import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { CrosswordChallenge } from '../../../content/types';
import { crosswordSolution, matchCrosswordCell } from '../../../content/answer';
import { ChallengeInputProps, primaryBtn } from './shared';

export function CrosswordInput({ challenge, onSubmit, solved }: ChallengeInputProps<CrosswordChallenge>) {
  const solution = useMemo(() => crosswordSolution(challenge), [challenge]);
  const [cells, setCells] = useState<Record<string, string>>({});
  const [wrongCells, setWrongCells] = useState<string[]>([]);
  const [direction, setDirection] = useState<'across' | 'down'>('across');
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setCells({});
    setWrongCells([]);
  }, [challenge.id]);

  // ترقيم بدايات الكلمات
  const numbers = useMemo(() => {
    const starts = [...new Set(challenge.entries.map((e) => `${e.row},${e.col}`))].sort((a, b) => {
      const [ar, ac] = a.split(',').map(Number);
      const [br, bc] = b.split(',').map(Number);
      return ar - br || ac - bc;
    });
    return new Map(starts.map((k, i) => [k, i + 1]));
  }, [challenge]);

  const move = (r: number, c: number) => {
    const next = direction === 'across' ? `${r},${c + 1}` : `${r + 1},${c}`;
    const alt = direction === 'across' ? `${r + 1},${c}` : `${r},${c + 1}`;
    const target = solution.has(next) ? next : solution.has(alt) ? alt : null;
    if (target) refs.current[target]?.focus();
  };

  const filled = [...solution.keys()].every((k) => (cells[k] ?? '').trim());

  const check = () => {
    if (!onSubmit({ kind: 'crossword', cells })) {
      setWrongCells([...solution.entries()].filter(([k, l]) => !matchCrosswordCell(cells[k] ?? '', l, challenge.match)).map(([k]) => k));
    } else setWrongCells([]);
  };

  const across = challenge.entries.filter((e) => e.direction === 'across');
  const down = challenge.entries.filter((e) => e.direction === 'down');

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-start">
      <div
        className="grid gap-1.5 p-2 rounded-2xl bg-slate-950/60 border border-slate-800"
        style={{ gridTemplateColumns: `repeat(${challenge.cols}, minmax(0, 1fr))` }}
        dir="rtl"
        role="grid"
        aria-label="شبكة الكلمات المتقاطعة"
      >
        {Array.from({ length: challenge.rows }).flatMap((_, r) =>
          Array.from({ length: challenge.cols }).map((__, c) => {
            const key = `${r},${c}`;
            const letter = solution.get(key);
            if (!letter) return <div key={key} className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-slate-800/30" aria-hidden="true" />;
            const num = numbers.get(key);
            const isWrong = wrongCells.includes(key);
            return (
              <div key={key} className="relative">
                {num && <span className="absolute top-0.5 right-1 text-[10px] text-cyan-300 font-bold pointer-events-none">{num}</span>}
                <input
                  ref={(el) => {
                    refs.current[key] = el;
                  }}
                  value={solved ? letter : cells[key] ?? ''}
                  disabled={solved}
                  onFocus={(e) => e.target.select()}
                  onDoubleClick={() => setDirection((d) => (d === 'across' ? 'down' : 'across'))}
                  onChange={(e) => {
                    const chars = Array.from(e.target.value.replace(/\s+/g, ''));
                    const ch = chars[chars.length - 1] ?? '';
                    setCells((prev) => ({ ...prev, [key]: ch }));
                    setWrongCells((w) => w.filter((x) => x !== key));
                    if (ch) move(r, c);
                  }}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg text-center text-2xl font-bold outline-none border-2 transition-colors ${
                    solved
                      ? 'bg-emerald-500/15 border-emerald-400 text-emerald-100'
                      : isWrong
                      ? 'bg-rose-500/10 border-rose-500/70 text-white'
                      : 'bg-slate-100 border-slate-300 text-slate-900 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40'
                  }`}
                  aria-label={`الخانة صف ${r + 1} عمود ${c + 1}`}
                  autoComplete="off"
                  maxLength={2}
                />
              </div>
            );
          })
        )}
      </div>
      <div className="flex-1 w-full grid sm:grid-cols-2 gap-4 text-sm">
        {[
          ['أفقي (من اليمين)', across],
          ['عمودي (من الأعلى)', down],
        ].map(([label, list]) => (
          <div key={label as string}>
            <h4 className="font-bold text-cyan-300 mb-2">{label as string}</h4>
            <ul className="flex flex-col gap-1.5">
              {(list as typeof across).map((e) => (
                <li key={e.id} className="text-slate-200 leading-relaxed">
                  <span className="font-bold text-cyan-200 font-num">{numbers.get(`${e.row},${e.col}`)}.</span> {e.clue}
                  <span className="text-slate-500"> ({Array.from(e.answer).length} أحرف)</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {!solved && (
          <div className="sm:col-span-2 flex flex-col gap-2">
            <button type="button" className={primaryBtn} onClick={check} disabled={!filled}>
              تحقق من الشبكة
            </button>
            <p className="text-xs text-slate-500">انقر مرتين على خانة لتبديل اتجاه الكتابة بين الأفقي والعمودي.</p>
          </div>
        )}
      </div>
    </div>
  );
}
