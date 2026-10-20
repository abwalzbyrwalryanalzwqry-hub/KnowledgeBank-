import React, { useState, useEffect } from 'react';
import { Undo2, RotateCcw } from 'lucide-react';
import type { OrderChallenge } from '../../../content/types';
import { ChallengeInputProps, primaryBtn, ghostBtn } from './shared';

export function OrderInput({ challenge, onSubmit, solved }: ChallengeInputProps<OrderChallenge>) {
  const [picked, setPicked] = useState<number[]>([]);
  const [shake, setShake] = useState(0);
  useEffect(() => setPicked([]), [challenge.id]);
  const sep = challenge.unit === 'letters' ? '' : ' ';
  const built = picked.map((i) => challenge.tiles[i]).join(sep);
  const complete = picked.length === challenge.tiles.length;

  const check = () => {
    if (!onSubmit({ kind: 'order', value: built })) setShake((s) => s + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        key={shake}
        className={`min-h-16 rounded-2xl border-2 border-dashed px-4 py-3 flex items-center justify-center text-2xl sm:text-3xl font-bold tracking-wide text-center ${
          solved ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200 hz-pop' : shake ? 'border-rose-500/60 hz-shake text-white' : 'border-slate-600 text-white'
        }`}
        aria-live="polite"
        aria-label="ترتيبك الحالي"
      >
        {solved ? challenge.answer : built || <span className="text-base font-normal text-slate-500">اضغط على القطع بالترتيب الصحيح</span>}
      </div>
      {!solved && (
        <>
          <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="القطع">
            {challenge.tiles.map((t, i) => {
              const used = picked.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={used}
                  onClick={() => setPicked((p) => [...p, i])}
                  className={`min-w-12 h-12 px-3 rounded-xl border text-xl font-bold transition-all cursor-pointer ${
                    used ? 'opacity-25 border-slate-800 bg-slate-900' : 'border-cyan-500/40 bg-slate-800 hover:bg-cyan-500/20 text-white'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button type="button" className={ghostBtn} onClick={() => setPicked((p) => p.slice(0, -1))} disabled={!picked.length}>
              <Undo2 className="w-4 h-4" /> تراجع
            </button>
            <button type="button" className={ghostBtn} onClick={() => setPicked([])} disabled={!picked.length}>
              <RotateCcw className="w-4 h-4" /> مسح
            </button>
            <button type="button" className={primaryBtn} onClick={check} disabled={!complete}>
              تحقق
            </button>
          </div>
        </>
      )}
    </div>
  );
}
