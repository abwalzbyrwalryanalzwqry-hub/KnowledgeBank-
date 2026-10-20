import { PlayerStats, GameSettings, Badge } from '../types/game';
import { calculateRank } from '../game/rules';
import { sanitizeProgress } from '../content/progress';

/**
 * التخزين المحلي للاعب.
 * - المفتاح نفسه المستخدم سابقًا (horizon_knowledge_stats_v1) حتى لا يُفقد أي تقدم قديم.
 * - التحقق من صحة البيانات عند الاستعادة: الحقول التالفة تُستبدل بالقيم الافتراضية دون مسح البقية.
 * - إن كانت البيانات غير قابلة للقراءة إطلاقًا، تُحفظ نسخة احتياطية منها قبل البدء من جديد.
 * - commitStats يقرأ أحدث نسخة من التخزين قبل التعديل، فلا تكتب علامة تبويب قديمة فوق تقدم أحدث.
 */
const STATS_KEY = 'horizon_knowledge_stats_v1';
const SETTINGS_KEY = 'horizon_knowledge_settings_v1';
const BACKUP_KEY = 'horizon_knowledge_stats_corrupt_backup';
export const STATS_SCHEMA_VERSION = 2;

export const INITIAL_BADGES: Badge[] = [
  { id: 'first_win', title: 'شرارة البداية', description: 'أكمل أول مرحلة بنجاح في رحلة العصور', icon: 'Sparkle', unlocked: false },
  { id: 'perfect_3_stars', title: 'عبقرية مطلقة', description: 'احصل على 3 نجوم في أي مرحلة', icon: 'Star', unlocked: false },
  { id: 'streak_5', title: 'سلسلة البصيرة', description: 'أجب عن 5 أسئلة متتالية بشكل صحيح دون خطأ', icon: 'Flame', unlocked: false },
  { id: 'streak_10', title: 'إعصار المعرفة', description: 'أجب عن 10 أسئلة متتالية بدون خطأ', icon: 'Zap', unlocked: false },
  { id: 'tower_5', title: 'صاعد البرج', description: 'تجاوز محطة الأمان الأولى (25,000 نقطة) في برج العباقرة', icon: 'Shield', unlocked: false },
  { id: 'tower_10', title: 'نخبة البرج', description: 'تجاوز محطة الأمان الثانية (250,000 نقطة) في برج العباقرة', icon: 'Crown', unlocked: false },
  { id: 'tower_millionaire', title: 'سيد المليون', description: 'تربّع على قمة برج العباقرة وحقق المليون نقطة', icon: 'Gem', unlocked: false },
  { id: 'blitz_survivor', title: 'نبض لا ينكسر', description: 'تجاوز 1,000 نقطة في طور سرعة النبض', icon: 'Timer', unlocked: false },
  { id: 'ai_conqueror', title: 'قاهر الذكاء الاصطناعي', description: 'انتصر على المنافس الاصطناعي في مبارزة النواة', icon: 'Bot', unlocked: false },
  { id: 'ancient_master', title: 'حكيم الأهرامات', description: 'اهزم زعيم العصور القديمة في رحلة العصور', icon: 'Pyramid', unlocked: false },
  { id: 'islamic_master', title: 'عالم بيت الحكمة', description: 'اهزم زعيم العصر الذهبي الإسلامي', icon: 'BookOpen', unlocked: false },
  { id: 'future_master', title: 'إمبراطور الكوانتم', description: 'أكمل جميع مراحل عصر المستقبل بنجاح', icon: 'Atom', unlocked: false },
];

export const DEFAULT_STATS: PlayerStats = {
  xp: 0,
  level: 1,
  rankTitle: 'مستكشف المعرفة',
  totalGames: 0,
  totalCorrect: 0,
  totalAnswered: 0,
  highestStreak: 0,
  towerRecord: 0,
  blitzRecord: 0,
  eraStars: {},
  unlockedStages: ['stage_anc_1'],
  badges: [],
  dailyStreak: 0,
  // Zaytouna Progression & Economy
  coins: 100,
  hearts: 5,
  completedLevels: {},
  claimedChests: [],
  horizon: undefined,
  rewardLedger: {},
  schemaVersion: STATS_SCHEMA_VERSION,
};

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  ambientMusic: false,
  speechEnabled: false,
  fontSize: 'normal',
  highContrast: false,
  autoAdvanceDelayMs: 1200,
};

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const nonNeg = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
const strArr = (v: unknown, d: string[]) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : d);

