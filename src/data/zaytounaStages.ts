import { ZaytounaWorld, Question } from '../types/game';
import { QUESTIONS_DATABASE } from './questions';

// Helper to filter or pick diverse questions across categories for a level
function pickQuestionsForLevel(indices: number[]): Question[] {
  return indices.map((idx) => QUESTIONS_DATABASE[idx % QUESTIONS_DATABASE.length]);
}

export const ZAYTOUNA_WORLDS: ZaytounaWorld[] = [
  // --- عالم 1: مهد الحضارات وبداية المعرفة ---
  {
    id: 'world_1',
    stageNumber: 1,
    title: 'عالم الحضارات الأولى',
    subtitle: 'سومر، بابل، الفراعنة، وفينيقيا العريقة',
    themeColor: '#D97706',
    accentBg: 'from-amber-600/20 to-orange-950/40',
    iconName: 'Pyramid',
    chestReward: { coins: 150, xp: 400 },
    levels: [
      {
        id: 'w1_lvl_1',
        stageId: 'world_1',
        levelNumber: 1,
        title: 'بوابة الرافدين وأهرامات الجيزة',
        questions: [
          QUESTIONS_DATABASE[5], // عجائب الدنيا السبع (هرم خوفو)
          QUESTIONS_DATABASE[20], // مهد الحضارات دجلة والفرات
          QUESTIONS_DATABASE[4],  // سور القرآن الكريم
        ],
      },
      {
        id: 'w1_lvl_2',
        stageId: 'world_1',
        levelNumber: 2,
        title: 'أسرار الحروف الفينيقية ونهر النيل',
        questions: [
          QUESTIONS_DATABASE[6], // الأبجدية الفينيقية
          QUESTIONS_DATABASE[9], // أطول نهر في العالم (النيل)
          QUESTIONS_DATABASE[17], // معلقة امرؤ القيس
        ],
      },
      {
        id: 'w1_lvl_3',
        stageId: 'world_1',
        levelNumber: 3,
        title: 'سد مأرب ومعالم الأنباط الوردية',
        questions: [
          QUESTIONS_DATABASE[7], // البتراء
          QUESTIONS_DATABASE[22], // سد مأرب العظيم
          QUESTIONS_DATABASE[26], // منخفض البحر الميت
        ],
      },
      {
        id: 'w1_lvl_4',
        stageId: 'world_1',
        levelNumber: 4,
        title: 'فلسفة الأطلال والألعاب الأولمبية القديمة',
        questions: [
          QUESTIONS_DATABASE[16], // أولمبيا والألعاب الأولمبية
          QUESTIONS_DATABASE[21], // رمز النخلة والتراث
          QUESTIONS_DATABASE[0],  // جامعة القرويين بفاس
        ],
      },
      {
        id: 'w1_lvl_5',
        stageId: 'world_1',
        levelNumber: 5,
        title: 'مضائق التجارة القديمة ورموز الحضارة',
        questions: [
          QUESTIONS_DATABASE[10], // مضيق باب المندب
          QUESTIONS_DATABASE[1],  // ابن الهيثم
          QUESTIONS_DATABASE[13], // معدن الليثيوم
        ],
      },
      {
        id: 'w1_lvl_6',
        stageId: 'world_1',
        levelNumber: 6,
        title: 'امتحان حارس العصور القديمة (المستوى الحاسم)',
        questions: [
          QUESTIONS_DATABASE[5],
          QUESTIONS_DATABASE[6],
          QUESTIONS_DATABASE[7],
          QUESTIONS_DATABASE[22],
        ],
      },
    ],
  },

  // --- عالم 2: العصر الذهبي ومنارات العلوم الإسلامية ---
  {
    id: 'world_2',
    stageNumber: 2,
    title: 'منارات العلوم الإسلامية',
    subtitle: 'بيت الحكمة، قرطبة، وفجر المنهج التجريبي',
    themeColor: '#059669',
    accentBg: 'from-emerald-600/20 to-teal-950/40',
    iconName: 'Moon',
    chestReward: { coins: 250, xp: 600 },
    levels: [
      {
        id: 'w2_lvl_1',
        stageId: 'world_2',
        levelNumber: 1,
        title: 'فجر الأكاديميات الكبرى ومخطوطات بغداد',
        questions: [
          QUESTIONS_DATABASE[0], // جامعة القرويين
          QUESTIONS_DATABASE[2], // بيت الحكمة
          QUESTIONS_DATABASE[19], // المقامات الهمذاني
        ],
      },
      {
        id: 'w2_lvl_2',
        stageId: 'world_2',
        levelNumber: 2,
        title: 'ثورة المناظر والبصريات',
        questions: [
          QUESTIONS_DATABASE[1], // ابن الهيثم
          QUESTIONS_DATABASE[25], // مريم الأسطرلابي
          QUESTIONS_DATABASE[11], // عاصمة كازاخستان أستانا
        ],
      },
      {
        id: 'w2_lvl_3',
        stageId: 'world_2',
        levelNumber: 3,
        title: 'عباقرة الطب والتشريح الدقيق',
        questions: [
          QUESTIONS_DATABASE[3], // ابن النفيس والدورة الصغرى
          QUESTIONS_DATABASE[21], // ابن بطوطة
          QUESTIONS_DATABASE[14], // مونديال قطر 2022
        ],
      },
      {
        id: 'w2_lvl_4',
        stageId: 'world_2',
        levelNumber: 4,
        title: 'رحالة الآفاق ورسائل المعرفة',
        questions: [
          QUESTIONS_DATABASE[21], // ابن بطوطة
          QUESTIONS_DATABASE[19], // دانتي والكوميديا الإلهية
          QUESTIONS_DATABASE[12], // محرك البخار جيمس واط
        ],
      },
      {
        id: 'w2_lvl_5',
        stageId: 'world_2',
        levelNumber: 5,
        title: 'حساب الفلك وصناع الأسطرلاب',
        questions: [
          QUESTIONS_DATABASE[25], // مريم الأسطرلابي
          QUESTIONS_DATABASE[13], // تكلفة الفرصة البديلة
          QUESTIONS_DATABASE[18], // نجيب محفوظ ونوبل
        ],
      },
      {
        id: 'w2_lvl_6',
        stageId: 'world_2',
        levelNumber: 6,
        title: 'مجلس حكيم بيت الحكمة (المستوى الحاسم)',
        questions: [
          QUESTIONS_DATABASE[0],
          QUESTIONS_DATABASE[1],
          QUESTIONS_DATABASE[2],
          QUESTIONS_DATABASE[3],
        ],
      },
    ],
  },

  // --- عالم 3: فجر الصناعة والتجارة الكبرى ---
  {
    id: 'world_3',
    stageNumber: 3,
    title: 'عصر الصناعة والتجارة',
    subtitle: 'المحركات البخارية، المطابع، وخرائط المحيطات',
    themeColor: '#7C3AED',
    accentBg: 'from-violet-600/20 to-purple-950/40',
    iconName: 'Factory',
    chestReward: { coins: 350, xp: 800 },
    levels: [
      {
        id: 'w3_lvl_1',
        stageId: 'world_3',
        levelNumber: 1,
        title: 'هدير البخار وفتح القسطنطينية',
        questions: [
          QUESTIONS_DATABASE[12], // جيمس واط
          QUESTIONS_DATABASE[8],  // فتح القسطنطينية 1453
          QUESTIONS_DATABASE[15], // يوسين بولت
        ],
      },
      {
        id: 'w3_lvl_2',
        stageId: 'world_3',
        levelNumber: 2,
        title: 'طرق القوافل وسلاسل الأسواق الكبرى',
        questions: [
          QUESTIONS_DATABASE[14], // تكلفة الفرصة البديلة
          QUESTIONS_DATABASE[11], // قمة كليمنجارو
          QUESTIONS_DATABASE[27], // مؤشر ناسداك 100
        ],
      },
      {
        id: 'w3_lvl_3',
        stageId: 'world_3',
        levelNumber: 3,
        title: 'سباقات البحار والرياح العالمية',
        questions: [
          QUESTIONS_DATABASE[16], // كأس أمريكا لليخوت
          QUESTIONS_DATABASE[13], // الليثيوم
          QUESTIONS_DATABASE[23], // مكتبة الإسكندرية الجديدة
        ],
      },
      {
        id: 'w3_lvl_4',
        stageId: 'world_3',
        levelNumber: 4,
        title: 'روائع الأدب العالمي وعصر النهضة',
        questions: [
          QUESTIONS_DATABASE[20], // دانتي
          QUESTIONS_DATABASE[10], // أستانا
          QUESTIONS_DATABASE[28], // رافاييل نادال رولان غاروس
        ],
      },
      {
        id: 'w3_lvl_5',
        stageId: 'world_3',
        levelNumber: 5,
        title: 'موازين القوى الاقتصادية وسوق المعادن',
        questions: [
          QUESTIONS_DATABASE[27], // ناسداك 100
          QUESTIONS_DATABASE[13], // الليثيوم
          QUESTIONS_DATABASE[15], // رقائق TSMC
        ],
      },
      {
        id: 'w3_lvl_6',
        stageId: 'world_3',
        levelNumber: 6,
        title: 'تحدي عميد التجارة والصناعة (المستوى الحاسم)',
        questions: [
          QUESTIONS_DATABASE[8],
          QUESTIONS_DATABASE[12],
          QUESTIONS_DATABASE[14],
          QUESTIONS_DATABASE[27],
        ],
      },
    ],
  },

  // --- عالم 4: الثورة الرقمية والمعلوماتية ---
  {
    id: 'world_4',
    stageNumber: 4,
    title: 'الثورة الرقمية والمعلوماتية',
    subtitle: 'آلان تورنغ، هبوط القمر، وبطولات المونديال',
    themeColor: '#2563EB',
    accentBg: 'from-blue-600/20 to-indigo-950/40',
    iconName: 'Radio',
    chestReward: { coins: 500, xp: 1000 },
    levels: [
      {
        id: 'w4_lvl_1',
        stageId: 'world_4',
        levelNumber: 1,
        title: 'آلة تورنغ وقفزة أبولو 11 نحو القمر',
        questions: [
          QUESTIONS_DATABASE[10], // آلان تورنغ
          QUESTIONS_DATABASE[22], // هبوط القمر 1969
          QUESTIONS_DATABASE[18], // نجيب محفوظ
        ],
      },
      {
        id: 'w4_lvl_2',
        stageId: 'world_4',
        levelNumber: 2,
        title: 'تشفير الكتل وسجلات البلوكتشين',
        questions: [
          QUESTIONS_DATABASE[24], // التشفير والتجزئة البلوكتشين
          QUESTIONS_DATABASE[14], // مونديال قطر 2022
          QUESTIONS_DATABASE[23], // مكتبة الإسكندرية
        ],
      },
      {
        id: 'w4_lvl_3',
        stageId: 'world_4',
        levelNumber: 3,
        title: 'صناع السيليكون وأرقام السرعة الأسطورية',
        questions: [
          QUESTIONS_DATABASE[15], // TSMC رقائق أشباه الموصلات
          QUESTIONS_DATABASE[15], // يوسين بولت
          QUESTIONS_DATABASE[24], // مبادرة السعودية الخضراء
        ],
      },
      {
        id: 'w4_lvl_4',
        stageId: 'world_4',
        levelNumber: 4,
        title: 'عواصم الحداثة ومؤشرات وول ستريت',
        questions: [
          QUESTIONS_DATABASE[11], // أستانا
          QUESTIONS_DATABASE[27], // ناسداك 100
          QUESTIONS_DATABASE[28], // رافاييل نادال
        ],
      },
      {
        id: 'w4_lvl_5',
        stageId: 'world_4',
        levelNumber: 5,
        title: 'المبادرات البيئية والنهضة الشاملة',
        questions: [
          QUESTIONS_DATABASE[24], // السعودية الخضراء
          QUESTIONS_DATABASE[24], // البلوكتشين
          QUESTIONS_DATABASE[10], // آلان تورنغ
        ],
      },
      {
        id: 'w4_lvl_6',
        stageId: 'world_4',
        levelNumber: 6,
        title: 'امتحان حارس البيانات الرقمية (المستوى الحاسم)',
        questions: [
          QUESTIONS_DATABASE[10],
          QUESTIONS_DATABASE[15],
          QUESTIONS_DATABASE[22],
          QUESTIONS_DATABASE[24],
        ],
      },
    ],
  },

  // --- عالم 5: أفق الكوانتم والذكاء الاصطناعي ---
  {
    id: 'world_5',
    stageNumber: 5,
    title: 'أفق الكوانتم والذكاء الاصطناعي',
    subtitle: 'المحولات العصبية، جيمس ويب، والمفاعل الاندماجي',
    themeColor: '#06B6D4',
    accentBg: 'from-cyan-600/20 to-teal-950/40',
    iconName: 'Atom',
    chestReward: { coins: 800, xp: 1500 },
    levels: [
      {
        id: 'w5_lvl_1',
        stageId: 'world_5',
        levelNumber: 1,
        title: 'بنية المحولات (Transformers) والكوبت الكمي',
        questions: [
          QUESTIONS_DATABASE[11], // Transformers الانتباه الذاتي
          QUESTIONS_DATABASE[9],  // الكوبت في الحواسيب الكمية
          QUESTIONS_DATABASE[13], // TSMC
        ],
      },
      {
        id: 'w5_lvl_2',
        stageId: 'world_5',
        levelNumber: 2,
        title: 'عيون جيمس ويب عند نقطة لاغرانج L2',
        questions: [
          QUESTIONS_DATABASE[12], // تلسكوب جيمس ويب
          QUESTIONS_DATABASE[23], // مفاعل إيتر الاندماجي ITER
          QUESTIONS_DATABASE[24], // البلوكتشين
        ],
      },
      {
        id: 'w5_lvl_3',
        stageId: 'world_5',
        levelNumber: 3,
        title: 'طاقة النجوم المصغرة ومستقبل البشرية',
        questions: [
          QUESTIONS_DATABASE[23], // مفاعل إيتر
          QUESTIONS_DATABASE[9],  // الكوبت
          QUESTIONS_DATABASE[11], // المحولات
        ],
      },
      {
        id: 'w5_lvl_4',
        stageId: 'world_5',
        levelNumber: 4,
        title: 'النانوميتر الفائق وأشباه الموصلات الذرية',
        questions: [
          QUESTIONS_DATABASE[15], // TSMC
          QUESTIONS_DATABASE[12], // جيمس ويب
          QUESTIONS_DATABASE[24], // السعودية الخضراء
        ],
      },
      {
        id: 'w5_lvl_5',
        stageId: 'world_5',
        levelNumber: 5,
        title: 'مصفوفة التكامل بين التاريخ والمستقبل',
        questions: [
          QUESTIONS_DATABASE[1],  // ابن الهيثم
          QUESTIONS_DATABASE[11], // المحولات
          QUESTIONS_DATABASE[23], // مفاعل إيتر
        ],
      },
      {
        id: 'w5_lvl_6',
        stageId: 'world_5',
        levelNumber: 6,
        title: 'المواجهة الأسطورية: إمبراطور المعرفة الخالد',
        questions: [
          QUESTIONS_DATABASE[9],
          QUESTIONS_DATABASE[11],
          QUESTIONS_DATABASE[12],
          QUESTIONS_DATABASE[23],
        ],
      },
    ],
  },
];
