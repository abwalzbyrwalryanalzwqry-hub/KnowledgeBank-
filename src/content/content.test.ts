import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Challenge, ContentPack, StageDef, TextChallenge } from './types.ts';
import { normalizeArabic, matchText, matchNumber, parseNumberInput, checkAnswer, crosswordSolution, findWordInGrid } from './answer.ts';
import { validatePacks, buildManifest, buildPlayableStages } from './validate.ts';
import {
  createEmptyProgress, applyChallengeSolved, applyStageCompleted, revealHint, recordWrong, challengePointsFor,
  isStageUnlocked, isWorldUnlocked, sanitizeProgress, evaluateAchievements, starsFor,
} from './progress.ts';
import { parseCsv, challengesFromCsv, challengesToCsv, mergeBatch, parseJsonImport } from './importer.ts';
import { sanitizeStats } from '../utils/storage.ts';
import { QUESTIONS_DATABASE } from '../data/questions.ts';
import { ZAYTOUNA_WORLDS } from '../data/zaytounaStages.ts';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PACKS_DIR = path.join(ROOT, 'src/content/packs');
const realPacks: ContentPack[] = fs
  .readdirSync(PACKS_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(PACKS_DIR, f), 'utf8')));

// ---------------------------------------------------------------------------
// مدقق الإجابات العربية
// ---------------------------------------------------------------------------
test('التطبيع يزيل التشكيل والتطويل والمسافات الزائدة', () => {
  assert.equal(normalizeArabic('  القَاهِرَةُ  '), normalizeArabic('القاهرة'));
  assert.equal(normalizeArabic('القـــاهرة'), normalizeArabic('القاهرة'));
  assert.equal(normalizeArabic('بيت   الحكمة'), normalizeArabic('بيت الحكمة'));
});

test('مطابقة النص: البدائل الموثقة مقبولة والإجابات الخاطئة مرفوضة', () => {
  assert.ok(matchText('ابن سينا', 'ابن سينا'));
  assert.ok(matchText('الشيخ الرئيس', 'ابن سينا', ['الشيخ الرئيس']));
  assert.ok(!matchText('ابن رشد', 'ابن سينا', ['الشيخ الرئيس']));
  // لا مطابقة تقريبية: حرف ناقص يعني إجابة خاطئة
  assert.ok(!matchText('القاهر', 'القاهرة'));
  assert.ok(!matchText('', 'القاهرة'));
});

test('قواعد المطابقة الاختيارية تعمل لكل سؤال على حدة', () => {
  assert.ok(!matchText('القاهره', 'القاهرة'), 'التاء المربوطة لا تُطوى افتراضيًا');
  assert.ok(matchText('القاهره', 'القاهرة', [], { foldTaMarbuta: true }));
  assert.ok(!matchText('احمد', 'أحمد'), 'الهمزات لا تُطوى افتراضيًا');
  assert.ok(matchText('احمد', 'أحمد', [], { foldAlef: true }));
  assert.ok(matchText('مستشفى', 'مستشفي', [], { foldYa: true }));
  assert.ok(!matchText('قاهرة', 'القاهرة'));
  assert.ok(matchText('قاهرة', 'القاهرة', [], { ignoreDefiniteArticle: true }));
});

test('الأرقام العربية والغربية والفواصل', () => {
  assert.equal(parseNumberInput('٣٦٥'), 365);
  assert.equal(parseNumberInput('۱۲'), 12);
  assert.equal(parseNumberInput('3٫5'), 3.5);
  assert.equal(parseNumberInput('١٬٠٠٠'), 1000);
  assert.equal(parseNumberInput('abc'), null);
  assert.ok(matchNumber('٣٦٥', 365));
  assert.ok(!matchNumber('366', 365));
  assert.ok(matchNumber('9.6', 9.58, 0.05));
});

