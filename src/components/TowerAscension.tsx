import React, { useState } from 'react';
import { Shield, Trophy, ArrowRight, DollarSign, Award, AlertCircle } from 'lucide-react';
import { Question, LifelineState, GameSettings } from '../types/game';
import { TOWER_TIERS, getTowerGuaranteedPrize } from '../game/rules';
import { ArenaQuestion } from './ArenaQuestion';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';

interface TowerAscensionProps {
  questions: Question[];
  settings: GameSettings;
  onFinishGame: (prizeWon: number, tierReached: number, statsUpdate: { correct: number; total: number }) => void;
  onExit: () => void;
}

export const TowerAscension: React.FC<TowerAscensionProps> = ({
  questions,
  settings,
  onFinishGame,
  onExit,
}) => {
  const [currentTierIndex, setCurrentTierIndex] = useState(0); // 0 to 14 (Tier 1 to 15)
  const [lifelines, setLifelines] = useState<LifelineState>({
    fiftyFifty: true,
    radarOracle: true,
    timeFreeze: true,
    matrixSwap: true,
  });
  const [correctCount, setCorrectCount] = useState(0);
  const [pool, setPool] = useState<Question[]>(questions);

  const currentTier = TOWER_TIERS[currentTierIndex];
  const currentQuestion = pool[currentTierIndex % pool.length];

  const handleUseLifeline = (lifeline: keyof LifelineState) => {
    setLifelines((prev) => ({ ...prev, [lifeline]: false }));

    if (lifeline === 'matrixSwap') {
      // Pick another random question from remaining pool
      const remaining = pool.filter((_, i) => i !== currentTierIndex % pool.length);
      if (remaining.length > 0) {
        const replacement = remaining[Math.floor(Math.random() * remaining.length)];
        const newPool = [...pool];
        newPool[currentTierIndex % pool.length] = replacement;
        setPool(newPool);
      }
    }
  };

  const handleAnswer = (selectedIndex: number) => {
    const isCorrect = selectedIndex === currentQuestion.correctIndex;

    if (isCorrect) {
      const nextCorrect = correctCount + 1;
      setCorrectCount(nextCorrect);

      if (currentTierIndex >= 14) {
        // Millionaire Victory!
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        sound.playVictory();
        onFinishGame(1000000, 15, { correct: nextCorrect, total: currentTierIndex + 1 });
      } else {
        setCurrentTierIndex((prev) => prev + 1);
      }
    } else {
      // Incorrect answer: drop to guaranteed prize!
      const currentTierNumber = currentTierIndex + 1;
      const guaranteedPrize = getTowerGuaranteedPrize(currentTierNumber - 1);
      onFinishGame(guaranteedPrize, currentTierNumber, { correct: correctCount, total: currentTierIndex + 1 });
    }
  };

  const handleWalkAway = () => {
    sound.playClick();
    const wonPrize = currentTierIndex === 0 ? 0 : TOWER_TIERS[currentTierIndex - 1].prize;
    onFinishGame(wonPrize, currentTierIndex, { correct: correctCount, total: currentTierIndex });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6 items-start">
      {/* Question Arena Surface (Center / Main) */}
      <div className="flex-1 w-full flex flex-col gap-4">
        {/* Header strip with Walk Away action */}
        <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl p-3 px-5">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="font-heading font-bold text-white text-base">
              برج العباقرة · الدرجة {currentTier.tier} من 15
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentTierIndex > 0 && (
              <button
                onClick={handleWalkAway}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                <span>الانسحاب برصيد {TOWER_TIERS[currentTierIndex - 1].prize.toLocaleString()} نقطة</span>
              </button>
            )}

            <button
              onClick={onExit}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 cursor-pointer"
            >
              مغادرة البرج
            </button>
          </div>
        </div>

        <ArenaQuestion
          question={currentQuestion}
          questionNumber={currentTier.tier}
          totalQuestions={15}
          timeLimitSeconds={30}
          onAnswer={handleAnswer}
          lifelines={lifelines}
          onUseLifeline={handleUseLifeline}
          settings={settings}
          scoreDisplay={currentTier.prize}
        />
      </div>

      {/* Holographic Prize Ladder Sidebar */}
      <div className="w-full lg:w-72 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 flex flex-col gap-1.5 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-1 text-xs text-slate-400 font-semibold">
          <span>سلّم المليون</span>
          <span>المكافأة</span>
        </div>

        <div className="flex flex-col-reverse gap-1 overflow-y-auto max-h-[500px] lg:max-h-none pr-1">
          {TOWER_TIERS.map((tierItem, idx) => {
            const isCurrent = idx === currentTierIndex;
            const isCompleted = idx < currentTierIndex;
            const isSafety = tierItem.isSafety;

            let rowStyle = 'text-slate-400 bg-slate-950/40 border-slate-900';
            if (isCurrent) {
              rowStyle = 'bg-cyan-950/80 text-cyan-200 border-cyan-400 font-bold holo-border shadow-md';
            } else if (isCompleted) {
              rowStyle = 'bg-emerald-950/30 text-emerald-300/80 border-emerald-900/50';
            } else if (isSafety) {
              rowStyle = 'bg-amber-950/20 text-amber-300 border-amber-800/40 font-semibold';
            }

            return (
              <div
                key={tierItem.tier}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs transition-all ${rowStyle}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-code text-[11px] w-5 text-right">{tierItem.tier}</span>
                  {isSafety && <Shield className="w-3.5 h-3.5 text-amber-400" />}
                  {isCurrent && <span className="text-[10px] text-cyan-400">● الآن</span>}
                </div>
                <span className="font-num tabular-nums font-bold">
                  {tierItem.prize.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
