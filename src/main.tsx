import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import App from './App.tsx';
import './index.css';

const root = createRoot(document.getElementById('root')!);

// استوديو المحتوى متاح فقط في بيئة التطوير المحلية (npm run dev ثم #/studio).
// في نسخة الإنتاج يُحذف هذا الفرع كليًا أثناء البناء، فلا توجد لوحة إدارة مكشوفة.
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