test('checkAnswer لكل آلية في المحتوى الحقيقي', () => {
  const all = realPacks.flatMap((p) => p.challenges).filter((c) => c.status === 'published');
  const kinds = new Set<string>();
  for (const c of all) {
    kinds.add(c.kind);
    switch (c.kind) {
      case 'mcq':
        assert.ok(checkAnswer(c, { kind: 'mcq', optionIndex: c.correctIndex }), c.id);
        assert.ok(!checkAnswer(c, { kind: 'mcq', optionIndex: (c.correctIndex + 1) % c.options.length }), c.id);
        break;
      case 'truefalse':
        assert.ok(checkAnswer(c, { kind: 'truefalse', value: c.answer }), c.id);
        assert.ok(!checkAnswer(c, { kind: 'truefalse', value: !c.answer }), c.id);
        break;
      case 'text':
        assert.ok(checkAnswer(c, { kind: 'text', value: c.answer }), c.id);
        for (const a of c.acceptedAnswers ?? []) assert.ok(checkAnswer(c, { kind: 'text', value: a }), `${c.id} بديل ${a}`);
        assert.ok(!checkAnswer(c, { kind: 'text', value: 'إجابة غير موجودة إطلاقا' }), c.id);
        break;
      case 'number':
        assert.ok(checkAnswer(c, { kind: 'number', value: String(c.answer).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]) }), c.id);
        assert.ok(!checkAnswer(c, { kind: 'number', value: String(c.answer + 1000) }), c.id);
        break;
      case 'order':
        assert.ok(checkAnswer(c, { kind: 'order', value: c.answer }), c.id);
        assert.ok(!checkAnswer(c, { kind: 'order', value: c.tiles.join(c.unit === 'letters' ? '' : ' ') + 'x' }), c.id);
        break;
      case 'password':
        assert.ok(checkAnswer(c, { kind: 'password', value: c.answer }), c.id);
        break;
      case 'crossword': {
        const cells = Object.fromEntries(crosswordSolution(c));
        assert.ok(checkAnswer(c, { kind: 'crossword', cells }), c.id);
        const k = Object.keys(cells)[0];
        assert.ok(!checkAnswer(c, { kind: 'crossword', cells: { ...cells, [k]: 'ظ' === cells[k] ? 'ض' : 'ظ' } }), c.id);
        break;
      }
      case 'wordsearch':
        for (const w of c.words) assert.ok(findWordInGrid(c, w), `${c.id}: ${w} غير موجودة في الشبكة`);
        assert.ok(checkAnswer(c, { kind: 'wordsearch', found: c.words }), c.id);
        assert.ok(!checkAnswer(c, { kind: 'wordsearch', found: c.words.slice(1) }), c.id);
        break;
      case 'observation':
        assert.ok(checkAnswer(c, { kind: 'observation', selected: c.targets }), c.id);
        assert.ok(!checkAnswer(c, { kind: 'observation', selected: [(c.targets[0] + 1) % c.cells.length] }), c.id);
        break;
    }
  }
  assert.equal(kinds.size, 9, 'كل الآليات التسع ممثلة في المحتوى المنشور');
});

// ---------------------------------------------------------------------------
// التحقق من المحتوى
// ---------------------------------------------------------------------------
const mkText = (id: string, status: Challenge['status'] = 'published'): TextChallenge => ({
  id, kind: 'text', prompt: `سؤال ${id}`, answer: 'جواب', category: 'general', difficulty: 'easy', points: 10, hints: [], status,
});
const mkStage = (id: string, challengeIds: string[], status: StageDef['status'] = 'published', order = 1): StageDef => ({
  id, title: `مرحلة ${id}`, worldId: 'w_t', groupId: 'g_t', order, type: 'general', difficulty: 'easy',
  completionPoints: 20, completionCoins: 5, challengeIds, completion: {}, status,
});
const mkPack = (stages: StageDef[], challenges: Challenge[], packId = 'test-pack'): ContentPack => ({
  packId, version: 1,
  worlds: packId === 'test-pack' ? [{ id: 'w_t', title: 'عالم', subtitle: 'اختبار', order: 1, icon: 'Sparkles', color: '#22d3ee', unlockRatio: 0 }] : [],
  groups: packId === 'test-pack' ? [{ id: 'g_t', worldId: 'w_t', title: 'مجموعة', order: 1, icon: 'Sparkles', stageType: 'general' }] : [],
  stages, challenges,
});

