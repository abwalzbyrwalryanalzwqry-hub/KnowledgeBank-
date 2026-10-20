import React from 'react';
import { X, Volume2, VolumeX, Music, Mic, Type, Eye, Keyboard } from 'lucide-react';
import { GameSettings } from '../types/game';
import { sound } from '../utils/audio';

interface SettingsModalProps {
  settings: GameSettings;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0E1322] border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 transition-colors cursor-pointer"
          aria-label="إغلاق الإعدادات"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div>
          <h3 className="text-xl font-bold text-white font-heading">
            إعدادات اللعبة وإمكانية الوصول
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            تخصيص التجربة الصوتية والبصرية ومساعد النطق الآلي
          </p>
        </div>

        {/* Controls List */}
        <div className="space-y-4">
          {/* Sound FX Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-sm font-semibold text-white">المؤثرات الصوتية التوليدية</div>
                <div className="text-xs text-slate-400">أصوات الإجابات والنقر والمؤقتات</div>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !settings.soundEnabled;
                sound.setMuted(!next);
                onUpdateSettings({ soundEnabled: next });
              }}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.soundEnabled ? 'bg-cyan-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  settings.soundEnabled ? 'left-1' : 'right-1'
                }`}
              />
            </button>
          </div>

          {/* Ambient Music Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-3">
              <Music className="w-5 h-5 text-violet-400" />
              <div>
                <div className="text-sm font-semibold text-white">الموسيقى المحيطية المستقبلية</div>
                <div className="text-xs text-slate-400">نغمات تأملية هادئة أثناء التفكير</div>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !settings.ambientMusic;
                sound.toggleAmbientMusic(next);
                onUpdateSettings({ ambientMusic: next });
              }}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.ambientMusic ? 'bg-violet-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  settings.ambientMusic ? 'left-1' : 'right-1'
                }`}
              />
            </button>
          </div>

          {/* Text-To-Speech Reader */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-3">
              <Mic className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-sm font-semibold text-white">المساعد الصوتي للأسئلة (TTS)</div>
                <div className="text-xs text-slate-400">قراءة الأسئلة والخيارات آلياً بصوت عربي</div>
              </div>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                onUpdateSettings({ speechEnabled: !settings.speechEnabled });
              }}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.speechEnabled ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                  settings.speechEnabled ? 'left-1' : 'right-1'
                }`}
              />
            </button>
          </div>

          {/* Font Size Scaling */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-white">حجم خط الأسئلة</div>
                <div className="text-xs text-slate-400">تكبير النصوص لسهولة القراءة</div>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['normal', 'large', 'xlarge'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    sound.playClick();
                    onUpdateSettings({ fontSize: size });
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                    settings.fontSize === size
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {size === 'normal' ? 'عادي' : size === 'large' ? 'كبير' : 'فائق'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Guide */}
        <div className="border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
            <Keyboard className="w-4 h-4 text-cyan-400" />
            <span>اختصارات لوحة المفاتيح:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div><span className="font-code text-cyan-300 font-bold">[1 - 4]</span> اختيار الإجابة</div>
            <div><span className="font-code text-cyan-300 font-bold">[Space / Enter]</span> الانتقال للسؤال التالي</div>
          </div>
        </div>
      </div>
    </div>
  );
};
