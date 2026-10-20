/**
 * المحرك المركزي للتحقق من الإجابات العربية.
 * لا يستخدم أي مطابقة تقريبية (لا مسافة تحرير ولا تشابه): بعد التطبيع يجب أن تتطابق الإجابة تمامًا
 * مع الإجابة الصحيحة أو إحدى الإجابات البديلة الموثقة.
 */
import type {
  Challenge,
  MatchRules,
  CrosswordChallenge,
  WordSearchChallenge,
} from './types.ts';

export const DEFAULT_MATCH_RULES: Required<Omit<MatchRules, 'numericTolerance'>> & { numericTolerance: number } = {
  ignoreDiacritics: true,
  ignoreTatweel: true,
  ignorePunctuation: true,
  normalizeDigits: true,
  foldAlef: false,
  foldTaMarbuta: false,
  foldYa: false,
  foldHamzaSeats: false,
  ignoreDefiniteArticle: false,
  ignoreSpaces: false,
  numericTolerance: 0,
};

// الحركات العربية + علامات قرآنية + الألف الخنجرية
const DIACRITICS_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL_RE = /\u0640/g;
// علامات الترقيم العربية واللاتينية الشائعة
const PUNCT_RE = /[.,!?؛،؟:;"'«»()\[\]{}\-_/\\…·"'`~*]/g;

/** تحويل الأرقام العربية الهندية (٠-٩) والفارسية (۰-۹) إلى أرقام غربية. */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\u066B/g, '.') // الفاصلة العشرية العربية
    .replace(/\u066C/g, ''); // فاصل الآلاف العربي
}

export function resolveRules(rules?: MatchRules): typeof DEFAULT_MATCH_RULES {
  return { ...DEFAULT_MATCH_RULES, ...(rules || {}) };
}

/** تطبيع نص عربي حسب القواعد. */
export function normalizeArabic(input: string, rules?: MatchRules): string {
  const r = resolveRules(rules);
  let s = (input ?? '').normalize('NFC');
  if (r.normalizeDigits) s = normalizeDigits(s);
  if (r.ignoreDiacritics) s = s.replace(DIACRITICS_RE, '');
  if (r.ignoreTatweel) s = s.replace(TATWEEL_RE, '');
  if (r.ignorePunctuation) s = s.replace(PUNCT_RE, ' ');
  if (r.foldAlef) s = s.replace(/[أإآٱ]/g, 'ا');
  if (r.foldTaMarbuta) s = s.replace(/ة/g, 'ه');
  if (r.foldYa) s = s.replace(/ى/g, 'ي');
  if (r.foldHamzaSeats) s = s.replace(/ؤ/g, 'و').replace(/ئ/g, 'ي');
  s = s.toLowerCase().replace(/\s+/g, ' ').trim();
  if (r.ignoreDefiniteArticle) {
    s = s
      .split(' ')
      .map((w) => (w.length > 3 && w.startsWith('ال') ? w.slice(2) : w))
      .join(' ');
  }
  if (r.ignoreSpaces) s = s.replace(/\s+/g, '');
  return s;
}

/** مقارنة إجابة نصية بالإجابة الصحيحة والبدائل. */
export function matchText(input: string, answer: string, accepted: string[] = [], rules?: MatchRules): boolean {
  const given = normalizeArabic(input, rules);
  if (!given) return false;
  return [answer, ...accepted].some((candidate) => normalizeArabic(candidate, rules) === given);
}

/** تحويل إدخال رقمي (عربي أو غربي) إلى رقم، أو null إن لم يكن رقمًا صالحًا. */
export function parseNumberInput(input: string): number | null {
  const s = normalizeDigits(input ?? '')
    .replace(/[\s,]/g, '')
    .replace(/٫/g, '.')
    .replace(/^−/, '-');
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

export function matchNumber(input: string, answer: number, tolerance = 0): boolean {
  const n = parseNumberInput(input);
  if (n === null) return false;
  return Math.abs(n - answer) <= Math.max(0, tolerance);
}

/** الخلايا الناتجة عن مداخل الكلمات المتقاطعة: مفتاح "r,c" ← الحرف الصحيح. */
export function crosswordSolution(ch: Pick<CrosswordChallenge, 'entries'>): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of ch.entries) {
    const letters = Array.from(e.answer.replace(/\s+/g, ''));
    letters.forEach((letter, i) => {
      const r = e.direction === 'down' ? e.row + i : e.row;
      const c = e.direction === 'across' ? e.col + i : e.col;
      map.set(`${r},${c}`, letter);
    });
  }
  return map;
}

export function matchCrosswordCell(input: string, expected: string, rules?: MatchRules): boolean {
  const r = { ...rules, ignoreSpaces: true };
  const a = normalizeArabic(input, r);
  return a.length > 0 && a === normalizeArabic(expected, r);
}

/** استخراج الحروف على خط مستقيم بين خانتين في شبكة البحث عن الكلمات. */
export function lineCells(
  from: { r: number; c: number },
  to: { r: number; c: number }
): Array<{ r: number; c: number }> | null {
  const dr = Math.sign(to.r - from.r);
  const dc = Math.sign(to.c - from.c);
  const lenR = Math.abs(to.r - from.r);
  const lenC = Math.abs(to.c - from.c);
  if (lenR !== 0 && lenC !== 0 && lenR !== lenC) return null; // ليس خطًا مستقيمًا أو قطريًا
  const len = Math.max(lenR, lenC);
  const cells = [];
  for (let i = 0; i <= len; i++) cells.push({ r: from.r + dr * i, c: from.c + dc * i });
  return cells;
}