test('المرحلة الفارغة لا تُعد قابلة للعب', () => {
  const r = validatePacks([mkPack([mkStage('s_empty', [])], [])]);
  assert.ok(!r.playableStageIds.includes('s_empty'));
});

test('مرحلة تحتوي سؤالًا غير منشور لا تُنشر', () => {
  const r = validatePacks([mkPack([mkStage('s_a', ['c_a'])], [mkText('c_a', 'review')])]);
  assert.ok(!r.playableStageIds.includes('s_a'));
});

test('مرحلة غير منشورة لا تظهر حتى لو كانت أسئلتها صالحة', () => {
  const r = validatePacks([mkPack([mkStage('s_a', ['c_a'], 'draft')], [mkText('c_a')])]);
  assert.ok(!r.playableStageIds.includes('s_a'));
});

test('المرجع المكسور خطأ يمنع النشر', () => {
  const r = validatePacks([mkPack([mkStage('s_a', ['c_missing'])], [])]);
  assert.ok(r.errors.length > 0);
  assert.ok(!r.playableStageIds.includes('s_a'));
});

test('اكتشاف المعرفات والأسئلة المكررة', () => {
  const r = validatePacks([mkPack([], [mkText('c_a'), mkText('c_a')])]);
  assert.ok(r.errors.some((e) => e.code.startsWith('challenge.dup')));
  const r2 = validatePacks([mkPack([], [mkText('c_a'), { ...mkText('c_b'), prompt: 'سؤال c_a' }])]);
  assert.ok([...r2.errors, ...r2.warnings].some((e) => e.code === 'challenge.duplicate'));
});

test('سؤال منشور بلا إجابة خطأ', () => {
  const r = validatePacks([mkPack([], [{ ...mkText('c_a'), answer: '' }])]);
  assert.ok(r.errors.length > 0);
});

test('مرحلة صالحة تظهر في الملخص بعدد تحدياتها الحقيقي', () => {
  const packs = [mkPack([mkStage('s_a', ['c_a', 'c_b'])], [mkText('c_a'), mkText('c_b')])];
  const m = buildManifest(packs, 'x');
  assert.equal(m.stageIndex.length, 1);
  assert.equal(m.stageIndex[0].challengeCount, 2);
  assert.equal(buildPlayableStages(packs).get('s_a')?.challenges.length, 2);
});

test('كل حزم المحتوى الحقيقية صالحة بلا أخطاء', () => {
  const r = validatePacks(realPacks);
  assert.deepEqual(r.errors, []);
  assert.ok(r.stats.playableStages >= 38);
});

test('الملخص المولّد مطابق للحزم (شغّل content:build إن فشل)', () => {
  const onDisk = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/manifest.json'), 'utf8'));
  assert.deepEqual(onDisk, JSON.parse(JSON.stringify(buildManifest(realPacks, 'content'))));
});

// ---------------------------------------------------------------------------
// التقدم والمكافآت
// ---------------------------------------------------------------------------
test('نقاط التحدي تُمنح مرة واحدة فقط', () => {
  const c = mkText('c_a');
  const a = applyChallengeSolved(createEmptyProgress(), c);
  assert.equal(a.delta.points, 10);
  const b = applyChallengeSolved(a.progress, c);
  assert.equal(b.delta.points, 0);
  assert.equal(b.progress.points, 10);
});

test('التلميحات والأخطاء تخفض نقاط التحدي بالقاعدة المعلنة ولا تقل عن الحد الأدنى', () => {
  assert.equal(challengePointsFor(20, 0, 0), 20);
  assert.equal(challengePointsFor(20, 1, 0), 15);
  assert.equal(challengePointsFor(20, 1, 1), 10);
  assert.equal(challengePointsFor(20, 5, 5), 5);
  let p = createEmptyProgress();
  const c = { ...mkText('c_h'), hints: ['ت1', 'ت2'], points: 20 };
  p = revealHint(p, c);
  p = recordWrong(p, c);
  assert.equal(applyChallengeSolved(p, c).delta.points, 10);
});

