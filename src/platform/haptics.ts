/** اهتزاز خفيف عند الإجابة (Android فقط، ويُعطَّل من الإعدادات). */
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

let enabled = true;
export const setHapticsEnabled = (v: boolean) => {
  enabled = v;
};
export const hapticsSupported = () => Capacitor.isNativePlatform();

const run = (fn: () => Promise<void>) => {
  if (!enabled || !Capacitor.isNativePlatform()) return;
  fn().catch(() => {});
};

export const haptic = {
  tap: () => run(() => Haptics.impact({ style: ImpactStyle.Light })),
  correct: () => run(() => Haptics.notification({ type: NotificationType.Success })),
  wrong: () => run(() => Haptics.notification({ type: NotificationType.Error })),
  win: () => run(() => Haptics.impact({ style: ImpactStyle.Heavy })),
};
