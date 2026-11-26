import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createHash, randomInt } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { createAuth } from "./auth.mjs";
import { createSaved } from "./saved.mjs";
const db = new DatabaseSync(
  fileURLToPath(new URL("./void.sqlite", import.meta.url))
);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    topics TEXT NOT NULL DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS portals (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id),
    color TEXT NOT NULL,
    symbol TEXT NOT NULL,
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS discoveries (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    source_url TEXT,
    source_name TEXT,
    region TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    rare INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE INDEX IF NOT EXISTS discovery_category
    ON discoveries(category_id, active, rare);

  CREATE TABLE IF NOT EXISTS daily_selections (
    period TEXT NOT NULL,
    portal_id TEXT NOT NULL REFERENCES portals(id),
    discovery_id TEXT NOT NULL REFERENCES discoveries(id),
    PRIMARY KEY (period, portal_id)
  );

  INSERT OR IGNORE INTO settings VALUES ('rotation_hours', '24');
  INSERT OR IGNORE INTO settings VALUES ('rotation_seed', 'void-v1');
  INSERT OR IGNORE INTO settings VALUES ('rare_chance', '0.03');
`);

const port = Number(process.env.PORT || 3000);
const handleAuth = createAuth(db, reply, port);
const handleSaved = createSaved(db, reply, port);
const staticFiles = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]]
]);

function setting(key) {
  return db.prepare(
    "SELECT value FROM settings WHERE key = ?"
  ).get(key)?.value;
}

function hashNumber(value) {
  return createHash("sha256")
    .update(value)
    .digest()
    .readUInt32BE(0);
}

function rotation() {
  const configured = Number(setting("rotation_hours"));
  const hours = Number.isFinite(configured) && configured > 0
    ? configured
    : 24;

  const duration = hours * 60 * 60 * 1000;
  const index = Math.floor(Date.now() / duration);

  return {
    index,
    period: String(index),
    nextRotation: new Date((index + 1) * duration).toISOString()
  };
}

function reply(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });

  res.end(JSON.stringify(payload));
}

function chooseDaily(portal, pool, cycle) {
  const existing = db.prepare(`
    SELECT d.*
    FROM daily_selections s
    JOIN discoveries d ON d.id = s.discovery_id
    WHERE s.period = ?
      AND s.portal_id = ?
      AND d.active = 1
  `).get(cycle.period, portal.id);

  if (existing) return existing;

  // Advancing one position each period avoids consecutive
  // daily repeats whenever the category has multiple entries.
  const offset = hashNumber(
    `${setting("rotation_seed")}:${portal.id}`
  );

  const selected = pool[(cycle.index + offset) % pool.length];

  db.prepare(`
    INSERT INTO daily_selections
      (period, portal_id, discovery_id)
    VALUES (?, ?, ?)
    ON CONFLICT(period, portal_id)
    DO UPDATE SET discovery_id = excluded.discovery_id
  `).run(cycle.period, portal.id, selected.id);

  return selected;
}

function chooseRandom(pool, excluded) {
  const unseen = pool.filter(item => !excluded.includes(item.id));

  if (unseen.length) {
    return unseen[randomInt(unseen.length)];
  }

  // Once the small pool is exhausted, prefer the least
  // recently encountered item instead of the current one.
  return [...pool].sort(
    (a, b) => excluded.indexOf(a.id) - excluded.indexOf(b.id)
  )[0];
}

const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self'; " +
    "connect-src 'self'; " +
    "img-src 'self'; " +
    "object-src 'none'; " +
    "base-uri 'none'; " +
    "frame-ancestors 'none'"
  );

  try {
    if (await handleAuth(req, res)) return;
    if (await handleSaved(req, res)) return;
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return reply(res, 405, { error: "Method not allowed." });
    }

    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/api/portals") {
      const portals = db.prepare(`
        SELECT id, color, symbol
        FROM portals
        ORDER BY position
      `).all();

      return reply(res, 200, {
        portals,
        nextRotation: rotation().nextRotation
      });
    }
    // قائمة الفروع: مصدر الربط بين النجوم والمحتوى.
if (url.pathname === "/api/branches") {
  const branches = db.prepare(`
    SELECT
      b.id,
      b.name_ar AS name,
      b.category_id,
      p.id AS portal_id,
      p.color,
      (
        SELECT COUNT(*)
        FROM discoveries d
        WHERE d.branch_id = b.id
          AND d.active = 1
          AND d.rare = 0
      ) AS content_count
    FROM branches b
    JOIN portals p ON p.category_id = b.category_id
    ORDER BY p.position, b.position
  `).all();

  return reply(res, 200, { branches });
}

// معلومة عشوائية من فرع محدد فقط.
const branchMatch = url.pathname.match(
  /^\/api\/branches\/([a-z0-9_-]+)\/discovery$/
);

if (branchMatch) {
  const branch = db.prepare(`
    SELECT
      b.*,
      c.name AS category_name
    FROM branches b
    JOIN categories c ON c.id = b.category_id
    WHERE b.id = ?
  `).get(branchMatch[1]);

  if (!branch) {
    return reply(res, 404, {
      error: "الفرع غير موجود."
    });
  }

  const excluded = (
    url.searchParams.get("exclude") || ""
  )
    .split(",")
    .filter(id => /^[a-z0-9_-]{1,80}$/.test(id))
    .slice(-80);

  const pool = db.prepare(`
    SELECT *
    FROM discoveries
    WHERE branch_id = ?
      AND active = 1
      AND rare = 0
    ORDER BY id
  `).all(branch.id);

  if (!pool.length) {
    return reply(res, 200, {
      discovery: null,
      availableCount: 0,
      branch: {
        id: branch.id,
        name: branch.name_ar
      }
    });
  }

  // نستخدم دالة تجنب التكرار الموجودة بالفعل في السيرفر.
  const item = chooseRandom(pool, excluded);

  return reply(res, 200, {
    availableCount: pool.length,

    discovery: {
      id: item.id,
      title: item.title,
      body: item.body,
      category: branch.category_name,
      branch: branch.name_ar,
      branchId: branch.id,
      region: item.region,
      language: item.language,
      rare: Boolean(item.rare),

      source: item.source_url
        ? {
            url: item.source_url,
            name: item.source_name || "المصدر"
          }
        : null
    }
  });
}
    const match = url.pathname.match(
      /^\/api\/portals\/([a-z0-9_-]+)\/discovery$/
    );

    if (match) {
      const portal = db.prepare(`
        SELECT p.*, c.name AS category_name
        FROM portals p
        JOIN categories c ON c.id = p.category_id
        WHERE p.id = ?
      `).get(match[1]);

      if (!portal) {
        return reply(res, 404, { error: "Unknown portal." });
      }

      const mode = url.searchParams.get("mode") || "daily";

      if (!["daily", "random", "secret"].includes(mode)) {
        return reply(res, 400, { error: "Unknown discovery mode." });
      }

      const excluded = (url.searchParams.get("exclude") || "")
        .split(",")
        .filter(id => /^[a-z0-9_-]{1,80}$/.test(id))
        .slice(-80);

      const regular = db.prepare(`
        SELECT *
        FROM discoveries
        WHERE category_id = ? AND active = 1 AND rare = 0
        ORDER BY id
      `).all(portal.category_id);

      const rare = db.prepare(`
        SELECT *
        FROM discoveries
        WHERE category_id = ? AND active = 1 AND rare = 1
        ORDER BY id
      `).all(portal.category_id);

      const cycle = rotation();
      let discovery;

      if (mode === "daily") {
        if (regular.length) {
          discovery = chooseDaily(portal, regular, cycle);
        }
      } else {
        const chance = Math.max(
          0,
          Math.min(1, Number(setting("rare_chance")) || 0)
        );

        const roll = randomInt(1_000_000) / 1_000_000;
        const rareUnseen = rare.filter(
          item => !excluded.includes(item.id)
        );

        const useRare = rareUnseen.length &&
          (mode === "secret" || roll < chance);

        const pool = useRare ? rareUnseen : regular;

        if (pool.length) {
          discovery = chooseRandom(pool, excluded);
        }
      }

      if (!discovery) {
        return reply(res, 200, {
          discovery: null,
          nextRotation: cycle.nextRotation
        });
      }

      return reply(res, 200, {
        discovery: {
          id: discovery.id,
          title: discovery.title,
          body: discovery.body,
          category: portal.category_name,
          region: discovery.region,
          language: discovery.language,
          rare: Boolean(discovery.rare),
          source: discovery.source_url
            ? {
                url: discovery.source_url,
                name: discovery.source_name || "Source"
              }
            : null
        },
        nextRotation: cycle.nextRotation
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return reply(res, 404, { error: "Unknown endpoint." });
    }

    const asset = staticFiles.get(url.pathname);

    if (!asset) {
      return reply(res, 404, { error: "Not found." });
    }

    const [filename, contentType] = asset;
    const content = await readFile(
      new URL(`./public/${filename}`, import.meta.url)
    );

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache"
    });

    res.end(content);
  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      reply(res, 500, {
        error: "The signal was interrupted. Try again."
      });
    } else {
      res.end();
    }
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`THE VOID is running at http://localhost:${port}`);
});