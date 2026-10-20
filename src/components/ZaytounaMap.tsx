import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Star,
  Gift,
  Coins,
  Heart,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trophy,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import { ZaytounaWorld, LevelItem, PlayerStats, GameSettings } from '../types/game';
import { ZAYTOUNA_WORLDS } from '../data/zaytounaStages';
import { isWorldUnlocked, isLevelUnlocked } from '../game/rules';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';

interface ZaytounaMapProps {
  stats: PlayerStats;
  settings: GameSettings;
  onSelectLevel: (level: LevelItem, stage: ZaytounaWorld) => void;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
  onBackToHub: () => void;
}

export const ZaytounaMap: React.FC<ZaytounaMapProps> = ({
  stats,
  settings,
  onSelectLevel,
  onUpdateStats,
  onBackToHub,
}) => {
  const [selectedWorldIndex, setSelectedWorldIndex] = useState(0);

  const worlds = ZAYTOUNA_WORLDS;
  const currentWorld = worlds[selectedWorldIndex];

  // Stage unlock status
  const currentWorldUnlocked = isWorldUnlocked(selectedWorldIndex, stats.completedLevels || {}, worlds);

  // Check if all levels in current world are completed
  const allLevelsInWorldCompleted = currentWorld.levels.every(
    (lvl) => Boolean(stats.completedLevels?.[lvl.id])
  );
  const isChestClaimed = stats.claimedChests?.includes(currentWorld.id);

  // Total stars in current world
  const currentWorldStars = currentWorld.levels.reduce((acc, lvl) => {
    return acc + (stats.completedLevels?.[lvl.id]?.stars || 0);
  }, 0);
  const maxPossibleStars = currentWorld.levels.length * 3;

  const handleClaimChest = () => {
    if (!allLevelsInWorldCompleted || isChestClaimed) return;

    sound.playChest();
    confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 } });

    onUpdateStats((prev) => ({
      ...prev,
      coins: prev.coins + currentWorld.chestReward.coins,
      xp: prev.xp + currentWorld.chestReward.xp,
      claimedChests: [...(prev.claimedChests || []), currentWorld.id],
    }));
  };

  const handleRefillHearts = () => {
    if (stats.hearts >= 5 || stats.coins < 30) return;
    sound.playCoin();
    onUpdateStats((prev) => ({
      ...prev,
      coins: prev.coins - 30,
      hearts: 5,
    }));
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-4 flex flex-col gap-6">
      {/* Top Bar: Nav Hub + Hearts + Coins */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playClick();
              onBackToHub();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>الأطوار الرئيسية</span>
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white font-heading">
              خارطة المراحل والمستويات (نظام زيتونة)
            </h1>
            <p className="text-xs text-slate-400">
              أكمل كل مرحلة بكافة مستوياتها لفتح المرحلة التالية وصندوق الكنز
            </p>
          </div>
        </div>

        {/* Economy Widgets */}
        <div className="flex items-center gap-3">
          {/* Hearts Meter with quick refill */}
          <button
            onClick={handleRefillHearts}
            className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
            title="القلوب المتاحة - انقر لإعادة الشحن مقابل 30 قطعة ذهبية"
          >
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((h) => (
                <Heart
                  key={h}
                  className={`w-3.5 h-3.5 ${
                    h <= stats.hearts
                      ? 'text-rose-500 fill-rose-500'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
            {stats.hearts < 5 && <span className="text-[10px] text-rose-400">+ شحن</span>}
          </button>

          {/* Coins Meter */}
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl font-num tabular-nums text-sm font-bold text-amber-300">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{stats.coins.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* World / Stage Selector Tabs (with lock icons) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        {worlds.map((w, idx) => {
          const isUnlocked = isWorldUnlocked(idx, stats.completedLevels || {}, worlds);
          const isSelected = selectedWorldIndex === idx;

          return (
            <button
              key={w.id}
              onClick={() => {
                sound.playClick();
                setSelectedWorldIndex(idx);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs md:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400 holo-border shadow-md'
                  : isUnlocked
                  ? 'bg-slate-900/70 text-slate-300 border-slate-800 hover:bg-slate-850'
                  : 'bg-slate-950/70 text-slate-500 border-slate-900 opacity-60'
              }`}
            >
              {!isUnlocked && <Lock className="w-3.5 h-3.5 text-slate-500" />}
              <span>المرحلة {w.stageNumber}: {w.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active World Banner & Status */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/90 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 mb-1">
            <span>المرحلة {currentWorld.stageNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{currentWorld.levels.length} مستويات متسلسلة</span>
          </div>
          <h2 className="text-2xl font-black text-white font-heading">
            {currentWorld.title}
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-xl leading-relaxed">
            {currentWorld.subtitle}
          </p>

          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5 text-amber-400 font-num tabular-nums font-bold">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{currentWorldStars} / {maxPossibleStars} نجوم</span>
            </div>
            <span aria-hidden="true" className="text-slate-700">|</span>
            <div className="text-slate-400 font-num tabular-nums">
              مكتمل: {currentWorld.levels.filter((lvl) => Boolean(stats.completedLevels?.[lvl.id])).length} من {currentWorld.levels.length}
            </div>
          </div>
        </div>

        {/* Stage Mystery Chest Reward */}
        <div className="flex flex-col items-center gap-2 bg-slate-950/90 border border-slate-800/80 rounded-2xl p-4 px-6 text-center shrink-0">
          <div className="relative">
            <Gift
              className={`w-10 h-10 ${
                allLevelsInWorldCompleted && !isChestClaimed
                  ? 'text-amber-400 animate-bounce'
                  : isChestClaimed
                  ? 'text-slate-600'
                  : 'text-amber-500/50'
              }`}
            />
            {allLevelsInWorldCompleted && !isChestClaimed && (
              <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1 animate-spin" />
            )}
          </div>

          <div className="text-xs font-bold text-white">
            {isChestClaimed
              ? 'تم فتح كنز المرحلة'
              : allLevelsInWorldCompleted
              ? 'الكنز متاح للفتح!'
              : 'صندوق كنز المرحلة'}
          </div>

          <button
            onClick={handleClaimChest}
            disabled={!allLevelsInWorldCompleted || isChestClaimed}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              allLevelsInWorldCompleted && !isChestClaimed
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 cursor-pointer shadow-md'
                : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
          >
            {isChestClaimed ? 'مستلم ✓' : `فتح (+${currentWorld.chestReward.coins} 🪙)`}
          </button>
        </div>
      </div>

      {/* Locked Stage Warning (if user views a locked stage) */}
      {!currentWorldUnlocked && (
        <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-6 text-center flex flex-col items-center gap-3">
          <Lock className="w-10 h-10 text-rose-400" />
          <h3 className="text-lg font-bold text-white font-heading">
            هذه المرحلة مغلقة حالياً
          </h3>
          <p className="text-xs md:text-sm text-rose-300 max-w-md">
            يجب إكمال جميع مستويات المرحلة {currentWorld.stageNumber - 1} أولاً لفك قفل هذه المرحلة ومواصلة رحلتك المعرفية!
          </p>
        </div>
      )}

      {/* Levels Pathway Grid (Zaytouna Path) */}
      {currentWorldUnlocked && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {currentWorld.levels.map((level, lvlIdx) => {
            const isUnlocked = isLevelUnlocked(selectedWorldIndex, lvlIdx, stats.completedLevels || {}, worlds);
            const levelData = stats.completedLevels?.[level.id];
            const isCompleted = Boolean(levelData);
            const stars = levelData?.stars || 0;

            let cardStyle = 'bg-slate-950/70 border-slate-900 opacity-60 cursor-not-allowed';
            if (isCompleted) {
              cardStyle = 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-400 cursor-pointer shadow-sm';
            } else if (isUnlocked) {
              cardStyle = 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-500/30 holo-border cursor-pointer animate-pulse';
            }

            return (
              <button
                key={level.id}
                onClick={() => {
                  if (isUnlocked) {
                    sound.playClick();
                    onSelectLevel(level, currentWorld);
                  }
                }}
                disabled={!isUnlocked}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center gap-3 transition-all min-h-[150px] ${cardStyle}`}
              >
                {/* Node Level Number or Lock */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-num tabular-nums text-lg font-black transition-all">
                  {isUnlocked ? (
                    <div
                      className={`w-full h-full rounded-full flex items-center justify-center border ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-400'
                      }`}
                    >
                      {level.levelNumber}
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-slate-600" />
                    </div>
                  )}
                </div>

                <div className="text-xs font-bold text-white line-clamp-1">
                  {level.title}
                </div>

                {/* Stars earned for this level */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= stars
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
