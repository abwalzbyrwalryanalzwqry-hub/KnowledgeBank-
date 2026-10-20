import React, { useState, useEffect } from 'react';
import { Bot, User, Swords, CheckCircle, XCircle, ArrowLeft, Trophy } from 'lucide-react';
import { Question, GameSettings } from '../types/game';
import { sound } from '../utils/audio';

interface CortexDuelProps {
  questions: Question[];
  settings: GameSettings;
  onFinishGame: (won: boolean, playerScore: number, aiScore: number, statsUpdate: { correct: number; total: number }) => void;
  onExit: () => void;
}

export const CortexDuel: React.FC<CortexDuelProps> = ({
  questions,
  settings,
  onFinishGame,
  onExit,
}) => {
  const [duelType, setDuelType] = useState<'AI' | 'PVP'>('AI');
  const [round, setRound] = useState(1);
  const totalRounds = 5;

  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0); // AI or Player 2

  const [activePlayerTurn, setActivePlayerTurn] = useState<1 | 2>(1);
  const [p1Answered, setP1Answered] = useState<number | null>(null);
  const [p2Answered, setP2Answered] = useState<number | null>(null);
  const [isRoundRevealed, setIsRoundRevealed] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const currentQuestion = questions[(round - 1) % questions.length];

  // AI answer simulation
  useEffect(() => {
    if (duelType === 'AI' && activePlayerTurn === 2 && !isRoundRevealed) {
      setAiThinking(true);
      const thinkTime = 1200 + Math.random() * 1500;

      const timer = setTimeout(() => {
        setAiThinking(false);
        // AI accuracy depends on question difficulty:
        // easy: 85%, medium: 70%, hard: 55%, expert: 45%
        const accuracyMap = { easy: 0.85, medium: 0.7, hard: 0.55, expert: 0.45 };
        const roll = Math.random();
        let aiChoice = currentQuestion.correctIndex;
        if (roll > accuracyMap[currentQuestion.difficulty]) {
          // wrong choice
          const wrong = [0, 1, 2, 3].filter((i) => i !== currentQuestion.correctIndex);
          aiChoice = wrong[Math.floor(Math.random() * wrong.length)];
        }

        setP2Answered(aiChoice);
        resolveRound(p1Answered!, aiChoice);
      }, thinkTime);

      return () => clearTimeout(timer);
    }
  }, [activePlayerTurn, duelType, isRoundRevealed]);

  const handleP1Select = (idx: number) => {
    if (p1Answered !== null) return;
    sound.playClick();
    setP1Answered(idx);

    if (duelType === 'AI') {
      setActivePlayerTurn(2);
    } else {
      // In PVP mode, switch to Player 2
      setActivePlayerTurn(2);
    }
  };

  const handleP2Select = (idx: number) => {
    if (p2Answered !== null) return;
    sound.playClick();
    setP2Answered(idx);
    resolveRound(p1Answered!, idx);
  };

  const resolveRound = (p1Choice: number, p2Choice: number) => {
    setIsRoundRevealed(true);
    const p1Correct = p1Choice === currentQuestion.correctIndex;
    const p2Correct = p2Choice === currentQuestion.correctIndex;

    if (p1Correct) {
      sound.playCorrect();
      setPlayer1Score((prev) => prev + 100);
    }
    if (p2Correct) {
      setPlayer2Score((prev) => prev + 100);
    }
    if (!p1Correct && !p2Correct) {
      sound.playWrong();
    }
  };

  const advanceNextRound = () => {
    if (round >= totalRounds) {
      const won = player1Score >= player2Score;
      onFinishGame(won, player1Score, player2Score, {
        correct: Math.round(player1Score / 100),
        total: totalRounds,
      });
      return;
    }

    setRound((prev) => prev + 1);
    setP1Answered(null);
    setP2Answered(null);
    setIsRoundRevealed(false);
    setActivePlayerTurn(1);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Top Header & Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
            <Swords className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white font-heading">مبارزة النواة المعرفية</h2>
            <p className="text-xs text-slate-400">الجولة {round} من {totalRounds}</p>
          </div>
        </div>

        {/* Duel Type Switch */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => {
                sound.playClick();
                setDuelType('AI');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                duelType === 'AI' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              ضد الذكاء الاصطناعي
            </button>
            <button
              onClick={() => {
                sound.playClick();
                setDuelType('PVP');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                duelType === 'PVP' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              لاعبان (جهاز واحد)
            </button>
          </div>

          <button
            onClick={onExit}
            className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 cursor-pointer"
          >
            إنهاء
          </button>
        </div>
      </div>

      {/* Opponent Showcase & Matchup Strip */}
      <div className="grid grid-cols-2 gap-4">
        {/* Player 1 Card */}
        <div
          className={`rounded-2xl border p-4 flex items-center justify-between transition-all ${
            activePlayerTurn === 1 && !isRoundRevealed
              ? 'bg-cyan-950/40 border-cyan-400 holo-border'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center">
              <User className="w-6 h-6 text-cyan-300" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">اللاعب الأول</div>
              <div className="text-base font-bold text-white">أنت</div>
            </div>
          </div>
          <div className="font-num tabular-nums text-xl font-black text-cyan-400">
            {player1Score}
          </div>
        </div>

        {/* Player 2 / AI Card */}
        <div
          className={`rounded-2xl border p-4 flex items-center justify-between transition-all ${
            activePlayerTurn === 2 && !isRoundRevealed
              ? 'bg-violet-950/40 border-violet-400 holo-border'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-violet-500/40 shrink-0">
              {duelType === 'AI' ? (
                <img
                  src="/src/assets/images/cortex_sage_avatar_1792451916060.jpg"
                  alt="سديم الذكاء الاصطناعي"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-violet-950 flex items-center justify-center">
                  <User className="w-6 h-6 text-violet-400" />
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">
                {duelType === 'AI' ? 'المنافس الاصطناعي' : 'اللاعب الثاني'}
              </div>
              <div className="text-base font-bold text-white">
                {duelType === 'AI' ? 'سديم الأفق' : 'الخصم'}
              </div>
            </div>
          </div>
          <div className="font-num tabular-nums text-xl font-black text-violet-400">
            {player2Score}
          </div>
        </div>
      </div>

      {/* Main Duel Question Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 md:p-8 holo-border min-h-[160px] flex flex-col justify-center">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-cyan-400 font-code">
            سؤال الجولة {round}
          </span>
          {aiThinking && (
            <span className="text-xs font-semibold text-violet-400 animate-pulse">
              سديم يحلل الخيارات...
            </span>
          )}
        </div>
        <h3 className="text-xl md:text-2xl font-black text-white font-heading leading-relaxed">
          {currentQuestion.question}
        </h3>
      </div>

      {/* Options Selection Zone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {currentQuestion.options.map((opt, idx) => {
          const isCorrect = currentQuestion.correctIndex === idx;
          const isP1Choice = p1Answered === idx;
          const isP2Choice = p2Answered === idx;

          let optionStyle =
            'bg-slate-900/70 border-slate-800 text-slate-200 hover:border-cyan-500/60 hover:bg-slate-850';

          if (isRoundRevealed) {
            if (isCorrect) {
              optionStyle = 'bg-emerald-950/70 border-emerald-500 text-white holo-emerald-border';
            } else if (isP1Choice || isP2Choice) {
              optionStyle = 'bg-rose-950/60 border-rose-500 text-white';
            } else {
              optionStyle = 'opacity-40 bg-slate-950 border-slate-900 text-slate-500';
            }
          }

          const canClick =
            !isRoundRevealed &&
            ((activePlayerTurn === 1 && p1Answered === null) ||
              (activePlayerTurn === 2 && duelType === 'PVP' && p2Answered === null));

          return (
            <button
              key={idx}
              onClick={() => {
                if (activePlayerTurn === 1) handleP1Select(idx);
                else if (duelType === 'PVP') handleP2Select(idx);
              }}
              disabled={!canClick}
              className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-center min-h-[64px] ${optionStyle} ${
                canClick ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-100 text-base md:text-lg">{opt}</span>

                {/* Badges showing who chose this option */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isP1Choice && (
                    <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded">
                      أنت
                    </span>
                  )}
                  {isP2Choice && (
                    <span className="text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40 px-2 py-0.5 rounded">
                      {duelType === 'AI' ? 'سديم' : 'الخصم'}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Next Round Controller */}
      {isRoundRevealed && (
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-4 px-6 backdrop-blur-md">
          <p className="text-xs md:text-sm text-slate-300">
            {currentQuestion.explanation}
          </p>

          <button
            onClick={advanceNextRound}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-bold text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-lg shadow-cyan-500/20"
          >
            <span>{round >= totalRounds ? 'عرض النتيجة النهائية' : 'الجولة التالية'}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
