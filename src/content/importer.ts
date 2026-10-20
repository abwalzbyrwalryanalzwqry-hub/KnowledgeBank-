/**
 * استيراد وتصدير المحتوى (JSON وCSV) — منطق نقي مشترك بين سطر الأوامر واستوديو المحتوى والاختبارات.
 */
import type { Challenge, ContentPack, MatchRules, StageDef, PublishStatus } from './types.ts';
import { validatePacks, validateChallenge, type ValidationReport } from './validate.ts';

/**
 * سياسة الحالة عند الاستيراد: لا يمكن لملف أن ينشر نفسه.
 * حالة «منشور» في الملف تُخفَّض إلى الحالة الافتراضية (مراجعة) ما لم يُطلب النشر صراحةً (--status published).
 */
export function importStatus(fileStatus: unknown, defaultStatus: PublishStatus): PublishStatus {
  const st = typeof fileStatus === 'string' ? (fileStatus as PublishStatus) : undefined;
  if (!st || !['draft', 'review', 'published', 'archived'].includes(st)) return defaultStatus;
  if (st === 'published' && defaultStatus !== 'published') return defaultStatus;
  return st;
}

// ---------------------------------------------------------------------------
// CSV (RFC 4180 مبسط: فواصل، علامات اقتباس مزدوجة، أسطر داخل الحقول)
// ---------------------------------------------------------------------------

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

function csvEscape(v: unknown): string {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_COLUMNS = [
  'id', 'kind', 'prompt', 'answer', 'options', 'correctIndex', 'acceptedAnswers', 'hints', 'explanation',
  'category', 'difficulty', 'points', 'unit', 'sourceTitle', 'sourceUrl', 'lastReviewed', 'status', 'matchRules', 'tags',
] as const;

const LIST_SEP = '|';
const splitList = (s: string | undefined) => (s ?? '').split(LIST_SEP).map((x) => x.trim()).filter(Boolean);
const MATCH_FLAGS: Array<keyof MatchRules> = [
  'ignoreDiacritics', 'ignoreTatweel', 'ignorePunctuation', 'normalizeDigits', 'foldAlef', 'foldTaMarbuta',
  'foldYa', 'foldHamzaSeats', 'ignoreDefiniteArticle', 'ignoreSpaces',
];

export interface ImportProblem {
  row?: number;
  message: string;
}

/** تحويل CSV إلى تحديات. يدعم الأنواع البسيطة: mcq وtruefalse وtext وnumber. */
export function challengesFromCsv(csv: string, defaultStatus: PublishStatus = 'review'): { challenges: Challenge[]; problems: ImportProblem[] } {
  const rows = parseCsv(csv);
  const problems: ImportProblem[] = [];
  if (rows.length === 0) return { challenges: [], problems: [{ message: 'ملف CSV فارغ' }] };
  const header = rows[0].map((h) => h.trim());
  for (const req of ['id', 'kind', 'prompt']) if (!header.includes(req)) problems.push({ message: `العمود المطلوب "${req}" غير موجود` });
  if (problems.length) return { challenges: [], problems };
  const col = (r: string[], name: string) => {
    const i = header.indexOf(name);
    return i >= 0 ? (r[i] ?? '').trim() : '';
  };
  const out: Challenge[] = [];
  rows.slice(1).forEach((r, idx) => {
    const rowNo = idx + 2;
    const kind = col(r, 'kind');
    const difficulty = (col(r, 'difficulty') || 'easy') as Challenge['difficulty'];
    const pointsRaw = col(r, 'points');
    const base: any = {
      id: col(r, 'id'),
      kind,
      prompt: col(r, 'prompt'),
      category: col(r, 'category') || 'general',
      difficulty,
      points: pointsRaw ? Number(pointsRaw) : { easy: 10, medium: 15, hard: 25, expert: 40 }[difficulty] ?? 10,
      hints: splitList(col(r, 'hints')),
      status: importStatus(col(r, 'status'), defaultStatus),
    };
    const expl = col(r, 'explanation');
    if (expl) base.explanation = expl;
    const st = col(r, 'sourceTitle');
    const su = col(r, 'sourceUrl');
    if (st || su) base.sources = [{ title: st || su, ...(su ? { url: su } : {}) }];
    const lr = col(r, 'lastReviewed');
    if (lr) base.lastReviewed = lr;
    const tags = splitList(col(r, 'tags'));
    if (tags.length) base.tags = tags;
    const flags = col(r, 'matchRules').split(/[;|]/).map((x) => x.trim()).filter(Boolean);
    const match: MatchRules = {};
    for (const f of flags) {
      if ((MATCH_FLAGS as string[]).includes(f)) (match as any)[f] = true;
      else if (f.startsWith('numericTolerance=')) match.numericTolerance = Number(f.split('=')[1]);
      else problems.push({ row: rowNo, message: `قاعدة مطابقة غير معروفة: ${f}` });
    }
    const answer = col(r, 'answer');
    switch (kind) {
      case 'mcq': {
        base.options = splitList(col(r, 'options'));
        const ci = col(r, 'correctIndex');
        if (ci !== '') base.correctIndex = Number(ci);
        else base.correctIndex = base.options.indexOf(answer);
        break;
      }
      case 'truefalse': {
        const a = answer.toLowerCase();
        if (['true', 'صح', 'صحيح', '1', 'نعم'].includes(a)) base.answer = true;
        else if (['false', 'خطأ', 'خطا', '0', 'لا'].includes(a)) base.answer = false;
        else problems.push({ row: rowNo, message: `إجابة صح/خطأ غير مفهومة: "${answer}"` });
        break;
      }
      case 'text': {
        base.answer = answer;
        const acc = splitList(col(r, 'acceptedAnswers'));
        if (acc.length) base.acceptedAnswers = acc;
        if (Object.keys(match).length) base.match = match;
        break;
      }
      case 'number': {
        const n = Number(answer.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)));
        if (!Number.isFinite(n) || answer === '') problems.push({ row: rowNo, message: `إجابة رقمية غير صالحة: "${answer}"` });
        base.answer = n;
        const unit = col(r, 'unit');
        if (unit) base.unit = unit;
        if (match.numericTolerance !== undefined) base.match = { numericTolerance: match.numericTolerance };
        break;
      }
      default:
        problems.push({ row: rowNo, message: `النوع "${kind}" غير مدعوم في CSV (استخدم JSON للأنواع المركبة)` });
        return;
    }
    for (const issue of validateChallenge(base as Challenge)) {
      if (issue.level === 'error') problems.push({ row: rowNo, message: `${base.id || 'بلا معرف'}: ${issue.message}` });
    }
    out.push(base as Challenge);
  });
  return { challenges: out, problems };
}

