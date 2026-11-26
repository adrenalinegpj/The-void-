import { createHash } from "node:crypto";

export function createSaved(db, reply, port) {
  const origin = new URL(
    process.env.APP_ORIGIN || `http://localhost:${port}`
  ).origin;

  db.exec(`
    CREATE TABLE IF NOT EXISTS saved_discoveries (
      user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

      discovery_id TEXT NOT NULL
        REFERENCES discoveries(id) ON DELETE CASCADE,

      saved_at INTEGER NOT NULL,

      PRIMARY KEY (user_id, discovery_id)
    );

    CREATE INDEX IF NOT EXISTS saved_by_user
      ON saved_discoveries(user_id, saved_at);
  `);

  function findUser(req) {
    const match = (req.headers.cookie || "").match(
      /(?:^|;\s*)void_session=([a-f0-9]{64})(?:;|$)/
    );

    if (!match) return null;

    const hash = createHash("sha256")
      .update(match[1])
      .digest("hex");

    return db.prepare(`
      SELECT u.id
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
        AND s.expires_at > ?
    `).get(hash, Date.now()) || null;
  }

  return async function handleSaved(req, res) {
    const path = new URL(req.url, origin).pathname;

    const itemMatch = path.match(
      /^\/api\/saved\/([a-z0-9_-]{1,80})$/
    );

    if (path !== "/api/saved" && !itemMatch) {
      return false;
    }

    function send(status, body) {
      reply(res, status, body);
      return true;
    }

    const allowed = itemMatch
      ? ["POST", "DELETE"]
      : ["GET"];

    if (!allowed.includes(req.method)) {
      res.setHeader("Allow", allowed.join(", "));

      return send(405, {
        error: "طريقة الطلب غير مسموحة."
      });
    }

    // تغيير المحفوظات مسموح من نفس الموقع فقط.
    if (
      req.method !== "GET" &&
      req.headers.origin !== origin
    ) {
      return send(403, {
        error: "مصدر الطلب غير مسموح."
      });
    }

    const user = findUser(req);

    if (!user) {
      return send(401, {
        error: "سجّلي دخول الأول عشان تحفظي المعلومات."
      });
    }

    // عرض أحدث ١٠٠ معلومة محفوظة.
    if (path === "/api/saved") {
      const items = db.prepare(`
        SELECT
          d.id,
          d.title,
          d.body,
          d.language,
          d.region,
          d.source_url,
          d.source_name,
          s.saved_at
        FROM saved_discoveries s
        JOIN discoveries d ON d.id = s.discovery_id
        WHERE s.user_id = ?
        ORDER BY s.saved_at DESC, d.id
        LIMIT 100
      `).all(user.id);

      const total = db.prepare(`
        SELECT COUNT(*) AS count
        FROM saved_discoveries
        WHERE user_id = ?
      `).get(user.id).count;

      return send(200, {
        total,
        items
      });
    }

    const discoveryId = itemMatch[1];

    // لا نحتاج محتوى للطلب؛ المعرّف موجود في المسار.
    req.resume();

    if (req.method === "DELETE") {
      db.prepare(`
        DELETE FROM saved_discoveries
        WHERE user_id = ?
          AND discovery_id = ?
      `).run(user.id, discoveryId);

      return send(200, {
        saved: false,
        discoveryId
      });
    }

    const discovery = db.prepare(`
      SELECT id
      FROM discoveries
      WHERE id = ?
        AND active = 1
    `).get(discoveryId);

    if (!discovery) {
      return send(404, {
        error: "المعلومة غير متاحة للحفظ."
      });
    }

    db.prepare(`
      INSERT INTO saved_discoveries (
        user_id,
        discovery_id,
        saved_at
      )
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, discovery_id) DO NOTHING
    `).run(
      user.id,
      discoveryId,
      Date.now()
    );

    return send(200, {
      saved: true,
      discoveryId
    });
  };
}