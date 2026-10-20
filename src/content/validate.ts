/**
 * مدقق المحتوى: يُستخدم في سطر الأوامر (قبل البناء)، وفي استوديو المحتوى، وأثناء التشغيل
 * لضمان ألا تظهر مرحلة فارغة أو معطوبة على أنها قابلة للعب.
 */
import type {
  Challenge,
  ContentPack,
  StageDef,
  GroupDef,
  WorldDef,
  PlayableStage,
  ContentManifest,
} from './types.ts';
import { ALLOWED_KINDS } from './types.ts';
import { normalizeArabic, crosswordSolution, findWordInGrid, passwordLetter, matchText } from './answer.ts';

export type IssueLevel = 'error' | 'warning';

export interface ValidationIssue {
  level: IssueLevel;
  code: string;
  message: string;
  /** معرف العنصر المعني. */
  ref?: string;
  pack?: string;
}

export interface ValidationReport {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** معرفات المراحل الصالحة للعب. */
  playableStageIds: string[];
  /** معرفات التحديات التي بها أخطاء. */
  brokenChallengeIds: string[];
  stats: {
    worlds: number;
    groups: number;
    stages: number;
    publishedStages: number;
    playableStages: number;
    challenges: number;
    publishedChallenges: number;
    needsReview: number;
    byKind: Record<string, number>;
    byCategory: Record<string, number>;
    byStageType: Record<string, number>;
  };
}

const ID_RE = /^[a-z0-9][a-z0-9_\-]*$/;
const CATEGORIES = new Set(['general','history','geography','science','religion','math','arabic','proverbs','sports','technology','logic','words','visual']);
const DIFFS = new Set(['easy', 'medium', 'hard', 'expert']);
const STATUSES = new Set(['draft', 'review', 'published', 'archived']);
const STAGE_TYPES = new Set(Object.keys(ALLOWED_KINDS));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** المفتاح المستخدم لاكتشاف الأسئلة المكررة. */
export function duplicateKey(ch: Challenge): string {
  const rules = { foldAlef: true, foldTaMarbuta: true, foldYa: true, foldHamzaSeats: true, ignoreDefiniteArticle: true };
  const media = ch.media ? JSON.stringify(ch.media) : '';
  return normalizeArabic(ch.prompt, rules) + (media ? `#${media}` : '');
}

function nonEmpty(s: unknown): s is string {
  return typeof s === 'string' && s.trim().length > 0;
}

