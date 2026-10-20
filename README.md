# أفق المعرفة | Horizon of Knowledge

لعبة معرفة وألغاز عربية بالكامل (اتجاه من اليمين إلى اليسار) مبنية بـ React وTypeScript وVite وTailwind،
وتُبنى تطبيق Android يعمل دون إنترنت عبر Capacitor 8 (انظر «تطبيق Android» أدناه).

## التشغيل

```bash
npm install          # يستخدم .npmrc (legacy-peer-deps) لتجاوز خلل في npm 10.8
npm run dev          # http://localhost:3000
npm run build        # يتحقق من المحتوى ويولّد الملخص ثم يبني إلى dist/
npm run preview      # معاينة نسخة الإنتاج
npm run lint         # tsc --noEmit
npm test             # اختبارات node:test (المدقق، التحقق، التقدم، الاستيراد، البيانات)
```

## البنية

```
src/
  content/                 طبقة المحتوى (منفصلة عن الواجهة)
    types.ts               الأنواع: عالم ← مجموعة ← مرحلة ← تحدٍّ، 19 نمط مرحلة، 9 آليات لعب
    answer.ts              مدقق الإجابات العربية المركزي
    validate.ts            التحقق قبل النشر + توليد الملخص
    progress.ts            التقدم والمكافآت (سجل يمنع تكرار المكافآت) والفتح والإنجازات
    importer.ts            استيراد/تصدير JSON وCSV (كل الدفعة أو لا شيء)
    loader.ts              تحميل الملخص فورًا والحزم عند الحاجة (تقسيم تلقائي للشيفرة)
    manifest.json          مولّد آليًا — لا تعدله يدويًا
    packs/*.json           حزم المحتوى (مصدر الحقيقة)
  features/horizon/        واجهة «عوالم الأفق»: الخريطة، مشغّل المراحل، مكونات الآليات
  studio/                  استوديو المحتوى (بيئة التطوير فقط)
  components/, data/       الأطوار الأصلية (البرج، النبض، المبارزة، الرحلة الكلاسيكية)
scripts/
  content-cli.ts           أدوات المحتوى من سطر الأوامر
  gemini-drafts.ts         توليد مسودات بمساعدة Gemini (Node فقط)
```

لا يوجد مكون لكل مرحلة: مشغّل واحد يقرأ تعريف المرحلة من JSON، وموزع واحد يعرض الآلية المناسبة.
الخريطة تحتاج إلى الملخص فقط (معرفات وعناوين وعدد التحديات)، والأسئلة تُحمّل لكل حزمة عند فتح مرحلة منها،
لذلك يتسع النظام لعشرات آلاف المراحل بتقسيمها إلى حزم (مثلًا حزمة لكل عالم أو لكل 500 مرحلة).

### قواعد العرض

- تظهر المرحلة للاعب فقط إذا كانت `published` وكل تحدياتها `published` وصالحة، وعددها أكبر من صفر.
- كل الأعداد في الواجهة محسوبة من الملخص الفعلي، ولا توجد أرقام وهمية.
- تُفتح المرحلة بإكمال السابقة في مجموعتها، ويُفتح العالم بإكمال نسبة `unlockRatio` من مراحل العالم السابق.
  العالم المفتوح يبقى مفتوحًا حتى لو أُضيف محتوى جديد.

### النقاط والمكافآت

- نقاط كل تحدٍّ تُمنح مرة واحدة على الإطلاق، وكل تلميح أو محاولة خاطئة قبل الحل يخفضها 25٪ (بحد أدنى 25٪).
- مكافأة إكمال المرحلة (نقاط وعملات) تُمنح مرة واحدة، وإعادة اللعب تحسّن النجوم فقط.
- لا يُخصم أي رصيد بسبب الخطأ في عوالم الأفق. القلوب في الرحلة الكلاسيكية قاعدة قائمة ومعلنة في ذلك الطور.
- كل مكافأة لها مفتاح في سجل (`ledger`)، فلا تتكرر عند تحديث الصفحة أو النقر المزدوج.

## التخزين

- طبقة موحدة في `src/platform/kvStore.ts`: على Android المصدر الدائم هو Capacitor Preferences (SharedPreferences)،
  وlocalStorage نسخة مرآة؛ في المتصفح localStorage فقط. القراءة متزامنة من ذاكرة تُملأ قبل عرض أول شاشة،
  والكتابة إلى التخزين الأصلي بطابور متسلسل تُفرَّغ عند إرسال التطبيق إلى الخلفية.
- كل حفظ يزيد `revision`، وعند وجود نسختين مختلفتين يُعتمد الأحدث، فلا تستبدل نسخة قديمة نسخة أحدث.
- `horizon_knowledge_stats_prev` يحفظ النسخة السابقة لكل حفظ، فإن تلفت البيانات تُستعاد آخر نسخة سليمة.
- إصدار البنية `schemaVersion` (حاليًا 3)، والحقول غير المعروفة من إصدار أحدث تُحفظ ولا تُحذف.
- نسخة احتياطية اختيارية من الإعدادات: تصدير ملف JSON (قائمة المشاركة في Android) واستيراده بعد التحقق من الصيغة
  والإصدار وبصمة السلامة، مع حفظ التقدم الحالي في `horizon_knowledge_stats_pre_import` قبل الاستبدال.
