import React, { useMemo, useState } from 'react';
import { ArrowRight, Lock, Star, CheckCircle2, Trophy, Coins, Target, Award, Map as MapIcon, ChevronLeft, BarChart2 } from 'lucide-react';
import type { PlayerStats } from '../../types/game';
import type { StageIndexEntry } from '../../content/types';
import { STAGE_TYPE_LABELS, DIFFICULTY_LABELS } from '../../content/types';
import { manifest } from '../../content/loader';
import { ACHIEVEMENTS, isStageUnlocked, isWorldUnlocked, worldUnlockRequirement } from '../../content/progress';
import { getHorizon } from '../../game/horizonRewards';
import { ContentIcon } from './icons';
import { ghostBtn } from './challenges/shared';

export interface HorizonNav {
  worldId?: string;
  groupId?: string;
}

interface Props {
  stats: PlayerStats;
  nav: HorizonNav;
  onNav: (nav: HorizonNav) => void;
  onPlayStage: (stageId: string) => void;
  onOpenClassic: () => void;
}

const DIFF_COLORS: Record<string, string> = {
  easy: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30',
  medium: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
  hard: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
  expert: 'text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/30',
};

function Bar({ value, total }: { value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={total}>
      <div className="h-full bg-cyan-400 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function HorizonHub({ stats, nav, onNav, onPlayStage, onOpenClassic }: Props) {
  const horizon = getHorizon(stats);
  const [showAch, setShowAch] = useState(false);

  // كل الأرقام محسوبة من فهرس المراحل المنشورة الفعلي، لا أرقام وهمية
  const byGroup = useMemo(() => {
    const m = new Map<string, StageIndexEntry[]>();
    for (const s of manifest.stageIndex) {
      if (!m.has(s.groupId)) m.set(s.groupId, []);
      m.get(s.groupId)!.push(s);
    }
    for (const list of m.values()) list.sort((a, b) => a.order - b.order);
    return m;
  }, []);
  const doneCount = (list: StageIndexEntry[]) => list.filter((s) => horizon.stages[s.id]?.completed).length;
  const totalPlayable = manifest.stageIndex.length;
  const totalDone = doneCount(manifest.stageIndex);
  const accuracy = horizon.counters.correct + horizon.counters.wrong ? Math.round((horizon.counters.correct / (horizon.counters.correct + horizon.counters.wrong)) * 100) : 0;

  const world = manifest.worlds.find((w) => w.id === nav.worldId);
  const group = world?.groups.find((g) => g.id === nav.groupId);

  const summary = (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="ملخص التقدم">
      {[
        { icon: Trophy, label: 'مجموع النقاط', value: horizon.points.toLocaleString('en-US'), color: 'text-amber-300' },
        { icon: Coins, label: 'العملات', value: stats.coins.toLocaleString('en-US'), color: 'text-amber-300' },
        { icon: MapIcon, label: 'المراحل المكتملة', value: `${totalDone.toLocaleString('en-US')} / ${totalPlayable.toLocaleString('en-US')}`, color: 'text-cyan-300' },
        { icon: Target, label: 'الإجابات', value: `${horizon.counters.correct.toLocaleString('en-US')} صحيحة`, color: 'text-emerald-300', sub: `${horizon.counters.wrong.toLocaleString('en-US')} خاطئة · الدقة ${accuracy}%` },
      ].map((c) => (
        <div key={c.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <c.icon className={`w-4 h-4 ${c.color}`} /> {c.label}
          </span>
          <span className="text-lg sm:text-xl font-bold text-white font-num">{c.value}</span>
          {c.sub && <span className="text-xs text-slate-500">{c.sub}</span>}
        </div>
      ))}
    </section>
  );

  // ---------------- المراحل داخل مجموعة ----------------
  if (world && group) {
    const stages = byGroup.get(group.id) ?? [];
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 flex-wrap">
          <button className={ghostBtn} onClick={() => onNav({ worldId: world.id })}>
            <ArrowRight className="w-4 h-4" /> {world.title}
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: `${world.color}22`, color: world.color }}>
              <ContentIcon name={group.icon} className="w-6 h-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white">{group.title}</h2>
              <p className="text-xs text-slate-400">
                {STAGE_TYPE_LABELS[group.stageType]} · <span className="font-num">{doneCount(stages)} / {stages.length}</span> مكتملة
              </p>
            </div>
          </div>
        </div>
        {group.description && <p className="text-slate-300 -mt-2">{group.description}</p>}
        {stages.length === 0 ? (
          <p className="text-slate-400 rounded-2xl border border-dashed border-slate-700 p-8 text-center">لا توجد مراحل منشورة في هذه المجموعة بعد.</p>
        ) : (
          <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stages.map((s, i) => {
              const p = horizon.stages[s.id];
              const unlocked = isStageUnlocked(horizon, stages, s.id);
              const completed = Boolean(p?.completed);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={!unlocked}
                    onClick={() => onPlayStage(s.id)}
                    className={`w-full text-start rounded-2xl border p-4 flex flex-col gap-3 transition-all cursor-pointer disabled:cursor-not-allowed ${
                      completed
                        ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10'
                        : unlocked
                        ? 'border-cyan-500/40 bg-slate-900/70 hover:border-cyan-400 hover:-translate-y-0.5'
                        : 'border-slate-800 bg-slate-900/30 opacity-60'
                    }`}
                    aria-label={`${s.title} — ${completed ? 'مكتملة' : unlocked ? 'مفتوحة' : 'مقفلة'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-10 h-10 rounded-xl grid place-items-center font-bold font-num shrink-0 ${completed ? 'bg-emerald-500 text-slate-950' : unlocked ? 'bg-cyan-500/20 text-cyan-200' : 'bg-slate-800 text-slate-500'}`}>
                        {completed ? <CheckCircle2 className="w-5 h-5" /> : unlocked ? i + 1 : <Lock className="w-4 h-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white truncate">{s.title}</h3>
                        <p className="text-xs text-slate-400 font-num">{s.challengeCount} تحديات · {s.completionPoints} نقطة إكمال</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-md border ${DIFF_COLORS[s.difficulty]}`}>{DIFFICULTY_LABELS[s.difficulty]}</span>
                      {completed ? (
                        <span className="flex gap-0.5" aria-label={`${p!.bestStars} نجوم`}>
                          {[1, 2, 3].map((n) => (
                            <Star key={n} className={`w-4 h-4 ${n <= p!.bestStars ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
                          ))}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">{unlocked ? 'مفتوحة' : 'أكمل المرحلة السابقة'}</span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    );
  }

  // ---------------- المجموعات داخل عالم ----------------
  if (world) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3 flex-wrap">
          <button className={ghostBtn} onClick={() => onNav({})}>
            <ArrowRight className="w-4 h-4" /> العوالم
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">{world.title}</h2>
            <p className="text-sm text-slate-400">{world.subtitle}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {world.groups.map((g) => {
            const stages = byGroup.get(g.id) ?? [];
            const done = doneCount(stages);
            const empty = stages.length === 0;
            return (
              <button
                key={g.id}
                type="button"
                disabled={empty}
                onClick={() => onNav({ worldId: world.id, groupId: g.id })}
                className="text-start rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-600 p-5 flex flex-col gap-3 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-xl grid place-items-center shrink-0" style={{ background: `${world.color}22`, color: world.color }}>
                    <ContentIcon name={g.icon} className="w-6 h-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white">{g.title}</h3>
                    <p className="text-xs text-slate-400">{STAGE_TYPE_LABELS[g.stageType]}</p>
                  </div>
                  {!empty && done === stages.length && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-label="مكتملة" />}
                </div>
                {g.description && <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{g.description}</p>}
                <div className="flex flex-col gap-1.5 mt-auto">
                  <Bar value={done} total={stages.length} />
                  <span className="text-xs text-slate-400 font-num">{empty ? 'لا مراحل منشورة بعد' : `${done} / ${stages.length} مراحل`}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------- العوالم ----------------
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">عوالم الأفق</h2>
          <p className="text-slate-400 mt-1">عالم ← مجموعة ← مرحلة ← تحدٍّ. تُفتح المراحل بالتقدم الحقيقي.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className={ghostBtn} onClick={() => setShowAch((v) => !v)} aria-expanded={showAch}>
            <Award className="w-4 h-4 text-amber-300" /> الإنجازات <span className="font-num">{horizon.achievements.length}/{ACHIEVEMENTS.length}</span>
          </button>
          <button className={ghostBtn} onClick={onOpenClassic}>
            <BarChart2 className="w-4 h-4" /> الرحلة الكلاسيكية
          </button>
        </div>
      </div>

      {summary}

      {showAch && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4" aria-label="الإنجازات">
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ACHIEVEMENTS.map((a) => {
              const got = horizon.achievements.includes(a.id);
              return (
                <li key={a.id} className={`rounded-xl border p-3 flex gap-3 ${got ? 'border-amber-400/50 bg-amber-400/10' : 'border-slate-800 opacity-60'}`}>
                  <Award className={`w-6 h-6 shrink-0 ${got ? 'text-amber-300' : 'text-slate-600'}`} />
                  <div>
                    <p className="font-bold text-white text-sm">{a.title}</p>
                    <p className="text-xs text-slate-400">{a.description}</p>
                    <p className="text-xs text-amber-300/80 font-num mt-0.5">+{a.coins} عملة {got ? '· مُنحت' : ''}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {manifest.worlds.filter((w) => w.playableStageCount > 0).map((w, wi) => {
          const stages = manifest.stageIndex.filter((s) => s.worldId === w.id);
          const done = doneCount(stages);
          const unlocked = isWorldUnlocked(horizon, manifest, w.id);
          const req = worldUnlockRequirement(horizon, manifest, w.id);
          return (
            <button
              key={w.id}
              type="button"
              disabled={!unlocked || stages.length === 0}
              onClick={() => onNav({ worldId: w.id })}
              className="group relative overflow-hidden text-start rounded-3xl border border-slate-800 p-6 flex flex-col gap-4 min-h-52 transition-all cursor-pointer disabled:cursor-not-allowed enabled:hover:-translate-y-0.5 enabled:hover:border-slate-600"
              style={{ background: `linear-gradient(160deg, ${w.color}26, rgba(15,23,42,0.85) 60%)` }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-num text-slate-400">العالم {wi + 1}</span>
                {!unlocked ? <Lock className="w-5 h-5 text-slate-400" /> : done === stages.length && stages.length > 0 ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-white" />}
              </div>
              <div className="flex items-center gap-3">
                <span className="w-14 h-14 rounded-2xl grid place-items-center shrink-0" style={{ background: `${w.color}33`, color: w.color }}>
                  <ContentIcon name={w.icon} className="w-7 h-7" />
                </span>
                <div>
                  <h3 className="text-xl font-bold text-white">{w.title}</h3>
                  <p className="text-sm text-slate-300">{w.subtitle}</p>
                </div>
              </div>
              <div className="mt-auto flex flex-col gap-1.5">
                <Bar value={done} total={stages.length} />
                <span className="text-xs text-slate-300 font-num">
                  {w.groups.length} مجموعات · {done} / {stages.length} مراحل
                </span>
                {!unlocked && req && (
                  <span className="text-xs text-amber-200">
                    للفتح: أكمل {req.need} مراحل في «{req.prevTitle}» (أنجزت {req.have})
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
