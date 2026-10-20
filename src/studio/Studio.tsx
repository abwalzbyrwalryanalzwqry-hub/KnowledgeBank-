/**
 * استوديو المحتوى — أداة تطوير محلية فقط.
 * يُفتح عبر  npm run dev  ثم الرابط  http://localhost:3000/#/studio
 * لا يُضمَّن في نسخة الإنتاج (محمي بـ import.meta.env.DEV في main.tsx)، فلا توجد لوحة إدارة عامة مكشوفة.
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { Challenge, ChallengeKind, ContentPack, StageDef, GroupDef, PublishStatus, TopicCategory, ContentDifficulty, StageType, MatchRules } from '../content/types';
import { KIND_LABELS, CATEGORY_LABELS, DIFFICULTY_LABELS, STAGE_TYPE_LABELS, ALLOWED_KINDS } from '../content/types';
import { loadAllPacks } from '../content/loader';
import { validatePacks, validateChallenge, duplicateKey } from '../content/validate';
import { normalizeArabic, describeCorrectAnswer } from '../content/answer';
import { challengesFromCsv, parseJsonImport, mergeBatch, challengesToCsv, CSV_COLUMNS } from '../content/importer';
import { loadWorkspace, saveWorkspace, applyWorkspace, toExport, download, emptyWorkspace, type StudioWorkspace } from './studioStore';

type Tab = 'questions' | 'stages' | 'review' | 'import' | 'validate';
const STATUSES: PublishStatus[] = ['draft', 'review', 'published', 'archived'];
const STATUS_LABELS: Record<PublishStatus, string> = { draft: 'مسودة', review: 'قيد المراجعة', published: 'منشور', archived: 'مؤرشف' };
const today = () => new Date().toISOString().slice(0, 10);

const box = 'rounded-xl border border-slate-800 bg-slate-900/60 p-4';
const input = 'w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none';
const btn = 'rounded-lg px-3 py-2 text-sm font-bold cursor-pointer disabled:opacity-40';
const btnPrimary = `${btn} bg-cyan-500 text-slate-950 hover:bg-cyan-400`;
const btnGhost = `${btn} border border-slate-700 text-slate-200 hover:bg-slate-800`;

function template(kind: ChallengeKind, id: string): Challenge {
  const base = { id, prompt: '', category: 'general' as TopicCategory, difficulty: 'easy' as ContentDifficulty, points: 10, hints: [], status: 'draft' as PublishStatus, lastReviewed: today() };
  switch (kind) {
    case 'mcq':
      return { ...base, kind, options: ['', '', '', ''], correctIndex: 0 };
    case 'truefalse':
      return { ...base, kind, answer: true };
    case 'text':
      return { ...base, kind, answer: '', acceptedAnswers: [] };
    case 'number':
      return { ...base, kind, answer: 0 };
    case 'order':
      return { ...base, kind, unit: 'letters', tiles: [], answer: '' } as Challenge;
    case 'password':
      return { ...base, kind, category: 'words', answer: '', clues: [{ clue: '', answer: '', letterIndex: 0 }] } as Challenge;
    case 'crossword':
      return { ...base, kind, category: 'words', rows: 3, cols: 3, entries: [] } as Challenge;
    case 'wordsearch':
      return { ...base, kind, category: 'words', grid: [], words: [] } as Challenge;
    case 'observation':
      return { ...base, kind, category: 'visual', columns: 4, cells: [], targets: [] } as Challenge;
  }
}

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

// ---------------------------------------------------------------------------
// محرر سؤال
// ---------------------------------------------------------------------------
function ChallengeEditor({
  initial,
  all,
  isNew,
  onSave,
  onCancel,
}: {
  initial: Challenge;
  all: Challenge[];
  isNew: boolean;
  onSave: (c: Challenge) => void;
  onCancel: () => void;
}) {
  const [c, setC] = useState<Challenge>(initial);
  const [json, setJson] = useState(JSON.stringify(initial, null, 2));
  const [jsonError, setJsonError] = useState('');
  const [mode, setMode] = useState<'form' | 'json'>(['mcq', 'truefalse', 'text', 'number'].includes(initial.kind) ? 'form' : 'json');
  useEffect(() => setJson(JSON.stringify(c, null, 2)), [c]);

  const set = (patch: Partial<Challenge>) => setC((prev) => ({ ...prev, ...patch }) as Challenge);
  const issues = validateChallenge(c);
  const idTaken = isNew && all.some((x) => x.id === c.id);
  const dupKey = duplicateKey(c);
  const dups = all.filter((x) => x.id !== c.id && duplicateKey(x) === dupKey);
  const errors = issues.filter((i) => i.level === 'error');

  return (
    <div className={`${box} flex flex-col gap-3`}>
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-bold text-white">{isNew ? 'سؤال جديد' : `تعديل ${c.id}`}</h3>
        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-cyan-300">{KIND_LABELS[c.kind]}</span>
        <div className="ms-auto flex gap-2">
          <button className={mode === 'form' ? btnPrimary : btnGhost} onClick={() => setMode('form')} disabled={!['mcq', 'truefalse', 'text', 'number'].includes(c.kind)}>
            نموذج
          </button>
          <button className={mode === 'json' ? btnPrimary : btnGhost} onClick={() => setMode('json')}>
            JSON
          </button>
        </div>
      </div>

      {mode === 'json' ? (
        <div className="flex flex-col gap-2">
          <textarea
            className={`${input} font-mono h-80`}
            dir="ltr"
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              try {
                setC(JSON.parse(e.target.value));
                setJsonError('');
              } catch (err) {
                setJsonError((err as Error).message);
              }
            }}
          />
          {jsonError && <p className="text-rose-300 text-xs">JSON غير صالح: {jsonError}</p>}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            المعرف الثابت
            <input className={input} dir="ltr" value={c.id} disabled={!isNew} onChange={(e) => set({ id: e.target.value.trim() })} />
          </label>
          <label className="flex flex-col gap-1">
            الحالة
            <select className={input} value={c.status} onChange={(e) => set({ status: e.target.value as PublishStatus })}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            نص السؤال
            <textarea className={`${input} h-20`} value={c.prompt} onChange={(e) => set({ prompt: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            التصنيف
            <select className={input} value={c.category} onChange={(e) => set({ category: e.target.value as TopicCategory })}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              الصعوبة
              <select className={input} value={c.difficulty} onChange={(e) => set({ difficulty: e.target.value as ContentDifficulty })}>
                {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              النقاط
              <input className={input} type="number" min={1} value={c.points} onChange={(e) => set({ points: Number(e.target.value) })} />
            </label>
          </div>

          {c.kind === 'mcq' && (
            <fieldset className="md:col-span-2 flex flex-col gap-2">
              <legend className="mb-1">الخيارات (اختر الصحيح)</legend>
              {c.options.map((o, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="radio" name="correct" checked={c.correctIndex === i} onChange={() => set({ correctIndex: i } as Partial<Challenge>)} aria-label={`الخيار ${i + 1} صحيح`} />
                  <input className={input} value={o} onChange={(e) => set({ options: c.options.map((x, j) => (j === i ? e.target.value : x)) } as Partial<Challenge>)} />
                </div>
              ))}
            </fieldset>
          )}
          {c.kind === 'truefalse' && (
            <label className="flex flex-col gap-1">
              الإجابة
              <select className={input} value={String(c.answer)} onChange={(e) => set({ answer: e.target.value === 'true' } as Partial<Challenge>)}>
                <option value="true">صح</option>
                <option value="false">خطأ</option>
              </select>
            </label>
          )}
          {c.kind === 'text' && (
            <>
              <label className="flex flex-col gap-1">
                الإجابة الصحيحة
                <input className={input} value={c.answer} onChange={(e) => set({ answer: e.target.value } as Partial<Challenge>)} />
              </label>
              <label className="flex flex-col gap-1">
                البدائل المقبولة الموثقة (سطر لكل بديل)
                <textarea className={`${input} h-20`} value={(c.acceptedAnswers ?? []).join('\n')} onChange={(e) => set({ acceptedAnswers: lines(e.target.value) } as Partial<Challenge>)} />
              </label>
              <fieldset className="md:col-span-2 flex flex-wrap gap-4 text-xs text-slate-300">
                <legend className="mb-1 text-sm text-white">قواعد المطابقة (اختيارية لهذا السؤال)</legend>
                {(
                  [
                    ['foldAlef', 'توحيد الألف والهمزات (أ إ آ ا)'],
                    ['foldTaMarbuta', 'التاء المربوطة = الهاء'],
                    ['foldYa', 'الألف المقصورة = الياء'],
                    ['ignoreDefiniteArticle', 'تجاهل «ال» التعريف'],
                  ] as Array<[keyof MatchRules, string]>
                ).map(([k, label]) => (
                  <label key={k} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={Boolean(c.match?.[k])}
                      onChange={(e) => set({ match: { ...(c.match ?? {}), [k]: e.target.checked } } as Partial<Challenge>)}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            </>
          )}
          {c.kind === 'number' && (
            <div className="grid grid-cols-3 gap-2 md:col-span-2">
              <label className="flex flex-col gap-1">
                الإجابة
                <input className={input} type="number" value={c.answer} onChange={(e) => set({ answer: Number(e.target.value) } as Partial<Challenge>)} />
              </label>
              <label className="flex flex-col gap-1">
                الوحدة
                <input className={input} value={c.unit ?? ''} onChange={(e) => set({ unit: e.target.value || undefined } as Partial<Challenge>)} />
              </label>
              <label className="flex flex-col gap-1">
                السماحية
                <input className={input} type="number" min={0} value={c.match?.numericTolerance ?? 0} onChange={(e) => set({ match: { numericTolerance: Number(e.target.value) } } as Partial<Challenge>)} />
              </label>
            </div>
          )}

          <label className="flex flex-col gap-1">
            التلميحات التدريجية (سطر لكل تلميح، من العام إلى الدقيق)
            <textarea className={`${input} h-20`} value={c.hints.join('\n')} onChange={(e) => set({ hints: lines(e.target.value) })} />
          </label>
          <label className="flex flex-col gap-1">
            الشرح
            <textarea className={`${input} h-20`} value={c.explanation ?? ''} onChange={(e) => set({ explanation: e.target.value || undefined })} />
          </label>
          <label className="flex flex-col gap-1">
            المصادر (سطر لكل مصدر: العنوان | الرابط)
            <textarea
              className={`${input} h-20`}
              value={(c.sources ?? []).map((s) => (s.url ? `${s.title} | ${s.url}` : s.title)).join('\n')}
              onChange={(e) =>
                set({
                  sources: lines(e.target.value).map((l) => {
                    const [title, url] = l.split('|').map((x) => x.trim());
                    return url ? { title, url } : { title };
                  }),
                })
              }
            />
          </label>
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              تاريخ آخر مراجعة
              <input className={input} type="date" value={c.lastReviewed ?? ''} onChange={(e) => set({ lastReviewed: e.target.value || undefined })} />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={Boolean(c.requiresSource)} onChange={(e) => set({ requiresSource: e.target.checked })} /> يتطلب مصدرًا موثوقًا
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={Boolean(c.timeSensitive)} onChange={(e) => set({ timeSensitive: e.target.checked })} /> معلومة قد تتغير مع الزمن
            </label>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1 text-xs">
        {idTaken && <p className="text-rose-300">المعرف مستخدم مسبقًا.</p>}
        {dups.length > 0 && <p className="text-amber-300">تكرار محتمل مع: {dups.map((d) => d.id).join('، ')}</p>}
        {issues.map((i, k) => (
          <p key={k} className={i.level === 'error' ? 'text-rose-300' : 'text-amber-300'}>
            {i.level === 'error' ? 'خطأ' : 'تحذير'}: {i.message}
          </p>
        ))}
        {!issues.length && !idTaken && !dups.length && <p className="text-emerald-300">السؤال صالح بنيويًا.</p>}
      </div>
      <div className="flex gap-2">
        <button
          className={btnPrimary}
          disabled={Boolean(jsonError) || idTaken || (c.status === 'published' && errors.length > 0)}
          onClick={() => onSave(c)}
          title={c.status === 'published' && errors.length ? 'لا يمكن نشر سؤال به أخطاء' : ''}
        >
          حفظ في المسودات المحلية
        </button>
        <button className={btnGhost} onClick={onCancel}>
          إلغاء
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// الاستوديو
// ---------------------------------------------------------------------------
export default function Studio() {
  const [base, setBase] = useState<ContentPack[] | null>(null);
  const [ws, setWs] = useState<StudioWorkspace>(loadWorkspace);
  const [tab, setTab] = useState<Tab>('questions');
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [catFilter, setCatFilter] = useState<string>('');
  const [editing, setEditing] = useState<{ c: Challenge; isNew: boolean } | null>(null);
  const [newKind, setNewKind] = useState<ChallengeKind>('mcq');
  const [importText, setImportText] = useState('');
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [importMsg, setImportMsg] = useState<{ ok: boolean; lines: string[] } | null>(null);

  useEffect(() => {
    loadAllPacks().then(setBase);
  }, []);
  useEffect(() => saveWorkspace(ws), [ws]);

  const packs = useMemo(() => (base ? applyWorkspace(base, ws) : []), [base, ws]);
  const report = useMemo(() => (packs.length ? validatePacks(packs) : null), [packs]);
  const allChallenges = useMemo(() => packs.flatMap((p) => p.challenges), [packs]);
  const allStages = useMemo(() => packs.flatMap((p) => p.stages), [packs]);
  const allGroups = useMemo(() => packs.flatMap((p) => p.groups), [packs]);
  const allWorlds = useMemo(() => packs.flatMap((p) => p.worlds), [packs]);
  const baseIds = useMemo(() => new Set((base ?? []).flatMap((p) => p.challenges.map((c) => c.id))), [base]);
  const baseStageIds = useMemo(() => new Set((base ?? []).flatMap((p) => p.stages.map((s) => s.id))), [base]);

  const filtered = useMemo(() => {
    const q = normalizeArabic(query, { foldAlef: true, foldTaMarbuta: true, foldYa: true });
    return allChallenges.filter((c) => {
      if (kindFilter && c.kind !== kindFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (catFilter && c.category !== catFilter) return false;
      if (!q) return true;
      const hay = normalizeArabic(`${c.id} ${c.prompt} ${describeCorrectAnswer(c)} ${(c.tags ?? []).join(' ')}`, { foldAlef: true, foldTaMarbuta: true, foldYa: true });
      return hay.includes(q);
    });
  }, [allChallenges, query, kindFilter, statusFilter, catFilter]);

  const saveChallenge = (c: Challenge) => {
    setWs((prev) => {
      if (baseIds.has(c.id)) return { ...prev, challengeOverrides: { ...prev.challengeOverrides, [c.id]: c } };
      const exists = prev.newChallenges.some((x) => x.id === c.id);
      return { ...prev, newChallenges: exists ? prev.newChallenges.map((x) => (x.id === c.id ? c : x)) : [...prev.newChallenges, c] };
    });
    setEditing(null);
  };

  const saveStage = (s: StageDef) =>
    setWs((prev) =>
      baseStageIds.has(s.id)
        ? { ...prev, stageOverrides: { ...prev.stageOverrides, [s.id]: s } }
        : { ...prev, newStages: prev.newStages.some((x) => x.id === s.id) ? prev.newStages.map((x) => (x.id === s.id ? s : x)) : [...prev.newStages, s] }
    );

  const setStatus = (c: Challenge, status: PublishStatus) => {
    const next = { ...c, status, lastReviewed: status === 'published' ? today() : c.lastReviewed } as Challenge;
    if (status === 'published' && validateChallenge(next).some((i) => i.level === 'error')) {
      alert('لا يمكن اعتماد سؤال يحتوي على أخطاء. افتحه للتعديل أولًا.');
      return;
    }
    saveChallenge(next);
  };

  const runImport = () => {
    const batch = importFormat === 'csv' ? { ...challengesFromCsv(importText, 'review'), stages: [] as StageDef[] } : parseJsonImport(importText, 'review');
    if (batch.problems.length) return setImportMsg({ ok: false, lines: batch.problems.map((p) => `${p.row ? `سطر ${p.row}: ` : ''}${p.message}`) });
    const res = mergeBatch(packs, 'studio-drafts', batch);
    if (!res.ok) return setImportMsg({ ok: false, lines: ['رُفضت الدفعة كاملة ولم يُضف شيء:', ...res.problems.map((p) => p.message)] });
    setWs((prev) => ({
      ...prev,
      newChallenges: [...prev.newChallenges, ...batch.challenges],
      newStages: [...prev.newStages, ...batch.stages],
      newGroups: [...prev.newGroups, ...(batch.pack?.groups ?? [])],
      newWorlds: [...prev.newWorlds, ...(batch.pack?.worlds ?? [])],
    }));
    setImportMsg({ ok: true, lines: [`أُضيف ${batch.challenges.length} سؤال و${batch.stages.length} مرحلة إلى المسودات المحلية بحالة «قيد المراجعة».`] });
    setImportText('');
  };

  const pendingCount =
    Object.keys(ws.challengeOverrides).length + Object.keys(ws.stageOverrides).length + ws.newChallenges.length + ws.newStages.length + ws.newGroups.length + ws.newWorlds.length;

  if (!base || !report) return <div className="p-10 text-slate-300" dir="rtl">جارٍ تحميل المحتوى...</div>;

  const reviewQueue = allChallenges.filter((c) => c.status === 'draft' || c.status === 'review' || c.review?.aiGenerated);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-4 sm:p-6 flex flex-col gap-4" dir="rtl">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">استوديو المحتوى</h1>
        <span className="text-xs px-2 py-1 rounded bg-amber-500/15 text-amber-200 border border-amber-500/30">أداة تطوير محلية — غير موجودة في نسخة الإنتاج</span>
        <a href="#" className="ms-auto text-sm text-cyan-300 underline" onClick={() => setTimeout(() => location.reload(), 0)}>
          العودة إلى اللعبة
        </a>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
        {[
          ['المراحل القابلة للعب', report.stats.playableStages],
          ['المراحل الكلية', report.stats.stages],
          ['الأسئلة', report.stats.challenges],
          ['منشورة', report.stats.publishedChallenges],
          ['تحتاج مراجعة', report.stats.needsReview],
          ['أخطاء / تحذيرات', `${report.errors.length} / ${report.warnings.length}`],
        ].map(([l, v]) => (
          <div key={l as string} className={box}>
            <p className="text-slate-400 text-xs">{l}</p>
            <p className="text-lg font-bold font-num">{v}</p>
          </div>
        ))}
      </section>

      <div className={`${box} flex flex-wrap items-center gap-2 text-sm`}>
        <span>تعديلات محلية غير مصدّرة: <strong className="font-num">{pendingCount}</strong></span>
        <button className={btnPrimary} disabled={!pendingCount} onClick={() => download(`studio-export-${today()}.json`, JSON.stringify(toExport(ws), null, 2))}>
          تصدير التعديلات (للتطبيق عبر CLI)
        </button>
        <button className={btnGhost} onClick={() => download(`questions-${today()}.csv`, challengesToCsv(allChallenges), 'text/csv')}>تصدير كل الأسئلة CSV</button>
        <button className={btnGhost} onClick={() => download(`content-${today()}.json`, JSON.stringify(packs, null, 2))}>تصدير كل الحزم JSON</button>
        <button
          className={`${btnGhost} text-rose-300`}
          disabled={!pendingCount}
          onClick={() => confirm('حذف كل التعديلات المحلية غير المصدّرة؟') && setWs(emptyWorkspace())}
        >
          تجاهل التعديلات
        </button>
        <code className="text-xs text-slate-400 w-full" dir="ltr">npm run content:apply -- studio-export.json --pack &lt;packId&gt;</code>
      </div>

      <nav className="flex gap-2 flex-wrap" aria-label="أقسام الاستوديو">
        {(
          [
            ['questions', 'الأسئلة'],
            ['stages', 'المراحل والمجموعات'],
            ['review', `المراجعة (${reviewQueue.length})`],
            ['import', 'استيراد دفعة'],
            ['validate', 'التحقق قبل النشر'],
          ] as Array<[Tab, string]>
        ).map(([t, l]) => (
          <button key={t} className={tab === t ? btnPrimary : btnGhost} onClick={() => setTab(t)}>
            {l}
          </button>
        ))}
      </nav>

      {tab === 'questions' && (
        <div className="flex flex-col gap-3">
          {editing ? (
            <ChallengeEditor initial={editing.c} isNew={editing.isNew} all={allChallenges} onSave={saveChallenge} onCancel={() => setEditing(null)} />
          ) : (
            <div className={`${box} flex flex-wrap gap-2 items-end`}>
              <label className="flex flex-col gap-1 text-sm flex-1 min-w-48">
                بحث (النص، الإجابة، المعرف)
                <input className={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="مثال: عاصمة" />
              </label>
              <select className={`${input} w-auto`} value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} aria-label="الآلية">
                <option value="">كل الآليات</option>
                {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select className={`${input} w-auto`} value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="التصنيف">
                <option value="">كل التصنيفات</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select className={`${input} w-auto`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="الحالة">
                <option value="">كل الحالات</option>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
              <select className={`${input} w-auto`} value={newKind} onChange={(e) => setNewKind(e.target.value as ChallengeKind)} aria-label="آلية السؤال الجديد">
                {Object.entries(KIND_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className={btnPrimary} onClick={() => setEditing({ c: template(newKind, `c_new_${Date.now().toString(36)}`), isNew: true })}>
                سؤال جديد
              </button>
            </div>
          )}
          <p className="text-xs text-slate-400 font-num">{filtered.length} نتيجة</p>
          <ul className="flex flex-col gap-2">
            {filtered.slice(0, 200).map((c) => {
              const errs = report.errors.filter((e) => e.ref === c.id);
              const warns = report.warnings.filter((e) => e.ref === c.id);
              const local = Boolean(ws.challengeOverrides[c.id] || ws.newChallenges.some((x) => x.id === c.id));
              return (
                <li key={c.id} className={`${box} flex flex-wrap items-center gap-2 text-sm`}>
                  <code className="text-xs text-slate-500" dir="ltr">{c.id}</code>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">{KIND_LABELS[c.kind]}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800">{CATEGORY_LABELS[c.category]}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800">{STATUS_LABELS[c.status]}</span>
                  {local && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200">معدّل محليًا</span>}
                  {errs.length > 0 && <span className="text-xs text-rose-300">{errs.length} خطأ</span>}
                  {warns.length > 0 && <span className="text-xs text-amber-300" title={warns.map((w) => w.message).join('\n')}>{warns.length} تحذير</span>}
                  <span className="basis-full text-slate-100">{c.prompt}</span>
                  <span className="text-xs text-slate-400">الإجابة: {describeCorrectAnswer(c)}</span>
                  <button className={`${btnGhost} ms-auto`} onClick={() => setEditing({ c, isNew: false })}>تعديل</button>
                  <button
                    className={btnGhost}
                    onClick={() => setEditing({ c: { ...c, id: `${c.id}_copy`, status: 'draft' } as Challenge, isNew: true })}
                  >
                    نسخ
                  </button>
                </li>
              );
            })}
          </ul>
          {filtered.length > 200 && <p className="text-xs text-slate-400">تُعرض أول 200 نتيجة فقط؛ ضيّق البحث.</p>}
        </div>
      )}

      {tab === 'stages' && (
        <StagesPanel
          worlds={allWorlds}
          groups={allGroups}
          stages={allStages}
          challenges={allChallenges}
          playable={new Set(report.playableStageIds)}
          errors={report.errors}
          onSaveStage={saveStage}
          onAddGroup={(g) => setWs((p) => ({ ...p, newGroups: [...p.newGroups, g] }))}
        />
      )}

      {tab === 'review' && (
        <ul className="flex flex-col gap-2">
          {reviewQueue.length === 0 && <p className="text-slate-400">لا توجد عناصر بانتظار المراجعة.</p>}
          {reviewQueue.map((c) => {
            const issues = validateChallenge(c);
            return (
              <li key={c.id} className={`${box} flex flex-col gap-2 text-sm`}>
                <div className="flex flex-wrap gap-2 items-center">
                  <code className="text-xs text-slate-500" dir="ltr">{c.id}</code>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800">{STATUS_LABELS[c.status]}</span>
                  {c.review?.aiGenerated && <span className="text-xs px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-200">مولّد بالذكاء الاصطناعي — يلزم التحقق من الحقائق والمصادر</span>}
                </div>
                <p className="text-white">{c.prompt}</p>
                <p className="text-slate-400">الإجابة: {describeCorrectAnswer(c)}</p>
                <p className="text-slate-400">المصادر: {(c.sources ?? []).map((s) => s.title).join('، ') || 'لا يوجد'}</p>
                {issues.map((i, k) => (
                  <p key={k} className={i.level === 'error' ? 'text-rose-300 text-xs' : 'text-amber-300 text-xs'}>{i.message}</p>
                ))}
                <div className="flex gap-2">
                  <button className={btnPrimary} onClick={() => setStatus(c, 'published')} disabled={issues.some((i) => i.level === 'error')}>اعتماد ونشر</button>
                  <button className={btnGhost} onClick={() => { setEditing({ c, isNew: false }); setTab('questions'); }}>تعديل</button>
                  <button className={btnGhost} onClick={() => setStatus(c, 'draft')}>إرجاع كمسودة</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {tab === 'import' && (
        <div className={`${box} flex flex-col gap-3 text-sm`}>
          <p className="text-slate-300">
            تُستورد الدفعة كاملة أو تُرفض كاملة. يُتحقق من البنية، وتفرد المعرفات، ووجود الإجابات والتصنيف، ثم تُضاف بحالة «قيد المراجعة» ولا تُنشر تلقائيًا.
          </p>
          <div className="flex gap-2 items-center flex-wrap">
            <select className={`${input} w-auto`} value={importFormat} onChange={(e) => setImportFormat(e.target.value as 'json' | 'csv')} aria-label="صيغة الدفعة">
              <option value="json">JSON (حزمة أو قائمة أسئلة)</option>
              <option value="csv">CSV (أسئلة اختيار/صح وخطأ/نص/رقم)</option>
            </select>
            <input
              type="file"
              accept=".json,.csv"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setImportFormat(f.name.endsWith('.csv') ? 'csv' : 'json');
                setImportText(await f.text());
              }}
            />
          </div>
          {importFormat === 'csv' && <code className="text-xs text-slate-400" dir="ltr">{CSV_COLUMNS.join(',')}</code>}
          <textarea className={`${input} font-mono h-64`} dir="ltr" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="الصق محتوى الدفعة هنا" />
          <button className={`${btnPrimary} self-start`} disabled={!importText.trim()} onClick={runImport}>تحقق واستورد</button>
          {importMsg && (
            <ul className={importMsg.ok ? 'text-emerald-300' : 'text-rose-300'}>
              {importMsg.lines.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          )}
        </div>
      )}

      {tab === 'validate' && (
        <div className={`${box} flex flex-col gap-2 text-sm`}>
          <p className={report.errors.length ? 'text-rose-300 font-bold' : 'text-emerald-300 font-bold'}>
            {report.errors.length ? `${report.errors.length} خطأ يمنع النشر` : 'لا توجد أخطاء تمنع النشر'}
          </p>
          {report.errors.map((e, i) => (
            <p key={`e${i}`} className="text-rose-300">[{e.code}] {e.ref} — {e.message}</p>
          ))}
          {report.warnings.map((w, i) => (
            <p key={`w${i}`} className="text-amber-300">[{w.code}] {w.ref} — {w.message}</p>
          ))}
          <p className="text-slate-400 mt-2">حسب الآلية: {Object.entries(report.stats.byKind).map(([k, v]) => `${KIND_LABELS[k as ChallengeKind] ?? k}: ${v}`).join('، ')}</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// المراحل والمجموعات
// ---------------------------------------------------------------------------
function StagesPanel({
  worlds,
  groups,
  stages,
  challenges,
  playable,
  errors,
  onSaveStage,
  onAddGroup,
}: {
  worlds: ContentPack['worlds'];
  groups: GroupDef[];
  stages: StageDef[];
  challenges: Challenge[];
  playable: Set<string>;
  errors: { ref?: string; message: string }[];
  onSaveStage: (s: StageDef) => void;
  onAddGroup: (g: GroupDef) => void;
}) {
  const [editing, setEditing] = useState<StageDef | null>(null);
  const [groupForm, setGroupForm] = useState<GroupDef | null>(null);

  const newStage = (g: GroupDef): StageDef => ({
    id: `s_new_${Date.now().toString(36)}`,
    title: '',
    worldId: g.worldId,
    groupId: g.id,
    order: stages.filter((s) => s.groupId === g.id).length + 1,
    type: g.stageType,
    difficulty: 'easy',
    completionPoints: 20,
    completionCoins: 10,
    challengeIds: [],
    completion: { minSolved: 1 },
    status: 'draft',
  });

  if (editing) {
    const allowed = ALLOWED_KINDS[editing.type];
    const usable = challenges.filter((c) => allowed.includes(c.kind));
    return (
      <div className={`${box} flex flex-col gap-3 text-sm`}>
        <h3 className="font-bold">{editing.title || 'مرحلة جديدة'}</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1">المعرف<input className={input} dir="ltr" value={editing.id} onChange={(e) => setEditing({ ...editing, id: e.target.value.trim() })} /></label>
          <label className="flex flex-col gap-1">الاسم<input className={input} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
          <label className="flex flex-col gap-1">
            الحالة
            <select className={input} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as PublishStatus })}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 md:col-span-3">الوصف (اختياري)<input className={input} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value || undefined })} /></label>
          <label className="flex flex-col gap-1">
            الصعوبة
            <select className={input} value={editing.difficulty} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value as ContentDifficulty })}>
              {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">نقاط الإكمال<input className={input} type="number" value={editing.completionPoints} onChange={(e) => setEditing({ ...editing, completionPoints: Number(e.target.value) })} /></label>
          <label className="flex flex-col gap-1">عملات الإكمال<input className={input} type="number" value={editing.completionCoins} onChange={(e) => setEditing({ ...editing, completionCoins: Number(e.target.value) })} /></label>
          <label className="flex flex-col gap-1">الحد الأدنى للحل<input className={input} type="number" min={1} value={editing.completion.minSolved ?? editing.challengeIds.length} onChange={(e) => setEditing({ ...editing, completion: { ...editing.completion, minSolved: Number(e.target.value) } })} /></label>
          <label className="flex flex-col gap-1">أقصى أخطاء (فارغ = بلا حد)<input className={input} type="number" min={0} value={editing.completion.maxMistakes ?? ''} onChange={(e) => setEditing({ ...editing, completion: { ...editing.completion, maxMistakes: e.target.value === '' ? undefined : Number(e.target.value) } })} /></label>
        </div>
        <fieldset className="flex flex-col gap-1 max-h-72 overflow-auto rounded-lg border border-slate-800 p-2">
          <legend>التحديات (المسموح لنمط «{STAGE_TYPE_LABELS[editing.type]}»: {allowed.map((k) => KIND_LABELS[k]).join('، ')})</legend>
          {usable.map((c) => (
            <label key={c.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.challengeIds.includes(c.id)}
                onChange={(e) =>
                  setEditing({ ...editing, challengeIds: e.target.checked ? [...editing.challengeIds, c.id] : editing.challengeIds.filter((x) => x !== c.id) })
                }
              />
              <code className="text-xs text-slate-500" dir="ltr">{c.id}</code> {c.prompt.slice(0, 80)} <span className="text-xs text-slate-500">({STATUS_LABELS[c.status]})</span>
            </label>
          ))}
        </fieldset>
        <p className="text-xs text-slate-400">لا تُعرض المرحلة للاعبين إلا إذا كانت منشورة وكل تحدياتها منشورة وصالحة. المرحلة الفارغة لا تظهر أبدًا.</p>
        <div className="flex gap-2">
          <button className={btnPrimary} onClick={() => { onSaveStage(editing); setEditing(null); }} disabled={!editing.id || !editing.title}>حفظ</button>
          <button className={btnGhost} onClick={() => setEditing(null)}>إلغاء</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groupForm ? (
        <div className={`${box} grid md:grid-cols-4 gap-2 text-sm`}>
          <label className="flex flex-col gap-1">المعرف<input className={input} dir="ltr" value={groupForm.id} onChange={(e) => setGroupForm({ ...groupForm, id: e.target.value.trim() })} /></label>
          <label className="flex flex-col gap-1">الاسم<input className={input} value={groupForm.title} onChange={(e) => setGroupForm({ ...groupForm, title: e.target.value })} /></label>
          <label className="flex flex-col gap-1">
            العالم
            <select className={input} value={groupForm.worldId} onChange={(e) => setGroupForm({ ...groupForm, worldId: e.target.value })}>
              {worlds.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            نمط المراحل
            <select className={input} value={groupForm.stageType} onChange={(e) => setGroupForm({ ...groupForm, stageType: e.target.value as StageType })}>
              {Object.entries(STAGE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="md:col-span-4 flex gap-2">
            <button className={btnPrimary} disabled={!groupForm.id || !groupForm.title || groups.some((g) => g.id === groupForm.id)} onClick={() => { onAddGroup(groupForm); setGroupForm(null); }}>إضافة المجموعة</button>
            <button className={btnGhost} onClick={() => setGroupForm(null)}>إلغاء</button>
          </div>
        </div>
      ) : (
        <button
          className={`${btnGhost} self-start`}
          onClick={() => setGroupForm({ id: `g_new_${Date.now().toString(36)}`, worldId: worlds[0]?.id ?? '', title: '', order: groups.length + 1, icon: 'Sparkles', stageType: 'general' })}
        >
          مجموعة جديدة
        </button>
      )}
      {worlds.map((w) => (
        <section key={w.id} className={box}>
          <h3 className="font-bold text-lg mb-2">{w.title} <code className="text-xs text-slate-500" dir="ltr">{w.id}</code></h3>
          <div className="flex flex-col gap-3">
            {groups.filter((g) => g.worldId === w.id).sort((a, b) => a.order - b.order).map((g) => (
              <div key={g.id} className="rounded-lg border border-slate-800 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <strong>{g.title}</strong>
                  <span className="text-xs text-slate-400">{STAGE_TYPE_LABELS[g.stageType]}</span>
                  <button className={`${btnGhost} ms-auto text-xs`} onClick={() => setEditing(newStage(g))}>مرحلة جديدة</button>
                </div>
                <ul className="flex flex-col gap-1 text-sm">
                  {stages.filter((s) => s.groupId === g.id).sort((a, b) => a.order - b.order).map((s) => (
                    <li key={s.id} className="flex items-center gap-2 flex-wrap">
                      <span className="font-num text-slate-500">{s.order}.</span>
                      <span>{s.title}</span>
                      <span className="text-xs text-slate-400 font-num">{s.challengeIds.length} تحديات</span>
                      <span className={`text-xs ${playable.has(s.id) ? 'text-emerald-300' : 'text-amber-300'}`}>{playable.has(s.id) ? 'قابلة للعب' : `غير معروضة (${STATUS_LABELS[s.status]})`}</span>
                      {errors.filter((e) => e.ref === s.id).map((e, i) => <span key={i} className="text-xs text-rose-300">{e.message}</span>)}
                      <button className={`${btnGhost} ms-auto text-xs`} onClick={() => setEditing(s)}>تعديل</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