/** التحقق من تحدٍ واحد بمعزل عن غيره. */
export function validateChallenge(ch: Challenge, pack?: string): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const err = (code: string, message: string) => out.push({ level: 'error', code, message, ref: ch?.id, pack });
  const warn = (code: string, message: string) => out.push({ level: 'warning', code, message, ref: ch?.id, pack });

  if (!ch || typeof ch !== 'object') {
    err('challenge.shape', 'عنصر سؤال غير صالح');
    return out;
  }
  if (!nonEmpty(ch.id) || !ID_RE.test(ch.id)) err('challenge.id', `معرف غير صالح: "${ch.id}" (أحرف لاتينية صغيرة وأرقام و _ - فقط)`);
  if (!nonEmpty(ch.prompt)) err('challenge.prompt', 'نص السؤال فارغ');
  if (!CATEGORIES.has(ch.category)) err('challenge.category', `تصنيف غير معروف: ${ch.category}`);
  if (!DIFFS.has(ch.difficulty)) err('challenge.difficulty', `صعوبة غير معروفة: ${ch.difficulty}`);
  if (!STATUSES.has(ch.status)) err('challenge.status', `حالة نشر غير معروفة: ${ch.status}`);
  if (typeof ch.points !== 'number' || !Number.isFinite(ch.points) || ch.points <= 0) err('challenge.points', 'النقاط يجب أن تكون رقمًا موجبًا');
  if (!Array.isArray(ch.hints)) err('challenge.hints', 'التلميحات يجب أن تكون قائمة');
  else if (ch.hints.some((h) => !nonEmpty(h))) err('challenge.hints', 'يوجد تلميح فارغ');
  else if (ch.hints.length === 0) warn('challenge.hints.empty', 'لا توجد تلميحات لهذا السؤال');

  const published = ch.status === 'published';
  const needsSource = ch.requiresSource || ch.category === 'religion';
  if (needsSource) {
    const ok = Array.isArray(ch.sources) && ch.sources.some((s) => nonEmpty(s?.title) && nonEmpty(s?.url));
    if (!ok) (published ? err : warn)('challenge.source', 'المعلومة تحتاج إلى مرجع موثوق برابط قبل النشر');
  }
  if (ch.sources) {
    for (const s of ch.sources) {
      if (!nonEmpty(s?.title)) err('challenge.source.title', 'مرجع بلا عنوان');
      if (s?.url && !/^https:\/\//.test(s.url)) err('challenge.source.url', `رابط المرجع يجب أن يبدأ بـ https: ${s.url}`);
    }
  }
  if (ch.timeSensitive && (!ch.lastReviewed || !DATE_RE.test(ch.lastReviewed))) {
    (published ? err : warn)('challenge.lastReviewed', 'معلومة قابلة للتغير بلا تاريخ مراجعة (YYYY-MM-DD)');
  }
  if (ch.lastReviewed && !DATE_RE.test(ch.lastReviewed)) err('challenge.lastReviewed.format', 'صيغة تاريخ المراجعة يجب أن تكون YYYY-MM-DD');
  if (published && ch.review?.aiGenerated && !nonEmpty(ch.review.reviewer)) {
    err('challenge.ai.unreviewed', 'سؤال مولد بالذكاء الاصطناعي منشور دون اسم مراجع بشري');
  }

  if (ch.media) {
    const m = ch.media as any;
    if (m.type === 'emoji' && !nonEmpty(m.value)) err('media.emoji', 'وسائط الرموز فارغة');
    else if (m.type === 'sequence' && (!Array.isArray(m.items) || m.items.length < 2)) err('media.sequence', 'السلسلة يجب أن تحتوي عنصرين على الأقل');
    else if (m.type === 'shapes') {
      if (!nonEmpty(m.viewBox) || !Array.isArray(m.shapes) || m.shapes.length === 0) err('media.shapes', 'رسم الأشكال ناقص');
      if (!nonEmpty(m.alt)) err('media.shapes.alt', 'الرسم يحتاج إلى وصف بديل');
      const allowed = new Set(['rect', 'circle', 'line', 'polygon', 'text']);
      if (Array.isArray(m.shapes) && m.shapes.some((s: any) => !allowed.has(s?.shape))) err('media.shapes.kind', 'شكل غير مدعوم');
    } else if (!['emoji', 'sequence', 'shapes'].includes(m.type)) err('media.type', `نوع وسائط غير مدعوم: ${m.type}`);
  }

  switch (ch.kind) {
    case 'mcq': {
      if (!Array.isArray(ch.options) || ch.options.length < 2) err('mcq.options', 'يجب وجود خيارين على الأقل');
      else {
        if (ch.options.some((o) => !nonEmpty(o))) err('mcq.options.empty', 'يوجد خيار فارغ');
        const norm = ch.options.map((o) => normalizeArabic(o));
        if (new Set(norm).size !== norm.length) err('mcq.options.dup', 'خيارات مكررة');
        if (!Number.isInteger(ch.correctIndex) || ch.correctIndex < 0 || ch.correctIndex >= ch.options.length) err('mcq.correct', 'فهرس الإجابة الصحيحة خارج النطاق');
      }
      break;
    }
    case 'truefalse':
      if (typeof ch.answer !== 'boolean') err('tf.answer', 'إجابة صح/خطأ مفقودة');
      break;
    case 'text': {
      if (!nonEmpty(ch.answer)) err('text.answer', 'الإجابة الصحيحة مفقودة');
      const all = [ch.answer, ...(ch.acceptedAnswers || [])].map((a) => normalizeArabic(a ?? '', ch.match));
      if ((ch.acceptedAnswers || []).some((a) => !nonEmpty(a))) err('text.accepted.empty', 'إجابة بديلة فارغة');
      if (new Set(all).size !== all.length) warn('text.accepted.dup', 'إجابات بديلة مكررة بعد التطبيع');
      break;
    }
    case 'number':
      if (typeof ch.answer !== 'number' || !Number.isFinite(ch.answer)) err('number.answer', 'الإجابة الرقمية غير صالحة');
      break;
    case 'order': {
      if (!nonEmpty(ch.answer)) err('order.answer', 'الإجابة الصحيحة مفقودة');
      if (!Array.isArray(ch.tiles) || ch.tiles.length < 2) err('order.tiles', 'يجب وجود قطعتين على الأقل');
      else if (nonEmpty(ch.answer)) {
        const pieces = ch.unit === 'letters' ? Array.from(ch.answer.replace(/\s+/g, '')) : ch.answer.trim().split(/\s+/);
        const a = [...pieces].sort().join('|');
        const b = [...ch.tiles].sort().join('|');
        if (a !== b) err('order.tiles.mismatch', 'القطع لا تطابق حروف/كلمات الإجابة');
        if (ch.tiles.join(ch.unit === 'letters' ? '' : ' ') === pieces.join(ch.unit === 'letters' ? '' : ' ')) {
          err('order.tiles.solved', 'القطع معروضة بالترتيب الصحيح مسبقًا');
        }
        for (const alt of ch.acceptedAnswers || []) {
          const ap = ch.unit === 'letters' ? Array.from(alt.replace(/\s+/g, '')) : alt.trim().split(/\s+/);
          if ([...ap].sort().join('|') !== b) err('order.accepted.mismatch', `الإجابة البديلة "${alt}" لا يمكن تكوينها من القطع`);
        }
      }
      break;
    }
    case 'password': {
      if (!nonEmpty(ch.answer)) err('password.answer', 'كلمة السر مفقودة');
      if (!Array.isArray(ch.clues) || ch.clues.length < 2) err('password.clues', 'يجب وجود دليلين على الأقل');
      else {
        let letters = '';
        for (const c of ch.clues) {
          if (!nonEmpty(c.clue) || !nonEmpty(c.answer)) err('password.clue', 'دليل ناقص');
          const len = Array.from((c.answer || '').replace(/\s+/g, '')).length;
          if (!Number.isInteger(c.letterIndex) || c.letterIndex < 0 || c.letterIndex >= len) err('password.letterIndex', `موضع الحرف خارج كلمة الدليل "${c.answer}"`);
          letters += passwordLetter(c.answer || '', c.letterIndex);
        }
        if (nonEmpty(ch.answer) && !matchText(letters, ch.answer, [], { ignoreSpaces: true })) {
          err('password.letters', `الحروف المستخرجة "${letters}" لا تكوّن كلمة السر "${ch.answer}"`);
        }
      }
      break;
    }
    case 'crossword': {
      if (!Number.isInteger(ch.rows) || !Number.isInteger(ch.cols) || ch.rows < 2 || ch.cols < 2) err('crossword.size', 'أبعاد الشبكة غير صالحة');
      if (!Array.isArray(ch.entries) || ch.entries.length < 2) err('crossword.entries', 'يجب وجود كلمتين على الأقل');
      else {
        const cells = new Map<string, string>();
        const ids = new Set<string>();
        for (const e of ch.entries) {
          if (ids.has(e.id)) err('crossword.entry.id', `معرف مدخل مكرر: ${e.id}`);
          ids.add(e.id);
          if (!nonEmpty(e.clue) || !nonEmpty(e.answer)) err('crossword.entry', `مدخل ناقص ${e.id}`);
          const letters = Array.from((e.answer || '').replace(/\s+/g, ''));
          letters.forEach((l, i) => {
            const r = e.direction === 'down' ? e.row + i : e.row;
            const c = e.direction === 'across' ? e.col + i : e.col;
            if (r < 0 || c < 0 || r >= ch.rows || c >= ch.cols) err('crossword.bounds', `الكلمة "${e.answer}" تخرج عن الشبكة`);
            const k = `${r},${c}`;
            const prev = cells.get(k);
            if (prev && prev !== l) err('crossword.conflict', `تعارض في الخانة ${k}: "${prev}" و"${l}"`);
            cells.set(k, l);
          });
        }
        if (crosswordSolution(ch).size === 0) err('crossword.empty', 'الشبكة فارغة');
      }
      break;
    }
    case 'wordsearch': {
      if (!Array.isArray(ch.grid) || ch.grid.length < 3) err('wordsearch.grid', 'الشبكة صغيرة جدًا');
      else {
        const w = Array.from(ch.grid[0]).length;
        if (ch.grid.some((row) => Array.from(row).length !== w)) err('wordsearch.grid.shape', 'صفوف الشبكة غير متساوية الطول');
      }
      if (!Array.isArray(ch.words) || ch.words.length === 0) err('wordsearch.words', 'لا توجد كلمات للبحث');
      else for (const word of ch.words) {
        if (Array.isArray(ch.grid) && !findWordInGrid(ch, word)) err('wordsearch.missing', `الكلمة "${word}" غير موجودة في الشبكة`);
      }
      break;
    }
    case 'observation': {
      if (!Array.isArray(ch.cells) || ch.cells.length < 4) err('observation.cells', 'يجب وجود 4 خانات على الأقل');
      if (!Number.isInteger(ch.columns) || ch.columns < 2) err('observation.columns', 'عدد الأعمدة غير صالح');
      if (!Array.isArray(ch.targets) || ch.targets.length === 0) err('observation.targets', 'لا يوجد هدف محدد');
      else if (ch.targets.some((t) => !Number.isInteger(t) || t < 0 || t >= (ch.cells?.length ?? 0))) err('observation.targets.range', 'فهرس هدف خارج النطاق');
      break;
    }
    default:
      err('challenge.kind', `نوع تحدٍ غير مدعوم: ${(ch as any).kind}`);
  }
  return out;
}

