/**
 * تحميل المحتوى في المتصفح.
 * - الملخص (manifest.json) صغير ويُحمّل فورًا لعرض العوالم والمجموعات والمراحل.
 * - كل حزمة JSON تُحمّل عند الحاجة فقط (تقسيم تلقائي للشيفرة عبر Vite)،
 *   فلا يلزم تحميل آلاف الأسئلة لعرض الخريطة.
 * - قبل اللعب يُعاد التحقق من المرحلة، فلا تُعرض مرحلة فارغة أو معطوبة.
 */
import manifestJson from './manifest.json';
import type { ContentManifest, ContentPack, PlayableStage } from './types.ts';
import { buildPlayableStages } from './validate.ts';

export const manifest = manifestJson as unknown as ContentManifest;

const packLoaders = import.meta.glob<ContentPack>('./packs/*.json', { import: 'default' });
const cache = new Map<string, Promise<ContentPack>>();

export function loadPack(packId: string): Promise<ContentPack> {
  const key = `./packs/${packId}.json`;
  const loader = packLoaders[key];
  if (!loader) return Promise.reject(new Error(`حزمة المحتوى ${packId} غير موجودة`));
  if (!cache.has(key)) cache.set(key, loader());
  return cache.get(key)!;
}

export function listPackIds(): string[] {
  return Object.keys(packLoaders).map((k) => k.replace('./packs/', '').replace('.json', ''));
}

export async function loadAllPacks(): Promise<ContentPack[]> {
  return Promise.all(listPackIds().map(loadPack));
}

/** تحميل مرحلة جاهزة للعب، أو null إن لم تكن صالحة للنشر. */
export async function loadPlayableStage(stageId: string): Promise<PlayableStage | null> {
  const entry = manifest.stageIndex.find((s) => s.id === stageId);
  if (!entry) return null;
  // نحمّل كل الحزم المرتبطة بالعالم لأن المرحلة قد تشير إلى أسئلة في حزمة أخرى
  const world = manifest.worlds.find((w) => w.id === entry.worldId);
  const ids = new Set([entry.packId, ...(world?.packIds ?? [])]);
  const packs = await Promise.all([...ids].map(loadPack));
  const playable = buildPlayableStages(packs);
  return playable.get(stageId) ?? null;
}
