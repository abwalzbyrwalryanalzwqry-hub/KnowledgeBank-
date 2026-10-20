/**
 * ربط تقدم «أفق المعرفة» بمحفظة اللاعب (العملات والخبرة) في تحديث ذري واحد.
 * النقاط تُضاف أيضًا إلى الخبرة XP حتى ترتفع رتبة اللاعب.
 */
import type { PlayerStats } from '../types/game';
import type { ContentManifest } from '../content/types';
import {
  createEmptyProgress,
  evaluateAchievements,
  syncUnlockedWorlds,
  type HorizonProgress,
  type RewardDelta,
} from '../content/progress';

export function getHorizon(stats: PlayerStats): HorizonProgress {
  return stats.horizon ?? createEmptyProgress();
}

export function applyHorizon(
  stats: PlayerStats,
  manifest: ContentManifest | undefined,
  fn: (p: HorizonProgress) => { progress: HorizonProgress; delta?: RewardDelta }
): { stats: PlayerStats; delta: RewardDelta } {
  const r = fn(getHorizon(stats));
  const ach = evaluateAchievements(r.progress, manifest);
  const progress = manifest ? syncUnlockedWorlds(ach.progress, manifest) : ach.progress;
  const delta: RewardDelta = {
    points: r.delta?.points ?? 0,
    coins: (r.delta?.coins ?? 0) + ach.delta.coins,
    newAchievements: ach.delta.newAchievements,
  };
  return {
    stats: {
      ...stats,
      horizon: progress,
      coins: stats.coins + delta.coins,
      xp: stats.xp + delta.points,
    },
    delta,
  };
}
