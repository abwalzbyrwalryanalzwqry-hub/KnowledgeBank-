import React from 'react';
import { X, Award, Flame, Trophy, Star, Target, Zap, Shield, Crown, BookOpen, Pyramid, Atom } from 'lucide-react';
import { PlayerStats, Badge } from '../types/game';
import { RANKS, calculateRank } from '../game/rules';
import { INITIAL_BADGES } from '../utils/storage';
import { sound } from '../utils/audio';

interface ProfileModalProps {
  stats: PlayerStats;
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  stats,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const currentRank = calculateRank(stats.xp);
  const nextRank = RANKS.find((r) => r.level === currentRank.level + 1) || currentRank;
  const xpNeeded = nextRank.minXp - currentRank.minXp;
  const currentLevelXp = stats.xp - currentRank.minXp;
  const progressRatio = nextRank.level === currentRank.level ? 1 : Math.min(1, Math.max(0, currentLevelXp / (xpNeeded || 1)));

  const accuracy =
    stats.totalAnswered > 0
      ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100)
      : 0;

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return <Flame className="w-5 h-5 text-amber-400" />;
      case 'Zap': return <Zap className="w-5 h-5 text-cyan-400" />;
      case 'Shield': return <Shield className="w-5 h-5 text-blue-400" />;
      case 'Crown': return <Crown className="w-5 h-5 text-yellow-400" />;
      case 'Pyramid': return <Pyramid className="w-5 h-5 text-amber-500" />;
      case 'BookOpen': return <BookOpen className="w-5 h-5 text-emerald-400" />;
      case 'Atom': return <Atom className="w-5 h-5 text-teal-400" />;
      default: return <Star className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0E1322] border border-cyan-500/30 holo-border rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl max-h-[90vh] overflow-y-auto">
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

        {/* Profile Card Header */}
        <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border border-cyan-500/40 shrink-0 shadow-lg shadow-cyan-500/10">
            <img
              src="/src/assets/images/astrolabe_insignia_1792451916541.jpg"
              alt="وسام الأسطرلاب الفلكي"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xl md:text-2xl font-black text-white font-heading">
                {currentRank.title}
              </h3>
              <span className="text-xs font-bold text-cyan-300 bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded-full font-num">
                المستوى {currentRank.level}
              </span>
            </div>

            {/* XP Progress Bar */}
            <div className="mt-2.5">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>التقدم نحو الرتبة التالية</span>
                <span className="font-num tabular-nums text-cyan-300">
                  {stats.xp.toLocaleString()} / {nextRank.minXp.toLocaleString()} XP
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round(progressRatio * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400">الدقة المعرفية</div>
            <div className="font-num tabular-nums text-lg font-black text-emerald-400 mt-0.5">
              {accuracy}%
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400">أعلى سلسلة إجابات</div>
            <div className="font-num tabular-nums text-lg font-black text-amber-400 mt-0.5">
              {stats.highestStreak} متتالية
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400">أعلى درجة بالبرج</div>
            <div className="font-num tabular-nums text-lg font-black text-cyan-400 mt-0.5">
              {stats.towerRecord > 0 ? `الدرجة ${stats.towerRecord}` : '-'}
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-[11px] text-slate-400">رقم سرعة النبض</div>
            <div className="font-num tabular-nums text-lg font-black text-rose-400 mt-0.5">
              {stats.blitzRecord > 0 ? `${stats.blitzRecord} نقطة` : '-'}
            </div>
          </div>
        </div>

        {/* Badges Collection */}
        <div>
          <h4 className="text-sm font-bold text-white font-heading mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-cyan-400" />
            <span>خزانة الأوسمة والشارات الفخرية (12 وساماً)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {INITIAL_BADGES.map((b) => {
              const isUnlocked = stats.badges?.includes(b.id);

              return (
                <div
                  key={b.id}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    isUnlocked
                      ? 'bg-slate-900/90 border-cyan-500/40 text-slate-200'
                      : 'bg-slate-950/60 border-slate-900 text-slate-600 opacity-60'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      isUnlocked
                        ? 'bg-cyan-500/10 border-cyan-500/30'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    {getBadgeIcon(b.icon)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{b.title}</div>
                    <div className="text-[11px] text-slate-400 leading-snug">{b.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
