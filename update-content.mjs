import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const db = new DatabaseSync(
  fileURLToPath(new URL("./void.sqlite", import.meta.url))
);

db.exec("PRAGMA foreign_keys = ON;");

const initialized = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table' AND name = 'discoveries'
`).get();

if (!initialized) {
  console.error(
    "قاعدة البيانات غير جاهزة. شغّلي server.mjs أولًا."
  );

  db.close();
  process.exit(1);
}

const entries = [
  {
    id: "music-01",
    category: "music",
    title: "التانجو مش حكاية بلد واحد",
    body:
      "التانجو تراث مشترك بين الأرجنتين وأوروغواي، " +
      "ومش مجرد رقصة: هو كمان موسيقى وغناء وتقاليد بتنتقل بين الناس. " +
      "بيشارك في استمراره موسيقيون وراقصون ومؤلفون ومدرّسون، " +
      "من المحترفين والهواة. " +
      "الفكرة المهمة إن التراث الموسيقي مش تسجيل قديم وبس؛ " +
      "هو ممارسة حية، وكل جيل بيشارك في استمرارها.",
    source: "https://ich.unesco.org/en/RL/tango-00258",
    sourceName: "UNESCO — Tango",
    region: "الأرجنتين وأوروغواي"
  },
  {
    id: "books-01",
    category: "books",
    title: "رواية عمرها ألف سنة… وفيها مئات القصائد",
    body:
      "كتبت موراساكي شيكيبو «حكاية غينجي» في اليابان " +
      "في أوائل القرن الحادي عشر. وهي من أقدم الروايات في العالم. " +
      "بتحكي عن حياة الأمير غينجي وعلاقاته، " +
      "وبتعكس حياة البلاط الياباني في عصر هييان. " +
      "لكن المفاجأة إن السرد النثري فيه حوالي ٨٠٠ قصيدة كمان. " +
      "يعني الحكاية مش بتفصل بين الرواية والشعر؛ " +
      "بتجمع الاثنين في عمل واحد.",
    source: "https://www.loc.gov/item/2021666121/",
    sourceName: "مكتبة الكونغرس — The Tale of Genji",
    region: "اليابان"
  },
  {
    id: "internet-01",
    category: "internet",
    title: "الإنترنت عنده ذاكرة… لكنها مش كاملة",
    body:
      "خدمة Wayback Machine التابعة لأرشيف الإنترنت " +
      "بتتيح الرجوع إلى نسخ مؤرشفة من صفحات الويب. " +
      "بدل ما تشوفي الموقع بشكله الحالي فقط، " +
      "تقدري تستكشفي لقطات محفوظة منه في تواريخ مختلفة، لو كانت متاحة. " +
      "وفيه كمان أداة لحفظ صفحة كما تظهر الآن. " +
      "المهم إن النسخة المؤرشفة لقطة محفوظة، " +
      "مش ضمان إن كل صفحات الموقع وكل وظائفه موجودة.",
    source: "https://help.archive.org/help/using-the-wayback-machine/",
    sourceName: "Internet Archive — Using the Wayback Machine",
    region: "العالم الرقمي"
  },
  {
    id: "cinema-01",
    category: "cinema",
    title: "حركة كاملة مبنية من صور ثابتة",
    body:
      "في تحريك الستوب موشن، بتصوّري جسمًا ثابتًا، " +
      "وتغيّري موضعه قليلًا، ثم تصوّريه مرة تانية. " +
      "لما الصور تتعرض بالتتابع، يظهر الجسم كأنه بيتحرك. " +
      "ممكن تستخدمي دمية أو ورقًا أو أشياء بسيطة، " +
      "وممكن تبدأي التصوير بموبايل أو تابلت. " +
      "سر الفكرة إن الحركة اللي بتشوفيها " +
      "متكوّنة من تغييرات صغيرة بين صورة والتانية.",
    source:
      "https://www.bfi.org.uk/" +
      "join-filmmaking-activities-children-young-people/" +
      "learn-how-animate-home",
    sourceName: "BFI — Learn how to animate at home",
    region: "تقنيات السينما"
  },
  {
    id: "culture-01",
    category: "culture",
    title: "لما تجهيز الأكل يبقى تقليدًا للمشاركة",
    body:
      "الكيمجانغ في كوريا هو تقليد إعداد الكيمتشي ومشاركته، " +
      "مش اسم طبق مختلف. في أواخر الخريف، " +
      "بتجتمع مجتمعات لإعداد كميات كبيرة تكفي الشتاء. " +
      "التقليد بيشجّع التعاون داخل الأسر ومشاركة الطعام مع الآخرين. " +
      "الفرق الجميل هنا إن التراث مش في الوصفة وحدها؛ " +
      "هو كمان في الناس اللي بيحضّروها مع بعض، " +
      "والمعرفة اللي بتنتقل بينهم.",
    source:
      "https://ich.unesco.org/en/RL/" +
      "kimjang-making-and-sharing-kimchi-in-the-republic-of-korea-00881",
    sourceName: "UNESCO — Kimjang",
    region: "كوريا الجنوبية"
  },
  {
    id: "world-01",
    category: "world",
    title: "تمبكتو: مدينة لها ذاكرة مكتوبة",
    body:
      "في تمبكتو بمالي، بتكشف المخطوطات عن جوانب " +
      "من الحياة العلمية والدينية والتجارية والاجتماعية. " +
      "معرض مكتبة الكونغرس بيعرض نماذج محفوظة " +
      "من القرن السادس عشر إلى القرن الثامن عشر. " +
      "ومن موضوعاتها المعاملات التجارية وحماية حقوق الأفراد. " +
      "الورق القديم هنا مش مجرد أثر للعرض؛ " +
      "هو دليل على الأسئلة والمعارف والعلاقات " +
      "اللي اهتم بها أصحاب المخطوطات.",
    source: "https://www.loc.gov/exhibits/mali/mali-exhibit.html",
    sourceName: "مكتبة الكونغرس — مخطوطات تمبكتو",
    region: "مالي — غرب أفريقيا"
  },
  {
    id: "science-01",
    category: "science",
    title: "الزهرة يلف حول الشمس أسرع من لفّه حول نفسه",
    body:
      "الزهرة بياخد حوالي ٢٤٣ يومًا أرضيًا " +
      "عشان يكمل دورة حول نفسه، " +
      "لكن سنته بتستغرق حوالي ٢٢٥ يومًا أرضيًا فقط. " +
      "يعني مدة دورانه حول نفسه أطول من سنته! " +
      "بس فيه فرق مهم: الزمن بين شروقين متتاليين " +
      "على الزهرة حوالي ١١٧ يومًا أرضيًا، " +
      "مش ٢٤٣. عشان كده لازم نميّز " +
      "بين مدة الدوران حول المحور واليوم الشمسي.",
    source: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html",
    sourceName: "NASA — Venus Fact Sheet",
    region: "المجموعة الشمسية"
  }
];

// نوقف ظهور المحتوى التجريبي المعروف فقط.
// لا نحذف السجلات، ولا نعطّل أي محتوى إضافي خارج هذه القائمة.
const categoryIds = [
  "music",
  "books",
  "internet",
  "cinema",
  "culture",
  "world",
  "science"
];

const oldDemoIds = categoryIds.flatMap(id => [
  `${id}-01`,
  `${id}-02`,
  `${id}-secret`
]);

const deactivate = db.prepare(`
  UPDATE discoveries
  SET active = 0
  WHERE id = ?
`);

const upsert = db.prepare(`
  INSERT INTO discoveries (
    id,
    category_id,
    title,
    body,
    source_url,
    source_name,
    region,
    language,
    rare,
    active
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)

  ON CONFLICT(id) DO UPDATE SET
    category_id = excluded.category_id,
    title = excluded.title,
    body = excluded.body,
    source_url = excluded.source_url,
    source_name = excluded.source_name,
    region = excluded.region,
    language = excluded.language,
    rare = excluded.rare,
    active = excluded.active
`);

db.exec("BEGIN");

try {
  for (const id of oldDemoIds) {
    deactivate.run(id);
  }

  for (const entry of entries) {
    upsert.run(
      entry.id,
      entry.category,
      entry.title,
      entry.body,
      entry.source,
      entry.sourceName,
      entry.region,
      "ar"
    );
  }

  db.exec("COMMIT");

  console.log(
    "تم تحديث المحتوى: ٧ معلومات عربية جاهزة."
  );
} catch (error) {
  db.exec("ROLLBACK");

  console.error("التحديث لم يكتمل:", error.message);
  process.exitCode = 1;
} finally {
  db.close();
}