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

  // Add this to your server.js file in the API section

/* ---------------- API: GET /api/recommendations ---------- */
if (req.method === "GET" && parsed.pathname === "/api/recommendations") {
  if (!userId) { 
    res.writeHead(401); 
    return res.end(); 
  }
  
  try {
    // Get current user's profile
    const { rows: userProfile } = await database.query(
      `SELECT gender, age FROM profiles WHERE user_id = $1`,
      [userId]
    );
    
    if (!userProfile.length || !userProfile[0].age || !userProfile[0].gender) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ 
        message: "Please complete your profile (age and gender) to get recommendations" 
      }));
    }
    
    const { gender, age } = userProfile[0];
    const ageRange = 5; // ±5 years
    
    // Find similar users (same gender, similar age, excluding current user)
    const { rows: similarUsers } = await database.query(
      `SELECT DISTINCT u.id, u.username, p.age, p.gender
       FROM users u
       JOIN profiles p ON u.id = p.user_id
       WHERE p.gender = $1 
         AND p.age BETWEEN $2 AND $3
         AND u.id != $4
         AND u.id IN (
           SELECT DISTINCT user_id FROM saved_workouts
         )`,
      [gender, age - ageRange, age + ageRange, userId]
    );
    
    if (similarUsers.length === 0) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        message: "No similar users found with workout data",
        recommendations: []
      }));
    }
    
    const similarUserIds = similarUsers.map(u => u.id);
    
    // Get popular exercises from similar users
    const { rows: popularExercises } = await database.query(
      `SELECT 
         exercise_name,
         exercise_muscle,
         exercise_difficulty,
         exercise_equipment_type,
         exercise_instructions,
         COUNT(*) as usage_count,
         ROUND(AVG(user_age)::numeric, 1) as avg_user_age
       FROM (
         SELECT 
           sw.user_id,
           p.age as user_age,
           jsonb_array_elements(sw.workout_data) as exercise_data
         FROM saved_workouts sw
         JOIN profiles p ON sw.user_id = p.user_id
         WHERE sw.user_id = ANY($1)
       ) workout_exercises
       CROSS JOIN LATERAL (
         SELECT 
           exercise_data->>'name' as exercise_name,
           exercise_data->>'muscle' as exercise_muscle,
           exercise_data->>'difficulty' as exercise_difficulty,
           exercise_data->>'equipmentType' as exercise_equipment_type,
           exercise_data->>'instructions' as exercise_instructions
       ) exercise_details
       WHERE exercise_name IS NOT NULL
       GROUP BY exercise_name, exercise_muscle, exercise_difficulty, exercise_equipment_type, exercise_instructions
       ORDER BY usage_count DESC, exercise_name
       LIMIT 20`,
      [similarUserIds]
    );
    
    // Get popular workout patterns (muscle group combinations)
    const { rows: popularMuscleGroups } = await database.query(
      `SELECT 
         muscle_groups,
         COUNT(*) as pattern_count,
         ROUND(AVG(user_age)::numeric, 1) as avg_user_age
       FROM (
         SELECT 
           sw.user_id,
           p.age as user_age,
           array_to_string(array_agg(DISTINCT unnested_muscle ORDER BY unnested_muscle), ', ') as muscle_groups
         FROM saved_workouts sw
         JOIN profiles p ON sw.user_id = p.user_id
         CROSS JOIN unnest(sw.body_parts_worked) as unnested_muscle
         WHERE sw.user_id = ANY($1)
         GROUP BY sw.id, sw.user_id, p.age
       ) muscle_patterns
       GROUP BY muscle_groups
       HAVING COUNT(*) >= 2
       ORDER BY pattern_count DESC
       LIMIT 10`,
      [similarUserIds]
    );
    
    // Get recent popular workouts
    const { rows: recentWorkouts } = await database.query(
      `SELECT 
         sw.name,
         sw.workout_data,
         sw.body_parts_worked,
         sw.created_at,
         u.username,
         p.age,
         COUNT(*) OVER (PARTITION BY sw.name) as name_popularity
       FROM saved_workouts sw
       JOIN users u ON sw.user_id = u.id
       JOIN profiles p ON sw.user_id = p.user_id
       WHERE sw.user_id = ANY($1)
         AND sw.created_at >= NOW() - INTERVAL '30 days'
       ORDER BY sw.created_at DESC, name_popularity DESC
       LIMIT 15`,
      [similarUserIds]
    );
    
    const recommendations = {
      userProfile: { gender, age, ageRange },
      similarUsersCount: similarUsers.length,
      popularExercises: popularExercises.map(ex => ({
        name: ex.exercise_name,
        muscle: ex.exercise_muscle,
        difficulty: ex.exercise_difficulty,
        equipmentType: ex.exercise_equipment_type,
        instructions: ex.exercise_instructions,
        usageCount: parseInt(ex.usage_count),
        avgUserAge: parseFloat(ex.avg_user_age)
      })),
      popularMuscleGroups: popularMuscleGroups.map(mg => ({
        muscleGroups: mg.muscle_groups,
        patternCount: parseInt(mg.pattern_count),
        avgUserAge: parseFloat(mg.avg_user_age)
      })),
      recentWorkouts: recentWorkouts.map(rw => ({
        name: rw.name,
        workoutData: rw.workout_data,
        bodyPartsWorked: rw.body_parts_worked,
        createdAt: rw.created_at,
        createdBy: rw.username,
        userAge: rw.age,
        namePopularity: parseInt(rw.name_popularity)
      }))
    };
    
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(recommendations));
    
  } catch (err) {
    console.error("Recommendations error:", err);
    res.writeHead(500); 
    return res.end();
  }
}

  // Add these endpoints to your server.js file

/* ---------------- API: GET /api/profile ---------- */
if (req.method === "GET" && parsed.pathname === "/api/profile") {
  if (!userId) { 
    res.writeHead(401); 
    return res.end(); 
  }
  
  try {
    const { rows } = await database.query(
      `SELECT gender, age, weight, height 
       FROM profiles 
       WHERE user_id = $1`,
      [userId]
    );
    
    const profile = rows[0] || {};
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(profile));
    
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.writeHead(500); 
    return res.end();
  }
}

/* ---------------- API: PUT /api/profile ---------- */
if (req.method === "PUT" && parsed.pathname === "/api/profile") {
  if (!userId) { 
    res.writeHead(401); 
    return res.end(); 
  }
  
  try {
    const body = await readBody(req);
    const { gender, age, weight, height } = body;
    
    // Validate required fields
    if (!gender || !age) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ 
        message: "Gender and age are required fields" 
      }));
    }
    
    // Validate data ranges
    if (age < 5 || age > 120) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ 
        message: "Age must be between 5 and 120 years" 
      }));
    }
    
    if (weight && (weight <= 0 || weight > 300)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ 
        message: "Weight must be between 0 and 300 kg" 
      }));
    }
    
    if (height && (height < 100 || height > 250)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ 
        message: "Height must be between 100 and 250 cm" 
      }));
    }
    
    // Update profile (profile should already exist due to trigger)
    await database.query(
      `UPDATE profiles 
       SET gender = $1, age = $2, weight = $3, height = $4
       WHERE user_id = $5`,
      [gender, age, weight || null, height || null, userId]
    );
    
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ 
      message: "Profile updated successfully" 
    }));
    
  } catch (err) {
    console.error("Profile update error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ 
      message: "Internal server error" 
    }));
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
