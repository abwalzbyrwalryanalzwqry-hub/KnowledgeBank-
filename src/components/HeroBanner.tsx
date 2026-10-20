import React from 'react';
import { Play, Sparkles, Compass, Trophy, Zap, BookOpen } from 'lucide-react';
import { sound } from '../utils/audio';
import heroImg from '../assets/images/hero_knowledge_sanctum_1792451915597.jpg';

interface HeroBannerProps {
  onStartJourney: () => void;
  onStartTower: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onStartJourney,
  onStartTower,
}) => {
  return (
    <div className="w-full flex flex-col gap-6">
      {/* 2-Column or Hero Split with Grand Knowledge Sanctum Visual */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800/90 shadow-2xl min-h-[360px] md:min-h-[420px] flex items-center">
        {/* Background Image with Scrim Overlay */}
        <img
          src={heroImg}
          alt="صرح أفق المعرفة المستقبلي"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F19] via-[#0B0F19]/80 to-transparent md:to-[#0B0F19]/30" />

        {/* Content Box */}
        <div className="relative z-10 max-w-2xl p-6 md:p-12 flex flex-col items-start gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>الصرح الثقافي فائق التطور</span>
            <span aria-hidden="true">·</span>
            <span>إصدار النخبة المعرفية</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-heading leading-tight text-balance">
            أفق المعرفة الكبرى
          </h1>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-xl">
            خض غمار أعمق تجربة ثقافية عربية وعالمية، تسبر أغوار الحضارة الإسلامية والتاريخ الإنساني والعلوم والرياضة والتكنولوجيا، في بيئة مستقبلية ذكية تشعل شغف الاكتشاف الدائم.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                sound.playClick();
                onStartJourney();
              }}
              className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all cursor-pointer whitespace-nowrap"
            >
              <Compass className="w-4 h-4" />
              <span>انطلق في رحلة العصور</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onStartTower();
              }}
              className="flex items-center gap-2 px-6 py-3.5 bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-sm rounded-xl border border-slate-700/80 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>تسلّق برج العباقرة</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI / Discipline Ribbon below hero (4 columns) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 text-center">
          <div className="text-xs text-slate-400">حقول معرفية متكاملة</div>
          <div className="font-num tabular-nums text-xl font-black text-cyan-400 mt-1">
            9 مسارات ثقافية
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 text-center">
          <div className="text-xs text-slate-400">عصور حضارية ملحمية</div>
          <div className="font-num tabular-nums text-xl font-black text-amber-400 mt-1">
            5 حقب تاريخية
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 text-center">
          <div className="text-xs text-slate-400">أطوار لعب احترافية</div>
          <div className="font-num tabular-nums text-xl font-black text-emerald-400 mt-1">
            4 أطوار رئيسية
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 text-center">
          <div className="text-xs text-slate-400">رتب وأوسمة فخرية</div>
          <div className="font-num tabular-nums text-xl font-black text-violet-400 mt-1">
            10 رتب و 12 وساماً
          </div>
        </div>
      </div>
    </div>
  );
};
