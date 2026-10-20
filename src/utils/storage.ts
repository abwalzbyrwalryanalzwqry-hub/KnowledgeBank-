import { PlayerStats, GameSettings, Badge } from '../types/game';
import { calculateRank } from '../game/rules';

const STATS_KEY = 'horizon_knowledge_stats_v1';
const SETTINGS_KEY = 'horizon_knowledge_settings_v1';

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
};

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  ambientMusic: false,
  speechEnabled: false,
  fontSize: 'normal',
  highContrast: false,
  autoAdvanceDelayMs: 1200,
};

export function loadPlayerStats(): PlayerStats {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw);
    const rank = calculateRank(parsed.xp || 0);
    return {
      ...DEFAULT_STATS,
      ...parsed,
      level: rank.level,
      rankTitle: rank.title,
    };
  } catch {
    return DEFAULT_STATS;
  }
}

export function savePlayerStats(stats: PlayerStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export function loadGameSettings(): GameSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveGameSettings(settings: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}
