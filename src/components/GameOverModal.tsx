import React, { useEffect } from 'react';
import {
  Trophy,
  Star,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Coins,
  ChevronLeft,
  Map,
} from 'lucide-react';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';

interface GameOverModalProps {
  title: string;
  subtitle: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  xpEarned: number;
  starsEarned?: number;
  coinsEarned?: number;
  isPerfect?: boolean;
  isOpen: boolean;
  onPlayAgain: () => void;
  onReturnHome: () => void;
  onNextLevel?: () => void;
  onReturnToStages?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  title,
  subtitle,
  score,
  correctAnswers,
  totalQuestions,
  xpEarned,
  starsEarned = 0,
  coinsEarned = 0,
  isPerfect = false,
  isOpen,
  onPlayAgain,
  onReturnHome,
  onNextLevel,
  onReturnToStages,
}) => {
  const accuracy =
    totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const isVictory = accuracy >= 60;

  useEffect(() => {
    if (!isOpen) return;

    if (isVictory) {
      sound.playVictory();
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.6 },
      });
    } else {
      sound.playWrong();
    }
  }, [isOpen, isVictory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg bg-[#0E1322] border border-cyan-500/40 holo-border rounded-2xl p-6 md:p-8 flex flex-col items-center text-center gap-5 shadow-2xl">
        {/* Victory Icon Crown */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-amber-400 p-[1px] shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full bg-[#0B0F19] rounded-[15px] flex items-center justify-center">
            <Trophy className="w-8 h-8 text-amber-400" />
          </div>
        </div>

        {/* Title & Subtitle */}
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white font-heading">
            {title}
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">{subtitle}</p>
        </div>

        {/* Perfect Clean Sweep Highlight */}
        {isPerfect && (
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-bold animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>مستوى أسطوري مثالي! مكافأة ذهبية إضافية</span>
          </div>
        )}

        {/* Stars (if Journey/Stage mode) */}
        {starsEarned > 0 && (
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((starIdx) => (
              <Star
                key={starIdx}
                className={`w-7 h-7 ${
                  starIdx <= starsEarned
                    ? 'text-amber-400 fill-amber-400 animate-bounce'
                    : 'text-slate-700'
                }`}
              />
            ))}
          </div>
        )}

        {/* Stats Summary Strip (4 KPI boxes) */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">النقاط</div>
            <div className="font-num tabular-nums text-base md:text-lg font-black text-amber-400 mt-0.5">
              {score.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">الصحيحة</div>
            <div className="font-num tabular-nums text-base md:text-lg font-black text-emerald-400 mt-0.5">
              {correctAnswers} / {totalQuestions}
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">الذهب 🪙</div>
            <div className="font-num tabular-nums text-base md:text-lg font-black text-amber-300 mt-0.5 flex items-center justify-center gap-1">
              <span>+{coinsEarned}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">الخبرة XP</div>
            <div className="font-num tabular-nums text-base md:text-lg font-black text-cyan-400 mt-0.5">
              +{xpEarned}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          {/* Primary CTA: Next Level if available */}
          {onNextLevel && (
            <button
              onClick={() => {
                sound.playClick();
                onNextLevel();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <span>المستوى التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div className="w-full flex items-center gap-2.5">
            {onReturnToStages ? (
              <button
                onClick={() => {
                  sound.playClick();
                  onReturnToStages();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-cyan-950/70 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <Map className="w-4 h-4" />
                <span>خارطة المراحل</span>
              </button>
            ) : null}

            <button
              onClick={() => {
                sound.playClick();
                onPlayAgain();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة المحاولة</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onReturnHome();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 font-medium text-xs rounded-xl transition-colors cursor-pointer"
            >
              <span>الرئيسية</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
