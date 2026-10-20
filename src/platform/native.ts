/**
 * تكامل Android: زر الرجوع، الإرسال إلى الخلفية (حفظ فوري)، شاشة البداية، أشرطة النظام.
 * كل الدوال آمنة في المتصفح (لا تفعل شيئًا).
 */
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { kvFlush } from './kvStore';
import { sound } from '../utils/audio';

export const isNative = () => Capacitor.isNativePlatform();
export const platformName = () => Capacitor.getPlatform();

export async function hideSplash() {
  if (!isNative()) return;
  try {
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch {}
}

export async function setupSystemBars() {
  if (!isNative()) return;
  try {
    await SystemBars.setStyle({ style: SystemBarsStyle.Dark });
  } catch {}
}

/** تُعيد true إن عولج الرجوع داخل اللعبة. */
export type BackHandler = () => boolean;
let backHandler: BackHandler = () => false;
export const setBackHandler = (h: BackHandler) => {
  backHandler = h;
};

let lastBackAt = 0;
let onExitHint: (() => void) | null = null;
export const setExitHint = (fn: () => void) => {
  onExitHint = fn;
};

export async function setupNativeLifecycle() {
  if (!isNative()) return;
  await CapApp.addListener('backButton', () => {
    if (backHandler()) return;
    // في الشاشة الرئيسية: ضغطتان متتاليتان للخروج
    const now = Date.now();
    if (now - lastBackAt < 2000) {
      kvFlush().finally(() => CapApp.exitApp());
    } else {
      lastBackAt = now;
      onExitHint?.();
    }
  });
  await CapApp.addListener('pause', () => {
    void kvFlush();
    sound.suspend();
  });
  await CapApp.addListener('resume', () => {
    sound.resume();
  });
}

export async function getAppVersion(): Promise<string> {
  if (!isNative()) return __APP_VERSION__;
  try {
    const info = await CapApp.getInfo();
    return `${info.version} (${info.build})`;
  } catch {
    return __APP_VERSION__;
  }
}