- المفتاح نفسه السابق `horizon_knowledge_stats_v1`، فلا يضيع التقدم القديم (يُرحَّل تلقائيًا من localStorage إلى التخزين الأصلي).
- تقدم عوالم الأفق محفوظ في الحقل `horizon` مفهرسًا بالمعرفات الثابتة، منفصلًا عن المحتوى، لذلك لا يضيع التقدم عند تحديث الأسئلة.
- كل حفظ يقرأ أحدث نسخة قبل التعديل (تبويبات متعددة)، والبيانات التالفة تُنظف حقلًا حقلًا،
  وإن تعذرت قراءتها كليًا تُحفظ نسخة في `horizon_knowledge_stats_corrupt_backup` بدل محوها.
- **متى نحتاج قاعدة بيانات؟** عند المزامنة بين الأجهزة، أو لوحات الصدارة، أو تحرير المحتوى من فريق عن بعد، أو منع الغش في الجوائز.
  حينها يُضاف خادم (Express موجود في التبعيات) بمصادقة، وجداول: players، progress (player_id, stage_id, …)، reward_ledger (مفتاح فريد)،
  ومحتوى بإصدارات. يبقى التخزين المحلي نسخة احتياطية تعمل دون اتصال.

## إضافة دفعة محتوى

1. اكتب الدفعة بصيغة JSON (حزمة كاملة أو `{ "challenges": [...], "stages": [...] }`) أو CSV للأسئلة البسيطة
   (`mcq`، `truefalse`، `text`، `number`). أعمدة CSV:
   `id,kind,prompt,answer,options,correctIndex,acceptedAnswers,hints,explanation,category,difficulty,points,unit,sourceTitle,sourceUrl,lastReviewed,status,matchRules,tags`
   (القوائم مفصولة بـ `|`، وقواعد المطابقة بـ `;` مثل `foldAlef;foldTaMarbuta`).
2. جرّب أولًا:
   ```bash
   npm run content:import -- batch.csv --pack w4-new --dry-run
   ```
   يُتحقق من البنية وتفرد المعرفات والتكرار ووجود الإجابات والتصنيف واكتمال المراحل والمصادر. أي خطأ يرفض الدفعة كاملة.
3. استورد (الحالة الافتراضية `review`، فلا يُنشر شيء تلقائيًا، وحالة `published` داخل الملف تُخفَّض إلى `review`):
   ```bash
   npm run content:import -- batch.csv --pack w4-new
   ```
4. راجع العناصر في الاستوديو ثم اعتمدها، أو غيّر `status` إلى `published` بعد التحقق من المصادر.
5. `npm run content:build` (يعمل تلقائيًا قبل `npm run build`).

أدوات أخرى: `content:validate`، `content:stats`، `content:export -- --format csv --out all.csv`،
`content:links` (يفحص روابط المصادر؛ المواقع التي تحجب الطلبات الآلية تُعلَّم «تحقق يدويًا»).

### استوديو المحتوى

`npm run dev` ثم افتح `http://localhost:3000/#/studio`. فيه: إضافة الأسئلة وتعديلها ونسخها، والبدائل والتلميحات والتصنيف والصعوبة،
وقواعد المطابقة لكل سؤال، وإنشاء المراحل والمجموعات، والبحث، وكشف التكرار، وقائمة المراجعة، واستيراد JSON/CSV، والتصدير، والتحقق قبل النشر.
التعديلات تُحفظ محليًا ثم تُصدَّر وتُطبق على المستودع:

```bash
npm run content:apply -- studio-export-YYYY-MM-DD.json --pack w4-new [--dry-run]
```

الاستوديو غير موجود في نسخة الإنتاج (محمي بـ `import.meta.env.DEV`)، فلا توجد لوحة إدارة عامة دون مصادقة.

## Gemini (اختياري)

```bash
GEMINI_API_KEY=... npm run content:ai-drafts -- --topic "الفلك" --category science --count 5 --kind mcq
npm run content:ai-drafts -- --mock --count 3     # لاختبار المسار دون مفتاح
```

- يعمل على جهاز المطور فقط، والمفتاح من متغير البيئة. لا يُضمَّن في الواجهة، وملفات `.env*` مستبعدة من Git.
- المخرجات في `content-drafts/` (خارج `src`، ومستبعدة من Git) بحالة `draft` و`review.aiGenerated: true`.
- اللعب لا يعتمد على Gemini إطلاقًا، ولا تُعد أي إجابة مولّدة صحيحة قبل مراجعة بشرية.

## قواعد مدقق الإجابات

الافتراضي: تجاهل التشكيل والتطويل وعلامات الترقيم والمسافات الزائدة، وتوحيد الأرقام العربية والفارسية والغربية.
اختياري لكل سؤال (`match`): `foldAlef`، `foldTaMarbuta`، `foldYa`، `foldHamzaSeats`، `ignoreDefiniteArticle`، `ignoreSpaces`، و`numericTolerance` للأرقام.
البدائل تُقبل فقط إذا وُثقت في `acceptedAnswers`، ولا توجد مطابقة تقريبية.