function stageMediaIssues(stage: StageDef, ch: Challenge): string | null {
  if (stage.type === 'picture' && !(ch.media && (ch.media.type === 'emoji' || ch.media.type === 'shapes'))) {
    return 'أسئلة الألغاز المصورة تحتاج إلى صورة (رموز أو رسم)';
  }
  if (stage.type === 'pattern' && !(ch.media && ch.media.type === 'sequence')) {
    return 'أسئلة الأنماط تحتاج إلى سلسلة معروضة';
  }
  if (stage.type === 'observation' && ch.kind === 'number' && !ch.media) {
    return 'سؤال العد في دقة الملاحظة يحتاج إلى صورة';
  }
  return null;
}

/** التحقق من مجموعة حزم كاملة (للمدقق وسطر الأوامر والاستوديو). */
export function validatePacks(packs: ContentPack[]): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const push = (i: ValidationIssue) => (i.level === 'error' ? errors : warnings).push(i);

  const worlds = new Map<string, WorldDef>();
  const groups = new Map<string, GroupDef>();
  const stages = new Map<string, StageDef & { _pack: string }>();
  const challenges = new Map<string, Challenge & { _pack?: string }>();
  const brokenChallenges = new Set<string>();

  for (const p of packs) {
    if (!p || !nonEmpty(p.packId)) {
      push({ level: 'error', code: 'pack.id', message: 'حزمة بلا معرف' });
      continue;
    }
    for (const key of ['worlds', 'groups', 'stages', 'challenges'] as const) {
      if (!Array.isArray((p as any)[key])) push({ level: 'error', code: 'pack.shape', message: `الحقل ${key} يجب أن يكون قائمة`, pack: p.packId });
    }
    for (const w of p.worlds || []) {
      if (!nonEmpty(w.id) || !ID_RE.test(w.id)) push({ level: 'error', code: 'world.id', message: `معرف عالم غير صالح ${w.id}`, pack: p.packId });
      if (worlds.has(w.id)) push({ level: 'error', code: 'world.dup', message: `معرف عالم مكرر ${w.id}`, ref: w.id, pack: p.packId });
      if (!nonEmpty(w.title)) push({ level: 'error', code: 'world.title', message: 'عالم بلا اسم', ref: w.id, pack: p.packId });
      if (typeof w.unlockRatio !== 'number' || w.unlockRatio < 0 || w.unlockRatio > 1) push({ level: 'error', code: 'world.unlock', message: 'نسبة الفتح يجب أن تكون بين 0 و1', ref: w.id, pack: p.packId });
      worlds.set(w.id, w);
    }
    for (const g of p.groups || []) {
      if (!nonEmpty(g.id) || !ID_RE.test(g.id)) push({ level: 'error', code: 'group.id', message: `معرف مجموعة غير صالح ${g.id}`, pack: p.packId });
      if (groups.has(g.id)) push({ level: 'error', code: 'group.dup', message: `معرف مجموعة مكرر ${g.id}`, ref: g.id, pack: p.packId });
      if (!STAGE_TYPES.has(g.stageType)) push({ level: 'error', code: 'group.type', message: `نمط غير معروف ${g.stageType}`, ref: g.id, pack: p.packId });
      groups.set(g.id, g);
    }
    for (const s of p.stages || []) {
      if (!nonEmpty(s.id) || !ID_RE.test(s.id)) push({ level: 'error', code: 'stage.id', message: `معرف مرحلة غير صالح ${s.id}`, pack: p.packId });
      if (stages.has(s.id)) push({ level: 'error', code: 'stage.dup', message: `معرف مرحلة مكرر ${s.id}`, ref: s.id, pack: p.packId });
      stages.set(s.id, { ...s, _pack: p.packId });
    }
    for (const c of p.challenges || []) {
      if (challenges.has(c?.id)) {
        push({ level: 'error', code: 'challenge.dup', message: `معرف سؤال مكرر ${c.id}`, ref: c.id, pack: p.packId });
        brokenChallenges.add(c.id);
      }
      const issues = validateChallenge(c, p.packId);
      issues.forEach(push);
      if (issues.some((i) => i.level === 'error')) brokenChallenges.add(c?.id);
      challenges.set(c?.id, { ...c, _pack: p.packId });
    }
  }

  for (const g of groups.values()) {
    if (!worlds.has(g.worldId)) push({ level: 'error', code: 'group.world', message: `المجموعة تشير إلى عالم غير موجود ${g.worldId}`, ref: g.id });
  }

  // اكتشاف التكرار
  const dupMap = new Map<string, string[]>();
  for (const c of challenges.values()) {
    if (!c?.prompt || c.status === 'archived') continue;
    const k = duplicateKey(c);
    dupMap.set(k, [...(dupMap.get(k) || []), c.id]);
  }
  for (const ids of dupMap.values()) {
    if (ids.length > 1) {
      // تحديات الشبكات (الكلمات المتقاطعة...) قد تتشارك التعليمات نفسها، فالتكرار يُقاس بالمحتوى
      const items = ids.map((id) => challenges.get(id)!);
      const sameBody = new Set(items.map((c) => JSON.stringify({ ...c, id: '', _pack: '', status: '', hints: [], points: 0 }))).size < items.length;
      const gridKinds = items.every((c) => ['crossword', 'wordsearch', 'observation', 'order', 'password'].includes(c.kind));
      if (gridKinds && !sameBody) continue;
      push({ level: 'warning', code: 'challenge.duplicate', message: `أسئلة متكررة النص: ${ids.join('، ')}`, ref: ids[0] });
    }
  }

  // المراحل
  const usage = new Map<string, string[]>();
  const playable: string[] = [];
  const orderKeys = new Set<string>();
  for (const s of stages.values()) {
    const e = (code: string, message: string) => push({ level: 'error', code, message, ref: s.id, pack: s._pack });
    const w = (code: string, message: string) => push({ level: 'warning', code, message, ref: s.id, pack: s._pack });
    let ok = true;
    if (!nonEmpty(s.title)) { e('stage.title', 'مرحلة بلا اسم'); ok = false; }
    if (!STAGE_TYPES.has(s.type)) { e('stage.type', `نمط مرحلة غير معروف ${s.type}`); ok = false; }
    if (!DIFFS.has(s.difficulty)) { e('stage.difficulty', 'صعوبة غير معروفة'); ok = false; }
    if (!STATUSES.has(s.status)) { e('stage.status', 'حالة نشر غير معروفة'); ok = false; }
    if (!worlds.has(s.worldId)) { e('stage.world', `عالم غير موجود ${s.worldId}`); ok = false; }
    const g = groups.get(s.groupId);
    if (!g) { e('stage.group', `مجموعة غير موجودة ${s.groupId}`); ok = false; }
    else if (g.worldId !== s.worldId) { e('stage.group.world', 'المجموعة لا تتبع عالم المرحلة'); ok = false; }
    else if (g.stageType !== s.type && g.stageType !== 'mixed') w('stage.group.type', 'نمط المرحلة يختلف عن نمط مجموعتها');
    const ok2 = `${s.groupId}#${s.order}`;
    if (orderKeys.has(ok2) && s.status === 'published') w('stage.order.dup', `ترتيب مكرر ${s.order} داخل المجموعة`);
    orderKeys.add(ok2);
    if (typeof s.completionPoints !== 'number' || s.completionPoints < 0) { e('stage.points', 'نقاط الإكمال غير صالحة'); ok = false; }
    if (typeof s.completionCoins !== 'number' || s.completionCoins < 0) { e('stage.coins', 'عملات الإكمال غير صالحة'); ok = false; }
    if (!Array.isArray(s.challengeIds) || s.challengeIds.length === 0) {
      (s.status === 'published' ? e : w)('stage.empty', 'مرحلة فارغة بلا أسئلة');
      ok = false;
    } else {
      if (new Set(s.challengeIds).size !== s.challengeIds.length) { e('stage.challenge.dup', 'سؤال مكرر داخل المرحلة'); ok = false; }
      for (const cid of s.challengeIds) {
        usage.set(cid, [...(usage.get(cid) || []), s.id]);
        const ch = challenges.get(cid);
        if (!ch) { e('stage.challenge.missing', `السؤال ${cid} غير موجود`); ok = false; continue; }
        if (brokenChallenges.has(cid)) { e('stage.challenge.broken', `السؤال ${cid} به أخطاء`); ok = false; }
        if (s.status === 'published' && ch.status !== 'published') { e('stage.challenge.unpublished', `السؤال ${cid} غير منشور (${ch.status})`); ok = false; }
        if (STAGE_TYPES.has(s.type) && !ALLOWED_KINDS[s.type].includes(ch.kind)) { e('stage.kind', `آلية ${ch.kind} غير مناسبة لنمط ${s.type}`); ok = false; }
        const mediaIssue = stageMediaIssues(s, ch);
        if (mediaIssue) { e('stage.media', `${cid}: ${mediaIssue}`); ok = false; }
      }
      const min = s.completion?.minSolved;
      if (min !== undefined && (!Number.isInteger(min) || min < 1 || min > s.challengeIds.length)) { e('stage.completion', 'شرط الحد الأدنى للحل غير صالح'); ok = false; }
      const mm = s.completion?.maxMistakes;
      if (mm !== undefined && mm !== null && (!Number.isInteger(mm) || mm < 0)) { e('stage.completion.mistakes', 'الحد الأقصى للأخطاء غير صالح'); ok = false; }
      if (s.type === 'mixed' && new Set(s.challengeIds.map((id) => challenges.get(id)?.kind)).size < 2) w('stage.mixed', 'المرحلة المختلطة تحتوي آلية واحدة فقط');
    }
    if (ok && s.status === 'published') playable.push(s.id);
  }
  for (const [cid, sids] of usage) {
    if (sids.length > 1) push({ level: 'warning', code: 'challenge.reused', message: `السؤال ${cid} مستخدم في أكثر من مرحلة: ${sids.join('، ')}`, ref: cid });
  }

  const pubChallenges = [...challenges.values()].filter((c) => c?.status === 'published');
  const byKind: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const c of pubChallenges) {
    byKind[c.kind] = (byKind[c.kind] || 0) + 1;
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
  }
  const byStageType: Record<string, number> = {};
  for (const id of playable) {
    const t = stages.get(id)!.type;
    byStageType[t] = (byStageType[t] || 0) + 1;
  }

  return {
    errors,
    warnings,
    playableStageIds: playable,
    brokenChallengeIds: [...brokenChallenges],
    stats: {
      worlds: worlds.size,
      groups: groups.size,
      stages: stages.size,
      publishedStages: [...stages.values()].filter((s) => s.status === 'published').length,
      playableStages: playable.length,
      challenges: challenges.size,
      publishedChallenges: pubChallenges.length,
      needsReview: [...challenges.values()].filter((c) => c?.status === 'draft' || c?.status === 'review').length +
        [...stages.values()].filter((s) => s.status === 'draft' || s.status === 'review').length,
      byKind,
      byCategory,
      byStageType,
    },
  };
}

