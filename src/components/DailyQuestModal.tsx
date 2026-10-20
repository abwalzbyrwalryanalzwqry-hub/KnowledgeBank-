import React from 'react';
import { Award, Flame, X, CheckCircle, ArrowLeft } from 'lucide-react';
import { PlayerStats } from '../types/game';
import { sound } from '../utils/audio';

interface DailyQuestModalProps {
  stats: PlayerStats;
  isOpen: boolean;
  onClose: () => void;
  onStartDaily: () => void;
}

export const DailyQuestModal: React.FC<DailyQuestModalProps> = ({
  stats,
  isOpen,
  onClose,
  onStartDaily,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0E1322] border border-amber-500/30 holo-gold-border rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white font-heading">
              التحدي المعرفي اليومي
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              5 أسئلة مختارة بعناية لتجديد ذهنك ومضاعفة نقاط خبرتك
            </p>
          </div>
        </div>

        {/* Streak & Reward Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <Flame className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-[11px] text-slate-400">سلسلة الأيام</div>
              <div className="font-num tabular-nums text-base font-bold text-white">
                {stats.dailyStreak} أيام متواصلة
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
            <Award className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="text-[11px] text-slate-400">مكافأة اليوم</div>
              <div className="font-num tabular-nums text-base font-bold text-cyan-300">
                +500 XP خبرة
              </div>
            </div>
          </div>
        </div>

        {/* Quest Requirements List */}
        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>أسئلة متنوعة من شتى الحقول (تاريخ، علوم، دين، تكنولوجيا)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>الحصول على نسبة إتقان 80% على الأقل لكسب المكافأة الكاملة</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>يتم تجديد الأسئلة تلقائياً كل 24 ساعة</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            sound.playClick();
            onStartDaily();
          }}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/20"
        >
          <span>خوض التحدي اليومي الآن</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