## تطبيق Android

التطبيق غلاف Capacitor 8 حول الواجهة نفسها. ملفات `dist/` تُنسخ داخل APK
(`android/app/src/main/assets/public`) وتُخدَّم من الجهاز عبر `https://localhost`.
لا يوجد `server.url`، ولا خادم Vite أو Express، ولا CDN أو خطوط خارجية. كل المحتوى والأصوات والخطوط مضمّنة.

- المعرّف: `com.horizonofknowledge.game` (نسخ debug: `com.horizonofknowledge.game.debug` باسم «أفق المعرفة (تجريبي)»،
  فتُثبَّت بجانب نسخة الإصدار ولا تتعارض معها).
- الإضافات: App (زر الرجوع ودورة الحياة)، Preferences (التخزين)، Haptics (الاهتزاز)، SplashScreen، Filesystem وShare (تصدير النسخة الاحتياطية).
  أشرطة النظام عبر SystemBars المدمج في Capacitor 8 (edge-to-edge مع `--safe-area-inset-*`).
- الاتجاه: عمودي على الهواتف. Android 16 قد يسمح بالتدوير على الشاشات الكبيرة، والواجهة تتكيف معه.
- الحد الأدنى: Android 7.0 (API 24) مع Android System WebView 111 أو أحدث (يحتاجه Tailwind 4).
  إن كان WebView أقدم تظهر صفحة محلية (`public/load-error.html`) تطلب تحديثه من Play.

### المتطلبات

- Node.js 22 أو أحدث (يحتاجه Capacitor CLI 8).
- JDK 21.
- Android SDK: Platform 36 وBuild-Tools 36 وPlatform-Tools. أسهل طريق: Android Studio 2025.2.1 أو أحدث.
  أو أدوات سطر الأوامر مع ضبط `ANDROID_HOME` (أو `android/local.properties` بالسطر `sdk.dir=...`).

### بناء APK تجريبي

```bash
npm install
npm run android:apk      # بناء الويب + cap sync + gradlew assembleDebug
# الناتج:
# android/app/build/outputs/apk/debug/app-debug.apk
```

التثبيت على الهاتف: انقل الملف وافتحه (مع السماح بالتثبيت من مصادر غير معروفة)، أو عبر USB:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### نسخة إصدار موقّعة (APK وAAB)

1. أنشئ مفتاح توقيع مرة واحدة واحفظه خارج المستودع مع نسخة احتياطية آمنة:
   ```bash
   keytool -genkeypair -v -keystore ~/keys/horizon-release.jks -alias horizon -keyalg RSA -keysize 4096 -validity 10000
   ```
2. انسخ `android/keystore.properties.example` إلى `android/keystore.properties` واملأ المسار وكلمات المرور
   (الملف ومفاتيح `*.jks` مستثناة في `.gitignore`)، أو استخدم متغيرات البيئة
   `HOK_KEYSTORE_FILE` و`HOK_KEYSTORE_PASSWORD` و`HOK_KEY_ALIAS` و`HOK_KEY_PASSWORD`.
3. ابنِ:
   ```bash
   npm run android:release
   # android/app/build/outputs/apk/release/app-release.apk
   # android/app/build/outputs/bundle/release/app-release.aab   (لـ Google Play)
   ```
   دون مفتاح يُنتج Gradle نسخة release غير موقعة لا يمكن تثبيتها.

### التحديث دون فقدان التقدم

- زِد `versionCode` (عدد صحيح) وحدّث `versionName` في `android/app/build.gradle` و`version` في `package.json`.
- وقّع دائمًا بالمفتاح نفسه وبالمعرّف نفسه: Android يحدّث التطبيق فوق القديم ويبقي بياناته.
  مفتاح مختلف يعني إلغاء التثبيت أولًا وضياع البيانات المحلية.
- التقدم مفهرس بمعرفات ثابتة للمراحل والأسئلة: لا تغيّر معرّف مرحلة منشورة، وأضف مراحل جديدة بمعرفات جديدة.
- عند تغيير بنية البيانات: ارفع `STATS_SCHEMA_VERSION` في `src/utils/storage.ts` وأضف الترحيل في `sanitizeStats`
  مع اختبار في `src/platform/platform.test.ts`.
- `android:allowBackup="true"`: النسخ الاحتياطي التلقائي في Android يحفظ التفضيلات. والتصدير اليدوي متاح من الإعدادات.

### إضافة محتوى إلى إصدار التطبيق

المحتوى جزء من البناء: أضف الدفعة كما في «إضافة دفعة محتوى»، ثم `npm run content:build`، ثم `npm run android:apk` (أو release).
الاستوديو (`#/studio`) يعمل في `npm run dev` فقط، ولا يدخل في `dist/` ولا في APK.

### الأيقونة وشاشة البداية

المصادر في `assets/` (مولّدة من شعار الواجهة نفسه). لإعادة توليد كل المقاسات: `npm run android:assets`.
