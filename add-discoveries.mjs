import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const db = new DatabaseSync(
  fileURLToPath(new URL("./void.sqlite", import.meta.url))
);

db.exec("PRAGMA foreign_keys = ON;");

const entries = [
  {
    id: "music-oud-001",
    category: "music",
    branch: "music-branch-2",
    title: "العود مش مجرد آلة… صناعته تراث كمان",
    body:
      "لما نسمع العود، غالبًا بنفكر في العازف واللحن. " +
      "لكن صناعة الآلة نفسها جزء من التراث، مش مجرد خطوة قبل الموسيقى. " +
      "اليونسكو بتوثّق صناعة العود والعزف عليه في ملف مشترك لسوريا وإيران، " +
      "وبتوضح إن المهارات بتنتقل أساسًا بالتعلّم على يد أصحاب الخبرة. " +
      "يعني فيه معرفة بتتنقل من صانع لصانع، ومن عازف لعازف. " +
      "المرة الجاية اللي تسمعي فيها عود، افتكري إن وراء الصوت " +
      "مش موسيقي واحد بس؛ فيه كمان حرفة وخبرة في صناعة الآلة.",
    source: "https://ich.unesco.org/en/RL/crafting-and-playing-the-oud-01867",
    sourceName: "UNESCO — Crafting and playing the Oud",
    region: "سوريا وإيران"
  },
  {
    id: "culture-hangeul-001",
    category: "culture",
    branch: "culture-branch-4",
    title: "الكورية لغة… والهانغول طريقة كتابتها",
    body:
      "فيه فرق بين اللغة ونظام الكتابة: الكورية هي اللغة، " +
      "والهانغول هو النظام المستخدم لكتابتها. " +
      "أُنشئ الهانغول في عهد الملك سيجونغ في القرن الخامس عشر. " +
      "وكان عدد حروفه الأصلية ٢٨ حرفًا، بينما الحروف الأساسية " +
      "المستخدمة حاليًا عددها ٢٤. " +
      "النقطة المهمة إن تعلّم حروف لغة مش هو نفسه تعلّم اللغة كلها. " +
      "ممكن تتعرفي على نظام الكتابة وتبدئي قراءة الرموز، " +
      "لكن فهم الكلمات والجمل محتاج تعلّم معانيها وقواعدها كمان.",
    source: "https://theme.archives.go.kr/next/koreaOfRecord/hangul.do",
    sourceName: "الأرشيف الوطني الكوري — 한글",
    region: "كوريا"
  },
  {
    id: "science-octopus-001",
    category: "science",
    branch: "science-branch-3",
    title: "ثلاثة قلوب… ودم أزرق",
    body:
      "الأخطبوط عنده ثلاثة قلوب، لكن مش كلهم بيعملوا نفس المهمة. " +
      "قلبان بيضخوا الدم إلى الخياشيم، وقلب ثالث بيضخه إلى باقي الجسم. " +
      "والدم كمان مختلف عن دمنا: اللون الأزرق مرتبط بصبغة " +
      "تحتوي على النحاس وتساعد على نقل الأكسجين. " +
      "يعني الاختلاف مش مجرد عدد قلوب غريب؛ " +
      "هو جزء من طريقة جسمه في توزيع الدم والحصول على الأكسجين. " +
      "تفصيلة صغيرة تخلّينا نفتكر إن أجسام الحيوانات " +
      "مش كلها نسخًا من نفس التصميم.",
    source:
      "https://www.aquariumofpacific.org/onlinelearningcenter/species/north_pacific_bigeye_octopus",
    sourceName: "Aquarium of the Pacific — North Pacific Bigeye Octopus",
    region: "المحيط الهادئ"
  }
];

let transactionStarted = false;

try {
  // نتأكد إن خطوة تجهيز الفروع اتعملت.
  const columns = db.prepare(
    "PRAGMA table_info(discoveries)"
  ).all();

  if (!columns.some(column => column.name === "branch_id")) {
    throw new Error(
      "عمود الفروع غير موجود. شغّلي setup-branches.mjs أولًا."
    );
  }

  const findBranch = db.prepare(`
    SELECT category_id
    FROM branches
    WHERE id = ?
  `);

  const saveDiscovery = db.prepare(`
    INSERT INTO discoveries (
      id,
      category_id,
      branch_id,
      title,
      body,
      source_url,
      source_name,
      region,
      language,
      rare,
      active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ar', 0, 1)

    ON CONFLICT(id) DO UPDATE SET
      category_id = excluded.category_id,
      branch_id = excluded.branch_id,
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
  transactionStarted = true;

  for (const entry of entries) {
    const branch = findBranch.get(entry.branch);

    if (!branch || branch.category_id !== entry.category) {
      throw new Error(
        `الفرع غير موجود أو لا يطابق المجال: ${entry.branch}`
      );
    }

    saveDiscovery.run(
      entry.id,
      entry.category,
      entry.branch,
      entry.title,
      entry.body,
      entry.source,
      entry.sourceName,
      entry.region
    );
  }

  db.exec("COMMIT");
  transactionStarted = false;

  console.log("تمت إضافة أو تحديث ٣ معلومات عربية بنجاح.");
} catch (error) {
  if (transactionStarted) {
    db.exec("ROLLBACK");
  }

  console.error("لم تكتمل الإضافة:", error.message);
  process.exitCode = 1;
} finally {
  db.close();
}