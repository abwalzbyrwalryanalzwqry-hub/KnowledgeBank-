/**
 * أنواع بيانات المحتوى في «أفق المعرفة».
 * البنية: العالم ← المجموعة ← المرحلة ← التحدي (السؤال).
 * المحتوى مخزن في ملفات JSON داخل src/content/packs ومنفصل تمامًا عن مكونات React.
 */

export type ContentDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** حالة النشر/المراجعة لأي عنصر محتوى. */
export type PublishStatus = 'draft' | 'review' | 'published' | 'archived';

/** تصنيف موضوعي للسؤال (عن ماذا يتحدث). */
export type TopicCategory =
  | 'general'
  | 'history'
  | 'geography'
  | 'science'
  | 'religion'
  | 'math'
  | 'arabic'
  | 'proverbs'
  | 'sports'
  | 'technology'
  | 'logic'
  | 'words'
  | 'visual';

/** نمط المرحلة كما يظهر للاعب (19 نمطًا). */
export type StageType =
  | 'general'
  | 'history'
  | 'geography'
  | 'science'
  | 'religion'
  | 'math'
  | 'arabic'
  | 'proverbs'
  | 'sports'
  | 'technology'
  | 'logic'
  | 'crossword'
  | 'wordsearch'
  | 'password'
  | 'order'
  | 'picture'
  | 'pattern'
  | 'observation'
  | 'mixed';

/** آلية الإدخال الفعلية للتحدي. */
export type ChallengeKind =
  | 'mcq'
  | 'truefalse'
  | 'text'
  | 'number'
  | 'order'
  | 'password'
  | 'crossword'
  | 'wordsearch'
  | 'observation';

/** قواعد مطابقة الإجابات النصية، قابلة للتخصيص لكل سؤال. */
export interface MatchRules {
  /** تجاهل التشكيل (الافتراضي: نعم). */
  ignoreDiacritics?: boolean;
  /** تجاهل التطويل «ـ» (الافتراضي: نعم). */
  ignoreTatweel?: boolean;
  /** تجاهل علامات الترقيم (الافتراضي: نعم). */
  ignorePunctuation?: boolean;
  /** توحيد الأرقام العربية الهندية والفارسية مع الغربية (الافتراضي: نعم). */
  normalizeDigits?: boolean;
  /** قبول اختلاف الهمزات على الألف: أ إ آ ٱ ← ا (الافتراضي: لا، يجب التصريح). */
  foldAlef?: boolean;
  /** قبول التاء المربوطة هاءً: ة ← ه (الافتراضي: لا). */
  foldTaMarbuta?: boolean;
  /** قبول الألف المقصورة ياءً: ى ← ي (الافتراضي: لا). */
  foldYa?: boolean;
  /** قبول ؤ/ئ بدل و/ي (الافتراضي: لا). */
  foldHamzaSeats?: boolean;
  /** تجاهل «ال» التعريف في أول كل كلمة (الافتراضي: لا). */
  ignoreDefiniteArticle?: boolean;
  /** تجاهل المسافات كليًا (مفيد لكلمات السر) (الافتراضي: لا). */
  ignoreSpaces?: boolean;
  /** هامش مقبول للإجابات الرقمية (الافتراضي: 0 أي تطابق تام). */
  numericTolerance?: number;
}

/** مرجع لتوثيق المعلومة. */
export interface SourceRef {
  title: string;
  url?: string;
  note?: string;
}

/** وسائط مرئية آمنة (لا تُحقن HTML). */
export type MediaSpec =
  | { type: 'emoji'; value: string; caption?: string }
  | { type: 'sequence'; items: string[]; caption?: string }
  | { type: 'shapes'; viewBox: string; shapes: ShapeSpec[]; caption?: string; alt: string };

