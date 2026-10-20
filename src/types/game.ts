export type CategoryId =
  | 'islamic'        // الحضارة والعلوم الإسلامية
  | 'history'        // التاريخ والآثار والحضارات
  | 'geography'      // الجغرافيا والمعالم والخرائط
  | 'technology'     // التكنولوجيا والذكاء الاصطناعي وعلوم الفضاء
  | 'industry'       // الصناعة والتجارة والاقتصاد
  | 'sports'         // الرياضة والبطولات العالمية
  | 'literature'     // الأدب والشعر والفنون
  | 'national'       // الثقافة الوطنية والتراث العربي
  | 'eras';          // عصور قديمة وحديثة

export type EraId =
  | 'ancient'        // العصور القديمة وبداية الحضارات
  | 'islamic_golden' // العصر الذهبي الإسلامي والعلوم
  | 'renaissance'    // عصر النهضة والصناعة والتجارة
  | 'modern_digital' // الثورة الرقمية والمعلوماتية
  | 'future_ai';     // عصر الذكاء الاصطناعي والمستقبل

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface Question {
  id: string;
  category: CategoryId;
  era: EraId;
  difficulty: Difficulty;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  points: number;
  tags?: string[];
}

export type GameMode =
  | 'JOURNEY'   // رحلة العصور (حملة المراحل المتسلسلة)
  | 'TOWER'     // برج العباقرة (صعود المليون)
  | 'BLITZ'     // سرعة النبض (تحدي البقاء مع الزمن)
  | 'DUEL';     // مبارزة النواة (ضد الذكاء الاصطناعي أو لاعب آخر)

export interface LifelineState {
  fiftyFifty: boolean;     // حذف إجابتين (Quantum Filter)
  radarOracle: boolean;    // استطلاع رادار الذكاء (Cortex Prediction)
  timeFreeze: boolean;     // تجميد الزمن 15 ثانية (Chrono Freeze)
  matrixSwap: boolean;     // استبدال السؤال (Matrix Swap)
}

export interface LevelItem {
  id: string;
  stageId: string;
  levelNumber: number;
  title: string;
  questions: Question[];
}

export interface ZaytounaWorld {
  id: string;
  stageNumber: number;
  title: string;
  subtitle: string;
  themeColor: string;
  accentBg: string;
  iconName: string;
  levels: LevelItem[];
  chestReward: { coins: number; xp: number };
}

export interface PlayerStats {
  xp: number;
  level: number;
  rankTitle: string;
  totalGames: number;
  totalCorrect: number;
  totalAnswered: number;
  highestStreak: number;
  towerRecord: number;      // highest tier reached in Tower
  blitzRecord: number;      // highest score in Blitz
  eraStars: Record<string, number>; // stageId -> stars (1-3)
  unlockedStages: string[];
  badges: string[];
  lastDailyDate?: string;
  dailyStreak: number;
  // Economy & Zaytouna-style progression
  coins: number;
  hearts: number;
  completedLevels: Record<string, { stars: number; score: number }>;
  claimedChests: string[];
}

export interface GameSettings {
  soundEnabled: boolean;
  ambientMusic: boolean;
  speechEnabled: boolean;
  fontSize: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  autoAdvanceDelayMs: number; // e.g. 1200ms
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: { current: number; max: number };
}

export interface Stage {
  id: string;
  eraId: EraId;
  stageNumber: number;
  title: string;
  subtitle: string;
  description: string;
  isBoss: boolean;
  requiredStarsToUnlock: number;
  questionCount: number;
  targetScore: number;
}

