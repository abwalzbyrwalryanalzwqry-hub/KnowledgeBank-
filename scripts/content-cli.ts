/**
 * أداة إدارة المحتوى من سطر الأوامر.
 *
 *   npm run content:validate              تحقق من كل الحزم (يفشل عند وجود أخطاء)
 *   npm run content:build                 تحقق + توليد src/content/manifest.json
 *   npm run content:stats                 إحصاءات المحتوى
 *   npm run content:import -- <file> --pack <packId> [--dry-run]
 *   npm run content:export -- --format csv|json [--out file]
 *   npm run content:links                 فحص روابط المراجع (يحتاج إلى إنترنت)
 *   npm run content:apply -- <studio-export.json> --pack <packId> [--dry-run]
 *                                         تطبيق تصدير استوديو المحتوى (تعديلات + عناصر جديدة)
 */
import fs from 'node:fs';
import path from 'node:path';
import { validatePacks, buildManifest } from '../src/content/validate.ts';
import { challengesFromCsv, parseJsonImport, mergeBatch, challengesToCsv } from '../src/content/importer.ts';
import type { ContentPack } from '../src/content/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const PACKS_DIR = path.join(ROOT, 'src/content/packs');
const MANIFEST = path.join(ROOT, 'src/content/manifest.json');

function loadPacks(): ContentPack[] {
  return fs
    .readdirSync(PACKS_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(PACKS_DIR, f), 'utf8')) as ContentPack);
}

function writePack(p: ContentPack) {
  fs.writeFileSync(path.join(PACKS_DIR, `${p.packId}.json`), JSON.stringify(p, null, 2) + '\n');
}

function printReport(packs: ContentPack[], verbose = true) {
  const r = validatePacks(packs);
  const s = r.stats;
  console.log(`الحزم: ${packs.length} · العوالم: ${s.worlds} · المجموعات: ${s.groups}`);
  console.log(`المراحل: ${s.stages} (منشورة: ${s.publishedStages}، قابلة للعب: ${s.playableStages})`);
  console.log(`الأسئلة/التحديات: ${s.challenges} (منشورة: ${s.publishedChallenges})`);
  console.log(`عناصر تحتاج إلى مراجعة (مسودة/مراجعة): ${s.needsReview}`);
  console.log('حسب الآلية:', JSON.stringify(s.byKind));
  console.log('حسب نمط المرحلة:', JSON.stringify(s.byStageType));
  if (verbose) {
    for (const w of r.warnings) console.log(`  تحذير [${w.code}] ${w.ref ?? ''} ${w.message}`);
  } else if (r.warnings.length) console.log(`تحذيرات: ${r.warnings.length} (استخدم content:validate لعرضها)`);
  for (const e of r.errors) console.log(`  خطأ [${e.code}] ${e.pack ?? ''}/${e.ref ?? ''} ${e.message}`);
  console.log(r.errors.length ? `✗ ${r.errors.length} خطأ` : '✓ لا توجد أخطاء');
  return r;
}

const [cmd, ...rest] = process.argv.slice(2);
const flag = (name: string) => {
  const i = rest.indexOf(name);
  return i >= 0 ? rest[i + 1] : undefined;
};

