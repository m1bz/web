// server.js – complete, self‑contained file with auth & static handling

const http       = require("http");
const fs         = require("fs").promises;
const path       = require("path");
const url        = require("url");
const config     = require("./config/config");
const database   = require("./database/database");

/* -------------------------------------------------------------
   Helper: MIME type lookup
----------------------------------------------------------------*/
function getContentType (ext) {
  const map = {
    ".html": "text/html",
    ".css" : "text/css",
    ".js"  : "application/javascript",
    ".json": "application/json",
    ".png" : "image/png",
    ".jpg" : "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif" : "image/gif",
    ".svg" : "image/svgxml",
  };
  return map[ext] || "text/plain";
}

/* -------------------------------------------------------------
   Helper: simple cookie parser
----------------------------------------------------------------*/
function parseCookies (req) {
  const raw = req.headers.cookie || "";
  return raw.split("; ").reduce((acc, kv) => {
    const idx = kv.indexOf("=");
    if (idx > -1) {
      const k = kv.slice(0, idx).trim();
      const v = kv.slice(idx +  1).trim();
      acc[k] = decodeURIComponent(v);
    }
    return acc;
  }, {});
}

/* -------------------------------------------------------------
   Helper: read request body (JSON only)
----------------------------------------------------------------*/
function readBody (req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data = chunk));
    req.on("end",  () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

/* -------------------------------------------------------------
   Static file server (from /public)
----------------------------------------------------------------*/
async function serveStatic (req, res) {
  const parsed   = url.parse(req.url);
  const filePath = parsed.pathname === "/" ? "index.html" : parsed.pathname.slice(1);
  const fullPath = path.join(__dirname, "public", filePath);

  try {
    const data = await fs.readFile(fullPath);
    res.writeHead(200, { "Content-Type": getContentType(path.extname(fullPath)) });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
}

/* -------------------------------------------------------------
   Generate exercises.json directly from DB
----------------------------------------------------------------*/
async function serveExercisesJson (res) {
  try {
    const { rows } = await database.query(`
      SELECT
        name,
        primary_muscle,
        secondary_muscles,
        difficulty,
        equipment_type,
        equipment_subtype,
        instructions
      FROM exercises`);

    // transform rows => { muscle: { exercises: [] } }
    const out = {};
    for (const row of rows) {
      const m = row.primary_muscle;
      out[m] ??= { exercises: [] };
      out[m].exercises.push({
        name: row.name,
        primary_muscle: row.primary_muscle,
        secondary_muscles: row.secondary_muscles,
        difficulty: row.difficulty,
        equipment: {
          type: row.equipment_type,
          subtype: row.equipment_subtype,
        },
        instructions: row.instructions,
      });
    }

    const body = JSON.stringify(out);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(body);
  } catch (err) {
    console.error("Error querying exercises:", err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
}

/* -------------------------------------------------------------
   Auth utilities
----------------------------------------------------------------*/
function setSessionCookie (res, userId) {
  // simple unsigned cookie; for prod add HttpOnly/Secure over HTTPS
  const cookie = `sid=${userId}; Path=/; SameSite=Strict; Max-Age=2592000`; // 30 days
  res.setHeader("Set-Cookie", cookie);
}

function clearSessionCookie (res) {
  res.setHeader("Set-Cookie", "sid=; Path=/; Max-Age=0; SameSite=Strict");
}

/* -------------------------------------------------------------
   Main HTTP server
----------------------------------------------------------------*/
const server = http.createServer(async (req, res) => {
  // Allow CORS / pre‑flight for fetch() in dev
  if (req.method === "OPTIONS") {
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  const parsed = url.parse(req.url);
  const cookies = parseCookies(req);
  const userId  = cookies.sid;

  /* ---------------- API: GET /api/me ------------------ */
 if (req.method === "GET" && parsed.pathname === "/api/me") {
    if (!userId) {
      res.writeHead(204);
      return res.end();
    }

    try {
      const { rows } = await database.query(
        "SELECT id, username, is_admin FROM users WHERE id=$1 AND is_logged_in=TRUE",
        [userId]
      );
      if (!rows.length) {
        clearSessionCookie(res);
        res.writeHead(204);
        return res.end();
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(rows[0]));
    } catch (err) {
      console.error(err);
      res.writeHead(500); return res.end();
    }
  }

  /* ---------------- API: POST /api/register ------------ */
  if (req.method === "POST" && parsed.pathname === "/api/register") {
    try {
      const { username, email, password } = await readBody(req);
      if (!username || !email || !password) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ message: "Missing fields" }));
      }

      const result = await database.query(
        `INSERT INTO users (username, email, password, is_logged_in)
         VALUES ($1, $2, $3, TRUE)
         RETURNING id, username`,
        [username, email, password]
      );
      const user = result.rows[0];

      await database.query(
        `INSERT INTO profiles (user_id) VALUES ($1)`,
        [user.id]
      );

      setSessionCookie(res, user.id);
      res.writeHead(201, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(user));
    } catch (err) {
      if (err.code === "23505") { // unique_violation
        res.writeHead(409, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ message: "Email already exists" }));
      }
      console.error(err);
      res.writeHead(500); return res.end();
    }
  }

  /* ---------------- API: POST /api/login --------------- */
  if (req.method === "POST" && parsed.pathname === "/api/login") {
    try {
      const { email, password } = await readBody(req);
      const { rows } = await database.query(
        `SELECT id, username FROM users WHERE email=$1 AND password=$2`,
        [email, password]
      );
      if (!rows.length) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ message: "Invalid credentials" }));
      }

      const user = rows[0];
      await database.query(
        `UPDATE users SET is_logged_in=TRUE, last_login=NOW() WHERE id=$1`,
        [user.id]
      );

      setSessionCookie(res, user.id);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(user));
    } catch (err) {
      console.error(err);
      res.writeHead(500); return res.end();
    }
  }

  /* ---------------- API: POST /api/logout -------------- */
  if (req.method === "POST" && parsed.pathname === "/api/logout") {
    if (userId) {
      try { await database.query("UPDATE users SET is_logged_in=FALSE WHERE id=$1", [userId]); }
      catch (err) { console.error(err); }
    }
    clearSessionCookie(res);
    res.writeHead(204); return res.end();
  }
    /* ---------------- API: POST /api/save-workout -------- */
  if (req.method === "POST" && parsed.pathname === "/api/save-workout") {
    if (!userId) { res.writeHead(401); return res.end(); }
    try {
      const { name, exercises, bodyParts } = await readBody(req);
      await database.query(
        `INSERT INTO saved_workouts (user_id, name, workout_data, body_parts_worked, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, name, JSON.stringify(exercises), bodyParts]
      );
      await database.query(
        `INSERT INTO workouts (user_id, name) VALUES ($1, $2)`,
        [userId, name]
      );
      res.writeHead(201); return res.end();
    } catch (err) {
      console.error(err); res.writeHead(500); return res.end();
    }
  }

  /* ---------------- API: GET /api/saved-workouts ------- */
  if (req.method === "GET" && parsed.pathname === "/api/saved-workouts") {
    if (!userId) { res.writeHead(401); return res.end(); }
    try {
      const { rows } = await database.query(
        `SELECT id, name, workout_data, created_at, body_parts_worked
         FROM saved_workouts WHERE user_id=$1 ORDER BY created_at DESC`,
        [userId]
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(rows));
    } catch (err) {
      console.error(err); res.writeHead(500); return res.end();
    }
  }

  /* ---------------- GET /exercises.json ---------------- */
  if (req.method === "GET" && parsed.pathname === "/exercises.json") {
    return serveExercisesJson(res);
  }



    /* ---------------- API: GET /api/muscles ---------------- */
 if (req.method === "GET" && parsed.pathname === "/api/muscles") {
  try {
    const { rows } = await database.query(
      `SELECT name FROM muscles ORDER BY name`
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(rows));
  } catch (err) {
    console.error("Error fetching muscles:", err);
    res.writeHead(500); return res.end();
  }
}


  /* ---------------- API: POST /api/add-exercise ------------ */
  if (req.method === "POST" && parsed.pathname === "/api/add-exercise") {
    // only admin
    const cookies = parseCookies(req);
    const uid = cookies.sid;
    if (!uid) { res.writeHead(401); return res.end(); }
    try {
      const { rows: users } = await database.query("SELECT is_admin FROM users WHERE id=$1", [uid]);
      if (!users.length || !users[0].is_admin) { res.writeHead(403); return res.end(); }
    } catch (e) { console.error(e); res.writeHead(500); return res.end(); }

    try {
      const body = await readBody(req);
      const { name, primary_muscle, secondary_muscles, difficulty, equipment_type, equipment_subtype, instructions } = body;
      // Insert into exercises table
      await database.query(
        `INSERT INTO exercises (name, primary_muscle, secondary_muscles, difficulty, equipment_type, equipment_subtype, instructions)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [name, primary_muscle, secondary_muscles, difficulty, equipment_type, equipment_subtype, instructions]
      );
      res.writeHead(201); return res.end();
    } catch (err) {
      console.error(err);
      if (err.code === '23503') {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ message: 'Invalid primary muscle selected.' }));
      }
      res.writeHead(500); return res.end();
    }
  }


    /* ---------------- Static files ----------------------- */
  if (req.method === "GET") {
    return serveStatic(req, res);
  }

  /* ---------------- Fallback --------------------------- */
  res.writeHead(405, { "Content-Type": "text/plain" });
  res.end("Method Not Allowed");
});

/* -------------------------------------------------------------
   Boot sequence
----------------------------------------------------------------*/
(async () => {
  try {
    try {
      await database.connect();
    } catch (dbErr) {
      console.error("Database connection failed (running in no‑DB mode):", dbErr.message);
    }

    server.listen(config.server.port, config.server.host, () => {
      console.log(`Server running at ${config.server.baseUrl}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();

/* -------------------------------------------------------------
   Graceful shutdown
----------------------------------------------------------------*/
async function shutdown () {
  console.log("Shutting down …");
  server.close(() => console.log("HTTP server stopped"));
  try { await database.disconnect(); } catch {}
  process.exit(0);
}

process.on("SIGINT",  shutdown);
process.on("SIGTERM", shutdown);
