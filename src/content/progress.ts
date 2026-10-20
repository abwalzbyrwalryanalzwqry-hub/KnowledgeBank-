/**
 * تقدم اللاعب في نظام «العوالم ← المجموعات ← المراحل».
 * كل الدوال هنا نقية (لا تلمس التخزين) ليسهل اختبارها.
 * التقدم مفهرس بالمعرفات الثابتة فقط، ولا ينسخ أي جزء من تعريفات المحتوى؛
 * لذلك تحديث المحتوى لا يمحو التقدم السابق.
 *
 * منع تكرار المكافآت: كل مكافأة لها مفتاح فريد في `ledger`. تطبيق المكافأة نفسها مرتين لا يغير شيئًا،
 * سواء بسبب تحديث الصفحة أو النقر المزدوج أو تكرار الطلب.
 */
import type { Challenge, StageDef, ContentManifest, StageIndexEntry } from './types.ts';
export type { StageIndexEntry };

export const HORIZON_PROGRESS_VERSION = 1;

export interface StageProgress {
  completed: boolean;
  bestStars: number;
  bestScore: number;
  plays: number;
  firstCompletedAt?: string;
  lastPlayedAt?: string;
}

export interface HorizonProgress {
  version: number;
  points: number;
  coinsEarned: number;
  stages: Record<string, StageProgress>;
  /** التحديات المحلولة (تمنح نقاطها مرة واحدة فقط على الإطلاق). */
  solved: Record<string, { points: number; at: string }>;
  /** عدد التلميحات المكشوفة لكل تحدٍ لم يُحل بعد في المحاولة الأولى. */
  hintsRevealed: Record<string, number>;
  /** محاولات خاطئة سابقة لكل تحدٍ لم يُحل (لحساب النقاط بعدل حتى بعد تحديث الصفحة). */
  wrongAttempts: Record<string, number>;
  /** مفاتيح المكافآت الممنوحة. */
  ledger: Record<string, string>;
  /** عوالم فُتحت سابقًا (تبقى مفتوحة حتى لو أضيف محتوى جديد للعالم السابق). */
  unlockedWorlds: string[];
  achievements: string[];
  counters: { correct: number; wrong: number; hintsUsed: number; stagesCompleted: number; replays: number; perfectStages: number };
}

export function createEmptyProgress(): HorizonProgress {
  return {
    version: HORIZON_PROGRESS_VERSION,
    points: 0,
    coinsEarned: 0,
    stages: {},
    solved: {},
    hintsRevealed: {},
    wrongAttempts: {},
    ledger: {},
    unlockedWorlds: [],
    achievements: [],
    counters: { correct: 0, wrong: 0, hintsUsed: 0, stagesCompleted: 0, replays: 0, perfectStages: 0 },
  };
}

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);

/** استعادة آمنة: تقبل بيانات ناقصة أو تالفة جزئيًا دون فقدان الأجزاء السليمة. */
export function sanitizeProgress(raw: unknown): HorizonProgress {
  const base = createEmptyProgress();
  if (!isObj(raw)) return base;
  const out: HorizonProgress = {
    ...base,
    points: Math.max(0, num(raw.points)),
    coinsEarned: Math.max(0, num(raw.coinsEarned)),
    stages: {},
    solved: {},
    hintsRevealed: {},
    wrongAttempts: {},
    ledger: {},
    unlockedWorlds: Array.isArray(raw.unlockedWorlds) ? raw.unlockedWorlds.filter((x: unknown) => typeof x === 'string') : [],
    achievements: Array.isArray(raw.achievements) ? raw.achievements.filter((x: unknown) => typeof x === 'string') : [],
    counters: { ...base.counters },
  };
  if (isObj(raw.stages)) {
    for (const [k, v] of Object.entries(raw.stages)) {
      if (!isObj(v)) continue;
      out.stages[k] = {
        completed: v.completed === true,
        bestStars: Math.min(3, Math.max(0, num(v.bestStars))),
        bestScore: Math.max(0, num(v.bestScore)),
        plays: Math.max(0, num(v.plays)),
        firstCompletedAt: typeof v.firstCompletedAt === 'string' ? v.firstCompletedAt : undefined,
        lastPlayedAt: typeof v.lastPlayedAt === 'string' ? v.lastPlayedAt : undefined,
      };
    }
  }
  if (isObj(raw.solved)) {
    for (const [k, v] of Object.entries(raw.solved)) {
      if (isObj(v)) out.solved[k] = { points: Math.max(0, num(v.points)), at: typeof v.at === 'string' ? v.at : '' };
    }
  }
  for (const key of ['hintsRevealed', 'wrongAttempts'] as const) {
    if (isObj(raw[key])) for (const [k, v] of Object.entries(raw[key])) if (typeof v === 'number' && v >= 0) out[key][k] = Math.floor(v);
  }
  if (isObj(raw.ledger)) for (const [k, v] of Object.entries(raw.ledger)) if (typeof v === 'string') out.ledger[k] = v;
  if (isObj(raw.counters)) for (const k of Object.keys(base.counters) as Array<keyof HorizonProgress['counters']>) out.counters[k] = Math.max(0, num(raw.counters[k]));
  return out;
}