export type ShapeSpec =
  | { shape: 'rect'; x: number; y: number; width: number; height: number; fill?: string; stroke?: string; strokeWidth?: number; rx?: number }
  | { shape: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { shape: 'line'; x1: number; y1: number; x2: number; y2: number; stroke?: string; strokeWidth?: number }
  | { shape: 'polygon'; points: string; fill?: string; stroke?: string; strokeWidth?: number }
  | { shape: 'text'; x: number; y: number; text: string; fill?: string; fontSize?: number };

interface ChallengeBase {
  /** معرف ثابت فريد على مستوى كل المحتوى. لا يُغيّر بعد النشر. */
  id: string;
  kind: ChallengeKind;
  /** نص السؤال أو التعليمات. */
  prompt: string;
  category: TopicCategory;
  difficulty: ContentDifficulty;
  /** نقاط التحدي الأساسية. */
  points: number;
  /** تلميحات تدريجية (من الأعم إلى الأدق). */
  hints: string[];
  /** شرح يظهر بعد الإجابة. */
  explanation?: string;
  /** مراجع موثوقة للمعلومات التي تحتاج إلى توثيق. */
  sources?: SourceRef[];
  /** يجب أن يحتوي على مصدر (تلزم به المراجعة). */
  requiresSource?: boolean;
  /** تاريخ آخر مراجعة YYYY-MM-DD للمعلومات القابلة للتغير. */
  lastReviewed?: string;
  /** المعلومة قد تتغير مع الزمن (أرقام قياسية، إحصاءات...). */
  timeSensitive?: boolean;
  status: PublishStatus;
  media?: MediaSpec;
  tags?: string[];
  /** بيانات مراجعة المحتوى. */
  review?: { aiGenerated?: boolean; reviewer?: string; notes?: string };
}

export interface McqChallenge extends ChallengeBase {
  kind: 'mcq';
  options: string[];
  correctIndex: number;
  /** إن كان ترتيب الخيارات مهمًا (مثل «جميع ما سبق») فلا تُخلط. */
  keepOptionOrder?: boolean;
}

export interface TrueFalseChallenge extends ChallengeBase {
  kind: 'truefalse';
  answer: boolean;
}

export interface TextChallenge extends ChallengeBase {
  kind: 'text';
  answer: string;
  /** إجابات بديلة موثقة ومقبولة. */
  acceptedAnswers?: string[];
  match?: MatchRules;
  placeholder?: string;
}

export interface NumberChallenge extends ChallengeBase {
  kind: 'number';
  answer: number;
  unit?: string;
  match?: Pick<MatchRules, 'numericTolerance'>;
}

export interface OrderChallenge extends ChallengeBase {
  kind: 'order';
  unit: 'letters' | 'words';
  /** القطع المعروضة للاعب (بترتيب مبعثر ثابت). */
  tiles: string[];
  answer: string;
  acceptedAnswers?: string[];
  match?: MatchRules;
}

export interface PasswordClue {
  clue: string;
  answer: string;
  /** موضع الحرف (يبدأ من 0) في إجابة الدليل الذي يدخل في كلمة السر. */
  letterIndex: number;
  acceptedAnswers?: string[];
}

export interface PasswordChallenge extends ChallengeBase {
  kind: 'password';
  clues: PasswordClue[];
  answer: string;
  acceptedAnswers?: string[];
  match?: MatchRules;
}

export interface CrosswordEntry {
  id: string;
  /** الصف (يبدأ من 0 من الأعلى). */
  row: number;
  /** العمود (يبدأ من 0 من اليمين، لأن الشبكة تُعرض من اليمين إلى اليسار). */
  col: number;
  direction: 'across' | 'down';
  answer: string;
  clue: string;
}

export interface CrosswordChallenge extends ChallengeBase {
  kind: 'crossword';
  rows: number;
  cols: number;
  entries: CrosswordEntry[];
  match?: MatchRules;
}

export interface WordSearchChallenge extends ChallengeBase {
  kind: 'wordsearch';
  /** صفوف الشبكة، كل صف سلسلة حروف (الحرف الأول هو الخانة اليمنى). */
  grid: string[];
  words: string[];
}

export interface ObservationChallenge extends ChallengeBase {
  kind: 'observation';
  cells: string[];
  columns: number;
  /** فهارس الخانات المطلوب اكتشافها. */
  targets: number[];
}

export type Challenge =
  | McqChallenge
  | TrueFalseChallenge
  | TextChallenge
  | NumberChallenge
  | OrderChallenge
  | PasswordChallenge
  | CrosswordChallenge
  | WordSearchChallenge
  | ObservationChallenge;

/** شروط إكمال المرحلة. */
export interface CompletionRule {
  /** أقل عدد من التحديات المحلولة لإكمال المرحلة (الافتراضي: الكل). */
  minSolved?: number;
  /** أقصى عدد للأخطاء في المحاولة الواحدة، بعده تنتهي المحاولة (الافتراضي: بلا حد). */
  maxMistakes?: number | null;
}

export interface StageDef {
  id: string;
  title: string;
  description?: string;
  worldId: string;
  groupId: string;
  /** ترتيب المرحلة داخل المجموعة (يبدأ من 1). */
  order: number;
  type: StageType;
  difficulty: ContentDifficulty;
  /** مكافأة إكمال المرحلة (تُمنح مرة واحدة). */
  completionPoints: number;
  completionCoins: number;
  challengeIds: string[];
  completion: CompletionRule;
  status: PublishStatus;
  /** تلميح عام للمرحلة. */
  hints?: string[];
}

export interface GroupDef {
  id: string;
  worldId: string;
  title: string;
  description?: string;
  order: number;
  icon: string;
  stageType: StageType;
}

export interface WorldDef {
  id: string;
  title: string;
  subtitle: string;
  order: number;
  icon: string;
  color: string;
  /** نسبة المراحل المنشورة في العالم السابق اللازم إكمالها لفتح هذا العالم (0..1). */
  unlockRatio: number;
}

/** حزمة محتوى = ملف JSON واحد. */
export interface ContentPack {
  packId: string;
  version: number;
  worlds: WorldDef[];
  groups: GroupDef[];
  stages: StageDef[];
  challenges: Challenge[];
}

/** سطر مختصر لكل مرحلة قابلة للعب، يُستخدم في الخريطة دون تحميل الأسئلة. */
export interface StageIndexEntry {
  id: string;
  worldId: string;
  groupId: string;
  order: number;
  title: string;
  type: StageType;
  difficulty: ContentDifficulty;
  challengeCount: number;
  completionPoints: number;
  packId: string;
}

/** ملخص يُبنى آليًا للاستخدام في شاشة العوالم دون تحميل كل المحتوى. */
export interface ContentManifest {
  stageIndex: StageIndexEntry[];
  generatedAt: string;
  totals: { challenges: number; publishedChallenges: number; stages: number; publishedStages: number; needsReview: number };
  worlds: Array<WorldDef & { packIds: string[]; groups: Array<GroupDef & { playableStageCount: number }>; playableStageCount: number }>;
}

/** مرحلة جاهزة للعب بعد التحقق وحل المراجع. */
export interface PlayableStage {
  stage: StageDef;
  challenges: Challenge[];
}

export const STAGE_TYPE_LABELS: Record<StageType, string> = {
  general: 'الثقافة العامة',
  history: 'التاريخ والحضارات',
  geography: 'الجغرافيا والعواصم',
  science: 'العلوم والطبيعة',
  religion: 'المعلومات الدينية الموثقة',
  math: 'الرياضيات والألغاز العددية',
  arabic: 'اللغة العربية',
  proverbs: 'الأمثال والحكم',
  sports: 'الرياضة',
  technology: 'التكنولوجيا والاختراعات',
  logic: 'المنطق والاستنتاج',
  crossword: 'الكلمات المتقاطعة',
  wordsearch: 'البحث عن الكلمات',
  password: 'كلمة السر',
  order: 'ترتيب الحروف والكلمات',
  picture: 'الألغاز المصورة',
  pattern: 'اكتشاف الأنماط',
  observation: 'دقة الملاحظة',
  mixed: 'مرحلة مختلطة',
};

export const CATEGORY_LABELS: Record<TopicCategory, string> = {
  general: 'ثقافة عامة',
  history: 'تاريخ',
  geography: 'جغرافيا',
  science: 'علوم',
  religion: 'دين',
  math: 'رياضيات',
  arabic: 'لغة عربية',
  proverbs: 'أمثال وحكم',
  sports: 'رياضة',
  technology: 'تكنولوجيا',
  logic: 'منطق',
  words: 'ألعاب كلمات',
  visual: 'بصري',
};

export const KIND_LABELS: Record<ChallengeKind, string> = {
  mcq: 'اختيار من متعدد',
  truefalse: 'صح أو خطأ',
  text: 'إجابة مكتوبة',
  number: 'إجابة رقمية',
  order: 'ترتيب',
  password: 'كلمة السر',
  crossword: 'كلمات متقاطعة',
  wordsearch: 'بحث عن الكلمات',
  observation: 'دقة ملاحظة',
};

export const DIFFICULTY_LABELS: Record<ContentDifficulty, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
  expert: 'خبير',
};

