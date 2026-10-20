import type { Challenge } from '../../../content/types';
import type { PlayerAnswer } from '../../../content/answer';

export interface ChallengeInputProps<C extends Challenge = Challenge> {
  challenge: C;
  /** يعيد true إن كانت الإجابة صحيحة. */
  onSubmit: (answer: PlayerAnswer) => boolean;
  /** بعد الحل: تُقفل المدخلات وتُعرض الإجابة. */
  solved: boolean;
}

export const inputClass =
  'w-full rounded-xl bg-slate-950/70 border border-slate-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 outline-none px-4 py-3 text-lg text-white placeholder:text-slate-500 disabled:opacity-60';
export const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';
export const ghostBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 px-4 py-2.5 transition-colors disabled:opacity-40 cursor-pointer';