// ---------------------------------------------------------------------------
// قواعد النقاط المعلنة للاعب
// ---------------------------------------------------------------------------

/** كل تلميح أو محاولة خاطئة يخفض نقاط التحدي 25%، بحد أدنى 25% من نقاطه. */
export const PENALTY_STEP = 0.25;
export const MIN_POINTS_RATIO = 0.25;

export function challengePointsFor(basePoints: number, hintsUsed: number, wrongAttempts: number): number {
  const ratio = Math.max(MIN_POINTS_RATIO, 1 - PENALTY_STEP * (hintsUsed + wrongAttempts));
  return Math.max(1, Math.round(basePoints * ratio));
}

/** النجوم: 3 دون أخطاء أو تلميحات، 2 حتى خطأين/تلميحين، 1 لأي إكمال. */
export function starsFor(mistakes: number, hints: number): number {
  const slips = mistakes + hints;
  if (slips === 0) return 3;
  if (slips <= 2) return 2;
  return 1;
}

export interface RewardDelta {
  points: number;
  coins: number;
  newAchievements: string[];
}

const nowIso = () => new Date().toISOString();

/** كشف التلميح التالي. يحفظ العدد فقط (لا يخصم شيئًا من الرصيد). */
export function revealHint(p: HorizonProgress, ch: Challenge): HorizonProgress {
  const current = p.hintsRevealed[ch.id] ?? 0;
  if (current >= ch.hints.length) return p;
  const solvedAlready = Boolean(p.solved[ch.id]);
  return {
    ...p,
    hintsRevealed: { ...p.hintsRevealed, [ch.id]: current + 1 },
    counters: { ...p.counters, hintsUsed: p.counters.hintsUsed + (solvedAlready ? 0 : 1) },
  };
}

export function recordWrong(p: HorizonProgress, ch: Challenge): HorizonProgress {
  return {
    ...p,
    wrongAttempts: p.solved[ch.id] ? p.wrongAttempts : { ...p.wrongAttempts, [ch.id]: (p.wrongAttempts[ch.id] ?? 0) + 1 },
    counters: { ...p.counters, wrong: p.counters.wrong + 1 },
  };
}

/** حل تحدٍ: النقاط تُضاف مرة واحدة فقط لكل تحدٍ. */
export function applyChallengeSolved(p: HorizonProgress, ch: Challenge, at = nowIso()): { progress: HorizonProgress; delta: RewardDelta } {
  const key = `challenge:${ch.id}`;
  const counters = { ...p.counters, correct: p.counters.correct + 1 };
  if (p.ledger[key] || p.solved[ch.id]) {
    return { progress: { ...p, counters }, delta: { points: 0, coins: 0, newAchievements: [] } };
  }
  const pts = challengePointsFor(ch.points, p.hintsRevealed[ch.id] ?? 0, p.wrongAttempts[ch.id] ?? 0);
  const next: HorizonProgress = {
    ...p,
    points: p.points + pts,
    solved: { ...p.solved, [ch.id]: { points: pts, at } },
    ledger: { ...p.ledger, [key]: at },
    counters,
  };
  return { progress: next, delta: { points: pts, coins: 0, newAchievements: [] } };
}

export interface AttemptSummary {
  stageId: string;
  solvedCount: number;
  total: number;
  mistakes: number;
  hints: number;
  score: number;
}

