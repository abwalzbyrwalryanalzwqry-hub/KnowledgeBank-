import React from 'react';
import { Home, Map, Building2, Timer, User } from 'lucide-react';

/** شريط تنقل سفلي للهواتف (شريط الرأس يخفي روابطه تحت md). */
export function MobileNav({
  activeTab,
  onSelect,
  onOpenProfile,
}: {
  activeTab: string;
  onSelect: (tab: string) => void;
  onOpenProfile: () => void;
}) {
  const items = [
    { id: 'home', label: 'الرئيسية', icon: Home },
    { id: 'horizon', label: 'العوالم', icon: Map },
    { id: 'tower', label: 'البرج', icon: Building2 },
    { id: 'blitz', label: 'النبض', icon: Timer },
  ];
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-800 bg-[#0B0F19]/95 backdrop-blur safe-bottom-tight"
      aria-label="التنقل الرئيسي"
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = activeTab === it.id;
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onSelect(it.id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex flex-col items-center gap-0.5 py-2.5 text-[11px] cursor-pointer ${active ? 'text-cyan-300' : 'text-slate-400'}`}
              >
                <it.icon className="w-5 h-5" />
                {it.label}
              </button>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onOpenProfile} className="w-full flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-slate-400 cursor-pointer">
            <User className="w-5 h-5" />
            ملفي
          </button>
        </li>
      </ul>
    </nav>
  );
}