export function challengesToCsv(challenges: Challenge[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const c of challenges) {
    if (!['mcq', 'truefalse', 'text', 'number'].includes(c.kind)) continue;
    const anyC = c as any;
    const match: MatchRules | undefined = anyC.match;
    const flags = match
      ? [
          ...MATCH_FLAGS.filter((f) => (match as any)[f] === true),
          ...(match.numericTolerance ? [`numericTolerance=${match.numericTolerance}`] : []),
        ].join(';')
      : '';
    const row: Record<string, unknown> = {
      id: c.id,
      kind: c.kind,
      prompt: c.prompt,
      answer: c.kind === 'mcq' ? c.options[c.correctIndex] : c.kind === 'truefalse' ? (c.answer ? 'true' : 'false') : anyC.answer,
      options: c.kind === 'mcq' ? c.options.join(LIST_SEP) : '',
      correctIndex: c.kind === 'mcq' ? c.correctIndex : '',
      acceptedAnswers: (anyC.acceptedAnswers || []).join(LIST_SEP),
      hints: c.hints.join(LIST_SEP),
      explanation: c.explanation ?? '',
      category: c.category,
      difficulty: c.difficulty,
      points: c.points,
      unit: anyC.unit ?? '',
      sourceTitle: c.sources?.[0]?.title ?? '',
      sourceUrl: c.sources?.[0]?.url ?? '',
      lastReviewed: c.lastReviewed ?? '',
      status: c.status,
      matchRules: flags,
      tags: (c.tags || []).join(LIST_SEP),
    };
    lines.push(CSV_COLUMNS.map((k) => csvEscape(row[k])).join(','));
  }
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/** يقبل: حزمة كاملة، أو {challenges, stages}، أو مصفوفة تحديات. */
export function parseJsonImport(raw: string, defaultStatus: PublishStatus = 'review'): { challenges: Challenge[]; stages: StageDef[]; pack?: ContentPack; problems: ImportProblem[] } {
  let data: any;
  try {
    data = JSON.parse(raw.replace(/^\uFEFF/, ''));
  } catch (e) {
    return { challenges: [], stages: [], problems: [{ message: `JSON غير صالح: ${(e as Error).message}` }] };
  }
  const withStatus = <T extends { status?: PublishStatus }>(x: T): T => ({ ...x, status: importStatus(x.status, defaultStatus) });
  if (Array.isArray(data)) return { challenges: data.map(withStatus), stages: [], problems: [] };
  if (data && typeof data === 'object') {
    const challenges = Array.isArray(data.challenges) ? data.challenges.map(withStatus) : [];
    const stages = Array.isArray(data.stages) ? data.stages.map(withStatus) : [];
    const isPack = typeof data.packId === 'string' && Array.isArray(data.worlds) && Array.isArray(data.groups);
    if (!challenges.length && !stages.length && !isPack) return { challenges: [], stages: [], problems: [{ message: 'لم يُعثر على challenges أو stages في الملف' }] };
    return { challenges, stages, pack: isPack ? { ...data, challenges, stages } : undefined, problems: [] };
  }
  return { challenges: [], stages: [], problems: [{ message: 'بنية JSON غير مدعومة' }] };
}

export interface MergeResult {
  ok: boolean;
  packs: ContentPack[];
  report: ValidationReport;
  problems: ImportProblem[];
  added: { challenges: number; stages: number };
}

/**
 * دمج دفعة جديدة في حزمة هدف مع منع تكرار المعرفات والتحقق الكامل.
 * لا يكتب شيئًا إن وُجدت أخطاء: الدمج «كل شيء أو لا شيء».
 */
export function mergeBatch(
  packs: ContentPack[],
  targetPackId: string,
  batch: { challenges: Challenge[]; stages: StageDef[]; pack?: ContentPack },
  opts: { newPackTemplate?: Partial<ContentPack> } = {}
): MergeResult {
  const problems: ImportProblem[] = [];
  const existingChallengeIds = new Set(packs.flatMap((p) => p.challenges.map((c) => c.id)));
  const existingStageIds = new Set(packs.flatMap((p) => p.stages.map((s) => s.id)));
  const batchIds = new Set<string>();
  for (const c of batch.challenges) {
    if (existingChallengeIds.has(c.id)) problems.push({ message: `معرف السؤال ${c.id} موجود مسبقًا` });
    if (batchIds.has(c.id)) problems.push({ message: `معرف السؤال ${c.id} مكرر داخل الدفعة` });
    batchIds.add(c.id);
  }
  for (const s of batch.stages) {
    if (existingStageIds.has(s.id)) problems.push({ message: `معرف المرحلة ${s.id} موجود مسبقًا` });
  }
  let next: ContentPack[];
  const target = packs.find((p) => p.packId === targetPackId);
  if (target) {
    next = packs.map((p) =>
      p.packId === targetPackId
        ? {
            ...p,
            worlds: [...p.worlds, ...(batch.pack?.worlds ?? [])],
            groups: [...p.groups, ...(batch.pack?.groups ?? [])],
            stages: [...p.stages, ...batch.stages],
            challenges: [...p.challenges, ...batch.challenges],
          }
        : p
    );
  } else {
    next = [
      ...packs,
      {
        packId: targetPackId,
        version: 1,
        worlds: batch.pack?.worlds ?? opts.newPackTemplate?.worlds ?? [],
        groups: batch.pack?.groups ?? opts.newPackTemplate?.groups ?? [],
        stages: batch.stages,
        challenges: batch.challenges,
      },
    ];
  }
  const report = validatePacks(next);
  // نعتبر فقط الأخطاء الجديدة (الأخطاء السابقة لا تمنع الاستيراد لكنها تُعرض)
  const before = validatePacks(packs);
  const beforeKeys = new Set(before.errors.map((e) => `${e.code}|${e.ref}|${e.message}`));
  const newErrors = report.errors.filter((e) => !beforeKeys.has(`${e.code}|${e.ref}|${e.message}`));
  for (const e of newErrors) problems.push({ message: `${e.ref ? `[${e.ref}] ` : ''}${e.message}` });
  return {
    ok: problems.length === 0,
    packs: problems.length === 0 ? next : packs,
    report,
    problems,
    added: { challenges: batch.challenges.length, stages: batch.stages.length },
  };
}