/** حل مراحل قابلة للعب من حزم محمّلة (يُستخدم أثناء التشغيل). */
export function buildPlayableStages(packs: ContentPack[]): Map<string, PlayableStage> {
  const report = validatePacks(packs);
  const challenges = new Map<string, Challenge>();
  const stages = new Map<string, StageDef>();
  for (const p of packs) {
    for (const c of p.challenges || []) challenges.set(c.id, c);
    for (const s of p.stages || []) stages.set(s.id, s);
  }
  const out = new Map<string, PlayableStage>();
  for (const id of report.playableStageIds) {
    const stage = stages.get(id)!;
    out.set(id, { stage, challenges: stage.challengeIds.map((cid) => challenges.get(cid)!) });
  }
  return out;
}

/** بناء الملخص (manifest) الذي تعتمد عليه شاشة العوالم. */
export function buildManifest(packs: ContentPack[], generatedAt = new Date().toISOString()): ContentManifest {
  const report = validatePacks(packs);
  const playable = new Set(report.playableStageIds);
  const worlds: ContentManifest['worlds'] = [];
  const allGroups: GroupDef[] = packs.flatMap((p) => p.groups || []);
  const allStages: StageDef[] = packs.flatMap((p) => p.stages || []);
  for (const p of packs) {
    for (const w of p.worlds || []) {
      const packIds = packs
        .filter((pp) => (pp.worlds || []).some((x) => x.id === w.id) || (pp.groups || []).some((g) => g.worldId === w.id) || (pp.stages || []).some((s) => s.worldId === w.id))
        .map((pp) => pp.packId);
      const groups = allGroups
        .filter((g) => g.worldId === w.id)
        .sort((a, b) => a.order - b.order)
        .map((g) => ({ ...g, playableStageCount: allStages.filter((s) => s.groupId === g.id && playable.has(s.id)).length }));
      worlds.push({ ...w, packIds, groups, playableStageCount: groups.reduce((a, g) => a + g.playableStageCount, 0) });
    }
  }
  worlds.sort((a, b) => a.order - b.order);
  const groupOrder = new Map(allGroups.map((g) => [g.id, g.order]));
  const worldOrder = new Map(worlds.map((w) => [w.id, w.order]));
  const stageIndex = packs
    .flatMap((p) => (p.stages || []).filter((s) => playable.has(s.id)).map((s) => ({
      id: s.id,
      worldId: s.worldId,
      groupId: s.groupId,
      order: s.order,
      title: s.title,
      type: s.type,
      difficulty: s.difficulty,
      challengeCount: s.challengeIds.length,
      completionPoints: s.completionPoints,
      packId: p.packId,
    })))
    .sort((a, b) =>
      (worldOrder.get(a.worldId) ?? 0) - (worldOrder.get(b.worldId) ?? 0) ||
      (groupOrder.get(a.groupId) ?? 0) - (groupOrder.get(b.groupId) ?? 0) ||
      a.order - b.order);
  return {
    generatedAt,
    stageIndex,
    totals: {
      challenges: report.stats.challenges,
      publishedChallenges: report.stats.publishedChallenges,
      stages: report.stats.stages,
      publishedStages: report.stats.playableStages,
      needsReview: report.stats.needsReview,
    },
    worlds,
  };
}
