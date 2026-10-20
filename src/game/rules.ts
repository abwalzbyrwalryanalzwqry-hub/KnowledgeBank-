import type { Difficulty } from '../types/game.ts';

export interface RankInfo {
  level: number;
  title: string;
  minXp: number;
  nextXp: number;
}

export const RANKS: RankInfo[] = [
  { level: 1, title: 'مستكشف المعرفة', minXp: 0, nextXp: 500 },
  { level: 2, title: 'باحث الأسرار', minXp: 500, nextXp: 1200 },
  { level: 3, title: 'رحّالة العصور', minXp: 1200, nextXp: 2500 },
  { level: 4, title: 'فيلسوف النجوم', minXp: 2500, nextXp: 4500 },
  { level: 5, title: 'حكيم الحضارات', minXp: 4500, nextXp: 7500 },
  { level: 6, title: 'أستاذ الأكاديمية', minXp: 7500, nextXp: 12000 },
  { level: 7, title: 'بروفيسور الأفق', minXp: 12000, nextXp: 20000 },
  { level: 8, title: 'حارس الحكمة الكونية', minXp: 20000, nextXp: 35000 },
  { level: 9, title: 'أسطورة الفكر العربي', minXp: 35000, nextXp: 60000 },
  { level: 10, title: 'إمبراطور المعرفة الخالد', minXp: 60000, nextXp: 100000 },
];

export function calculateRank(xp: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXp) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function calculateStreakMultiplier(streak: number): number {
  if (streak >= 8) return 3.0;
  if (streak >= 5) return 2.0;
  if (streak >= 3) return 1.5;
  return 1.0;
}

export function calculateQuestionScore(
  basePoints: number,
  difficulty: Difficulty,
  remainingSeconds: number,
  maxSeconds: number,
  streak: number
): { finalScore: number; speedBonus: number; streakMultiplier: number } {
  const diffMultiplier: Record<Difficulty, number> = {
    easy: 1.0,
    medium: 1.25,
    hard: 1.5,
    expert: 2.0,
  };

  const streakMultiplier = calculateStreakMultiplier(streak);
  // Speed bonus is proportional to time left: up to 50% extra base score
  const timeRatio = maxSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / maxSeconds)) : 0;
  const speedBonus = Math.round(basePoints * 0.5 * timeRatio);

  const finalScore = Math.round((basePoints * diffMultiplier[difficulty] + speedBonus) * streakMultiplier);

  return {
    finalScore,
    speedBonus,
    streakMultiplier,
  };
}

export function calculateStageStars(score: number, targetScore: number, accuracyPercent: number): number {
  if (score >= targetScore && accuracyPercent >= 90) return 3;
  if (score >= targetScore * 0.75 && accuracyPercent >= 70) return 2;
  if (score >= targetScore * 0.4 || accuracyPercent >= 50) return 1;
  return 0;
}

export function getFiftyFiftyHiddenIndices(correctIndex: number, totalOptions: number = 4): number[] {
  const wrongIndices: number[] = [];
  for (let i = 0; i < totalOptions; i++) {
    if (i !== correctIndex) {
      wrongIndices.push(i);
    }
  }

  // Shuffle wrong indices deterministically/randomly and pick 2
  const shuffled = [...wrongIndices].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2);
}

export function simulateRadarPercentages(correctIndex: number, difficulty: Difficulty): number[] {
  // Correct answer gets high confidence based on question difficulty
  const baseCorrectRate: Record<Difficulty, number> = {
    easy: 75,
    medium: 65,
    hard: 55,
    expert: 45,
  };

  const correctPct = baseCorrectRate[difficulty] + Math.floor(Math.random() * 10);
  let remaining = 100 - correctPct;

  const result = [0, 0, 0, 0];
  result[correctIndex] = correctPct;

  const otherIndices = [0, 1, 2, 3].filter((i) => i !== correctIndex);
  for (let i = 0; i < otherIndices.length - 1; i++) {
    const chunk = Math.floor(Math.random() * (remaining - (otherIndices.length - 1 - i)));
    result[otherIndices[i]] = chunk;
    remaining -= chunk;
  }
  result[otherIndices[otherIndices.length - 1]] = remaining;

  return result;
}

export const TOWER_TIERS = [
  { tier: 1, prize: 1000, isSafety: false },
  { tier: 2, prize: 2000, isSafety: false },
  { tier: 3, prize: 5000, isSafety: false },
  { tier: 4, prize: 10000, isSafety: false },
  { tier: 5, prize: 25000, isSafety: true },    // محطة أمان 1
  { tier: 6, prize: 50000, isSafety: false },
  { tier: 7, prize: 75000, isSafety: false },
  { tier: 8, prize: 100000, isSafety: false },
  { tier: 9, prize: 150000, isSafety: false },
  { tier: 10, prize: 250000, isSafety: true },  // محطة أمان 2
  { tier: 11, prize: 400000, isSafety: false },
  { tier: 12, prize: 550000, isSafety: false },
  { tier: 13, prize: 700000, isSafety: false },
  { tier: 14, prize: 850000, isSafety: false },
  { tier: 15, prize: 1000000, isSafety: true }, // قمة المليون
];

export function getTowerGuaranteedPrize(currentTier: number): number {
  if (currentTier >= 15) return 1000000;
  if (currentTier >= 10) return 250000;
  if (currentTier >= 5) return 25000;
  return 0;
}

/**
 * Zaytouna-style strict Stage/World and Level unlocking rules.
 */
export function isWorldUnlocked(
  worldIndex: number,
  completedLevels: Record<string, { stars: number; score: number }>,
  worlds: { id: string; levels: { id: string }[] }[]
): boolean {
  if (worldIndex === 0) return true;
  const prevWorld = worlds[worldIndex - 1];
  if (!prevWorld) return false;

  // Strict check: ALL levels of the previous world must be completed!
  return prevWorld.levels.every((lvl) => Boolean(completedLevels[lvl.id]));
}

export function isLevelUnlocked(
  worldIndex: number,
  levelIndex: number,
  completedLevels: Record<string, { stars: number; score: number }>,
  worlds: { id: string; levels: { id: string }[] }[]
): boolean {
  // First, the world itself must be unlocked
  if (!isWorldUnlocked(worldIndex, completedLevels, worlds)) return false;

  // First level of an unlocked world is always unlocked
  if (levelIndex === 0) return true;

  // Otherwise, previous level in the same world must be completed
  const currentWorld = worlds[worldIndex];
  if (!currentWorld) return false;
  const prevLevel = currentWorld.levels[levelIndex - 1];
  return Boolean(completedLevels[prevLevel.id]);
}

export function calculateLevelRewards(
  stars: number,
  mistakesCount: number
): { coins: number; xp: number; isPerfect: boolean } {
  const isPerfect = mistakesCount === 0 && stars === 3;
  let baseCoins = 10;
  let baseXp = 50;

  if (stars === 3) {
    baseCoins = 30;
    baseXp = 150;
  } else if (stars === 2) {
    baseCoins = 20;
    baseXp = 100;
  }

  if (isPerfect) {
    baseCoins += 15;
    baseXp += 50;
  }

  return { coins: baseCoins, xp: baseXp, isPerfect };
}

export function deductHeartOnMistake(currentHearts: number): number {
  return Math.max(0, currentHearts - 1);
}

