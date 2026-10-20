/**
 * نسخة احتياطية محلية اختيارية للتقدم والإعدادات.
 * التصدير: ملف JSON يُشارك عبر قائمة المشاركة في Android (حفظ في الملفات، Drive، رسالة...)،
 * أو يُنزَّل في المتصفح. الاستيراد: التحقق من الصيغة والإصدار وبصمة السلامة قبل أي استبدال،
 * مع حفظ التقدم الحالي تلقائيًا قبل الاستبدال.
 */
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import type { GameSettings, PlayerStats } from '../types/game';
import { STATS_SCHEMA_VERSION, sanitizeStats, sanitizeSettings } from '../utils/storage';

export const BACKUP_FORMAT = 'horizon-knowledge-backup';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  appVersion: string;
  exportedAt: string;
  schemaVersion: number;
  checksum: string;
  data: { stats: PlayerStats; settings: GameSettings };
}

/** بصمة FNV-1a ‏32 بت (لكشف تلف الملف أو تعديله اليدوي غير المقصود، وليست تشفيرًا). */
export function checksumOf(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function createBackup(stats: PlayerStats, settings: GameSettings, appVersion: string, now = new Date()): BackupFile {
  const data = { stats, settings };
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    appVersion,
    exportedAt: now.toISOString(),
    schemaVersion: STATS_SCHEMA_VERSION,
    checksum: checksumOf(JSON.stringify(data)),
    data,
  };
}

export interface BackupPreview {
  ok: true;
  stats: PlayerStats;
  settings: GameSettings;
  exportedAt: string;
  summary: { points: number; coins: number; xp: number; stagesCompleted: number; classicLevels: number };
}
export type BackupParseResult = BackupPreview | { ok: false; error: string };

export function parseBackup(text: string): BackupParseResult {
  let file: any;
  try {
    file = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    return { ok: false, error: 'الملف ليس JSON صالحًا.' };
  }
  if (!file || file.format !== BACKUP_FORMAT) return { ok: false, error: 'هذا الملف ليس نسخة احتياطية من «أفق المعرفة».' };
  if (typeof file.version !== 'number' || file.version > BACKUP_VERSION)
    return { ok: false, error: 'النسخة الاحتياطية من إصدار أحدث من التطبيق. حدّث التطبيق أولًا.' };
  if (!file.data || typeof file.data !== 'object' || typeof file.data.stats !== 'object')
    return { ok: false, error: 'الملف لا يحتوي بيانات تقدم.' };
  if (file.checksum !== checksumOf(JSON.stringify(file.data)))
    return { ok: false, error: 'بصمة السلامة غير مطابقة: الملف تالف أو عُدّل يدويًا.' };
  const stats = sanitizeStats(file.data.stats);
  const settings = sanitizeSettings(file.data.settings);
  const h = stats.horizon;
  return {
    ok: true,
    stats,
    settings,
    exportedAt: String(file.exportedAt ?? ''),
    summary: {
      points: h?.points ?? 0,
      coins: stats.coins,
      xp: stats.xp,
      stagesCompleted: h ? Object.values(h.stages).filter((s) => s.completed).length : 0,
      classicLevels: Object.keys(stats.completedLevels).length,
    },
  };
}

export function backupFileName(now = new Date()) {
  return `horizon-backup-${now.toISOString().slice(0, 10)}.json`;
}

/** يعيد وصفًا لما حدث (للعرض). */
export async function exportBackup(file: BackupFile): Promise<string> {
  const name = backupFileName(new Date(file.exportedAt));
  const content = JSON.stringify(file, null, 2);
  if (Capacitor.isNativePlatform()) {
    const res = await Filesystem.writeFile({ path: name, data: content, directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title: 'نسخة احتياطية — أفق المعرفة', files: [res.uri], dialogTitle: 'احفظ النسخة الاحتياطية' });
    } catch (e) {
      // إلغاء المستخدم لقائمة المشاركة ليس خطأ
      if (!/cancel/i.test(String((e as Error)?.message ?? e))) throw e;
      return 'أُلغيت المشاركة. لم يُحفظ الملف خارج التطبيق.';
    }
    return 'أُنشئت النسخة الاحتياطية. اختر مكان حفظها من قائمة المشاركة.';
  }
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return `نُزّل الملف ${name}.`;
}
