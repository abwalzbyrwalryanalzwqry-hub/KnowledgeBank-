import React from 'react';
import { Volume2, VolumeX, Settings, User, Sparkles, Award } from 'lucide-react';
import { PlayerStats, GameSettings } from '../types/game';
import { sound } from '../utils/audio';

interface HeaderProps {
  stats: PlayerStats;
  settings: GameSettings;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenDaily: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  settings,
  onOpenProfile,
  onOpenSettings,
  onOpenDaily,
  activeTab,
  onSelectTab,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80 px-4 md:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => {
            sound.playClick();
            onSelectTab('home');
          }}
          className="flex items-center gap-2.5 text-right cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-lg p-1"
          aria-label="الرئيسية أفق المعرفة"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-amber-400 p-[1px] shadow-sm shadow-cyan-500/20">
            <div className="w-full h-full bg-[#0B0F19] rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <span className="text-lg md:text-xl font-bold tracking-tight text-white font-heading whitespace-nowrap shrink-0">
            أفق المعرفة
          </span>
        </button>

        {/* Zone 2: Navigation Links (single-line, clean typography) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => {
              sound.playClick();
              onSelectTab('home');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-white cursor-pointer ${
              activeTab === 'home' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : 'text-slate-400'
            }`}
          >
            الأطوار الرئيسية
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onSelectTab('horizon');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-white cursor-pointer ${
              activeTab === 'horizon' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : 'text-slate-400'
            }`}
          >
            عوالم الأفق
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onSelectTab('stages');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-white cursor-pointer ${
              activeTab === 'stages' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : 'text-slate-400'
            }`}
          >
            الرحلة الكلاسيكية
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onSelectTab('tower');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-white cursor-pointer ${
              activeTab === 'tower' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : 'text-slate-400'
            }`}
          >
            برج العباقرة
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onSelectTab('blitz');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-white cursor-pointer ${
              activeTab === 'blitz' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : 'text-slate-400'
            }`}
          >
            سرعة النبض
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onSelectTab('duel');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 hover:text-white cursor-pointer ${
              activeTab === 'duel' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400' : 'text-slate-400'
            }`}
          >
            مبارزة النواة
          </button>
        </nav>

        {/* Zone 3: Player Info & Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Economy Quick Meters */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg text-xs">
              <span className="text-rose-500">❤️</span>
              <span className="font-num tabular-nums font-bold text-rose-300">{stats.hearts}</span>
            </div>
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-xs">
              <span className="text-amber-400">🪙</span>
              <span className="font-num tabular-nums font-bold text-amber-300">{stats.coins.toLocaleString()}</span>
            </div>
          </div>

          {/* Daily Quest Button */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenDaily();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors whitespace-nowrap cursor-pointer"
            title="التحدي اليومي"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span className="hidden lg:inline">اليومي</span>
          </button>

          {/* Player Passport Quick CTA */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenProfile();
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-900/90 border border-slate-700/80 rounded-lg hover:border-cyan-500/50 hover:bg-slate-800 transition-all text-slate-200 cursor-pointer"
            aria-label="الملف الشخصي والإحصائيات"
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-heading font-semibold text-cyan-300">{stats.rankTitle}</span>
            <span className="text-slate-400 font-num tabular-nums text-xs">
              م {stats.level}
            </span>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenSettings();
            }}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="إعدادات اللعبة وإمكانية الوصول"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
