import React, { useState, useEffect, useMemo } from 'react';
import type { WordSearchChallenge } from '../../../content/types';
import { gridLetters, lineCells, matchWordSearchSelection, findWordInGrid } from '../../../content/answer';
import { ChallengeInputProps } from './shared';

export function WordSearchInput({ challenge, onSubmit, solved }: ChallengeInputProps<WordSearchChallenge>) {
  const grid = useMemo(() => gridLetters(challenge), [challenge]);
  const [start, setStart] = useState<{ r: number; c: number } | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [foundCells, setFoundCells] = useState<string[]>([]);
  const [flash, setFlash] = useState<string[]>([]);

  useEffect(() => {
    setStart(null);
    setFound([]);
    setFoundCells([]);
  }, [challenge.id]);

  const solvedCells = useMemo(
    () => (solved ? challenge.words.flatMap((w) => (findWordInGrid(challenge, w) || []).map(({ r, c }) => `${r},${c}`)) : []),
    [solved, challenge]
  );

  const click = (r: number, c: number) => {
    if (solved) return;
    if (!start) return setStart({ r, c });
    if (start.r === r && start.c === c) return setStart(null);
    const word = matchWordSearchSelection(challenge, start, { r, c });
    const cells = (lineCells(start, { r, c }) || []).map((x) => `${x.r},${x.c}`);
    setStart(null);
    if (word && !found.includes(word)) {
      const nextFound = [...found, word];
      setFound(nextFound);
      setFoundCells((fc) => [...fc, ...cells]);
      if (nextFound.length === challenge.words.length) onSubmit({ kind: 'wordsearch', found: nextFound });
    } else {
      setFlash(cells);
      setTimeout(() => setFlash([]), 500);
    }
  };

  const highlighted = new Set([...foundCells, ...solvedCells]);
  return (
    <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
      <div
        className="grid gap-1 p-2 rounded-2xl bg-slate-950/60 border border-slate-800 select-none"
        style={{ gridTemplateColumns: `repeat(${grid[0]?.length ?? 1}, minmax(0, 1fr))` }}
        dir="rtl"
        role="grid"
        aria-label="شبكة البحث عن الكلمات"
      >
        {grid.flatMap((row, r) =>
          row.map((ch, c) => {
            const key = `${r},${c}`;
            const isStart = start?.r === r && start?.c === c;
            return (
              <button
                key={key}
                type="button"
                onClick={() => click(r, c)}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg text-xl font-bold transition-colors cursor-pointer ${
                  isStart
                    ? 'bg-cyan-400 text-slate-950'
                    : highlighted.has(key)
                    ? 'bg-emerald-500/30 text-emerald-100'
                    : flash.includes(key)
                    ? 'bg-rose-500/30 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
                aria-label={`الحرف ${ch}`}
                aria-pressed={isStart}
              >
                {ch}
              </button>
            );
          })
        )}
      </div>
      <div className="flex flex-col gap-3 w-full md:w-auto">
        <p className="text-sm text-slate-400">اضغط على أول حرف من الكلمة ثم على آخر حرف منها.</p>
        <ul className="flex flex-wrap md:flex-col gap-2">
          {challenge.words.map((w) => {
            const done = solved || found.includes(w);
            return (
              <li key={w} className={`px-3 py-1.5 rounded-lg border text-base ${done ? 'border-emerald-400/60 text-emerald-200 line-through' : 'border-slate-700 text-slate-200'}`}>
                {w}
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-slate-300 font-num">
          {solved ? challenge.words.length : found.length} / {challenge.words.length}
        </p>
      </div>
    </div>
  );
}
