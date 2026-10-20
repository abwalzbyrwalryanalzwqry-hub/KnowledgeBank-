/**
 * توليد مسودات أسئلة بمساعدة Gemini — يعمل على جهاز المطوّر فقط (Node)، لا داخل الواجهة.
 *
 *   GEMINI_API_KEY=... npm run content:ai-drafts -- --topic "الفلك" --category science --count 5 [--kind mcq|text|truefalse]
 *   npm run content:ai-drafts -- --mock --count 3          (بلا مفتاح: بيانات تجريبية لاختبار المسار)
 *
 * المبادئ:
 * - المفتاح يُقرأ من متغير البيئة فقط؛ لا يُضمَّن في الواجهة ولا في المستودع (.env* مستبعدة في .gitignore).
 * - المخرجات تُكتب في content-drafts/ (خارج src فلا تُحزم مع اللعبة) بحالة draft و review.aiGenerated = true.
 * - لا شيء يُنشر تلقائيًا: يجب أن يراجع إنسان كل سؤال ومصدره، ثم يستورده:
 *     npm run content:import -- content-drafts/<file>.json --pack <packId> --status review
 *   ثم يعتمده في استوديو المحتوى بعد التحقق.
 */
import fs from 'node:fs';
import path from 'node:path';
import { validateChallenge, duplicateKey } from '../src/content/validate.ts';
import type { Challenge, ContentPack, TopicCategory } from '../src/content/types.ts';
import { CATEGORY_LABELS } from '../src/content/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const flag = (n: string) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const topic = flag('--topic') ?? 'ثقافة عامة';
const category = (flag('--category') ?? 'general') as TopicCategory;
const count = Math.min(20, Math.max(1, Number(flag('--count') ?? 5)));
const kind = (flag('--kind') ?? 'mcq') as 'mcq' | 'text' | 'truefalse';
const mock = args.includes('--mock');
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (!(category in CATEGORY_LABELS)) {
  console.error(`تصنيف غير معروف: ${category}. المتاح: ${Object.keys(CATEGORY_LABELS).join(', ')}`);
  process.exit(2);
}

interface RawItem {
  prompt: string;
  options?: string[];
  correctIndex?: number;
  answer?: string | boolean;
  acceptedAnswers?: string[];
  explanation?: string;
  hints?: string[];
  difficulty?: string;
  sourceTitle?: string;
  sourceUrl?: string;
}

const instructions = `أنت مساعد لكتابة أسئلة مسابقات عربية أصلية. اكتب ${count} أسئلة جديدة بالعربية الفصحى عن «${topic}».
القيود: لا تنسخ أسئلة من ألعاب أو مسابقات موجودة. معلومات قابلة للتحقق فقط. لكل سؤال مصدر موثوق (عنوان ورابط) يمكن لمراجع بشري التحقق منه.
النوع: ${kind === 'mcq' ? 'اختيار من أربعة خيارات، مع correctIndex' : kind === 'text' ? 'إجابة نصية قصيرة answer مع acceptedAnswers للبدائل الإملائية الموثقة فقط' : 'صح أو خطأ answer منطقية'}.
أعد JSON فقط: مصفوفة عناصر بالحقول prompt, ${kind === 'mcq' ? 'options, correctIndex,' : 'answer,'} explanation, hints (تلميحان), difficulty (easy|medium|hard), sourceTitle, sourceUrl.`;

async function generate(): Promise<RawItem[]> {
  if (mock) {
    return Array.from({ length: count }, (_, i) => ({
      prompt: `سؤال تجريبي رقم ${i + 1} عن ${topic} (بيانات وهمية لاختبار المسار)`,
      options: ['أ', 'ب', 'ج', 'د'],
      correctIndex: 0,
      answer: kind === 'truefalse' ? true : 'إجابة',
      explanation: 'شرح تجريبي',
      hints: ['تلميح عام', 'تلميح أدق'],
      difficulty: 'easy',
    }));
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY') {
    console.error('GEMINI_API_KEY غير مضبوط. ضعه في متغير البيئة (لا في الشيفرة)، أو استخدم --mock لاختبار المسار.');
    process.exit(2);
  }
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });
  const res = await ai.models.generateContent({
    model,
    contents: instructions,
    config: { responseMimeType: 'application/json', temperature: 0.7 },
  });
  const text = res.text ?? '[]';
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : parsed.items ?? [];
}

const existing: ContentPack[] = fs
  .readdirSync(path.join(ROOT, 'src/content/packs'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src/content/packs', f), 'utf8')));
const existingKeys = new Set(existing.flatMap((p) => p.challenges.map(duplicateKey)));

const raw = await generate();
const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const out: Challenge[] = [];
const rejected: string[] = [];
raw.forEach((r, i) => {
  const id = `c_ai_${stamp}_${String(i + 1).padStart(2, '0')}`;
  const common = {
    id,
    prompt: String(r.prompt ?? '').trim(),
    category,
    difficulty: (['easy', 'medium', 'hard'].includes(String(r.difficulty)) ? r.difficulty : 'medium') as Challenge['difficulty'],
    points: 10,
    hints: (r.hints ?? []).map(String).slice(0, 3),
    explanation: r.explanation ? String(r.explanation) : undefined,
    sources: r.sourceTitle ? [{ title: String(r.sourceTitle), url: r.sourceUrl ? String(r.sourceUrl) : undefined, note: 'مصدر مقترح آليًا — يجب التحقق منه' }] : [],
    requiresSource: true,
    status: 'draft' as const,
    review: { aiGenerated: true, notes: `مولّد بنموذج ${mock ? 'تجريبي' : model}؛ لم تتم مراجعته بشريًا` },
  };
  let c: Challenge;
  if (kind === 'mcq') c = { ...common, kind: 'mcq', options: (r.options ?? []).map(String), correctIndex: Number(r.correctIndex ?? -1) };
  else if (kind === 'truefalse') c = { ...common, kind: 'truefalse', answer: r.answer === true || r.answer === 'true' };
  else c = { ...common, kind: 'text', answer: String(r.answer ?? ''), acceptedAnswers: (r.acceptedAnswers ?? []).map(String) };
  const errors = validateChallenge(c).filter((x) => x.level === 'error');
  if (errors.length) return rejected.push(`${id}: ${errors.map((e) => e.message).join('؛ ')}`);
  if (existingKeys.has(duplicateKey(c))) return rejected.push(`${id}: مكرر مع سؤال موجود`);
  out.push(c);
});

const dir = path.join(ROOT, 'content-drafts');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `ai-${stamp}.json`);
fs.writeFileSync(file, JSON.stringify({ challenges: out }, null, 2) + '\n');
console.log(`✓ ${out.length} مسودة في ${path.relative(ROOT, file)} (حالة draft، تحتاج مراجعة بشرية قبل أي نشر)`);
if (rejected.length) console.log(`رُفض ${rejected.length}:\n  ${rejected.join('\n  ')}`);
