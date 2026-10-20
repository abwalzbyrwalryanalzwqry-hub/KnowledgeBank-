import React, { useState, useEffect } from 'react';
import type { ObservationChallenge } from '../../../content/types';
import { ChallengeInputProps, primaryBtn } from './shared';

export function ObservationInput({ challenge, onSubmit, solved }: ChallengeInputProps<ObservationChallenge>) {
  const [selected, setSelected] = useState<number[]>([]);
  const [wrong, setWrong] = useState<number[]>([]);
  const multi = challenge.targets.length > 1;
  useEffect(() => {
    setSelected([]);
    setWrong([]);
  }, [challenge.id]);

  const click = (i: number) => {
    if (solved) return;
    if (!multi) {
      if (!onSubmit({ kind: 'observation', selected: [i] })) setWrong((w) => [...w, i]);
      return;
    }
    setWrong([]);
    setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : s.length < challenge.targets.length ? [...s, i] : s));
  };

  const check = () => {
    if (!onSubmit({ kind: 'observation', selected })) {
      setWrong(selected.filter((i) => !challenge.targets.includes(i)));
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="grid gap-1.5 sm:gap-2 p-2 rounded-2xl bg-slate-950/60 border border-slate-800"
        style={{ gridTemplateColumns: `repeat(${challenge.columns}, minmax(0, 1fr))` }}
        role="grid"
        aria-label="شبكة الملاحظة"
      >
        {challenge.cells.map((cell, i) => {
          const isTarget = solved && challenge.targets.includes(i);
          const isSel = selected.includes(i);
          const isWrong = wrong.includes(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() => click(i)}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl text-2xl sm:text-3xl grid place-items-center transition-all cursor-pointer ${
                isTarget
                  ? 'bg-emerald-500/30 ring-2 ring-emerald-400 hz-pop'
                  : isWrong
                  ? 'bg-rose-500/20 ring-2 ring-rose-500/60 hz-shake'
                  : isSel
                  ? 'bg-cyan-500/25 ring-2 ring-cyan-400'
                  : 'bg-slate-800/70 hover:bg-slate-700'
              }`}
              aria-label={`خانة ${i + 1}`}
              aria-pressed={isSel}
            >
              {cell}
            </button>
          );
        })}
      </div>
      {multi && !solved && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400 font-num">
            المحدد: {selected.length} / {challenge.targets.length}
          </span>
          <button type="button" className={primaryBtn} onClick={check} disabled={selected.length !== challenge.targets.length}>
            تحقق
          </button>
        </div>
      )}
    </div>
  );
}
