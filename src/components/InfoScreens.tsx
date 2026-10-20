import React, { useEffect, useState } from 'react';
import { X, HelpCircle, Info, Star, Lightbulb, Lock, WifiOff, ShieldCheck } from 'lucide-react';
import { manifest } from '../content/loader';
import { KIND_LABELS } from '../content/types';
import { getAppVersion } from '../platform/native';

const Shell: React.FC<{ title: string; icon: React.ReactNode; onClose: () => void; children: React.ReactNode }> = ({ title, icon, onClose, children }) => (
  <div className="fixed inset-0 z-[60] bg-[#0B0F19] overflow-y-auto overscroll-contain hz-enter" role="dialog" aria-modal="true" aria-label={title}>
    <div className="sticky top-0 z-10 bg-[#0B0F19]/95 border-b border-slate-800 safe-top">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">{icon}{title}</h2>
        <button onClick={onClose} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 cursor-pointer" aria-label="إغلاق">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
    <div className="max-w-2xl mx-auto px-4 py-5 flex flex-col gap-4 text-sm text-slate-300 leading-loose safe-bottom">{children}</div>
  </div>
);

const Card: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <section className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4">
    <h3 className="flex items-center gap-2 text-base font-bold text-white mb-2">{icon}{title}</h3>
    {children}
  </section>
);

const KIND_HELP: Record<keyof typeof KIND_LABELS, string> = {
  mcq: 'اختر إجابة واحدة من الخيارات.',
  truefalse: 'قرّر إن كانت العبارة صحيحة أم خاطئة.',
  text: 'اكتب الإجابة بالعربية. التشكيل والتطويل وعلامات الترقيم لا تُحتسب، وبعض الأسئلة تقبل صيغًا بديلة، لكن الكلمة نفسها يجب أن تكون صحيحة.',
  number: 'اكتب رقمًا بالأرقام العربية (٣) أو الغربية (3).',
  order: 'المس العناصر بالترتيب الصحيح، ويمكنك التراجع عن آخر اختيار.',
  password: 'حلّ الأدلة لتكوين كلمة السر حرفًا حرفًا ثم اكتبها.',
  crossword: 'المس الخانة لتعرف تعريفها، ثم اكتب الحروف. تُقبل الكلمة عند اكتمالها صحيحة.',
  wordsearch: 'المس أول حرف الكلمة ثم آخر حرف فيها على خط مستقيم.',
  observation: 'تأمّل الشكل جيدًا ثم اختر أو المس ما يُطلب منك.',
};

