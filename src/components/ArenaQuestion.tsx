import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Zap, Eye, Clock, RefreshCw, CheckCircle2, XCircle, ArrowLeft, Sparkles, BookOpen } from 'lucide-react';
import { Question, LifelineState, GameSettings } from '../types/game';
import { CATEGORY_META, ERAS_META } from '../data/questions';
import { sound } from '../utils/audio';
import { speech } from '../utils/speech';
import { simulateRadarPercentages } from '../game/rules';

interface ArenaQuestionProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  timeLimitSeconds?: number;
  onAnswer: (selectedIndex: number, timeTakenSeconds: number) => void;
  lifelines?: LifelineState;
  onUseLifeline?: (lifeline: keyof LifelineState) => void;
  settings: GameSettings;
  streakCount?: number;
  scoreDisplay?: number;
  isDuelMode?: boolean;
  duelOpponentName?: string;
}

export const ArenaQuestion: React.FC<ArenaQuestionProps> = ({
  question,
  questionNumber,
  totalQuestions,
  timeLimitSeconds = 25,
  onAnswer,
  lifelines,
  onUseLifeline,
  settings,
  streakCount = 0,
  scoreDisplay,
  isDuelMode,
  duelOpponentName,
}) => {
  const [timeLeft, setTimeLeft] = useState(timeLimitSeconds);
  const [isFrozen, setIsFrozen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [radarData, setRadarData] = useState<number[] | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const freezeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const categoryMeta = CATEGORY_META[question.category] || CATEGORY_META.history;
  const eraMeta = ERAS_META[question.era] || ERAS_META.ancient;

  // Reset states on new question
  useEffect(() => {
    setTimeLeft(timeLimitSeconds);
    setSelectedOption(null);
    setIsAnswered(false);
    setHiddenOptions([]);
    setRadarData(null);
    setIsFrozen(false);
    speech.stop();
    setIsSpeaking(false);

    if (settings.speechEnabled) {
      handleReadQuestion();
    }
  }, [question.id, timeLimitSeconds, settings.speechEnabled]);

  // Main countdown loop
  useEffect(() => {
    if (isAnswered || isFrozen) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeExpire();
          return 0;
        }
        if (prev <= 6) {
          sound.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAnswered, isFrozen, question.id]);

  // Cleanup speech and freeze timer
  useEffect(() => {
    return () => {
      speech.stop();
      if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);
    };
  }, []);

  // Keyboard shortcut listener (keys 1-4 for options)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnswered) {
        if (e.key === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          proceedNext();
        }
        return;
      }
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (!hiddenOptions.includes(idx)) {
          handleSelectOption(idx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, selectedOption, hiddenOptions]);

  const handleTimeExpire = () => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(-1); // Timed out
    sound.playWrong();
  };

  const handleSelectOption = (index: number) => {
    if (isAnswered || hiddenOptions.includes(index)) return;

    speech.stop();
    setIsSpeaking(false);
    setSelectedOption(index);
    setIsAnswered(true);

    if (timerRef.current) clearInterval(timerRef.current);

    const timeSpent = timeLimitSeconds - timeLeft;
    const isCorrect = index === question.correctIndex;

    if (isCorrect) {
      sound.playCorrect();
    } else {
      sound.playWrong();
    }
  };

  const proceedNext = () => {
    if (selectedOption === null) return;
    const timeSpent = timeLimitSeconds - timeLeft;
    onAnswer(selectedOption, timeSpent);
  };

  const handleReadQuestion = () => {
    if (isSpeaking) {
      speech.stop();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const textToRead = `${question.question}. الخيارات: الأول: ${question.options[0]}. الثاني: ${question.options[1]}. الثالث: ${question.options[2]}. الرابع: ${question.options[3]}`;
    speech.speak(textToRead, () => setIsSpeaking(false));
  };

  // Quantum Lifelines Handlers
  const handleFiftyFifty = () => {
    if (!lifelines?.fiftyFifty || isAnswered || hiddenOptions.length > 0) return;
    sound.playLifeline();
    onUseLifeline?.('fiftyFifty');

    const wrong = [0, 1, 2, 3].filter((i) => i !== question.correctIndex);
    const toHide = wrong.sort(() => 0.5 - Math.random()).slice(0, 2);
    setHiddenOptions(toHide);
  };

  const handleRadarOracle = () => {
    if (!lifelines?.radarOracle || isAnswered || radarData) return;
    sound.playLifeline();
    onUseLifeline?.('radarOracle');
    const pcts = simulateRadarPercentages(question.correctIndex, question.difficulty);
    setRadarData(pcts);
  };

  const handleTimeFreeze = () => {
    if (!lifelines?.timeFreeze || isAnswered || isFrozen) return;
    sound.playLifeline();
    onUseLifeline?.('timeFreeze');
    setIsFrozen(true);
    if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);
    freezeTimerRef.current = setTimeout(() => {
      setIsFrozen(false);
    }, 15000);
  };

  const handleMatrixSwap = () => {
    if (!lifelines?.matrixSwap || isAnswered) return;
    sound.playLifeline();
    onUseLifeline?.('matrixSwap');
  };

  // Font size classes for high accessibility
  const fontSizeClass = {
    normal: 'text-lg md:text-2xl',
    large: 'text-xl md:text-3xl',
    xlarge: 'text-2xl md:text-4xl',
  }[settings.fontSize || 'normal'];

  const timerRatio = timeLeft / timeLimitSeconds;
  const strokeDashoffset = 100 - timerRatio * 100;
  const isDangerTime = timeLeft <= 5;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 md:py-6 flex flex-col gap-5">
      {/* Top HUD: Unboxed metadata + Timer Ring + Streaks */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
        {/* Unboxed Metadata (Section 1.A discipline) */}
        <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-slate-400 font-medium">
          <span className="text-cyan-400 font-semibold">{categoryMeta.label}</span>
          <span aria-hidden="true">·</span>
          <span>{eraMeta.name}</span>
          <span aria-hidden="true">·</span>
          <span className="font-num tabular-nums text-slate-300">
            السؤال {questionNumber} من {totalQuestions}
          </span>
          {scoreDisplay !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-num tabular-nums text-amber-400 font-bold">
                {scoreDisplay.toLocaleString()} نقطة
              </span>
            </>
          )}
        </div>

        {/* Status Combo & TTS Readout & Timer */}
        <div className="flex items-center gap-3 shrink-0">
          {streakCount >= 2 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>مضاعف النبض x{streakCount >= 8 ? '3' : streakCount >= 5 ? '2' : '1.5'}</span>
            </div>
          )}

          {/* Voice recitation button */}
          <button
            onClick={handleReadQuestion}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              isSpeaking
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            aria-label="قراءة السؤال بصوت واضح"
            title="المساعد الصوتي للأسئلة"
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Circular Countdown Gauge */}
          <div className="relative w-11 h-11 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={`transition-all duration-300 ${
                  isFrozen
                    ? 'text-cyan-300'
                    : isDangerTime
                    ? 'text-rose-500 animate-pulse'
                    : 'text-cyan-400'
                }`}
                strokeDasharray="100, 100"
                strokeDashoffset={strokeDashoffset}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span
              className={`absolute font-num tabular-nums text-sm font-bold ${
                isFrozen ? 'text-cyan-300' : isDangerTime ? 'text-rose-400' : 'text-slate-200'
              }`}
            >
              {isFrozen ? '❄️' : timeLeft}
            </span>
          </div>
        </div>
      </div>

      {/* Main Holographic Question Surface */}
      <div className="relative bg-slate-900/80 rounded-2xl p-6 md:p-8 holo-border backdrop-blur-sm shadow-xl flex flex-col justify-center min-h-[140px] md:min-h-[170px]">
        {isFrozen && (
          <div className="absolute top-3 left-4 text-xs font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 rounded px-2 py-0.5 animate-pulse">
            تجميد الزمن نشط (15 ثانية)
          </div>
        )}

        <h2
          className={`font-heading font-extrabold text-white leading-relaxed text-right text-balance ${fontSizeClass}`}
        >
          {question.question}
        </h2>
      </div>

      {/* Futuristic Lifelines Toolbar (if available) */}
      {lifelines && (
        <div className="flex items-center justify-center gap-2 md:gap-3 py-1">
          {/* 50:50 Quantum Filter */}
          <button
            onClick={handleFiftyFifty}
            disabled={!lifelines.fiftyFifty || isAnswered || hiddenOptions.length > 0}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              lifelines.fiftyFifty && !isAnswered && hiddenOptions.length === 0
                ? 'bg-slate-900/90 text-cyan-300 border-cyan-500/40 hover:bg-cyan-950/40 hover:border-cyan-400 shadow-sm'
                : 'opacity-40 bg-slate-950 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
            title="حذف إجابتين خاطئتين"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span className="whitespace-nowrap">فلتر الكوانتم (50:50)</span>
          </button>

          {/* AI Oracle Radar */}
          <button
            onClick={handleRadarOracle}
            disabled={!lifelines.radarOracle || isAnswered || radarData !== null}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              lifelines.radarOracle && !isAnswered && radarData === null
                ? 'bg-slate-900/90 text-amber-300 border-amber-500/40 hover:bg-amber-950/40 hover:border-amber-400 shadow-sm'
                : 'opacity-40 bg-slate-950 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
            title="رادار إحصائيات الذكاء الجمعي"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="whitespace-nowrap">رادار الذكاء</span>
          </button>

          {/* Chrono Freeze */}
          <button
            onClick={handleTimeFreeze}
            disabled={!lifelines.timeFreeze || isAnswered || isFrozen}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              lifelines.timeFreeze && !isAnswered && !isFrozen
                ? 'bg-slate-900/90 text-sky-300 border-sky-500/40 hover:bg-sky-950/40 hover:border-sky-400 shadow-sm'
                : 'opacity-40 bg-slate-950 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
            title="تجميد العداد لـ 15 ثانية"
          >
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span className="whitespace-nowrap">تجميد الزمن</span>
          </button>

          {/* Matrix Swap */}
          <button
            onClick={handleMatrixSwap}
            disabled={!lifelines.matrixSwap || isAnswered}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              lifelines.matrixSwap && !isAnswered
                ? 'bg-slate-900/90 text-violet-300 border-violet-500/40 hover:bg-violet-950/40 hover:border-violet-400 shadow-sm'
                : 'opacity-40 bg-slate-950 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
            title="استبدال السؤال بسؤال جديد"
          >
            <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
            <span className="whitespace-nowrap">استبدال المصفوفة</span>
          </button>
        </div>
      )}

      {/* 4 Interactive Option Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {question.options.map((opt, idx) => {
          const isHidden = hiddenOptions.includes(idx);
          const isSelected = selectedOption === idx;
          const isCorrect = question.correctIndex === idx;

          let cardStyle =
            'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-cyan-500/60 hover:bg-slate-850 hover:shadow-md';

          if (isAnswered) {
            if (isCorrect) {
              cardStyle = 'bg-emerald-950/60 border-emerald-500 text-white holo-emerald-border';
            } else if (isSelected) {
              cardStyle = 'bg-rose-950/60 border-rose-500 text-white shadow-rose-900/20';
            } else {
              cardStyle = 'opacity-50 bg-slate-950 border-slate-900 text-slate-500';
            }
          }

          if (isHidden) {
            return (
              <div
                key={idx}
                className="h-16 rounded-xl border border-dashed border-slate-800/60 bg-slate-950/30 flex items-center justify-center opacity-30 select-none"
              >
                <span className="text-xs text-slate-600">تم تفكيك الخيار بواسطة فلتر الكوانتم</span>
              </div>
            );
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectOption(idx)}
              disabled={isAnswered}
              className={`group relative text-right p-4 rounded-xl border transition-all duration-200 flex flex-col justify-center min-h-[68px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${cardStyle}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-code text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 group-hover:text-cyan-300 transition-colors">
                    [{idx + 1}]
                  </span>
                  <span className="font-medium text-base md:text-lg text-slate-100">{opt}</span>
                </div>

                {isAnswered && (
                  <div className="shrink-0">
                    {isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : isSelected ? (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    ) : null}
                  </div>
                )}
              </div>

              {/* Radar prediction bar if activated */}
              {radarData && (
                <div className="mt-2.5 w-full flex items-center gap-2">
                  <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-700"
                      style={{ width: `${radarData[idx]}%` }}
                    />
                  </div>
                  <span className="font-num tabular-nums text-xs font-bold text-amber-300 shrink-0">
                    {radarData[idx]}%
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Answer Reveal & Deep Fact Explanation Sheet */}
      {isAnswered && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 md:p-6 backdrop-blur-md flex flex-col gap-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span className="text-white">الإضاءة المعرفية والشرح التوثيقي:</span>
            </div>

            <button
              onClick={proceedNext}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{questionNumber >= totalQuestions ? 'عرض النتيجة' : 'السؤال التالي'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed text-right">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
};