/** الآليات المسموح بها لكل نمط مرحلة (يستخدمها المدقق). */
export const ALLOWED_KINDS: Record<StageType, ChallengeKind[]> = {
  general: ['mcq', 'truefalse', 'text', 'number'],
  history: ['mcq', 'truefalse', 'text', 'number'],
  geography: ['mcq', 'truefalse', 'text', 'number'],
  science: ['mcq', 'truefalse', 'text', 'number'],
  religion: ['mcq', 'truefalse', 'text', 'number'],
  math: ['number', 'mcq', 'text'],
  arabic: ['mcq', 'text', 'truefalse', 'number', 'order'],
  proverbs: ['text', 'mcq', 'order'],
  sports: ['mcq', 'truefalse', 'text', 'number'],
  technology: ['mcq', 'truefalse', 'text', 'number'],
  logic: ['mcq', 'text', 'number', 'truefalse'],
  crossword: ['crossword'],
  wordsearch: ['wordsearch'],
  password: ['password'],
  order: ['order'],
  picture: ['mcq', 'text', 'number'],
  pattern: ['mcq', 'text', 'number'],
  observation: ['observation', 'number'],
  mixed: ['mcq', 'truefalse', 'text', 'number', 'order', 'password', 'crossword', 'wordsearch', 'observation'],
};
