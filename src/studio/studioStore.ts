/**
 * مخزن الاستوديو: تعديلات المحرر تُحفظ محليًا في المتصفح (localStorage) كمسودات،
 * ثم تُصدَّر إلى ملف JSON يُطبَّق على المستودع عبر:
 *   npm run content:apply -- studio-export.json --pack <packId>
 * لا يكتب الاستوديو على الخادم ولا ينشر شيئًا بنفسه.
 */
import type { Challenge, ContentPack, StageDef, GroupDef, WorldDef } from '../content/types';

export const STUDIO_KEY = 'horizon_studio_workspace_v1';

export interface StudioWorkspace {
  /** تعديلات على عناصر موجودة في الحزم (بالمعرف). */
  challengeOverrides: Record<string, Challenge>;
  stageOverrides: Record<string, StageDef>;
  /** عناصر جديدة. */
  newChallenges: Challenge[];
  newStages: StageDef[];
  newGroups: GroupDef[];
  newWorlds: WorldDef[];
  updatedAt?: string;
}

export interface StudioExport {
  format: 'horizon-studio-export';
  version: 1;
  exportedAt: string;
  challengeOverrides: Challenge[];
  stageOverrides: StageDef[];
  drafts: Pick<ContentPack, 'worlds' | 'groups' | 'stages' | 'challenges'>;
}

export const emptyWorkspace = (): StudioWorkspace => ({
  challengeOverrides: {},
  stageOverrides: {},
  newChallenges: [],
  newStages: [],
  newGroups: [],
  newWorlds: [],
});

export function loadWorkspace(): StudioWorkspace {
  try {
    const raw = localStorage.getItem(STUDIO_KEY);
    if (!raw) return emptyWorkspace();
    return { ...emptyWorkspace(), ...JSON.parse(raw) };
  } catch {
    return emptyWorkspace();
  }
}

export function saveWorkspace(ws: StudioWorkspace) {
  localStorage.setItem(STUDIO_KEY, JSON.stringify({ ...ws, updatedAt: new Date().toISOString() }));
}

/** دمج الحزم الأصلية مع تعديلات الاستوديو للحصول على صورة العمل الحالية. */
export function applyWorkspace(base: ContentPack[], ws: StudioWorkspace): ContentPack[] {
  const merged = base.map((p) => ({
    ...p,
    challenges: p.challenges.map((c) => ws.challengeOverrides[c.id] ?? c),
    stages: p.stages.map((s) => ws.stageOverrides[s.id] ?? s),
  }));
  if (ws.newChallenges.length || ws.newStages.length || ws.newGroups.length || ws.newWorlds.length) {
    merged.push({
      packId: 'studio-drafts',
      version: 1,
      worlds: ws.newWorlds,
      groups: ws.newGroups,
      stages: ws.newStages,
      challenges: ws.newChallenges,
    });
  }
  return merged;
}

export function toExport(ws: StudioWorkspace): StudioExport {
  return {
    format: 'horizon-studio-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    challengeOverrides: Object.values(ws.challengeOverrides),
    stageOverrides: Object.values(ws.stageOverrides),
    drafts: { worlds: ws.newWorlds, groups: ws.newGroups, stages: ws.newStages, challenges: ws.newChallenges },
  };
}

export function download(filename: string, content: string, type = 'application/json') {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
