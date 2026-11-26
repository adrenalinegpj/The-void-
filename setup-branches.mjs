import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const db = new DatabaseSync(
  fileURLToPath(new URL("./void.sqlite", import.meta.url))
);

db.exec("PRAGMA foreign_keys = ON;");

const groups = [
  {
    category: "music",
    branches: [
      "موسيقى عالمية",
      "موسيقى عربية",
      "هيب هوب وأندرجراوند",
      "كيبوب وجيبوب",
      "تاريخ الموسيقى"
    ]
  },
  {
    category: "books",
    branches: [
      "روايات وفانتازيا",
      "أدب عربي وعالمي",
      "مانجا ومانهوا",
      "رعب وتشويق",
      "شعر ومعانٍ خفية"
    ]
  },
  {
    category: "internet",
    branches: [
      "ألغاز الإنترنت",
      "ميديا مفقودة",
      "ميمز وثقافة رقمية",
      "مجتمعات ومواقع غريبة",
      "ألعاب وحنين رقمي"
    ]
  },
  {
    category: "cinema",
    branches: [
      "سينما عالمية",
      "أنمي وكيدراما",
      "أفلام نفسية ورعب",
      "رموز وكواليس",
      "شخصيات وأعمال منسية"
    ]
  },
  {
    category: "culture",
    branches: [
      "موضة وتعبير عن الذات",
      "سلوك وعلاقات",
      "ثقافات الشباب",
      "لغات وكلمات",
      "طعام من العالم"
    ]
  },
  {
    category: "world",
    branches: [
      "تاريخ وأحداث منسية",
      "فلسفة وأساطير",
      "فن وتصوير",
      "عمارة وأماكن خفية",
      "ألغاز وحكايات شعبية"
    ]
  },
  {
    category: "science",
    branches: [
      "فضاء وفلك",
      "علوم وتكنولوجيا",
      "حيوانات وطبيعة",
      "جغرافيا وكوكب الأرض",
      "معرفة عشوائية"
    ]
  }
];

// ربط المعلومات العربية الحالية بالفروع المناسبة.
const assignments = [
  ["music-01", "music-branch-1"],
  ["books-01", "books-branch-2"],
  ["internet-01", "internet-branch-2"],
  ["cinema-01", "cinema-branch-4"],
  ["culture-01", "culture-branch-5"],
  ["world-01", "world-branch-1"],
  ["science-01", "science-branch-1"]
];

db.exec("BEGIN");

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id),
      name_ar TEXT NOT NULL,
      position INTEGER NOT NULL
    );
  `);

  const columns = db.prepare(
    "PRAGMA table_info(discoveries)"
  ).all();

  const alreadyAdded = columns.some(
    column => column.name === "branch_id"
  );

  if (!alreadyAdded) {
    db.exec(`
      ALTER TABLE discoveries
      ADD COLUMN branch_id TEXT REFERENCES branches(id);
    `);
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS discoveries_branch
    ON discoveries(branch_id, active);
  `);

  const insertBranch = db.prepare(`
    INSERT INTO branches (
      id, category_id, name_ar, position
    )
    VALUES (?, ?, ?, ?)

    ON CONFLICT(id) DO UPDATE SET
      category_id = excluded.category_id,
      name_ar = excluded.name_ar,
      position = excluded.position
  `);

  for (const group of groups) {
    group.branches.forEach((name, index) => {
      insertBranch.run(
        `${group.category}-branch-${index + 1}`,
        group.category,
        name,
        index
      );
    });
  }

  const connectDiscovery = db.prepare(`
    UPDATE discoveries
    SET branch_id = ?
    WHERE id = ?
      AND category_id = (
        SELECT category_id
        FROM branches
        WHERE id = ?
      )
  `);

  for (const [discoveryId, branchId] of assignments) {
    const result = connectDiscovery.run(
      branchId,
      discoveryId,
      branchId
    );

    if (Number(result.changes) !== 1) {
      throw new Error(
        `تعذر ربط ${discoveryId}. تأكدي من تشغيل update-content.mjs أولًا.`
      );
    }
  }

  db.exec("COMMIT");

  console.log(
    "تم تجهيز ٣٥ فرعًا وربط المعلومات العربية السبعة."
  );
} catch (error) {
  db.exec("ROLLBACK");
  console.error("لم يكتمل الإعداد:", error.message);
  process.exitCode = 1;
} finally {
  db.close();
}