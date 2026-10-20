import React, { useState, useEffect } from 'react';
import { KeyRound, Check } from 'lucide-react';
import type { PasswordChallenge } from '../../../content/types';
import { matchText, passwordLetter } from '../../../content/answer';
import { ChallengeInputProps, inputClass, primaryBtn, ghostBtn } from './shared';

export function PasswordInput({ challenge, onSubmit, solved }: ChallengeInputProps<PasswordChallenge>) {
  const [clueValues, setClueValues] = useState<string[]>([]);
  const [clueSolved, setClueSolved] = useState<boolean[]>([]);
  const [clueWrong, setClueWrong] = useState<number | null>(null);
  const [finalValue, setFinalValue] = useState('');
  const [finalShake, setFinalShake] = useState(0);

  useEffect(() => {
    setClueValues(challenge.clues.map(() => ''));
    setClueSolved(challenge.clues.map(() => false));
    setFinalValue('');
  }, [challenge.id]);

  const tryClue = (i: number) => {
    const c = challenge.clues[i];
    // أدلة كلمة السر تُتحقق محليًا بالقواعد نفسها ولا تُحتسب أخطاء في المرحلة
    if (matchText(clueValues[i] ?? '', c.answer, c.acceptedAnswers, challenge.match)) {
      setClueSolved((s) => s.map((v, j) => (j === i ? true : v)));
      setClueWrong(null);
    } else {
      setClueWrong(i);
      setTimeout(() => setClueWrong(null), 600);
    }
  };

  const submitFinal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalValue.trim()) return;
    if (!onSubmit({ kind: 'password', value: finalValue })) setFinalShake((s) => s + 1);
  };

  return (
    <div className="flex flex-col gap-5">
      <ol className="flex flex-col gap-3">
        {challenge.clues.map((c, i) => {
          const done = solved || clueSolved[i];
          const letters = Array.from(c.answer.replace(/\s+/g, ''));
          return (
            <li key={i} className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 flex flex-col gap-2">
              <div className="flex items-start gap-2 text-slate-200">
                <span className="shrink-0 w-6 h-6 rounded-md bg-slate-800 text-cyan-300 text-xs grid place-items-center font-bold">{i + 1}</span>
                <span className="leading-relaxed">{c.clue}</span>
                <span className="ms-auto shrink-0 text-xs text-slate-400">الحرف رقم {c.letterIndex + 1}</span>
              </div>
              {done ? (
                <div className="flex gap-1 flex-wrap" aria-label={`الإجابة: ${c.answer}`}>
                  {letters.map((l, j) => (
                    <span
                      key={j}
                      className={`w-9 h-9 grid place-items-center rounded-lg text-lg font-bold ${
                        j === c.letterIndex ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              ) : (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    tryClue(i);
                  }}
                >
                  <input
                    className={`${inputClass} py-2 text-base ${clueWrong === i ? 'hz-shake border-rose-500/60' : ''}`}
                    value={clueValues[i] ?? ''}
                    onChange={(e) => setClueValues((v) => v.map((x, j) => (j === i ? e.target.value : x)))}
                    placeholder="إجابة الدليل"
                    aria-label={`إجابة الدليل ${i + 1}`}
                    autoComplete="off"
                  />
                  <button type="submit" className={ghostBtn} disabled={!(clueValues[i] ?? '').trim()}>
                    <Check className="w-4 h-4" />
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ol>

      <div className="rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-amber-200 font-bold">
          <KeyRound className="w-5 h-5" /> كلمة السر
        </div>
        <div className="flex gap-2 justify-center" aria-label="حروف كلمة السر المكتشفة">
          {challenge.clues.map((c, i) => (
            <span key={i} className="w-11 h-11 grid place-items-center rounded-xl border border-amber-400/50 bg-slate-950 text-xl font-bold text-amber-300">
              {solved || clueSolved[i] ? passwordLetter(c.answer, c.letterIndex) : '؟'}
            </span>
          ))}
        </div>
        <form onSubmit={submitFinal} className="flex flex-col sm:flex-row gap-2">
          <input
            key={finalShake}
            className={`${inputClass} ${finalShake ? 'hz-shake border-rose-500/60' : ''}`}
            value={solved ? challenge.answer : finalValue}
            onChange={(e) => setFinalValue(e.target.value)}
            disabled={solved}
            placeholder="اكتب كلمة السر"
            aria-label="كلمة السر"
            autoComplete="off"
          />
          <button type="submit" className={primaryBtn} disabled={solved || !finalValue.trim()}>
            افتح الخزنة
          </button>
        </form>
      </div>
    </div>
  );
}