/** تنظيف بيانات اللاعب المستعادة حقلًا حقلًا. */
export function sanitizeStats(parsed: unknown): PlayerStats {
  if (!isObj(parsed)) return { ...DEFAULT_STATS, horizon: sanitizeProgress(undefined) };
  const completedLevels: PlayerStats['completedLevels'] = {};
  if (isObj(parsed.completedLevels)) {
    for (const [k, v] of Object.entries(parsed.completedLevels)) {
      if (isObj(v)) completedLevels[k] = { stars: nonNeg(v.stars, 0), score: nonNeg(v.score, 0) };
    }
  }
  const eraStars: Record<string, number> = {};
  if (isObj(parsed.eraStars)) for (const [k, v] of Object.entries(parsed.eraStars)) if (typeof v === 'number') eraStars[k] = v;
  const ledger: Record<string, string> = {};
  if (isObj(parsed.rewardLedger)) for (const [k, v] of Object.entries(parsed.rewardLedger)) if (typeof v === 'string') ledger[k] = v;
  const xp = nonNeg(parsed.xp, 0);
  const rank = calculateRank(xp);
  return {
    ...DEFAULT_STATS,
    xp,
    level: rank.level,
    rankTitle: rank.title,
    totalGames: nonNeg(parsed.totalGames, 0),
    totalCorrect: nonNeg(parsed.totalCorrect, 0),
    totalAnswered: nonNeg(parsed.totalAnswered, 0),
    highestStreak: nonNeg(parsed.highestStreak, 0),
    towerRecord: nonNeg(parsed.towerRecord, 0),
    blitzRecord: nonNeg(parsed.blitzRecord, 0),
    eraStars,
    unlockedStages: strArr(parsed.unlockedStages, DEFAULT_STATS.unlockedStages),
    badges: strArr(parsed.badges, []),
    lastDailyDate: typeof parsed.lastDailyDate === 'string' ? parsed.lastDailyDate : undefined,
    dailyStreak: nonNeg(parsed.dailyStreak, 0),
    coins: nonNeg(parsed.coins, DEFAULT_STATS.coins),
    hearts: Math.min(5, nonNeg(parsed.hearts, DEFAULT_STATS.hearts)),
    completedLevels,
    claimedChests: strArr(parsed.claimedChests, []),
    horizon: sanitizeProgress(parsed.horizon),
    rewardLedger: ledger,
    schemaVersion: STATS_SCHEMA_VERSION,
  };
}

function storageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export function loadPlayerStats(): PlayerStats {
  if (!storageAvailable()) return sanitizeStats(undefined);
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STATS_KEY);
  } catch {
    return sanitizeStats(undefined);
  }
  if (!raw) return sanitizeStats(undefined);
  try {
    return sanitizeStats(JSON.parse(raw));
  } catch {
    // بيانات تالفة: احتفظ بنسخة منها بدل محوها بصمت
    try {
      localStorage.setItem(BACKUP_KEY, raw);
    } catch {}
    return sanitizeStats(undefined);
  }
}

let lastSaveError: string | null = null;
export const getLastSaveError = () => lastSaveError;

export function savePlayerStats(stats: PlayerStats): boolean {
  if (!storageAvailable()) return false;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify({ ...stats, schemaVersion: STATS_SCHEMA_VERSION }));
    lastSaveError = null;
    return true;
  } catch (e) {
    lastSaveError = (e as Error)?.message || 'تعذر الحفظ';
    return false;
  }
}

/**
 * تعديل ذري: يقرأ آخر نسخة محفوظة، يطبق التعديل، يحفظ، ويعيد النتيجة.
 * يمنع فقدان التقدم عند فتح اللعبة في أكثر من تبويب.
 */
export function commitStats(updater: (prev: PlayerStats) => PlayerStats): PlayerStats {
  const fresh = loadPlayerStats();
  const next = updater(fresh);
  const rank = calculateRank(next.xp);
  const updated = { ...next, level: rank.level, rankTitle: rank.title };
  savePlayerStats(updated);
  return updated;
}

export function onStatsChangedElsewhere(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === STATS_KEY) cb();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export function loadGameSettings(): GameSettings {
  if (!storageAvailable()) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveGameSettings(settings: GameSettings): void {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}
