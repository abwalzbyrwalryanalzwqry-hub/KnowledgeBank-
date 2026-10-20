import type { CapacitorConfig } from '@capacitor/cli';

/**
 * إعداد تطبيق Android.
 * - الواجهة تُبنى إلى dist/ ثم تُنسخ داخل التطبيق (android/app/src/main/assets/public)،
 *   وتُخدَّم من الجهاز نفسه عبر https://localhost، فلا خادم Vite ولا Express ولا رابط خارجي.
 * - لا يوجد server.url عمدًا: وجوده يجعل التطبيق يعتمد على خادم بعيد.
 */
const config: CapacitorConfig = {
  appId: 'com.horizonofknowledge.game',
  appName: 'أفق المعرفة',
  webDir: 'dist',
  backgroundColor: '#0B0F19',
  android: {
    allowMixedContent: false,
    // Tailwind 4 يحتاج Chrome 111+. إن كان WebView أقدم يعرض Capacitor رسالة بدل واجهة مكسورة.
    minWebViewVersion: 111,
    // يسمح بفحص WebView من Chrome في نسخ debug فقط (Capacitor يعطله تلقائيًا في release).
    webContentsDebuggingEnabled: undefined,
  },
  server: {
    // ملف محلي يُعرض إن تعذر تحميل الواجهة (مثل WebView قديم جدًا). لا يوجد server.url.
    errorPath: 'load-error.html',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#0B0F19',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: false,
      splashImmersive: false,
    },
    SystemBars: {
      insetsHandling: 'css',
      style: 'DARK',
      hidden: false,
    },
  },
};

export default config;
