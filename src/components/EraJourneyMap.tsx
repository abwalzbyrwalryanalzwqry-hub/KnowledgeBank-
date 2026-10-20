import React, { useState } from 'react';
import { Star, Lock, Sparkles, Trophy, ChevronRight, Swords, ArrowLeft } from 'lucide-react';
import { Stage, EraId, PlayerStats } from '../types/game';
import { STAGES_DATA, ERAS_META } from '../data/questions';
import { sound } from '../utils/audio';
import eraPortalImg from '../assets/images/era_journey_portal_1792451916189.jpg';

interface EraJourneyMapProps {
  stats: PlayerStats;
  onSelectStage: (stage: Stage) => void;
  onBackToHub: () => void;
}

export const EraJourneyMap: React.FC<EraJourneyMapProps> = ({
  stats,
  onSelectStage,
  onBackToHub,
}) => {
  const [selectedEra, setSelectedEra] = useState<EraId>('ancient');

  const eraIds: EraId[] = ['ancient', 'islamic_golden', 'renaissance', 'modern_digital', 'future_ai'];
  const currentEraMeta = ERAS_META[selectedEra];
  const stages = STAGES_DATA.filter((s) => s.eraId === selectedEra);

  // Total stars collected across all stages
  const totalStars = Object.values(stats.eraStars || {}).reduce((acc, stars) => acc + stars, 0);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
      {/* Top Bar with Total Stars & Hub Navigation */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            <span>العودة للأطوار</span>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white font-heading">
              خارطة رحلة العصور
            </h1>
            <p className="text-xs text-slate-400">انطلق في رحلة ملحمية عبر 5 عصور حضارية كبرى</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="font-num tabular-nums text-sm font-bold text-amber-300">
            {totalStars} نجمة مكتسبة
          </span>
        </div>
      </div>

      {/* Era Journey Portal Cinematic Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 h-48 md:h-64 shadow-xl">
        <img
          src={eraPortalImg}
          alt="بوابة رحلة العصور"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/50 to-transparent flex flex-col justify-end p-6 md:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 mb-1">
            <span>العصر المختار</span>
            <span aria-hidden="true">·</span>
            <span>{currentEraMeta.period}</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-white font-heading">
            {currentEraMeta.name}
          </h2>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl mt-1 leading-relaxed">
            {currentEraMeta.description}
          </p>
        </div>
      </div>

      {/* Interactive Era Timeline Tabs (Single-line interactive controls) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800/80 scrollbar-none">
        {eraIds.map((eId) => {
          const meta = ERAS_META[eId];
          const isSelected = selectedEra === eId;

          return (
            <button
              key={eId}
              onClick={() => {
                sound.playClick();
                setSelectedEra(eId);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-medium rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-400 font-bold holo-border shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-white hover:bg-slate-850'
              }`}
            >
              <span>{meta.name}</span>
            </button>
          );
        })}
      </div>

      {/* Stage Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stages.map((stage) => {
          const isUnlocked = totalStars >= stage.requiredStarsToUnlock;
          const starsEarned = stats.eraStars?.[stage.id] || 0;

          return (
            <div
              key={stage.id}
              className={`relative rounded-2xl border p-5 flex flex-col justify-between transition-all backdrop-blur-sm ${
                stage.isBoss
                  ? isUnlocked
                    ? 'bg-slate-900/90 border-amber-500/50 holo-gold-border'
                    : 'bg-slate-950/80 border-slate-800/60 opacity-60'
                  : isUnlocked
                  ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 shadow-md'
                  : 'bg-slate-950/70 border-slate-900 opacity-60'
              }`}
            >
              {/* Header: Stage Number & Status */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 font-code">
                    المرحلة {stage.stageNumber} {stage.isBoss && '· مواجهة الزعيم'}
                  </span>

                  {stage.isBoss && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5">
                      <Swords className="w-3 h-3" />
                      <span>زعيم العصر</span>
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-white font-heading mb-1">{stage.title}</h3>
                <div className="text-xs text-cyan-400 font-medium mb-2">{stage.subtitle}</div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{stage.description}</p>
              </div>

              {/* Bottom: Stars & Action CTA */}
              <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
                {/* 3 Stars display */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((starIdx) => (
                    <Star
                      key={starIdx}
                      className={`w-4 h-4 ${
                        starIdx <= starsEarned
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>

                {isUnlocked ? (
                  <button
                    onClick={() => {
                      sound.playClick();
                      onSelectStage(stage);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      stage.isBoss
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-400 hover:to-orange-400 shadow-md shadow-amber-500/20'
                        : 'bg-gradient-to-r from-cyan-600 to-teal-500 text-slate-950 hover:from-cyan-500 hover:to-teal-400 shadow-md shadow-cyan-500/20'
                    }`}
                  >
                    <span>{starsEarned > 0 ? 'إعادة التحدي' : 'بدء المرحلة'}</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                    <span>يتطلب {stage.requiredStarsToUnlock} نجوم</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