export const HelpScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Shell title="طريقة اللعب" icon={<HelpCircle className="w-5 h-5 text-cyan-400" />} onClose={onClose}>
    <Card title="الرحلة">
      <p>اللعبة مقسّمة إلى عوالم، وكل عالم إلى مجموعات، وكل مجموعة إلى مراحل. تنفتح المرحلة التالية عند إكمال التي قبلها، وينفتح العالم التالي عند إكمال جزء من العالم السابق.</p>
    </Card>
    <Card title="النقاط والنجوم" icon={<Star className="w-4 h-4 text-amber-300" />}>
      <ul className="list-disc pr-5 space-y-1">
        <li>لكل سؤال نقاط تُمنح مرة واحدة فقط عند حلّه أول مرة.</li>
        <li>كل تلميح أو محاولة خاطئة تُنقص نقاط ذلك السؤال بنسبة 25٪، ولا تقل عن ربع النقاط.</li>
        <li>إكمال المرحلة يمنح مكافأة إكمال مرة واحدة. إعادة اللعب تحسّن النجوم فقط.</li>
        <li>ثلاث نجوم: دون خطأ أو تلميح. نجمتان: حتى خطأين أو تلميحين. نجمة: لأي إكمال.</li>
        <li>لا يُخصم أي شيء من رصيدك في عوالم الأفق.</li>
      </ul>
    </Card>
    <Card title="التلميحات" icon={<Lightbulb className="w-4 h-4 text-yellow-300" />}>
      <p>تظهر التلميحات واحدًا بعد الآخر، وهي مجانية ومحفوظة على الجهاز، لكنها تقلل نقاط السؤال.</p>
    </Card>
    <Card title="أنواع الألغاز">
      <ul className="space-y-2">
        {(Object.keys(KIND_LABELS) as Array<keyof typeof KIND_LABELS>).map((k) => (
          <li key={k}><span className="font-bold text-white">{KIND_LABELS[k]}:</span> {KIND_HELP[k]}</li>
        ))}
      </ul>
    </Card>
    <Card title="الأطوار الأخرى" icon={<Lock className="w-4 h-4 text-violet-300" />}>
      <p>الرحلة الكلاسيكية (بالقلوب والصناديق)، وبرج العباقرة، وسرعة النبض، والمبارزة، والتحدي اليومي. في الرحلة الكلاسيكية يُفقد قلب عند الخطأ، ويمكن ملء القلوب بـ30 عملة.</p>
    </Card>
    <Card title="دون إنترنت" icon={<WifiOff className="w-4 h-4 text-emerald-300" />}>
      <p>كل المراحل والأسئلة والأصوات والخطوط مضمّنة في التطبيق. لا حاجة للإنترنت إلا لفتح روابط المصادر الخارجية إن أردت ذلك.</p>
    </Card>
    <Card title="زر الرجوع">
      <p>زر الرجوع في الهاتف يغلق النافذة المفتوحة أو يعيدك خطوة إلى الوراء. في الشاشة الرئيسية اضغطه مرتين للخروج.</p>
    </Card>
  </Shell>
);

export const AboutScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [version, setVersion] = useState(__APP_VERSION__);
  useEffect(() => {
    getAppVersion().then(setVersion);
  }, []);
  const t = manifest.totals;
  return (
    <Shell title="حول اللعبة" icon={<Info className="w-5 h-5 text-violet-400" />} onClose={onClose}>
      <Card title="أفق المعرفة">
        <p className="text-xs text-slate-400 -mt-1 mb-2" dir="ltr" lang="en">Horizon of Knowledge</p>
        <p>لعبة ألغاز وثقافة عامة عربية تعمل كاملة على الهاتف دون اتصال بالإنترنت.</p>
        <p className="mt-2">الإصدار: <span className="font-num text-white">{version}</span></p>
      </Card>
      <Card title="المحتوى المثبّت">
        <ul className="space-y-1">
          <li>العوالم: <span className="font-num text-white">{manifest.worlds.length}</span></li>
          <li>المراحل القابلة للعب: <span className="font-num text-white">{manifest.stageIndex.length}</span></li>
          <li>الأسئلة والألغاز المنشورة: <span className="font-num text-white">{t.publishedChallenges}</span></li>
        </ul>
        <p className="mt-2 text-xs text-slate-400">الأرقام محسوبة من ملفات المحتوى المضمّنة في هذا الإصدار، وتشمل عوالم الأفق فقط. محتوى أصلي مع مصادر لكل سؤال.</p>
      </Card>
      <Card title="الخصوصية" icon={<ShieldCheck className="w-4 h-4 text-emerald-300" />}>
        <p>لا تجمع اللعبة أي بيانات، ولا تحتاج حسابًا أو تسجيل دخول، ولا تتصل بأي خادم. التقدم محفوظ على هاتفك فقط، ويمكنك تصديره في ملف من الإعدادات.</p>
      </Card>
      <Card title="حقوق وترخيص">
        <ul className="list-disc pr-5 space-y-1">
          <li>خط Cairo: رخصة SIL Open Font License 1.1.</li>
          <li>أيقونات Lucide: رخصة ISC.</li>
          <li>الأصوات مولّدة برمجيًا داخل التطبيق.</li>
        </ul>
      </Card>
    </Shell>
  );
};
