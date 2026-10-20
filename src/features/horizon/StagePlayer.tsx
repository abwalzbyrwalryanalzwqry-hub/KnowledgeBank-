import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowRight, Lightbulb, CheckCircle2, XCircle, ChevronLeft, RotateCcw, Star, Coins, Trophy, SkipForward, Loader2, AlertTriangle, BookOpen, ExternalLink, Award,
} from 'lucide-react';
import type { PlayerStats } from '../../types/game';
import type { Challenge, PlayableStage } from '../../content/types';
import { STAGE_TYPE_LABELS, DIFFICULTY_LABELS, KIND_LABELS } from '../../content/types';
import { checkAnswer, describeCorrectAnswer, type PlayerAnswer } from '../../content/answer';
import { loadPlayableStage, manifest } from '../../content/loader';
import {
  applyChallengeSolved, recordWrong, revealHint, applyStageCompleted, markStageStarted, challengePointsFor, starsFor,
  ACHIEVEMENTS, PENALTY_STEP, MIN_POINTS_RATIO, isStageUnlocked,
} from '../../content/progress';
import { applyHorizon, getHorizon } from '../../game/horizonRewards';
import { sound } from '../../utils/audio';
import { ChallengeView } from './challenges/ChallengeView';
import { primaryBtn, ghostBtn } from './challenges/shared';

interface Props {
  stageId: string;
  stats: PlayerStats;
  onCommit: (updater: (prev: PlayerStats) => PlayerStats) => PlayerStats;
  onExit: () => void;
  onOpenStage: (stageId: string) => void;
}

type Feedback = { type: 'correct'; points: number; already: boolean } | { type: 'wrong' } | null;

interface Result {
  stars: number;
  firstTime: boolean;
  completionPoints: number;
  coins: number;
  challengePoints: number;
  achievements: string[];
  mistakes: number;
  hints: number;
}

