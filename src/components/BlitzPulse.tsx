import React, { useState, useEffect, useRef } from 'react';
import { Flame, Clock, Zap, ArrowLeft, Trophy, AlertTriangle } from 'lucide-react';
import { Question, GameSettings } from '../types/game';
import { sound } from '../utils/audio';

interface BlitzPulseProps {
  questions: Question[];
  settings: GameSettings;
  onFinishGame: (finalScore: number, statsUpdate: { correct: number; total: number; highestStreak: number }) => void;
  onExit: () => void;
}

export const BlitzPulse: React.FC<BlitzPulseProps> = ({
  questions,
  settings,
  onFinishGame,
  onExit,
}) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; isPositive: boolean } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentQuestion = questions[currentIndex % questions.length];

  // Adrenaline Countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleGameOver();
          return 0;
        }
        if (prev <= 8) {
          sound.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [score]);

  const handleGameOver = () => {
    sound.playWrong();
    onFinishGame(score, {
      correct: correctAnswers,
      total: totalAnswered,
      highestStreak: highestStreak,
    });
  };

  const handleAnswer = (optionIdx: number) => {
    const isCorrect = optionIdx === currentQuestion.correctIndex;
    const newTotal = totalAnswered + 1;
    setTotalAnswered(newTotal);

    if (isCorrect) {
      sound.playCorrect();
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > highestStreak) setHighestStreak(newStreak);

      const multiplier = newStreak >= 8 ? 3.0 : newStreak >= 5 ? 2.0 : newStreak >= 3 ? 1.5 : 1.0;
      const pointsGained = Math.round(100 * multiplier);
      setScore((prev) => prev + pointsGained);
      setCorrectAnswers((prev) => prev + 1);

      // +5s time bonus!
      setTimeLeft((prev) => Math.min(90, prev + 5));
      setFeedback({ text: `+5 ثوانٍ | +${pointsGained} نقطة`, isPositive: true });
    } else {
      sound.playWrong();
      setStreak(0);
      // -3s penalty
      setTimeLeft((prev) => Math.max(0, prev - 3));
      setFeedback({ text: `-3 ثوانٍ خسارة زمنية!`, isPositive: false });
    }

    // Clear feedback after 700ms
    setTimeout(() => setFeedback(null), 700);

    // Advance to next question immediately (blitz speed!)
    setCurrentIndex((prev) => prev + 1);
  };

  // Keyboard shortcut listener 1-4
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        handleAnswer(parseInt(e.key, 10) - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, currentQuestion]);

  const isLowTime = timeLeft <= 10;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 flex flex-col gap-5">
      {/* HUD Bar */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl p-4 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <Flame className={`w-5 h-5 ${isLowTime ? 'text-rose-500 animate-bounce' : 'text-rose-400'}`} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-heading">سرعة النبض</h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>النقاط: </span>
              <span className="font-num tabular-nums text-amber-400 font-bold">{score}</span>
              <span aria-hidden="true">·</span>
              <span>السلسلة: </span>
              <span className="font-num tabular-nums text-cyan-400 font-bold">x{streak}</span>
            </div>
          </div>
        </div>

        {/* Big Adrenaline Timer */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-base font-extrabold font-num tabular-nums transition-all ${
              isLowTime
                ? 'bg-rose-950/80 text-rose-300 border-rose-500 animate-pulse shadow-rose-900/40 shadow-lg'
                : 'bg-slate-950 text-cyan-300 border-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{timeLeft} ثانية</span>
          </div>

          <button
            onClick={onExit}
            className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 cursor-pointer"
          >
            إنهاء
          </button>
        </div>
      </div>

      {/* Floating Speed Feedback Indicator */}
      {feedback && (
        <div
          className={`text-center py-1.5 px-4 rounded-xl text-xs font-bold transition-all animate-in fade-in zoom-in-90 ${
            feedback.isPositive
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Blitz Question Box */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 holo-border min-h-[160px] flex flex-col justify-center">
        <div className="text-xs text-cyan-400 font-semibold mb-2">
          سؤال سريع رقم {totalAnswered + 1}
        </div>
        <h3 className="text-xl md:text-2xl font-black text-white font-heading leading-relaxed">
          {currentQuestion.question}
        </h3>
      </div>

      {/* 4 Swift Click Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {currentQuestion.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(idx)}
            className="text-right p-4 rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-800 hover:border-cyan-400 transition-all flex items-center justify-between cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <span className="font-medium text-slate-100 text-base md:text-lg">{opt}</span>
            <span className="font-code text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:text-cyan-300">
              [{idx + 1}]
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