switch (cmd) {
  case 'validate': {
    const r = printReport(loadPacks());
    process.exit(r.errors.length ? 1 : 0);
  }
  case 'stats': {
    printReport(loadPacks(), false);
    break;
  }
  case 'build': {
    const packs = loadPacks();
    const r = printReport(packs, false);
    if (r.errors.length) {
      console.error('لن يُولّد الملخص بسبب الأخطاء.');
      process.exit(1);
    }
    // تاريخ ثابت مشتق من المحتوى حتى لا يتغير الملف دون تغيير حقيقي
    const manifest = buildManifest(packs, 'content');
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`✓ كُتب ${path.relative(ROOT, MANIFEST)} (${manifest.stageIndex.length} مرحلة قابلة للعب)`);
    break;
  }
  case 'import': {
    const file = rest.find((a) => !a.startsWith('--') && a !== flag('--pack') && a !== flag('--status'));
    const packId = flag('--pack');
    const status = (flag('--status') as any) || 'review';
    if (!file || !packId) {
      console.error('الاستخدام: content:import -- <file.json|file.csv> --pack <packId> [--status review|draft|published] [--dry-run]');
      process.exit(2);
    }
    if (!/^[a-z0-9][a-z0-9\-]*$/.test(packId)) {
      console.error('معرف الحزمة يجب أن يكون بأحرف لاتينية صغيرة وأرقام و-');
      process.exit(2);
    }
    const raw = fs.readFileSync(file, 'utf8');
    const batch = file.endsWith('.csv')
      ? { ...challengesFromCsv(raw, status), stages: [] as any[] }
      : parseJsonImport(raw, status);
    if (batch.problems.length) {
      batch.problems.forEach((p) => console.error(`  ${p.row ? `سطر ${p.row}: ` : ''}${p.message}`));
      process.exit(1);
    }
    const res = mergeBatch(loadPacks(), packId, batch);
    if (!res.ok) {
      console.error('✗ رُفض الاستيراد، لم يُكتب أي شيء:');
      res.problems.forEach((p) => console.error('  ' + p.message));
      process.exit(1);
    }
    console.log(`✓ الدفعة صالحة: ${res.added.challenges} سؤال و${res.added.stages} مرحلة.`);
    if (rest.includes('--dry-run')) {
      console.log('(تشغيل تجريبي، لم يُكتب شيء)');
      break;
    }
    writePack(res.packs.find((p) => p.packId === packId)!);
    console.log(`✓ حُفظت الحزمة ${packId}. شغّل npm run content:build لتحديث الملخص.`);
    break;
  }
  case 'apply': {
    const file = rest.find((a) => !a.startsWith('--') && a !== flag('--pack'));
    const packId = flag('--pack');
    if (!file || !packId) {
      console.error('الاستخدام: content:apply -- <studio-export.json> --pack <packId> [--dry-run]');
      process.exit(2);
    }
    const exp = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (exp.format !== 'horizon-studio-export') {
      console.error('الملف ليس تصديرًا من استوديو المحتوى.');
      process.exit(2);
    }
    let packs = loadPacks();
    const touched = new Set<string>();
    // 1) تعديلات على عناصر موجودة (بالمعرف الثابت)
    for (const c of exp.challengeOverrides ?? []) {
      const p = packs.find((x) => x.challenges.some((y) => y.id === c.id));
      if (!p) { console.error(`  السؤال ${c.id} غير موجود في الحزم`); process.exit(1); }
      p.challenges = p.challenges.map((y) => (y.id === c.id ? c : y));
      touched.add(p.packId);
    }
    for (const st of exp.stageOverrides ?? []) {
      const p = packs.find((x) => x.stages.some((y) => y.id === st.id));
      if (!p) { console.error(`  المرحلة ${st.id} غير موجودة في الحزم`); process.exit(1); }
      p.stages = p.stages.map((y) => (y.id === st.id ? st : y));
      touched.add(p.packId);
    }
    // 2) عناصر جديدة: كل شيء أو لا شيء
    const d = exp.drafts ?? {};
    if ((d.challenges?.length ?? 0) + (d.stages?.length ?? 0) + (d.groups?.length ?? 0) + (d.worlds?.length ?? 0) > 0) {
      const res = mergeBatch(packs, packId, {
        challenges: d.challenges ?? [],
        stages: d.stages ?? [],
        pack: { packId, version: 1, worlds: d.worlds ?? [], groups: d.groups ?? [], stages: [], challenges: [] },
      });
      if (!res.ok) {
        console.error('✗ رُفض التطبيق، لم يُكتب أي شيء:');
        res.problems.forEach((p) => console.error('  ' + p.message));
        process.exit(1);
      }
      packs = res.packs;
      touched.add(packId);
    }
    const r = printReport(packs, false);
    if (r.errors.length) {
      console.error('✗ التطبيق ينتج أخطاء تحقق، لم يُكتب أي شيء.');
      process.exit(1);
    }
    if (rest.includes('--dry-run')) {
      console.log(`(تشغيل تجريبي) الحزم المتأثرة: ${[...touched].join(', ')}`);
      break;
    }
    for (const id of touched) writePack(packs.find((p) => p.packId === id)!);
    fs.writeFileSync(MANIFEST, JSON.stringify(buildManifest(packs, 'content'), null, 2) + '\n');
    console.log(`✓ طُبّق التصدير على: ${[...touched].join(', ')} وحُدّث الملخص.`);
    break;
  }
  case 'export': {
    const fmt = flag('--format') || 'json';
    const out = flag('--out');
    const packs = loadPacks();
    const data = fmt === 'csv' ? challengesToCsv(packs.flatMap((p) => p.challenges)) : JSON.stringify(packs, null, 2);
    if (out) fs.writeFileSync(out, data);
    else process.stdout.write(data);
    break;
  }
  case 'links': {
    const urls = new Map<string, string[]>();
    for (const p of loadPacks()) for (const c of p.challenges) for (const s of c.sources || []) if (s.url) urls.set(s.url, [...(urls.get(s.url) || []), c.id]);
    let bad = 0;
    for (const [url, ids] of urls) {
      try {
        const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (content link check)' } });
        const ok = res.status < 400;
        // بعض المواقع (مثل Britannica) تحظر الفحص الآلي بـ 403؛ تُعرض للتحقق اليدوي ولا تُعد معطوبة
        const blocked = res.status === 403 || res.status === 429;
        if (!ok && !blocked) bad++;
        console.log(`${ok ? '✓' : blocked ? '⚠' : '✗'} ${res.status} ${url} (${ids.join(', ')})${blocked ? ' — محظور للفحص الآلي، تحقّق يدويًا' : ''}`);
      } catch (e) {
        bad++;
        console.log(`✗ ERR ${url} ${(e as Error).message}`);
      }
    }
    console.log(bad ? `✗ ${bad} رابط لا يعمل` : `✓ كل الروابط (${urls.size}) تعمل`);
    process.exit(bad ? 1 : 0);
  }
  default:
    console.log('الأوامر: validate | build | stats | import | export | links');
}
