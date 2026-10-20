import React, { useRef, useState } from 'react';
import {
  X, Volume2, Music, Mic, Type, Eye, Vibrate, Wind, Download, Upload, HelpCircle, Info, ShieldCheck, Keyboard,
} from 'lucide-react';
import { GameSettings, PlayerStats } from '../types/game';
import { sound } from '../utils/audio';
import { speech } from '../utils/speech';
import { hapticsSupported } from '../platform/haptics';
import { isNative } from '../platform/native';
import { createBackup, exportBackup, parseBackup, type BackupPreview } from '../platform/backup';

interface SettingsModalProps {
  settings: GameSettings;
  stats: PlayerStats;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onRestoreBackup: (preview: BackupPreview) => void;
  onOpenHelp: () => void;
  onOpenAbout: () => void;
}

const Toggle: React.FC<{ on: boolean; onChange: () => void; label: string; color: string }> = ({ on, onChange, label, color }) => (
  <button
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => {
      sound.playClick();
      onChange();
    }}
    className={`shrink-0 w-14 h-8 rounded-full transition-colors relative cursor-pointer ${on ? color : 'bg-slate-700'}`}
  >
    <span className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-all ${on ? 'left-1' : 'right-1'}`} />
  </button>
);

const Row: React.FC<{ icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }> = ({ icon, title, desc, children }) => (
  <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
    <div className="flex items-center gap-3 min-w-0">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-xs text-slate-400 leading-relaxed">{desc}</div>
      </div>
    </div>
    {children}
  </div>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings, stats, isOpen, onClose, onUpdateSettings, onRestoreBackup, onOpenHelp, onOpenAbout,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<BackupPreview | null>(null);
  const [busy, setBusy] = useState(false);
  if (!isOpen) return null;

  const doExport = async () => {
    setBusy(true);
    setBackupMsg(null);
    try {
      const text = await exportBackup(createBackup(stats, settings, __APP_VERSION__));
      setBackupMsg({ ok: true, text });
    } catch {
      setBackupMsg({ ok: false, text: 'تعذر إنشاء النسخة الاحتياطية على هذا الجهاز.' });
    } finally {
      setBusy(false);
    }
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBackupMsg(null);
    if (f.size > 2_000_000) return setBackupMsg({ ok: false, text: 'الملف أكبر من المتوقع لنسخة احتياطية.' });
    const res = parseBackup(await f.text());
    if (!res.ok) return setBackupMsg({ ok: false, text: res.error });
    setPending(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 hz-enter" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain bg-[#0E1322] border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 sm:p-7 flex flex-col gap-5 shadow-2xl safe-bottom">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="settings-title" className="text-xl font-bold text-white font-heading">الإعدادات</h3>
            <p className="text-xs text-slate-400 mt-0.5">الصوت، الحركة، القراءة، والنسخ الاحتياطي</p>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-3 -m-1 text-slate-300 hover:text-white rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
            aria-label="إغلاق الإعدادات"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <section className="space-y-3" aria-label="الصوت والاهتزاز">
          <Row icon={<Volume2 className="w-5 h-5 text-cyan-400" />} title="المؤثرات الصوتية" desc="أصوات الإجابات والنقر والفوز">
            <Toggle
              label="المؤثرات الصوتية"
              color="bg-cyan-500"
              on={settings.soundEnabled}
              onChange={() => {
                const next = !settings.soundEnabled;
                sound.setMuted(!next);
                onUpdateSettings({ soundEnabled: next });
              }}
            />
          </Row>
          <Row icon={<Music className="w-5 h-5 text-violet-400" />} title="الموسيقى الهادئة" desc="خلفية صوتية مولّدة محليًا">
            <Toggle
              label="الموسيقى الهادئة"
              color="bg-violet-500"
              on={settings.ambientMusic}
              onChange={() => {
                const next = !settings.ambientMusic;
                sound.toggleAmbientMusic(next);
                onUpdateSettings({ ambientMusic: next });
              }}
            />
          </Row>
          {hapticsSupported() && (
            <Row icon={<Vibrate className="w-5 h-5 text-rose-400" />} title="الاهتزاز" desc="اهتزاز خفيف عند الإجابة والفوز">
              <Toggle label="الاهتزاز" color="bg-rose-500" on={settings.vibrationEnabled} onChange={() => onUpdateSettings({ vibrationEnabled: !settings.vibrationEnabled })} />
            </Row>
          )}
          {speech.supported && (
            <Row icon={<Mic className="w-5 h-5 text-emerald-400" />} title="قراءة الأسئلة صوتيًا" desc="تتوفر إن كان في الجهاز صوت عربي">
              <Toggle label="قراءة الأسئلة صوتيًا" color="bg-emerald-500" on={settings.speechEnabled} onChange={() => onUpdateSettings({ speechEnabled: !settings.speechEnabled })} />
            </Row>
          )}
        </section>

        <section className="space-y-3" aria-label="العرض وإمكانية الوصول">
          <Row icon={<Wind className="w-5 h-5 text-sky-400" />} title="تقليل الحركة" desc="إيقاف الرسوم المتحركة والمؤثرات البصرية">
            <Toggle label="تقليل الحركة" color="bg-sky-500" on={settings.reducedMotion} onChange={() => onUpdateSettings({ reducedMotion: !settings.reducedMotion })} />
          </Row>
          <Row icon={<Eye className="w-5 h-5 text-amber-300" />} title="تباين عالٍ" desc="ألوان أوضح للنصوص والحدود">
            <Toggle label="تباين عالٍ" color="bg-amber-500" on={settings.highContrast} onChange={() => onUpdateSettings({ highContrast: !settings.highContrast })} />
          </Row>
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-semibold text-white">حجم الخط</div>
                <div className="text-xs text-slate-400">يكبّر كل نصوص اللعبة</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['normal', 'large', 'xlarge'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    sound.playClick();
                    onUpdateSettings({ fontSize: size });
                  }}
                  aria-pressed={settings.fontSize === size}
                  className={`min-h-11 text-sm rounded-md font-medium cursor-pointer ${
                    settings.fontSize === size ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {size === 'normal' ? 'عادي' : size === 'large' ? 'كبير' : 'كبير جدًا'}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-3" aria-label="النسخ الاحتياطي">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-semibold text-white">النسخة الاحتياطية</div>
              <div className="text-xs text-slate-400 leading-relaxed">التقدم محفوظ تلقائيًا على الهاتف. يمكنك أيضًا حفظ نسخة في ملف لنقلها أو استعادتها.</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy} onClick={doExport} className="min-h-12 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold cursor-pointer disabled:opacity-60">
              <Download className="w-4 h-4" /> تصدير
            </button>
            <button disabled={busy} onClick={() => fileRef.current?.click()} className="min-h-12 flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold cursor-pointer disabled:opacity-60">
              <Upload className="w-4 h-4" /> استيراد
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onPickFile} />
          </div>
          {backupMsg && (
            <p role="status" className={`text-xs leading-relaxed ${backupMsg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{backupMsg.text}</p>
          )}
          {pending && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100 flex flex-col gap-2" role="alertdialog" aria-label="تأكيد الاستيراد">
              <p className="font-bold text-sm">استبدال تقدمك الحالي بهذه النسخة؟</p>
              <p className="leading-relaxed">
                النسخة من {pending.exportedAt ? new Date(pending.exportedAt).toLocaleDateString('ar') : 'تاريخ غير معروف'}: نقاط الأفق <span className="font-num">{pending.summary.points}</span>، العملات <span className="font-num">{pending.summary.coins}</span>، مراحل مكتملة <span className="font-num">{pending.summary.stagesCompleted}</span>.
                سيُحفظ تقدمك الحالي داخل التطبيق قبل الاستبدال.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="min-h-11 rounded-lg bg-amber-500 text-slate-950 font-bold cursor-pointer"
                  onClick={() => {
                    onRestoreBackup(pending);
                    setPending(null);
                    setBackupMsg({ ok: true, text: 'استُعيدت النسخة الاحتياطية.' });
                  }}
                >
                  نعم، استعد
                </button>
                <button className="min-h-11 rounded-lg bg-slate-800 text-white cursor-pointer" onClick={() => setPending(null)}>
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onOpenHelp} className="min-h-12 flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold cursor-pointer">
            <HelpCircle className="w-4 h-4 text-cyan-400" /> طريقة اللعب
          </button>
          <button onClick={onOpenAbout} className="min-h-12 flex items-center justify-center gap-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold cursor-pointer">
            <Info className="w-4 h-4 text-violet-400" /> حول اللعبة
          </button>
        </div>

        {!isNative() && (
          <div className="hidden md:block border-t border-slate-800 pt-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
              <Keyboard className="w-4 h-4 text-cyan-400" />
              <span>اختصارات لوحة المفاتيح:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div><span className="font-code text-cyan-300 font-bold">[1 - 4]</span> اختيار الإجابة</div>
              <div><span className="font-code text-cyan-300 font-bold">[Space / Enter]</span> الانتقال للسؤال التالي</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
