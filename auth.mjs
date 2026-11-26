import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual
} from "node:crypto";

import { promisify } from "node:util";

const deriveKey = promisify(scrypt);

const SESSION_SECONDS = 7 * 24 * 60 * 60;

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionToken(req) {
  const match = (req.headers.cookie || "").match(
    /(?:^|;\s*)void_session=([a-f0-9]{64})(?:;|$)/
  );

  return match?.[1] || null;
}

async function passwordKey(password, salt) {
  return deriveKey(password, salt, 64, {
    N: 131072,
    r: 8,
    p: 1,
    maxmem: 256 * 1024 * 1024
  });
}

async function readJSON(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;

    if (size > 8192) {
      throw new Error("BODY_TOO_LARGE");
    }

    chunks.push(chunk);
  }

  try {
    const value = JSON.parse(
      Buffer.concat(chunks).toString("utf8")
    );

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error();
    }

    return value;
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export function createAuth(db, reply, port) {
  const origin = new URL(
    process.env.APP_ORIGIN || `http://localhost:${port}`
  ).origin;

  const secureCookie = origin.startsWith("https://");

  if (process.env.NODE_ENV === "production" && !secureCookie) {
    throw new Error(
      "في النشر العام يجب ضبط APP_ORIGIN على عنوان HTTPS."
    );
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_expiry
      ON sessions(expires_at);
  `);

  const attempts = new Map();
  let activePasswordJobs = 0;

  function cookie(res, token, maxAge) {
    res.setHeader(
      "Set-Cookie",
      `void_session=${token}; Path=/; HttpOnly; ` +
      `SameSite=Lax; Max-Age=${maxAge}` +
      (secureCookie ? "; Secure" : "")
    );
  }

  function currentUser(req) {
    const token = sessionToken(req);

    if (!token) return null;

    return db.prepare(`
      SELECT u.id, u.username
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
        AND s.expires_at > ?
    `).get(tokenHash(token), Date.now()) || null;
  }

  function startSession(req, res, userId) {
    const previous = sessionToken(req);

    const token = randomBytes(32).toString("hex");
    const now = Date.now();

    db.exec("BEGIN");

    try {
      db.prepare(
        "DELETE FROM sessions WHERE expires_at <= ?"
      ).run(now);

      if (previous) {
        db.prepare(
          "DELETE FROM sessions WHERE token_hash = ?"
        ).run(tokenHash(previous));
      }

      db.prepare(`
        INSERT INTO sessions (
          token_hash, user_id, expires_at
        )
        VALUES (?, ?, ?)
      `).run(
        tokenHash(token),
        userId,
        now + SESSION_SECONDS * 1000
      );

      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    cookie(res, token, SESSION_SECONDS);
  }

  function allowAttempt(req) {
    const now = Date.now();

    for (const [key, value] of attempts) {
      if (value.resetAt <= now) attempts.delete(key);
    }

    const key = req.socket.remoteAddress || "unknown";

    const record = attempts.get(key) || {
      count: 0,
      resetAt: now + 15 * 60 * 1000
    };

    record.count++;
    attempts.set(key, record);

    return record.count <= 20;
  }

  const routes = new Map([
    ["/api/auth/me", "GET"],
    ["/api/auth/register", "POST"],
    ["/api/auth/login", "POST"],
    ["/api/auth/logout", "POST"]
  ]);

  return async function handleAuth(req, res) {
    const path = new URL(req.url, origin).pathname;

    if (!routes.has(path)) return false;

    const send = (status, body) => {
      reply(res, status, body);
      return true;
    };

    const expectedMethod = routes.get(path);

    if (req.method !== expectedMethod) {
      res.setHeader("Allow", expectedMethod);

      return send(405, {
        error: "طريقة الطلب غير مسموحة."
      });
    }

    if (path === "/api/auth/me") {
      return send(200, {
        user: currentUser(req)
      });
    }

    // طلبات تغيير الحساب يجب أن تأتي من نفس الموقع.
    if (req.headers.origin !== origin) {
      return send(403, {
        error: "مصدر الطلب غير مسموح."
      });
    }

    const contentType = (
      req.headers["content-type"] || ""
    ).split(";")[0].trim().toLowerCase();

    if (contentType !== "application/json") {
      return send(415, {
        error: "الطلب يجب أن يكون بصيغة JSON."
      });
    }

    if (path === "/api/auth/logout") {
      const token = sessionToken(req);

      if (token) {
        db.prepare(
          "DELETE FROM sessions WHERE token_hash = ?"
        ).run(tokenHash(token));
      }

      cookie(res, "", 0);

      return send(200, { ok: true });
    }

    if (!allowAttempt(req)) {
      res.setHeader("Retry-After", "900");

      return send(429, {
        error: "محاولات كثيرة. جرّبي بعد ١٥ دقيقة."
      });
    }

    let body;

    try {
      body = await readJSON(req);
    } catch (error) {
      return send(
        error.message === "BODY_TOO_LARGE" ? 413 : 400,
        { error: "بيانات الطلب غير صالحة أو أكبر من المسموح." }
      );
    }

    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";

    // لا نحذف المسافات من كلمة المرور.
    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return send(400, {
        error:
          "اسم المستخدم من ٣ إلى ٣٠ حرفًا: " +
          "حروف إنجليزية وأرقام وشرطة سفلية فقط."
      });
    }

    if (password.length < 15 || password.length > 128) {
      return send(400, {
        error: "كلمة المرور من ١٥ إلى ١٢٨ خانة."
      });
    }

    if (activePasswordJobs >= 2) {
      return send(503, {
        error: "السيرفر مشغول قليلًا. جرّبي بعد لحظات."
      });
    }

    activePasswordJobs++;

    try {
      if (path === "/api/auth/register") {
        const existing = db.prepare(
          "SELECT id FROM users WHERE username = ?"
        ).get(username);

        if (existing) {
          return send(409, {
            error: "اسم المستخدم مستخدم بالفعل."
          });
        }

        const salt = randomBytes(16).toString("hex");
        const key = await passwordKey(password, salt);

        // إعادة الفحص لأن حسابًا آخر قد يسجل أثناء حساب البصمة.
        const result = db.prepare(`
          INSERT INTO users (
            username,
            password_salt,
            password_hash,
            created_at
          )
          VALUES (?, ?, ?, ?)
          ON CONFLICT(username) DO NOTHING
        `).run(
          username,
          salt,
          key.toString("hex"),
          Date.now()
        );

        if (Number(result.changes) !== 1) {
          return send(409, {
            error: "اسم المستخدم مستخدم بالفعل."
          });
        }

        const user = db.prepare(
          "SELECT id, username FROM users WHERE username = ?"
        ).get(username);

        startSession(req, res, user.id);

        return send(201, { user });
      }

      const user = db.prepare(
        "SELECT * FROM users WHERE username = ?"
      ).get(username);

      // نحسب بصمة حتى لو الاسم غير موجود.
      const salt =
        user?.password_salt || randomBytes(16).toString("hex");

      const actual = await passwordKey(password, salt);

      const expected = user
        ? Buffer.from(user.password_hash, "hex")
        : Buffer.alloc(64);

      const matches = timingSafeEqual(actual, expected);

      if (!user || !matches) {
        return send(401, {
          error: "اسم المستخدم أو كلمة المرور غير صحيحة."
        });
      }

      startSession(req, res, user.id);

      return send(200, {
        user: {
          id: user.id,
          username: user.username
        }
      });
    } finally {
      activePasswordJobs--;
    }
  };
}