test('مكافأة إكمال المرحلة مرة واحدة، والإعادة تحسن النجوم فقط', () => {
  const s = mkStage('s_a', ['c_a']);
  const sum = { stageId: 's_a', solvedCount: 1, total: 1, mistakes: 3, hints: 0, score: 10 };
  const a = applyStageCompleted(createEmptyProgress(), s, sum);
  assert.equal(a.delta.points, 20);
  assert.equal(a.delta.coins, 5);
  assert.equal(a.stars, 1);
  const b = applyStageCompleted(a.progress, s, { ...sum, mistakes: 0 });
  assert.equal(b.delta.points, 0);
  assert.equal(b.delta.coins, 0);
  assert.equal(b.progress.stages.s_a.bestStars, 3);
  assert.equal(b.progress.points, 20);
});

test('لا تكتمل المرحلة دون تحقيق الحد الأدنى من الحلول', () => {
  const s = { ...mkStage('s_a', ['c_a', 'c_b']), completion: { minSolved: 2 } };
  const r = applyStageCompleted(createEmptyProgress(), s, { stageId: 's_a', solvedCount: 1, total: 2, mistakes: 0, hints: 0, score: 0 });
  assert.ok(!r.progress.stages.s_a);
  assert.equal(r.delta.points, 0);
});

test('فتح المرحلة التالية يعتمد على إكمال السابقة', () => {
  const idx = [1, 2, 3].map((o) => ({ id: `s_${o}`, worldId: 'w', groupId: 'g', order: o, title: '', type: 'general' as const, difficulty: 'easy' as const, challengeCount: 1, completionPoints: 1, packId: 'p' }));
  let p = createEmptyProgress();
  assert.ok(isStageUnlocked(p, idx, 's_1'));
  assert.ok(!isStageUnlocked(p, idx, 's_2'));
  p = applyStageCompleted(p, mkStage('s_1', ['x']), { stageId: 's_1', solvedCount: 1, total: 1, mistakes: 0, hints: 0, score: 0 }).progress;
  assert.ok(isStageUnlocked(p, idx, 's_2'));
  assert.ok(!isStageUnlocked(p, idx, 's_3'));
});

test('فتح العالم الثاني مرتبط بنسبة الإكمال الحقيقية في العالم الأول', () => {
  const manifest = buildManifest(realPacks, 'content');
  const [w1, w2] = manifest.worlds;
  let p = createEmptyProgress();
  assert.ok(isWorldUnlocked(p, manifest, w1.id));
  assert.ok(!isWorldUnlocked(p, manifest, w2.id));
  const needed = Math.ceil(w1.playableStageCount * w2.unlockRatio);
  const w1Stages = manifest.stageIndex.filter((s) => s.worldId === w1.id).slice(0, needed);
  for (const s of w1Stages) p.stages[s.id] = { completed: true, bestStars: 1, bestScore: 0, plays: 1 } as any;
  assert.ok(isWorldUnlocked(p, manifest, w2.id));
});

test('الإنجازات تُمنح مرة واحدة', () => {
  let p = createEmptyProgress();
  p = applyStageCompleted(p, mkStage('s_a', ['c']), { stageId: 's_a', solvedCount: 1, total: 1, mistakes: 0, hints: 0, score: 0 }).progress;
  const a = evaluateAchievements(p);
  assert.ok(a.delta.newAchievements.length > 0);
  const b = evaluateAchievements(a.progress);
  assert.equal(b.delta.newAchievements.length, 0);
  assert.equal(b.delta.coins, 0);
});

test('النجوم', () => {
  assert.equal(starsFor(0, 0), 3);
  assert.equal(starsFor(2, 0), 2);
  assert.equal(starsFor(1, 1), 2);
  assert.equal(starsFor(5, 0), 1);
});

test('تنظيف التقدم التالف لا يرمي استثناء ولا يفقد البيانات السليمة', () => {
  const p = sanitizeProgress({ points: 'x', stages: { s_a: { completed: true, bestStars: 2 } }, ledger: { 'stage:s_a': 'x' }, achievements: 5 });
  assert.equal(p.points, 0);
  assert.equal(p.stages.s_a.completed, true);
  assert.equal(p.ledger['stage:s_a'], 'x');
  assert.deepEqual(p.achievements, []);
  assert.doesNotThrow(() => sanitizeProgress('garbage'));
});

