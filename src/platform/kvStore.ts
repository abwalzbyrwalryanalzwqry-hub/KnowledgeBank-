/**
 * طبقة تخزين موحدة (مفتاح ← نص JSON) تعمل في المتصفح وداخل تطبيق Android.
 *
 * - على Android: المصدر الدائم هو Capacitor Preferences (SharedPreferences الأصلية)،
 *   وهو لا يُمسح مع ذاكرة WebView المؤقتة ولا يتأثر بتحديث التطبيق.
 * - localStorage يبقى نسخة مرآة (ومصدرًا للترحيل من الإصدارات السابقة ومن نسخة الويب).
 * - القراءة متزامنة من ذاكرة مؤقتة تُملأ مرة واحدة عند الإقلاع (initKvStore)،
 *   فتبقى منطقيات اللعب الحالية متزامنة كما هي.
 * - الكتابة فورية في الذاكرة وlocalStorage، وتُرسل إلى التخزين الأصلي بطابور متسلسل
 *   (لا تتداخل عمليتا كتابة). تُفرَّغ عند إرسال التطبيق إلى الخلفية.
 * - عند وجود نسختين مختلفتين يُعتمد صاحب رقم المراجعة (revision) الأعلى،
 *   فلا تستبدل نسخة قديمة نسخة أحدث بالخطأ.
 */
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const cache = new Map<string, string | null>();
let ready = false;
let queue: Promise<void> = Promise.resolve();
let lastError: string | null = null;
const native = () => Capacitor.isNativePlatform();

function lsGet(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
function lsSet(key: string, value: string | null) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* المساحة ممتلئة أو التخزين معطل: التخزين الأصلي يبقى المرجع */
  }
}

/** رقم المراجعة داخل مستند JSON (إن وجد) لاختيار الأحدث. */
function revisionOf(raw: string | null): number {
  if (!raw) return -1;
  try {
    const r = JSON.parse(raw)?.revision;
    return typeof r === 'number' && Number.isFinite(r) ? r : 0;
  } catch {
    return -2; // تالف
  }
}

export function pickNewest(nativeRaw: string | null, webRaw: string | null): string | null {
  if (nativeRaw === null) return webRaw;
  if (webRaw === null) return nativeRaw;
  return revisionOf(webRaw) > revisionOf(nativeRaw) ? webRaw : nativeRaw;
}

/** تحميل المفاتيح المطلوبة إلى الذاكرة. يُستدعى مرة واحدة قبل عرض اللعبة. */
export async function initKvStore(keys: string[]): Promise<void> {
  for (const key of keys) {
    const webRaw = lsGet(key);
    if (!native()) {
      cache.set(key, webRaw);
      continue;
    }
    let nativeRaw: string | null = null;
    try {
      nativeRaw = (await Preferences.get({ key })).value;
    } catch (e) {
      lastError = String((e as Error)?.message ?? e);
    }
    const chosen = pickNewest(nativeRaw, webRaw);
    cache.set(key, chosen);
    // ترحيل: نسخة localStorage أحدث (أو الوحيدة) تُنقل إلى التخزين الأصلي
    if (chosen !== null && chosen !== nativeRaw) enqueueNative(key, chosen);
    if (chosen !== null && chosen !== webRaw) lsSet(key, chosen);
  }
  ready = true;
}

export const isKvReady = () => ready;
export const getKvError = () => lastError;

export function kvGet(key: string): string | null {
  if (cache.has(key)) return cache.get(key) ?? null;
  const v = lsGet(key);
  cache.set(key, v);
  return v;
}

function enqueueNative(key: string, value: string | null) {
  if (!native()) return;
  queue = queue
    .then(() => (value === null ? Preferences.remove({ key }) : Preferences.set({ key, value })))
    .then(() => {
      lastError = null;
    })
    .catch((e) => {
      lastError = String((e as Error)?.message ?? e);
    });
}

export function kvSet(key: string, value: string | null): boolean {
  cache.set(key, value);
  lsSet(key, value);
  enqueueNative(key, value);
  return true;
}

/** انتظار انتهاء كل عمليات الكتابة المعلقة. */
export function kvFlush(): Promise<void> {
  return queue;
}

/** تحديث الذاكرة من localStorage (عند تغيير تبويب آخر في نسخة الويب). */
export function kvReloadFromWeb(key: string) {
  if (!native()) cache.set(key, lsGet(key));
}

/** للاختبارات فقط. */
export function __resetKvForTests() {
  cache.clear();
  ready = false;
  queue = Promise.resolve();
}