/** إكمال مرحلة: مكافأة الإكمال تُمنح مرة واحدة، والنجوم وأفضل نتيجة تتحسن مع الإعادة. */
export function applyStageCompleted(
  p: HorizonProgress,
  stage: StageDef,
  attempt: AttemptSummary,
  at = nowIso()
): { progress: HorizonProgress; delta: RewardDelta; stars: number; firstTime: boolean } {
  // لا تُحتسب المرحلة مكتملة إن لم يتحقق شرط الإكمال المعلن
  const required = Math.min(attempt.total, stage.completion.minSolved ?? attempt.total);
  if (attempt.solvedCount < required) return { progress: p, delta: { points: 0, coins: 0, newAchievements: [] }, stars: 0, firstTime: false };
  const stars = starsFor(attempt.mistakes, attempt.hints);
  const prev = p.stages[stage.id];
  const key = `stage:${stage.id}`;
  const firstTime = !p.ledger[key];
  let points = 0;
  let coins = 0;
  let next: HorizonProgress = { ...p };
  if (firstTime) {
    points = stage.completionPoints;
    coins = stage.completionCoins;
    next.ledger = { ...next.ledger, [key]: at };
    next.counters = { ...next.counters, stagesCompleted: next.counters.stagesCompleted + 1 };
  } else {
    next.counters = { ...next.counters, replays: next.counters.replays + 1 };
  }
  if (stars === 3 && !(prev?.bestStars === 3)) {
    next.counters = { ...next.counters, perfectStages: next.counters.perfectStages + 1 };
  }
  next.points += points;
  next.coinsEarned += coins;
  next.stages = {
    ...next.stages,
    [stage.id]: {
      completed: true,
      bestStars: Math.max(stars, prev?.bestStars ?? 0),
      bestScore: Math.max(attempt.score + points, prev?.bestScore ?? 0),
      plays: (prev?.plays ?? 0) + 1,
      firstCompletedAt: prev?.firstCompletedAt ?? at,
      lastPlayedAt: at,
    },
  };
  return { progress: next, delta: { points, coins, newAchievements: [] }, stars, firstTime };
}

