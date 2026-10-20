import { ZaytounaWorld, Question } from '../types/game';
import { QUESTIONS_DATABASE } from './questions';

// إصلاح: كانت المستويات تشير إلى الأسئلة بأرقام مواضع خاطئة (لا تطابق التعليقات ولا عناوين المستويات)
// وتكرر السؤال نفسه داخل المستوى الواحد. أصبح الربط بالمعرف الثابت للسؤال.
function q(id: string): Question {
  const found = QUESTIONS_DATABASE.find((x) => x.id === id);
  if (!found) throw new Error(`سؤال غير موجود: ${id}`);
  return found;
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
          q('hist_01'), // عجائب الدنيا السبع (هرم خوفو)
          q('era_01'), // مهد الحضارات دجلة والفرات
          q('isl_05'), // سور القرآن الكريم
        ],
      },
      {
        id: 'w1_lvl_2',
        stageId: 'world_1',
        levelNumber: 2,
        title: 'أسرار الحروف الفينيقية ونهر النيل',
        questions: [
          q('hist_02'), // الأبجدية الفينيقية
          q('geo_01'), // أطول نهر في العالم (النيل)
          q('lit_01'), // معلقة امرؤ القيس
        ],
      },
      {
        id: 'w1_lvl_3',
        stageId: 'world_1',
        levelNumber: 3,
        title: 'سد مأرب ومعالم الأنباط الوردية',
        questions: [
          q('hist_03'), // البتراء
          q('nat_02'), // سد مأرب العظيم
          q('mix_03'), // منخفض البحر الميت
        ],
      },
      {
        id: 'w1_lvl_4',
        stageId: 'world_1',
        levelNumber: 4,
        title: 'فلسفة الأطلال والألعاب الأولمبية القديمة',
        questions: [
          q('spo_04'), // أولمبيا والألعاب الأولمبية
          q('nat_01'), // رمز النخلة والتراث
          q('isl_01'), // جامعة القرويين بفاس
        ],
      },
      {
        id: 'w1_lvl_5',
        stageId: 'world_1',
        levelNumber: 5,
        title: 'مضائق التجارة القديمة ورموز الحضارة',
        questions: [
          q('geo_02'), // مضيق باب المندب
          q('isl_02'), // ابن الهيثم
          q('ind_02'), // معدن الليثيوم
        ],
      },
      {
        id: 'w1_lvl_6',
        stageId: 'world_1',
        levelNumber: 6,
        title: 'امتحان حارس العصور القديمة (المستوى الحاسم)',
        questions: [
          q('hist_01'),
          q('hist_02'),
          q('hist_03'),
          q('nat_02'),
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
          q('isl_01'), // جامعة القرويين
          q('isl_03'), // بيت الحكمة
          q('lit_03'), // المقامات الهمذاني
        ],
      },
      {
        id: 'w2_lvl_2',
        stageId: 'world_2',
        levelNumber: 2,
        title: 'ثورة المناظر والبصريات',
        questions: [
          q('isl_02'), // ابن الهيثم
          q('mix_02'), // مريم الأسطرلابي
          q('geo_03'), // عاصمة كازاخستان أستانا
        ],
      },
      {
        id: 'w2_lvl_3',
        stageId: 'world_2',
        levelNumber: 3,
        title: 'عباقرة الطب والتشريح الدقيق',
        questions: [
          q('isl_04'), // ابن النفيس والدورة الصغرى
          q('era_02'), // ابن بطوطة
          q('spo_01'), // مونديال قطر 2022
        ],
      },
      {
        id: 'w2_lvl_4',
        stageId: 'world_2',
        levelNumber: 4,
        title: 'رحالة الآفاق ورسائل المعرفة',
        questions: [
          q('era_02'), // ابن بطوطة
          q('lit_04'), // دانتي والكوميديا الإلهية
          q('ind_01'), // محرك البخار جيمس واط
        ],
      },
      {
        id: 'w2_lvl_5',
        stageId: 'world_2',
        levelNumber: 5,
        title: 'حساب الفلك وصناع الأسطرلاب',
        questions: [
          q('mix_02'), // مريم الأسطرلابي
          q('ind_03'), // تكلفة الفرصة البديلة
          q('lit_02'), // نجيب محفوظ ونوبل
        ],
      },
      {
        id: 'w2_lvl_6',
        stageId: 'world_2',
        levelNumber: 6,
        title: 'مجلس حكيم بيت الحكمة (المستوى الحاسم)',
        questions: [
          q('isl_01'),
          q('isl_02'),
          q('isl_03'),
          q('isl_04'),
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
          q('ind_01'), // جيمس واط
          q('hist_04'), // فتح القسطنطينية 1453
          q('spo_02'), // يوسين بولت
        ],
      },
      {
        id: 'w3_lvl_2',
        stageId: 'world_3',
        levelNumber: 2,
        title: 'طرق القوافل وسلاسل الأسواق الكبرى',
        questions: [
          q('ind_03'), // تكلفة الفرصة البديلة
          q('geo_04'), // قمة كليمنجارو
          q('mix_04'), // مؤشر ناسداك 100
        ],
      },
      {
        id: 'w3_lvl_3',
        stageId: 'world_3',
        levelNumber: 3,
        title: 'سباقات البحار والرياح العالمية',
        questions: [
          q('spo_03'), // كأس أمريكا لليخوت
          q('ind_02'), // الليثيوم
          q('nat_03'), // مكتبة الإسكندرية الجديدة
        ],
      },
      {
        id: 'w3_lvl_4',
        stageId: 'world_3',
        levelNumber: 4,
        title: 'روائع الأدب العالمي وعصر النهضة',
        questions: [
          q('lit_04'), // دانتي
          q('geo_03'), // أستانا
          q('mix_05'), // رافاييل نادال رولان غاروس
        ],
      },
      {
        id: 'w3_lvl_5',
        stageId: 'world_3',
        levelNumber: 5,
        title: 'موازين القوى الاقتصادية وسوق المعادن',
        questions: [
          q('mix_04'), // ناسداك 100
          q('ind_02'), // الليثيوم
          q('ind_04'), // رقائق TSMC
        ],
      },
      {
        id: 'w3_lvl_6',
        stageId: 'world_3',
        levelNumber: 6,
        title: 'تحدي عميد التجارة والصناعة (المستوى الحاسم)',
        questions: [
          q('hist_04'),
          q('ind_01'),
          q('ind_03'),
          q('mix_04'),
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
          q('tech_02'), // آلان تورنغ
          q('era_03'), // هبوط القمر 1969
          q('lit_02'), // نجيب محفوظ
        ],
      },
      {
        id: 'w4_lvl_2',
        stageId: 'world_4',
        levelNumber: 2,
        title: 'تشفير الكتل وسجلات البلوكتشين',
        questions: [
          q('mix_01'), // التشفير والتجزئة البلوكتشين
          q('spo_01'), // مونديال قطر 2022
          q('nat_03'), // مكتبة الإسكندرية
        ],
      },
      {
        id: 'w4_lvl_3',
        stageId: 'world_4',
        levelNumber: 3,
        title: 'صناع السيليكون وأرقام السرعة الأسطورية',
        questions: [
          q('ind_04'), // TSMC رقائق أشباه الموصلات
          q('spo_02'), // يوسين بولت
          q('nat_04'), // مبادرة السعودية الخضراء
        ],
      },
      {
        id: 'w4_lvl_4',
        stageId: 'world_4',
        levelNumber: 4,
        title: 'عواصم الحداثة ومؤشرات وول ستريت',
        questions: [
          q('geo_03'), // أستانا
          q('mix_04'), // ناسداك 100
          q('mix_05'), // رافاييل نادال
        ],
      },
      {
        id: 'w4_lvl_5',
        stageId: 'world_4',
        levelNumber: 5,
        title: 'المبادرات البيئية والنهضة الشاملة',
        questions: [
          q('nat_04'), // السعودية الخضراء
          q('mix_01'), // البلوكتشين
          q('tech_02'), // آلان تورنغ
        ],
      },
      {
        id: 'w4_lvl_6',
        stageId: 'world_4',
        levelNumber: 6,
        title: 'امتحان حارس البيانات الرقمية (المستوى الحاسم)',
        questions: [
          q('tech_02'),
          q('ind_04'),
          q('era_03'),
          q('mix_01'),
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
          q('tech_03'), // Transformers الانتباه الذاتي
          q('tech_01'), // الكوبت في الحواسيب الكمية
          q('ind_04'), // TSMC
        ],
      },
      {
        id: 'w5_lvl_2',
        stageId: 'world_5',
        levelNumber: 2,
        title: 'عيون جيمس ويب عند نقطة لاغرانج L2',
        questions: [
          q('tech_04'), // تلسكوب جيمس ويب
          q('era_04'), // مفاعل إيتر الاندماجي ITER
          q('mix_01'), // البلوكتشين
        ],
      },
      {
        id: 'w5_lvl_3',
        stageId: 'world_5',
        levelNumber: 3,
        title: 'طاقة النجوم المصغرة ومستقبل البشرية',
        questions: [
          q('era_04'), // مفاعل إيتر
          q('tech_01'), // الكوبت
          q('tech_03'), // المحولات
        ],
      },
      {
        id: 'w5_lvl_4',
        stageId: 'world_5',
        levelNumber: 4,
        title: 'النانوميتر الفائق وأشباه الموصلات الذرية',
        questions: [
          q('ind_04'), // TSMC
          q('tech_04'), // جيمس ويب
          q('nat_04'), // السعودية الخضراء
        ],
      },
      {
        id: 'w5_lvl_5',
        stageId: 'world_5',
        levelNumber: 5,
        title: 'مصفوفة التكامل بين التاريخ والمستقبل',
        questions: [
          q('isl_02'), // ابن الهيثم
          q('tech_03'), // المحولات
          q('era_04'), // مفاعل إيتر
        ],
      },
      {
        id: 'w5_lvl_6',
        stageId: 'world_5',
        levelNumber: 6,
        title: 'المواجهة الأسطورية: إمبراطور المعرفة الخالد',
        questions: [
          q('tech_01'),
          q('tech_03'),
          q('tech_04'),
          q('era_04'),
        ],
      },
    ],
  },
];
