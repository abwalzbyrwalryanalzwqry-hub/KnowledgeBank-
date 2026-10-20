import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import App from './App.tsx';
import './index.css';
import { initKvStore } from './platform/kvStore';
import { STORAGE_KEYS } from './utils/storage';
import { hideSplash, setupNativeLifecycle, setupSystemBars } from './platform/native';

const removeBootScreen = () => {
  const boot = document.getElementById('boot');
  if (boot) boot.remove();
};

async function start() {
  // تحميل التقدم من التخزين الأصلي في Android (أو localStorage في المتصفح) قبل عرض أي شاشة
  try {
    await initKvStore(STORAGE_KEYS);
  } catch {
    /* تُستخدم القيم الافتراضية ولا تُعرض أخطاء للاعب */
  }
  const root = createRoot(document.getElementById('root')!);

  // استوديو المحتوى متاح فقط في بيئة التطوير المحلية (npm run dev ثم #/studio).
  // في نسخة الإنتاج وتطبيق Android يُحذف هذا الفرع كليًا أثناء البناء.
  if (import.meta.env.DEV && window.location.hash.startsWith('#/studio')) {
    const Studio = lazy(() => import('./studio/Studio.tsx'));
    root.render(
      <Suspense fallback={null}>
        <Studio />
      </Suspense>
    );
  } else {
    root.render(<App />);
  }
  requestAnimationFrame(() => {
    removeBootScreen();
    void hideSplash();
  });
  void setupSystemBars();
  void setupNativeLifecycle();
}

void start();