export function gridLetters(ch: Pick<WordSearchChallenge, 'grid'>): string[][] {
  return ch.grid.map((row) => Array.from(row));
}

/** التحقق من تحديد كلمة في شبكة البحث: يعيد الكلمة المطابقة أو null. */
export function matchWordSearchSelection(
  ch: Pick<WordSearchChallenge, 'grid' | 'words'>,
  from: { r: number; c: number },
  to: { r: number; c: number }
): string | null {
  const cells = lineCells(from, to);
  if (!cells || cells.length < 2) return null;
  const g = gridLetters(ch);
  const letters = cells.map(({ r, c }) => g[r]?.[c] ?? '').join('');
  const reversed = Array.from(letters).reverse().join('');
  const rules: MatchRules = { ignoreSpaces: true };
  for (const w of ch.words) {
    const nw = normalizeArabic(w, rules);
    if (nw === normalizeArabic(letters, rules) || nw === normalizeArabic(reversed, rules)) return w;
  }
  return null;
}

/** إيجاد موضع كلمة في الشبكة (8 اتجاهات). يستخدمه المدقق وعرض الحل. */
export function findWordInGrid(
  ch: Pick<WordSearchChallenge, 'grid'>,
  word: string
): Array<{ r: number; c: number }> | null {
  const g = gridLetters(ch);
  const target = Array.from(word.replace(/\s+/g, ''));
  const dirs = [
    [0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1],
  ];
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < g[r].length; c++) {
      for (const [dr, dc] of dirs) {
        const cells = [];
        let ok = true;
        for (let i = 0; i < target.length; i++) {
          const rr = r + dr * i;
          const cc = c + dc * i;
          if (g[rr]?.[cc] !== target[i]) {
            ok = false;
            break;
          }
          cells.push({ r: rr, c: cc });
        }
        if (ok) return cells;
      }
    }
  }
  return null;
}

/** حرف كلمة السر المستخرج من إجابة دليل. */
export function passwordLetter(answer: string, index: number): string {
  return Array.from(answer.replace(/\s+/g, ''))[index] ?? '';
}

/** إجابة اللاعب حسب نوع التحدي. */
export type PlayerAnswer =
  | { kind: 'mcq'; optionIndex: number }
  | { kind: 'truefalse'; value: boolean }
  | { kind: 'text'; value: string }
  | { kind: 'number'; value: string }
  | { kind: 'order'; value: string }
  | { kind: 'password'; value: string }
  | { kind: 'crossword'; cells: Record<string, string> }
  | { kind: 'wordsearch'; found: string[] }
  | { kind: 'observation'; selected: number[] };

/**
 * التحقق المركزي من إجابة أي تحدٍ. خيارات الاختيار من متعدد تُقارن بالفهرس الأصلي
 * (الواجهة مسؤولة عن تحويل الفهرس المعروض بعد الخلط إلى الفهرس الأصلي).
 */
export function checkAnswer(ch: Challenge, ans: PlayerAnswer): boolean {
  switch (ch.kind) {
    case 'mcq':
      return ans.kind === 'mcq' && ans.optionIndex === ch.correctIndex;
    case 'truefalse':
      return ans.kind === 'truefalse' && ans.value === ch.answer;
    case 'text':
      return ans.kind === 'text' && matchText(ans.value, ch.answer, ch.acceptedAnswers, ch.match);
    case 'number':
      return ans.kind === 'number' && matchNumber(ans.value, ch.answer, ch.match?.numericTolerance ?? 0);
    case 'order':
      return (
        ans.kind === 'order' &&
        matchText(ans.value, ch.answer, ch.acceptedAnswers, { ...ch.match, ignoreSpaces: ch.unit === 'letters' || ch.match?.ignoreSpaces })
      );
    case 'password':
      return (
        ans.kind === 'password' &&
        matchText(ans.value, ch.answer, ch.acceptedAnswers, { ignoreSpaces: true, ...ch.match })
      );
    case 'crossword': {
      if (ans.kind !== 'crossword') return false;
      const sol = crosswordSolution(ch);
      for (const [key, letter] of sol) {
        if (!matchCrosswordCell(ans.cells[key] ?? '', letter, ch.match)) return false;
      }
      return true;
    }
    case 'wordsearch': {
      if (ans.kind !== 'wordsearch') return false;
      const found = new Set(ans.found);
      return ch.words.every((w) => found.has(w));
    }
    case 'observation': {
      if (ans.kind !== 'observation') return false;
      const sel = [...new Set(ans.selected)].sort((a, b) => a - b);
      const tgt = [...new Set(ch.targets)].sort((a, b) => a - b);
      return sel.length === tgt.length && sel.every((v, i) => v === tgt[i]);
    }
  }
}

/** نص الإجابة الصحيحة لعرضه بعد الحل. */
export function describeCorrectAnswer(ch: Challenge): string {
  switch (ch.kind) {
    case 'mcq':
      return ch.options[ch.correctIndex];
    case 'truefalse':
      return ch.answer ? 'صح' : 'خطأ';
    case 'text':
    case 'order':
    case 'password':
      return ch.answer;
    case 'number':
      return `${ch.answer}${ch.unit ? ' ' + ch.unit : ''}`;
    case 'crossword':
      return ch.entries.map((e) => e.answer).join('، ');
    case 'wordsearch':
      return ch.words.join('، ');
    case 'observation':
      return ch.targets.map((t) => ch.cells[t]).join('، ');
  }
}
