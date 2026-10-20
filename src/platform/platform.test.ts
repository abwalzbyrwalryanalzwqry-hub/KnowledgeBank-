import { test } from 'node:test';
import assert from 'node:assert/strict';

// محاكاة localStorage في Node
const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
};

const { pickNewest, initKvStore, kvGet, __resetKvForTests } = await import('./kvStore');
const storage = await import('../utils/storage');
const { createBackup, parseBackup, checksumOf } = await import('./backup');

const reset = async () => {
  mem.clear();
  __resetKvForTests();
  await initKvStore(storage.STORAGE_KEYS);
};

test('pickNewest يختار رقم المراجعة الأعلى ولا يستبدل الأحدث بالأقدم', () => {
  const a = JSON.stringify({ revision: 5, xp: 50 });
  const b = JSON.stringify({ revision: 9, xp: 90 });
  assert.equal(pickNewest(a, b), b);
  assert.equal(pickNewest(b, a), b);
  assert.equal(pickNewest(null, a), a);
  assert.equal(pickNewest(a, null), a);
  assert.equal(pickNewest(a, '{bad json'), a);
});

test('ترحيل بيانات الإصدار الأول (بلا schemaVersion) دون فقدان التقدم', async () => {
  mem.clear();
  __resetKvForTests();
  mem.set(storage.STATS_KEY, JSON.stringify({ xp: 1200, coins: 77, completedLevels: { l1: { stars: 3, score: 90 } }, totalCorrect: 40 }));
  await initKvStore(storage.STORAGE_KEYS);
  const s = storage.loadPlayerStats();
  assert.equal(s.xp, 1200);
  assert.equal(s.coins, 77);
  assert.deepEqual(s.completedLevels.l1, { stars: 3, score: 90 });
  assert.ok(s.horizon, 'أُضيف تقدم عوالم الأفق');
  storage.savePlayerStats(s);
  const saved = JSON.parse(kvGet(storage.STATS_KEY)!);
  assert.equal(saved.schemaVersion, storage.STATS_SCHEMA_VERSION);
  assert.equal(saved.revision, 1);
});

test('الحقول غير المعروفة من إصدار أحدث تبقى محفوظة', async () => {
  await reset();
  mem.set(storage.STATS_KEY, JSON.stringify({ xp: 10, futureFeature: { a: 1 } }));
  __resetKvForTests();
  await initKvStore(storage.STORAGE_KEYS);
  const s = storage.loadPlayerStats() as any;
  storage.savePlayerStats(s);
  assert.deepEqual(JSON.parse(kvGet(storage.STATS_KEY)!).futureFeature, { a: 1 });
});

test('كل حفظ يزيد رقم المراجعة ويحتفظ بالنسخة السابقة', async () => {
  await reset();
  const s1 = storage.commitStats((p) => ({ ...p, coins: p.coins + 10 }));
  const s2 = storage.commitStats((p) => ({ ...p, coins: p.coins + 5 }));
  assert.equal(s2.revision, (s1.revision ?? 0) + 1);
  const prev = JSON.parse(kvGet(storage.PREV_KEY)!);
  assert.equal(prev.coins, s1.coins);
});

test('بيانات تالفة: نسخة احتياطية من التالف واستعادة آخر نسخة سليمة', async () => {
  await reset();
  storage.commitStats((p) => ({ ...p, coins: 321 }));
  storage.commitStats((p) => ({ ...p, coins: 322 }));
  mem.set(storage.STATS_KEY, '{oops');
  __resetKvForTests();
  await initKvStore(storage.STORAGE_KEYS);
  const s = storage.loadPlayerStats();
  assert.equal(s.coins, 321);
  assert.equal(kvGet(storage.BACKUP_KEY), '{oops');
});

test('الإعدادات: قيم ناقصة أو غير صالحة تعود للافتراضي', () => {
  const s = storage.sanitizeSettings({ soundEnabled: false, fontSize: 'huge', vibrationEnabled: 'yes' });
  assert.equal(s.soundEnabled, false);
  assert.equal(s.fontSize, 'normal');
  assert.equal(s.vibrationEnabled, true);
  assert.equal(typeof s.reducedMotion, 'boolean');
});

test('النسخة الاحتياطية: تصدير ثم استيراد يعيد البيانات نفسها', async () => {
  await reset();
  const stats = storage.commitStats((p) => ({ ...p, coins: 999, xp: 4000 }));
  const settings = storage.loadGameSettings();
  const file = createBackup(stats, settings, '1.0.0', new Date('2026-10-20T00:00:00Z'));
  const res = parseBackup(JSON.stringify(file));
  assert.ok(res.ok);
  if (res.ok) {
    assert.equal(res.stats.coins, 999);
    assert.equal(res.stats.xp, 4000);
    assert.equal(res.summary.coins, 999);
  }
});

test('النسخة الاحتياطية: رفض الملفات التالفة أو المعدلة أو الغريبة', () => {
  const settings = storage.loadGameSettings();
  const file = createBackup(storage.sanitizeStats({ coins: 5 }), settings, '1.0.0');
  assert.equal(parseBackup('not json').ok, false);
  assert.equal(parseBackup(JSON.stringify({ hello: 1 })).ok, false);
  const tampered = { ...file, data: { ...file.data, stats: { ...file.data.stats, coins: 100000 } } };
  const r = parseBackup(JSON.stringify(tampered));
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /بصمة/);
  assert.equal(parseBackup(JSON.stringify({ ...file, version: 99 })).ok, false);
  assert.equal(checksumOf('abc'), checksumOf('abc'));
  assert.notEqual(checksumOf('abc'), checksumOf('abd'));
});

test('الاستيراد يحفظ التقدم الحالي قبل الاستبدال', async () => {
  await reset();
  storage.commitStats((p) => ({ ...p, coins: 42 }));
  storage.replacePlayerStats(storage.sanitizeStats({ coins: 7 }));
  assert.equal(storage.loadPlayerStats().coins, 7);
  assert.equal(JSON.parse(kvGet(storage.PRE_IMPORT_KEY)!).coins, 42);
});