export function StagePlayer({ stageId, stats, onCommit, onExit, onOpenStage }: Props) {
  const [data, setData] = useState<PlayableStage | null | undefined>(undefined);
  const [phase, setPhase] = useState<'intro' | 'play' | 'done' | 'failed'>('intro');
  const [index, setIndex] = useState(0);
  const [solvedNow, setSolvedNow] = useState<Record<string, boolean>>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [hintsLocal, setHintsLocal] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [attemptPoints, setAttemptPoints] = useState(0);
  const [attemptCoins, setAttemptCoins] = useState(0);
  const [attemptAch, setAttemptAch] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const finishing = useRef(false);

  useEffect(() => {
    let alive = true;
    setData(undefined);
    loadPlayableStage(stageId)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [stageId]);

  const resetAttempt = () => {
    setIndex(0);
    setSolvedNow({});
    setSkipped([]);
    setMistakes(0);
    setHintsLocal({});
    setFeedback(null);
    setAttemptPoints(0);
    setAttemptCoins(0);
    setAttemptAch([]);
    setResult(null);
    finishing.current = false;
  };

  useEffect(() => {
    resetAttempt();
    setPhase('intro');
  }, [stageId]);

  const horizon = getHorizon(stats);
  const stage = data?.stage;
  const challenges = data?.challenges ?? [];
  const current: Challenge | undefined = challenges[index];
  const isSolved = current ? Boolean(solvedNow[current.id]) : false;
  const minSolved = stage?.completion.minSolved ?? challenges.length;
  const maxMistakes = stage?.completion.maxMistakes ?? null;
  const allowedSkips = Math.max(0, challenges.length - minSolved);
  const prevProgress = stage ? horizon.stages[stage.id] : undefined;

  const groupStages = useMemo(
    () => (stage ? manifest.stageIndex.filter((s) => s.groupId === stage.groupId).sort((a, b) => a.order - b.order) : []),
    [stage]
  );
  const nextStage = useMemo(() => {
    if (!stage) return null;
    const i = groupStages.findIndex((s) => s.id === stage.id);
    return groupStages[i + 1] ?? null;
  }, [groupStages, stage]);

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-slate-300">
        <Loader2 className="w-6 h-6 animate-spin" /> جارٍ تحميل المرحلة...
      </div>
    );
  }
  if (data === null || !stage || challenges.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 flex flex-col items-center gap-4">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <h2 className="text-xl font-bold text-white">هذه المرحلة غير متاحة للعب</h2>
        <p className="text-slate-400">قد تكون قيد المراجعة أو بلا أسئلة صالحة. لا تُعرض إلا المراحل المنشورة والمكتملة.</p>
        <button className={ghostBtn} onClick={onExit}>
          <ArrowRight className="w-4 h-4" /> العودة
        </button>
      </div>
    );
  }

  const persistedHints = horizon.solved[current?.id ?? ''] ? 0 : horizon.hintsRevealed[current?.id ?? ''] ?? 0;
  const shownHints = current ? Math.max(hintsLocal[current.id] ?? 0, persistedHints) : 0;
  const alreadySolvedEver = current ? Boolean(horizon.solved[current.id]) : false;
  const potential = current
    ? alreadySolvedEver
      ? 0
      : challengePointsFor(current.points, horizon.hintsRevealed[current.id] ?? 0, horizon.wrongAttempts[current.id] ?? 0)
    : 0;

  const start = () => {
    sound.playClick();
    onCommit((prev) => ({ ...prev, horizon: markStageStarted(getHorizon(prev), stage.id) }));
    resetAttempt();
    setPhase('play');
  };

  const handleSubmit = (answer: PlayerAnswer): boolean => {
    if (!current || isSolved || phase !== 'play') return false;
    const correct = checkAnswer(current, answer);
    if (correct) {
      let gained = 0;
      let already = false;
      let coins = 0;
      let ach: string[] = [];
      onCommit((prev) => {
        const { stats: next, delta } = applyHorizon(prev, manifest, (p) => {
          already = Boolean(p.solved[current.id]);
          return applyChallengeSolved(p, current);
        });
        gained = delta.points;
        coins = delta.coins;
        ach = delta.newAchievements;
        return { ...next, totalCorrect: next.totalCorrect + 1, totalAnswered: next.totalAnswered + 1 };
      });
      setSolvedNow((s) => ({ ...s, [current.id]: true }));
      setAttemptPoints((p) => p + gained);
      setAttemptCoins((c) => c + coins);
      if (ach.length) setAttemptAch((a) => [...a, ...ach]);
      setFeedback({ type: 'correct', points: gained, already });
      sound.playCorrect();
      return true;
    }
    onCommit((prev) => {
      const { stats: next } = applyHorizon(prev, manifest, (p) => ({ progress: recordWrong(p, current) }));
      return { ...next, totalAnswered: next.totalAnswered + 1 };
    });
    const m = mistakes + 1;
    setMistakes(m);
    setFeedback({ type: 'wrong' });
    sound.playWrong();
    if (maxMistakes !== null && m > maxMistakes) setPhase('failed');
    return false;
  };

  const showHint = () => {
    if (!current || shownHints >= current.hints.length) return;
    sound.playClick();
    setHintsLocal((h) => ({ ...h, [current.id]: shownHints + 1 }));
    if (!alreadySolvedEver && shownHints >= persistedHints) {
      onCommit((prev) => ({ ...prev, horizon: revealHint(getHorizon(prev), current) }));
    }
  };

  const totalHintsUsed = Object.values(hintsLocal).reduce((a, b) => a + b, 0);

  const finish = (solvedCount: number) => {
    if (finishing.current) return;
    finishing.current = true;
    let res: Result | null = null;
    onCommit((prev) => {
      let out: ReturnType<typeof applyStageCompleted> | null = null;
      const { stats: next, delta } = applyHorizon(prev, manifest, (p) => {
        out = applyStageCompleted(p, stage, {
          stageId: stage.id,
          solvedCount,
          total: challenges.length,
          mistakes,
          hints: totalHintsUsed,
          score: attemptPoints,
        });
        return out;
      });
      const o = out as unknown as ReturnType<typeof applyStageCompleted>;
      res = {
        stars: o.stars,
        firstTime: o.firstTime,
        completionPoints: o.delta.points,
        coins: delta.coins + attemptCoins,
        challengePoints: attemptPoints,
        achievements: [...attemptAch, ...delta.newAchievements],
        mistakes,
        hints: totalHintsUsed,
      };
      return { ...next, totalGames: next.totalGames + 1 };
    });
    setResult(res);
    setPhase('done');
    sound.playVictory();
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.65 }, disableForReducedMotion: true });
  };

  const goNext = () => {
    setFeedback(null);
    const solvedCount = Object.keys(solvedNow).length;
    if (index + 1 < challenges.length) setIndex(index + 1);
    else finish(solvedCount);
  };

  const skip = () => {
    if (!current || skipped.length >= allowedSkips) return;
    setSkipped((s) => [...s, current.id]);
    goNext();
  };

  // ---------------------------------------------------------------------------
  // الواجهة
  // ---------------------------------------------------------------------------
  const header = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <button className={ghostBtn} onClick={onExit}>
        <ArrowRight className="w-4 h-4" /> المراحل
      </button>
      <div className="text-start sm:text-center flex-1 min-w-0">
        <h2 className="text-lg sm:text-xl font-bold text-white truncate">{stage.title}</h2>
        <p className="text-xs text-slate-400">
          {STAGE_TYPE_LABELS[stage.type]} · {DIFFICULTY_LABELS[stage.difficulty]}
        </p>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-sm text-amber-200 font-num" aria-label="نقاط هذه المحاولة">
        <Trophy className="w-4 h-4" /> {attemptPoints}
      </div>
    </div>
  );

  if (phase === 'intro') {
    return (
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
        {header}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 flex flex-col gap-5">
          {stage.description && <p className="text-slate-300 leading-relaxed">{stage.description}</p>}
          <ul className="grid sm:grid-cols-2 gap-3 text-sm">
            <li className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
              <span className="text-slate-400 block">عدد التحديات</span>
              <span className="text-white font-bold font-num text-lg">{challenges.length}</span>
            </li>
            <li className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
              <span className="text-slate-400 block">مكافأة الإكمال الأول</span>
              <span className="text-white font-bold font-num text-lg">
                {stage.completionPoints} نقطة · {stage.completionCoins} عملة
              </span>
            </li>
          </ul>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm text-slate-300 leading-loose">
            <h3 className="font-bold text-cyan-200 mb-1">قواعد المرحلة</h3>
            <ul className="list-disc ps-5">
              <li>يمكنك إعادة المحاولة بعد الإجابة الخاطئة{maxMistakes !== null ? `، بحد أقصى ${maxMistakes} أخطاء في المحاولة الواحدة` : ' دون حد'}.</li>
              <li>
                كل تلميح أو محاولة خاطئة يخفض نقاط ذلك التحدي {Math.round(PENALTY_STEP * 100)}٪ (بحد أدنى {Math.round(MIN_POINTS_RATIO * 100)}٪). لا يُخصم شيء من رصيدك.
              </li>
              <li>تُمنح نقاط كل تحدٍ ومكافأة الإكمال مرة واحدة فقط؛ إعادة اللعب تحسّن نجومك.</li>
              <li>النجوم: 3 دون أخطاء ولا تلميحات، 2 حتى خطأين أو تلميحين، 1 لأي إكمال.</li>
              {allowedSkips > 0 && <li>يمكنك تخطي {allowedSkips} تحديات كحد أقصى.</li>}
            </ul>
          </div>
          {prevProgress?.completed && (
            <p className="text-sm text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> أكملت هذه المرحلة سابقًا بأفضل نتيجة {prevProgress.bestStars} نجوم.
            </p>
          )}
          <button className={`${primaryBtn} text-lg py-4`} onClick={start}>
            {prevProgress?.completed ? 'إعادة اللعب' : 'ابدأ المرحلة'}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'failed') {
    return (
      <div className="max-w-xl mx-auto w-full flex flex-col gap-6">
        {header}
        <div className="rounded-3xl border border-rose-500/30 bg-rose-500/5 p-8 text-center flex flex-col items-center gap-4">
          <XCircle className="w-12 h-12 text-rose-400" />
          <h3 className="text-xl font-bold text-white">تجاوزت الحد المسموح من الأخطاء</h3>
          <p className="text-slate-300">لم يُخصم شيء من رصيدك. النقاط التي ربحتها في هذه المحاولة محفوظة.</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button className={primaryBtn} onClick={start}>
              <RotateCcw className="w-4 h-4" /> أعد المحاولة
            </button>
            <button className={ghostBtn} onClick={onExit}>العودة للمراحل</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'done' && result) {
    const nextUnlocked = nextStage ? isStageUnlocked(getHorizon(stats), groupStages, nextStage.id) : false;
    return (
      <div className="max-w-xl mx-auto w-full flex flex-col gap-6">
        {header}
        <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-slate-900/60 p-6 sm:p-8 text-center flex flex-col items-center gap-5 hz-pop">
          <h3 className="text-2xl font-bold text-white">اكتملت المرحلة</h3>
          <div className="flex gap-2" aria-label={`${result.stars} من 3 نجوم`}>
            {[1, 2, 3].map((n) => (
              <Star key={n} className={`w-10 h-10 ${n <= result.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-3 w-full text-sm">
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
              <dt className="text-slate-400">نقاط التحديات</dt>
              <dd className="text-white font-bold font-num text-lg">+{result.challengePoints}</dd>
            </div>
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
              <dt className="text-slate-400">مكافأة الإكمال</dt>
              <dd className="text-white font-bold font-num text-lg">{result.firstTime ? `+${result.completionPoints}` : 'مُنحت سابقًا'}</dd>
            </div>
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
              <dt className="text-slate-400">العملات</dt>
              <dd className="text-amber-300 font-bold font-num text-lg flex items-center justify-center gap-1">
                <Coins className="w-4 h-4" /> +{result.coins}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
              <dt className="text-slate-400">أخطاء / تلميحات</dt>
              <dd className="text-white font-bold font-num text-lg">
                {result.mistakes} / {result.hints}
              </dd>
            </div>
          </dl>
          {result.achievements.length > 0 && (
            <div className="w-full rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-start">
              <p className="font-bold text-amber-200 flex items-center gap-2 mb-1">
                <Award className="w-4 h-4" /> إنجاز جديد
              </p>
              <ul className="text-sm text-slate-200">
                {result.achievements.map((id) => {
                  const a = ACHIEVEMENTS.find((x) => x.id === id);
                  return <li key={id}>{a ? `${a.title} — ${a.description} (+${a.coins} عملة)` : id}</li>;
                })}
              </ul>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {nextStage && nextUnlocked && (
              <button className={`${primaryBtn} flex-1`} onClick={() => onOpenStage(nextStage.id)}>
                المرحلة التالية <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button className={`${ghostBtn} flex-1`} onClick={start}>
              <RotateCcw className="w-4 h-4" /> إعادة اللعب
            </button>
            <button className={`${ghostBtn} flex-1`} onClick={onExit}>
              المراحل
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;
  const progressPct = Math.round((index / challenges.length) * 100);
  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-5">
      {header}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={challenges.length}>
          <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="text-sm text-slate-400 font-num">
          {index + 1} / {challenges.length}
        </span>
        {maxMistakes !== null && (
          <span className="text-xs text-rose-300 font-num" title="الأخطاء المسموحة">
            أخطاء {mistakes}/{maxMistakes}
          </span>
        )}
      </div>

      <article key={current.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7 flex flex-col gap-5 hz-enter">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="px-2 py-1 rounded-md bg-slate-800 text-cyan-300">{KIND_LABELS[current.kind]}</span>
          <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300">{DIFFICULTY_LABELS[current.difficulty]}</span>
          <span className="ms-auto text-slate-400 font-num">
            {alreadySolvedEver && !isSolved ? 'محلول سابقًا (بلا نقاط جديدة)' : isSolved ? '' : `حتى ${potential} نقطة`}
          </span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-white leading-relaxed">{current.prompt}</h3>

        <ChallengeView challenge={current} onSubmit={handleSubmit} solved={isSolved} />

        {/* التلميحات التدريجية */}
        {!isSolved && current.hints.length > 0 && (
          <div className="flex flex-col gap-2">
            {current.hints.slice(0, shownHints).map((h, i) => (
              <p key={i} className="rounded-xl bg-amber-400/10 border border-amber-400/30 px-4 py-2.5 text-amber-100 text-sm flex gap-2 hz-enter">
                <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" /> <span>تلميح {i + 1}: {h}</span>
              </p>
            ))}
            {shownHints < current.hints.length && (
              <button className={`${ghostBtn} self-start text-sm`} onClick={showHint}>
                <Lightbulb className="w-4 h-4 text-amber-300" /> تلميح ({shownHints + 1}/{current.hints.length})
                {!alreadySolvedEver && <span className="text-xs text-slate-400">−{Math.round(PENALTY_STEP * 100)}٪ من نقاط التحدي</span>}
              </button>
            )}
          </div>
        )}

        {/* نتيجة الإجابة */}
        <div aria-live="polite">
          {feedback?.type === 'wrong' && !isSolved && (
            <p className="rounded-xl bg-rose-500/10 border border-rose-500/40 px-4 py-3 text-rose-200 flex items-center gap-2 hz-shake">
              <XCircle className="w-5 h-5 shrink-0" /> إجابة غير صحيحة، حاول مرة أخرى.
            </p>
          )}
          {isSolved && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 p-4 flex flex-col gap-2 hz-pop">
              <p className="text-emerald-200 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> إجابة صحيحة
                <span className="ms-auto font-num text-amber-300">
                  {feedback?.type === 'correct' && feedback.already ? 'لا نقاط مكررة' : `+${feedback?.type === 'correct' ? feedback.points : 0}`}
                </span>
              </p>
              <p className="text-slate-200 text-sm">
                الإجابة: <strong className="text-white">{describeCorrectAnswer(current)}</strong>
              </p>
              {current.explanation && <p className="text-slate-300 text-sm leading-relaxed">{current.explanation}</p>}
              {current.sources && current.sources.length > 0 && (
                <ul className="text-xs text-slate-400 flex flex-col gap-1">
                  {current.sources.map((s, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-300 inline-flex items-center gap-1">
                          {s.title} <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        s.title
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          {!isSolved && skipped.length < allowedSkips && (
            <button className={ghostBtn} onClick={skip}>
              <SkipForward className="w-4 h-4" /> تخطَّ
            </button>
          )}
          {isSolved && (
            <button className={primaryBtn} onClick={goNext} autoFocus>
              {index + 1 < challenges.length ? 'التالي' : 'إنهاء المرحلة'} <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </article>
      <p className="text-center text-xs text-slate-500">
        النجوم المتوقعة الآن: <span className="font-num">{starsFor(mistakes, totalHintsUsed)}</span> / 3
      </p>
    </div>
  );
}
