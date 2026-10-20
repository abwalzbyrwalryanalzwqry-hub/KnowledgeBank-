import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Coins,
  ChevronRight,
  ChevronLeft,
  Volume2,
  Sparkles,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Star,
  AlertTriangle,
  BookOpen,
  Flame,
} from 'lucide-react';
import { Question, LevelItem, PlayerStats, GameSettings } from '../types/game';
import { sound } from '../utils/audio';
import { speech } from '../utils/speech';
import { CATEGORY_META } from '../data/questions';
import { calculateLevelRewards, deductHeartOnMistake } from '../game/rules';
import confetti from 'canvas-confetti';

interface LevelPlayArenaProps {
  level: LevelItem;
  stageTitle: string;
  stageNumber: number;
  stats: PlayerStats;
  settings: GameSettings;
  onLevelComplete: (
    stars: number,
    score: number,
    rewards: { coins: number; xp: number; isPerfect: boolean },
    correctCount?: number
  ) => void;
  onExit: () => void;
  onUpdateStats: (updater: (prev: PlayerStats) => PlayerStats) => void;
}

export const LevelPlayArena: React.FC<LevelPlayArenaProps> = ({
  level,
  stageTitle,
  stageNumber,
  stats,
  settings,
  onLevelComplete,
  onExit,
  onUpdateStats,
}) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [mistakesCount, setMistakesCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [isLevelFinished, setIsLevelFinished] = useState(false);
  const [isOutOfHearts, setIsOutOfHearts] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const questions = level.questions;
  const currentQuestion = questions[currentQIndex];
  const isCurrentAnswered = userAnswers[currentQIndex] !== undefined;
  const selectedOption = userAnswers[currentQIndex];

  // Cleanup on unmount or question change
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
      speech.stop();
    };
  }, [autoAdvanceTimer]);

  const handleSelectOption = (optionIndex: number) => {
    if (isCurrentAnswered || stats.hearts <= 0) return;

    speech.stop();
    setIsSpeaking(false);

    const isCorrect = optionIndex === currentQuestion.correctIndex;
    const updatedAnswers = { ...userAnswers, [currentQIndex]: optionIndex };
    setUserAnswers(updatedAnswers);

    if (isCorrect) {
      const nextStreak = streak + 1;
      setStreak(nextStreak);

      // Rewards: Base points + streak combo bonus
      const streakBonus = nextStreak > 1 ? (nextStreak - 1) * 20 : 0;
      const pointsEarned = currentQuestion.points + streakBonus;
      setScore((prev) => prev + pointsEarned);

      if (nextStreak >= 2) {
        sound.playStreak(nextStreak);
      } else {
        sound.playCorrect();
      }

      // Auto-advance to next question automatically
      const timer = setTimeout(() => {
        advanceQuestion(currentQIndex + 1, updatedAnswers);
      }, settings.autoAdvanceDelayMs || 1200);

      setAutoAdvanceTimer(timer);
    } else {
      // PENALTY: Streak breaks + Heart lost + Audio buzzer
      setStreak(0);
      sound.playHeartLoss();

      const newMistakes = mistakesCount + 1;
      setMistakesCount(newMistakes);

      const nextHearts = deductHeartOnMistake(stats.hearts);
      onUpdateStats((prev) => ({ ...prev, hearts: nextHearts }));

      if (nextHearts <= 0) {
        setIsOutOfHearts(true);
      } else {
        // Auto-advance after penalty display to keep fluid progression
        const timer = setTimeout(() => {
          advanceQuestion(currentQIndex + 1, updatedAnswers);
        }, (settings.autoAdvanceDelayMs || 1200) + 900);
        setAutoAdvanceTimer(timer);
      }
    }
  };

  const advanceQuestion = (
    nextIndex: number,
    answersSnapshot: Record<number, number> = userAnswers
  ) => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }

    if (nextIndex < questions.length) {
      setCurrentQIndex(nextIndex);
    } else {
      finishLevel(answersSnapshot);
    }
  };

  // Dedicated previous question navigation
  const goToPreviousQuestion = () => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
    if (currentQIndex > 0) {
      sound.playClick();
      setCurrentQIndex((prev) => prev - 1);
    }
  };

  const finishLevel = (answersSnapshot: Record<number, number> = userAnswers) => {
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (answersSnapshot[idx] === q.correctIndex) {
        correctCount++;
      }
    });

    const accuracy = Math.round((correctCount / questions.length) * 100);
    const stars = accuracy >= 90 ? 3 : accuracy >= 60 ? 2 : accuracy >= 30 ? 1 : 0;
    const rewards = calculateLevelRewards(stars, mistakesCount);

    sound.playVictory();
    confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });

    setIsLevelFinished(true);
    onLevelComplete(stars, score, rewards, correctCount);
  };

  const handleRefillHeartsWithCoins = () => {
    if (stats.coins < 30) return;
    sound.playCoin();
    onUpdateStats((prev) => ({
      ...prev,
      coins: prev.coins - 30,
      hearts: 5,
    }));
    setIsOutOfHearts(false);
  };

  const handleReadQuestion = () => {
    if (isSpeaking) {
      speech.stop();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    const text = `${currentQuestion.question}. الخيارات: الأول: ${currentQuestion.options[0]}. الثاني: ${currentQuestion.options[1]}. الثالث: ${currentQuestion.options[2]}. الرابع: ${currentQuestion.options[3]}`;
    speech.speak(text, () => setIsSpeaking(false));
  };

  const categoryMeta = CATEGORY_META[currentQuestion.category] || CATEGORY_META.history;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 flex flex-col gap-5">
      {/* Top Zaytouna Bar: Hearts & Coins & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
              sound.playClick();
              onExit();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>خارطة المستويات</span>
          </button>
          <div>
            <h2 className="text-base md:text-lg font-bold text-white font-heading">
              المرحلة {stageNumber} · المستوى {level.levelNumber}
            </h2>
            <div className="text-xs text-slate-400">{level.title}</div>
          </div>
        </div>

        {/* Economy & Streak Meters (Rewards & Penalties) */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Combo Streak Indicator */}
          {streak >= 2 && (
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-300 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
              <span>ستريك x{streak}</span>
            </div>
          )}

          {/* Hearts Bar (Penalty meter) */}
          <div
            className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl cursor-help"
            title="نظام الأرواح: تفقد قلباً مع كل خطأ"
          >
            {[1, 2, 3, 4, 5].map((h) => (
              <Heart
                key={h}
                className={`w-4 h-4 transition-transform ${
                  h <= stats.hearts
                    ? 'text-rose-500 fill-rose-500'
                    : 'text-slate-700 scale-90'
                }`}
              />
            ))}
          </div>

          {/* Golden Coins (Reward meter) */}
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl font-num tabular-nums text-sm font-bold text-amber-300">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{stats.coins.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Level Progress Indicator Strip */}
      <div className="flex items-center justify-between px-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>السؤال</span>
          <span className="font-num tabular-nums text-cyan-400 font-bold">
            {currentQIndex + 1} من {questions.length}
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-300">{categoryMeta.label}</span>
        </div>

        {/* Auto-advance notification */}
        {isCurrentAnswered && (
          <div className="text-xs font-semibold flex items-center gap-1 animate-pulse">
            {selectedOption === currentQuestion.correctIndex ? (
              <div className="text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {currentQIndex + 1 < questions.length
                    ? 'إجابة ممتازة! جاري الانتقال التلقائي...'
                    : 'إجابة صحيحة! جاري إكمال المستوى...'}
                </span>
              </div>
            ) : (
              <div className="text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  {currentQIndex + 1 < questions.length
                    ? 'خطأ (-1 ❤️) · جاري الانتقال للسؤال التالي...'
                    : 'خطأ (-1 ❤️) · جاري إكمال المستوى...'}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {speech.supported && <button
            onClick={handleReadQuestion}
            className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
              isSpeaking
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="قراءة السؤال صوتياً"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>}
        </div>
      </div>

      {/* Interactive Progress Dots (Clickable for review and fast jumps) */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {questions.map((q, idx) => {
          const isAnswered = userAnswers[idx] !== undefined;
          const isCurrent = idx === currentQIndex;
          const isCorrect = userAnswers[idx] === q.correctIndex;

          let dotClass = 'bg-slate-800 border-slate-700 hover:border-slate-500';
          if (isCurrent) {
            dotClass = 'bg-cyan-500 border-cyan-300 ring-2 ring-cyan-500/50 shadow-md shadow-cyan-500/30';
          } else if (isAnswered) {
            dotClass = isCorrect
              ? 'bg-emerald-500 border-emerald-400 hover:brightness-110'
              : 'bg-rose-500 border-rose-400 hover:brightness-110';
          }

          return (
            <button
              key={idx}
              onClick={() => {
                if (autoAdvanceTimer) clearTimeout(autoAdvanceTimer);
                sound.playClick();
                setCurrentQIndex(idx);
              }}
              className={`h-2.5 rounded-full border transition-all cursor-pointer ${dotClass}`}
              title={`الانتقال للسؤال ${idx + 1}`}
            />
          );
        })}
      </div>

      {/* Question Card Surface */}
      <div className="relative bg-slate-900/90 rounded-2xl p-6 md:p-8 holo-border backdrop-blur-sm min-h-[140px] flex flex-col justify-center">
        <h3 className="font-heading font-extrabold text-white text-xl md:text-2xl leading-relaxed text-right text-balance">
          {currentQuestion.question}
        </h3>
      </div>

      {/* 4 Interactive Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {currentQuestion.options.map((opt, idx) => {
          const isSelected = selectedOption === idx;
          const isCorrect = currentQuestion.correctIndex === idx;

          let style = 'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-cyan-400 hover:bg-slate-850';
          if (isCurrentAnswered) {
            if (isCorrect) {
              style = 'bg-emerald-950/80 border-emerald-500 text-white holo-emerald-border ring-1 ring-emerald-500/40';
            } else if (isSelected) {
              style = 'bg-rose-950/80 border-rose-500 text-white ring-1 ring-rose-500/40';
            } else {
              style = 'opacity-40 bg-slate-950 border-slate-900 text-slate-500';
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectOption(idx)}
              disabled={isCurrentAnswered || stats.hearts <= 0}
              className={`group text-right p-4 rounded-xl border transition-all flex items-center justify-between min-h-[64px] ${style} ${
                !isCurrentAnswered && stats.hearts > 0 ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-code text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:text-cyan-300">
                  [{idx + 1}]
                </span>
                <span className="font-medium text-base md:text-lg">{opt}</span>
              </div>

              {isCurrentAnswered && (
                <div>
                  {isCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : isSelected ? (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  ) : null}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Controls Bar: Previous Question + Next Question / Finish */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-xl p-3 px-5">
        {/* Previous Question Button (ميزة العودة للسؤال السابق) */}
        <button
          onClick={goToPreviousQuestion}
          disabled={currentQIndex === 0}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
            currentQIndex > 0
              ? 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800 cursor-pointer shadow-sm'
              : 'opacity-40 text-slate-600 border-slate-900 cursor-not-allowed'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
          <span>السؤال السابق</span>
        </button>

        {/* Current score badge */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-num tabular-nums">
          <span>النقاط المجمعة:</span>
          <span className="text-amber-400 font-bold">{score.toLocaleString()}</span>
        </div>

        {/* Next Question / Finish Button */}
        {isCurrentAnswered ? (
          <button
            onClick={() => advanceQuestion(currentQIndex + 1)}
            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-md shadow-cyan-500/20"
          >
            <span>{currentQIndex + 1 >= questions.length ? 'إكمال المستوى' : 'السؤال التالي'}</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        ) : (
          <div className="text-xs text-slate-500">اختر إجابة للمتابعة</div>
        )}
      </div>

      {/* Educational Explanation Box (when answered) */}
      {isCurrentAnswered && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col gap-2 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <BookOpen className="w-4 h-4" />
            <span>معلومة وثائقية:</span>
          </div>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed text-right">
            {currentQuestion.explanation}
          </p>
        </div>
      )}

      {/* Out of Hearts Modal (Penalty State with Coin Refill Option) */}
      {isOutOfHearts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#0E1322] border border-rose-500/40 rounded-2xl p-6 max-w-md w-full flex flex-col items-center text-center gap-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white font-heading">
                نفدت طاقة المحاولات (القلوب)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                لقد استهلكت كل القلوب المتاحة في هذا المستوى بسبب الإجابات الخاطئة
              </p>
            </div>

            <div className="w-full flex flex-col gap-2.5">
              <button
                onClick={handleRefillHeartsWithCoins}
                disabled={stats.coins < 30}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  stats.coins >= 30
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 cursor-pointer shadow-lg'
                    : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>إعادة شحن 5 قلوب كاملة (30 قطعة ذهبية)</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  onExit();
                }}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors cursor-pointer"
              >
                العودة لخارطة المستويات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
