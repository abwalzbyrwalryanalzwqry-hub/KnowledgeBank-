import React from 'react';
import { Play, Compass } from 'lucide-react';
import type { PlayerStats } from '../types/game';
import { manifest } from '../content/loader';

/** زر «متابعة اللعب»: يعود إلى آخر مرحلة بدأها اللاعب، أو يبدأ أول مرحلة. */
export const ContinueCard: React.FC<{ stats: PlayerStats; onContinue: (stageId: string) => void; onBrowse: () => void }> = ({ stats, onContinue, onBrowse }) => {
  const stages = manifest.stageIndex;
  const done = stats.horizon ? Object.values(stats.horizon.stages).filter((s) => s.completed).length : 0;
  const last = stats.lastPlayed ? stages.find((s) => s.id === stats.lastPlayed!.stageId) : undefined;
  const lastDone = last && stats.horizon?.stages[last.id]?.completed;
  // إن اكتملت آخر مرحلة: اقترح التالية في المجموعة نفسها
  let target = last;
  if (last && lastDone) {
    const next = stages.find((s) => s.groupId === last.groupId && s.order === last.order + 1);
    target = next ?? last;
  }
  if (!target) target = stages[0];
  if (!target) return null;
  const world = manifest.worlds.find((w) => w.id === target!.worldId);
  const pct = stages.length ? Math.round((done / stages.length) * 100) : 0;

  return (
    <section className="rounded-3xl border border-cyan-500/30 bg-gradient-to-l from-cyan-950/60 to-slate-900/80 p-5 flex flex-col gap-4" aria-label="متابعة اللعب">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-cyan-300 font-semibold">{last ? 'تابع من حيث توقفت' : 'ابدأ رحلتك'}</p>
          <h2 className="text-xl font-extrabold text-white truncate mt-1">{target.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{world?.title}</p>
        </div>
        <div className="text-left shrink-0">
          <div className="text-2xl font-extrabold text-white font-num" dir="ltr">{done}<span className="text-sm text-slate-400">/{stages.length}</span></div>
          <div className="text-[11px] text-slate-400">مرحلة مكتملة</div>
        </div>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="نسبة التقدم">
        <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button onClick={() => onContinue(target!.id)} className="min-h-14 flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 active:scale-[.98] text-slate-950 text-lg font-extrabold cursor-pointer transition-transform">
          <Play className="w-5 h-5 fill-current" /> {last ? 'متابعة اللعب' : 'ابدأ اللعب'}
        </button>
        <button onClick={onBrowse} className="min-h-14 px-4 flex items-center justify-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer" aria-label="خريطة العوالم">
          <Compass className="w-5 h-5" /> العوالم
        </button>
      </div>
    </section>
  );
};