/** تسجيل بداية لعب مرحلة لم تكتمل بعد (لعدّ المحاولات فقط). */
export function markStageStarted(p: HorizonProgress, stageId: string, at = nowIso()): HorizonProgress {
  const prev = p.stages[stageId];
  return {
    ...p,
    stages: {
      ...p.stages,
      [stageId]: {
        completed: prev?.completed ?? false,
        bestStars: prev?.bestStars ?? 0,
        bestScore: prev?.bestScore ?? 0,
        plays: prev?.plays ?? 0,
        firstCompletedAt: prev?.firstCompletedAt,
        lastPlayedAt: at,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// الإنجازات
// ---------------------------------------------------------------------------

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  coins: number;
  test: (p: HorizonProgress, ctx: { manifest?: ContentManifest }) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'h_first_stage', title: 'أول الغيث', description: 'أكمل أول مرحلة في أفق المعرفة', coins: 10, test: (p) => p.counters.stagesCompleted >= 1 },
  { id: 'h_five_stages', title: 'خطى ثابتة', description: 'أكمل 5 مراحل مختلفة', coins: 25, test: (p) => p.counters.stagesCompleted >= 5 },
  { id: 'h_twenty_stages', title: 'رحالة الأفق', description: 'أكمل 20 مرحلة مختلفة', coins: 60, test: (p) => p.counters.stagesCompleted >= 20 },
  { id: 'h_perfect', title: 'بلا عثرة', description: 'أكمل مرحلة بثلاث نجوم دون خطأ أو تلميح', coins: 20, test: (p) => p.counters.perfectStages >= 1 },
  { id: 'h_perfect_five', title: 'دقة الصقر', description: 'احصل على ثلاث نجوم في 5 مراحل', coins: 50, test: (p) => p.counters.perfectStages >= 5 },
  { id: 'h_correct_50', title: 'خمسون صوابًا', description: 'أجب إجابة صحيحة 50 مرة', coins: 40, test: (p) => p.counters.correct >= 50 },
  { id: 'h_replay', title: 'العود أحمد', description: 'أعد لعب مرحلة مكتملة', coins: 5, test: (p) => p.counters.replays >= 1 },
  { id: 'h_points_500', title: 'خزانة المعرفة', description: 'اجمع 500 نقطة في عوالم الأفق', coins: 30, test: (p) => p.points >= 500 },
  {
    id: 'h_world_complete',
    title: 'فاتح العوالم',
    description: 'أكمل جميع المراحل المنشورة في أي عالم',
    coins: 100,
    test: (p, { manifest }) => !!manifest && manifest.worlds.some((w) => w.playableStageCount > 0 && worldCompletedCount(p, manifest, w.id) >= w.playableStageCount),
  },
];

/** يمنح الإنجازات المستحقة مرة واحدة فقط. */
export function evaluateAchievements(p: HorizonProgress, manifest?: ContentManifest, at = nowIso()): { progress: HorizonProgress; delta: RewardDelta } {
  let next = p;
  const newly: string[] = [];
  let coins = 0;
  for (const a of ACHIEVEMENTS) {
    const key = `achievement:${a.id}`;
    if (next.ledger[key]) continue;
    if (a.test(next, { manifest })) {
      newly.push(a.id);
      coins += a.coins;
      next = {
        ...next,
        ledger: { ...next.ledger, [key]: at },
        achievements: [...next.achievements, a.id],
        coinsEarned: next.coinsEarned + a.coins,
      };
    }
  }
  return { progress: next, delta: { points: 0, coins, newAchievements: newly } };
}

// ---------------------------------------------------------------------------
// الفتح والقفل — مبني على المراحل المنشورة الصالحة فقط (لا أعداد وهمية)
// ---------------------------------------------------------------------------


export function worldCompletedCount(p: HorizonProgress, manifest: ContentManifest, worldId: string): number {
  const idx = manifest.stageIndex;
  return idx.filter((s) => s.worldId === worldId && p.stages[s.id]?.completed).length;
}

export function isWorldUnlocked(
  p: HorizonProgress,
  manifest: ContentManifest,
  worldId: string
): boolean {
  const worlds = manifest.worlds.filter((w) => w.playableStageCount > 0);
  const i = worlds.findIndex((w) => w.id === worldId);
  if (i < 0) return false;
  if (i === 0) return true;
  if (p.unlockedWorlds.includes(worldId)) return true;
  // أي مرحلة مكتملة في هذا العالم تعني أنه كان مفتوحًا
  if (worldCompletedCount(p, manifest, worldId) > 0) return true;
  const prev = worlds[i - 1];
  const need = Math.ceil(prev.playableStageCount * worlds[i].unlockRatio);
  return worldCompletedCount(p, manifest, prev.id) >= need;
}

export function worldUnlockRequirement(
  p: HorizonProgress,
  manifest: ContentManifest,
  worldId: string
): { prevTitle: string; need: number; have: number } | null {
  const worlds = manifest.worlds.filter((w) => w.playableStageCount > 0);
  const i = worlds.findIndex((w) => w.id === worldId);
  if (i <= 0) return null;
  const prev = worlds[i - 1];
  return {
    prevTitle: prev.title,
    need: Math.ceil(prev.playableStageCount * worlds[i].unlockRatio),
    have: worldCompletedCount(p, manifest, prev.id),
  };
}

/** داخل المجموعة: الأولى مفتوحة، وكل مرحلة تُفتح بإكمال التي قبلها. المكتملة تبقى مفتوحة. */
export function isStageUnlocked(p: HorizonProgress, groupStages: StageIndexEntry[], stageId: string): boolean {
  const sorted = [...groupStages].sort((a, b) => a.order - b.order);
  const i = sorted.findIndex((s) => s.id === stageId);
  if (i < 0) return false;
  if (p.stages[stageId]?.completed) return true;
  if (i === 0) return true;
  return Boolean(p.stages[sorted[i - 1].id]?.completed);
}

/** تسجيل فتح العوالم الجديدة حتى تبقى مفتوحة بعد تحديثات المحتوى. */
export function syncUnlockedWorlds(p: HorizonProgress, manifest: ContentManifest): HorizonProgress {
  const add = manifest.worlds
    .filter((w) => w.playableStageCount > 0 && !p.unlockedWorlds.includes(w.id) && isWorldUnlocked(p, manifest, w.id))
    .map((w) => w.id);
  return add.length ? { ...p, unlockedWorlds: [...p.unlockedWorlds, ...add] } : p;
}
