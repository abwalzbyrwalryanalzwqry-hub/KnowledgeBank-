import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { McqChallenge, TrueFalseChallenge, TextChallenge, NumberChallenge } from '../../../content/types';
import { ChallengeInputProps, inputClass, primaryBtn } from './shared';

const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

export function McqInput({ challenge, onSubmit, solved }: ChallengeInputProps<McqChallenge>) {
  const [wrong, setWrong] = useState<number[]>([]);
  useEffect(() => setWrong([]), [challenge.id]);
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="الخيارات">
      {challenge.options.map((opt, i) => {
        const isCorrect = solved && i === challenge.correctIndex;
        const isWrong = wrong.includes(i);
        return (
          <button
            key={i}
            type="button"
            disabled={solved || isWrong}
            onClick={() => {
              if (!onSubmit({ kind: 'mcq', optionIndex: i })) setWrong((w) => [...w, i]);
            }}
            className={`flex items-center gap-3 text-start rounded-xl border px-4 py-3.5 min-h-14 transition-all cursor-pointer disabled:cursor-default ${
              isCorrect
                ? 'border-emerald-400 bg-emerald-500/15 text-emerald-100 hz-pop'
                : isWrong
                ? 'border-rose-500/60 bg-rose-500/10 text-rose-200 line-through opacity-70 hz-shake'
                : 'border-slate-700 bg-slate-900/70 hover:border-cyan-400/70 hover:bg-slate-800 text-slate-100'
            }`}
          >
            <span className={`shrink-0 w-8 h-8 rounded-lg grid place-items-center text-sm font-bold ${isCorrect ? 'bg-emerald-400 text-slate-950' : isWrong ? 'bg-rose-500/30' : 'bg-slate-800 text-cyan-300'}`}>
              {isCorrect ? <Check className="w-4 h-4" /> : isWrong ? <X className="w-4 h-4" /> : LETTERS[i]}
            </span>
            <span className="text-base sm:text-lg leading-relaxed">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TrueFalseInput({ challenge, onSubmit, solved }: ChallengeInputProps<TrueFalseChallenge>) {
  const [wrong, setWrong] = useState<boolean | null>(null);
  useEffect(() => setWrong(null), [challenge.id]);
  const btn = (value: boolean, label: string) => {
    const isCorrect = solved && challenge.answer === value;
    const isWrong = wrong === value;
    return (
      <button
        type="button"
        disabled={solved || isWrong}
        onClick={() => {
          if (!onSubmit({ kind: 'truefalse', value })) setWrong(value);
        }}
        className={`flex-1 rounded-2xl border-2 py-5 text-xl font-bold transition-all cursor-pointer disabled:cursor-default ${
          isCorrect
            ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200 hz-pop'
            : isWrong
            ? 'border-rose-500/60 bg-rose-500/10 text-rose-300 opacity-70 hz-shake'
            : 'border-slate-700 bg-slate-900/70 hover:border-cyan-400 text-white'
        }`}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="flex gap-3">
      {btn(true, 'صح')}
      {btn(false, 'خطأ')}
    </div>
  );
}

function FreeInput({
  id,
  solved,
  placeholder,
  inputMode,
  onTry,
  solvedText,
}: {
  id: string;
  solved: boolean;
  placeholder: string;
  inputMode?: 'numeric' | 'text' | 'decimal';
  onTry: (v: string) => boolean;
  solvedText: string;
}) {
  const [value, setValue] = useState('');
  const [shake, setShake] = useState(0);
  useEffect(() => setValue(''), [id]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || solved) return;
    if (!onTry(value)) setShake((s) => s + 1);
  };
  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
      <input
        key={shake}
        className={`${inputClass} ${shake ? 'hz-shake border-rose-500/60' : ''}`}
        value={solved ? solvedText : value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={solved}
        aria-label="إجابتك"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        dir="auto"
      />
      <button type="submit" className={primaryBtn} disabled={solved || !value.trim()}>
        تحقق
      </button>
    </form>
  );
}

export function TextInput({ challenge, onSubmit, solved }: ChallengeInputProps<TextChallenge>) {
  return (
    <FreeInput
      id={challenge.id}
      solved={solved}
      placeholder={challenge.placeholder || 'اكتب إجابتك هنا'}
      onTry={(v) => onSubmit({ kind: 'text', value: v })}
      solvedText={challenge.answer}
    />
  );
}

export function NumberInput({ challenge, onSubmit, solved }: ChallengeInputProps<NumberChallenge>) {
  return (
    <div className="flex flex-col gap-2">
      <FreeInput
        id={challenge.id}
        solved={solved}
        placeholder="اكتب رقمًا (عربيًا أو غربيًا)"
        inputMode="decimal"
        onTry={(v) => onSubmit({ kind: 'number', value: v })}
        solvedText={`${challenge.answer}${challenge.unit ? ' ' + challenge.unit : ''}`}
      />
      {challenge.unit && !solved && <p className="text-xs text-slate-400">الوحدة: {challenge.unit} (اكتب الرقم فقط)</p>}
    </div>
  );
}
