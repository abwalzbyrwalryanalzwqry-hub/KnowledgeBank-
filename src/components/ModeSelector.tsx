import React from 'react';
import { Compass, Trophy, Flame, Swords, ArrowLeft, Star, Shield, Clock } from 'lucide-react';
import { GameMode, PlayerStats } from '../types/game';
import { sound } from '../utils/audio';

interface ModeSelectorProps {
  stats: PlayerStats;
  onSelectMode: (mode: GameMode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  stats,
  onSelectMode,
}) => {
  const completedLevelsCount = Object.keys(stats.completedLevels || {}).length;

  const modes: {
    id: GameMode;
    title: string;
    subtitle: string;
    description: string;
    icon: React.ReactNode;
    colorClass: string;
    badgeText: string;
    statValue: string;
  }[] = [
    {
      id: 'JOURNEY',
      title: 'المراحل والمستويات (نظام زيتونة)',
      subtitle: 'نظام المراحل المغلقة والمستويات المتسلسلة',
      description: 'عوالم معرفية متكاملة بأسلوب ألعاب زيتونة العالمية؛ لن تفتح المرحلة التالية حتى تكمل كافة مستويات السابقة مع مكافآت الكنوز والقلوب.',
      icon: <Compass className="w-6 h-6 text-cyan-400" />,
      colorClass: 'border-cyan-500/40 hover:border-cyan-400 ring-1 ring-cyan-500/20',
      badgeText: 'نظام المراحل الأسطوري',
      statValue: `${completedLevelsCount} مستويات مكتملة`,
    },
    {
      id: 'TOWER',
      title: 'برج العباقرة',
      subtitle: 'سلّم الصعود نحو المليون نقطة',
      description: '15 درجة تصاعدية محفوفة بالتحدي، مع محطتي أمان ووسائل مساعدة كوانتية وخيار الانسحاب بالأرباح.',
      icon: <Trophy className="w-6 h-6 text-amber-400" />,
      colorClass: 'border-amber-500/30 hover:border-amber-400',
      badgeText: 'قمة المليون',
      statValue: stats.towerRecord > 0 ? `أعلى إنجاز: الدرجة ${stats.towerRecord}` : 'لم يكتمل بعد',
    },
    {
      id: 'BLITZ',
      title: 'سرعة النبض',
      subtitle: 'تحدي البقاء مع الزمن والكومبو',
      description: '60 ثانية متسارعة، كل إجابة صحيحة تمنحك +5 ثوانٍ ومضاعف نقاط، بينما الخطأ يكلفك خسارة زمنية حاسمة.',
      icon: <Flame className="w-6 h-6 text-rose-400" />,
      colorClass: 'border-rose-500/30 hover:border-rose-400',
      badgeText: 'أدرينالين مستمر',
      statValue: stats.blitzRecord > 0 ? `أعلى رقم: ${stats.blitzRecord} نقطة` : 'تحدَّ سرعتك الآن',
    },
    {
      id: 'DUEL',
      title: 'مبارزة النواة',
      subtitle: 'مواجهة تكتيكية ضد الذكاء الاصطناعي أو خصمك',
      description: 'تبارز في 5 جولات سريعة ضد المعلم الاصطناعي "سديم" أو خض منافسة حماسية مع صديق على نفس الجهاز.',
      icon: <Swords className="w-6 h-6 text-violet-400" />,
      colorClass: 'border-violet-500/30 hover:border-violet-400',
      badgeText: 'فردي أو لاعبين',
      statValue: 'جولات تكتيكية سريعة',
    },
  ];

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white font-heading">
            أطوار اللعب الرئيسية
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            اختر أسلوب التحدي الذي يناسبك وعش تجربة معرفية لا تنتهي
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => {
              sound.playClick();
              onSelectMode(mode.id);
            }}
            className={`group text-right p-6 rounded-2xl bg-slate-900/80 border ${mode.colorClass} hover:bg-slate-850 transition-all duration-300 flex flex-col justify-between gap-5 cursor-pointer shadow-lg hover:shadow-xl backdrop-blur-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
          >
            <div>
              {/* Card Header with Icon & Pill-Free Meta */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center">
                  {mode.icon}
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {mode.badgeText}
                </div>
              </div>

              <h3 className="text-xl font-extrabold text-white font-heading group-hover:text-cyan-300 transition-colors">
                {mode.title}
              </h3>
              <div className="text-xs text-cyan-400 font-medium mt-1 mb-2">
                {mode.subtitle}
              </div>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                {mode.description}
              </p>
            </div>

            <div className="border-t border-slate-800/80 pt-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 font-num">
                {mode.statValue}
              </span>

              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 group-hover:translate-x-[-4px] transition-transform">
                <span>دخول الطور</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