test('تنظيف إحصاءات اللاعب يحافظ على التقدم القديم', () => {
  const s = sanitizeStats({ xp: 500, coins: 40, completedLevels: { w1_lvl_1: { stars: 3, score: 100 } }, claimedChests: ['c1'], hearts: 99, horizon: 'bad' });
  assert.equal(s.xp, 500);
  assert.equal(s.coins, 40);
  assert.equal(s.completedLevels.w1_lvl_1.stars, 3);
  assert.equal(s.hearts, 5);
  assert.equal(s.horizon?.points, 0);
  const d = sanitizeStats(null);
  assert.equal(d.coins, 100);
});

// ---------------------------------------------------------------------------
// الاستيراد
// ---------------------------------------------------------------------------
test('محلل CSV يدعم الاقتباس والفواصل داخل الحقول', () => {
  const rows = parseCsv('a,b\n"x, y","قال ""مرحبا"""\n');
  assert.deepEqual(rows[1], ['x, y', 'قال "مرحبا"']);
});

test('استيراد CSV والتصدير ذهابًا وإيابًا', () => {
  const src = [mkText('c_csv_1'), { ...mkText('c_csv_2'), acceptedAnswers: ['جوابا', 'الجواب'] } as TextChallenge];
  const csv = challengesToCsv(src);
  const { challenges, problems } = challengesFromCsv(csv, 'review');
  assert.deepEqual(problems, []);
  assert.equal(challenges.length, 2);
  assert.deepEqual((challenges[1] as TextChallenge).acceptedAnswers, ['جوابا', 'الجواب']);
  assert.equal(challenges[0].status, 'review', 'حالة «منشور» في الملف لا تنشر تلقائيًا');
  const explicit = challengesFromCsv(csv, 'published');
  assert.equal(explicit.challenges[0].status, 'published');
});

test('CSV بسطر ناقص الإجابة يُرفض مع رقم السطر', () => {
  const csv = challengesToCsv([mkText('c_x')]).replace(',جواب,', ',,');
  const { problems } = challengesFromCsv(csv);
  assert.ok(problems.length > 0);
});

test('دمج الدفعة كله أو لا شيء: معرف مكرر يرفض الدفعة كاملة', () => {
  const packs = [mkPack([], [mkText('c_a')])];
  const res = mergeBatch(packs, 'test-pack', { challenges: [mkText('c_new'), mkText('c_a')], stages: [] });
  assert.equal(res.ok, false);
  assert.equal(packs[0].challenges.length, 1, 'الحزم الأصلية لم تتغير');
  const ok = mergeBatch(packs, 'new-pack', { challenges: [mkText('c_new')], stages: [] });
  assert.equal(ok.ok, true);
  assert.equal(ok.added.challenges, 1);
});

test('استيراد JSON يفرض حالة المراجعة الافتراضية', () => {
  const { challenges, problems } = parseJsonImport(JSON.stringify({ challenges: [{ ...mkText('c_j'), status: undefined }] }), 'review');
  assert.deepEqual(problems, []);
  assert.equal(challenges[0].status, 'review');
});

// ---------------------------------------------------------------------------
// إصلاحات البيانات القديمة
// ---------------------------------------------------------------------------
test('الأسئلة القديمة: الإجابة الصحيحة لم تعد دائمًا الخيار الأول', () => {
  const positions = new Set(QUESTIONS_DATABASE.map((q) => q.correctIndex));
  assert.ok(positions.size >= 3);
  for (const q of QUESTIONS_DATABASE) assert.ok(q.correctIndex >= 0 && q.correctIndex < q.options.length);
});

test('المستويات الكلاسيكية لا تكرر السؤال داخل المستوى نفسه', () => {
  for (const w of ZAYTOUNA_WORLDS)
    for (const l of w.levels) {
      const ids = l.questions.map((q) => q.id);
      assert.equal(new Set(ids).size, ids.length, l.id);
    }
});
