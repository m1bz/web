// server.js – complete, self-contained file with auth, static, and media upload handling

const express = require('express');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const config = require('./config/config');
const loggingRoutes = require('./public/logging');

const database = require('./database/database');
const DatabaseSetup = require('./scripts/setup-database');



(async () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Bootstrap & DB connect
  // ──────────────────────────────────────────────────────────────────────────
  try {
    await database.connect();
    await ensureDatabaseSetup();
  } catch (dbErr) {
    console.error('Database connection failed (running in limited mode):', dbErr.message);
  }

  // Add this function after your database connection
  async function ensureDatabaseSetup() {
    try {
      // Check if exercises table exists and has data
      const result = await database.query('SELECT COUNT(*) FROM exercises');
      const exerciseCount = parseInt(result.rows[0].count);

      if (exerciseCount === 0) {
        console.log('🔄 Database appears empty, running setup...');
        const setup = new DatabaseSetup();
        await setup.run();
        console.log('✅ Database setup completed');
      } else {
        console.log(`✅ Database ready with ${exerciseCount} exercises`);
      }
    } catch (error) {
      if (error.code === '42P01') { // Table doesn't exist
        console.log('🔄 Tables not found, running database setup...');
        const setup = new DatabaseSetup();
        await setup.run();
      } else {
        console.error('⚠️ Database setup check failed:', error.message);
      }
    }
  }

  const app = express();

  // ──────────────────────────────────────────────────────────────────────────
  // Middlewares
  // ──────────────────────────────────────────────────────────────────────────

  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', loggingRoutes);
  // CORS & preflight (for fetch in dev)
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Serve public static assets
  app.use(express.static(path.join(__dirname, 'public')));

  // Serve uploaded media
  app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

  // ──────────────────────────────────────────────────────────────────────────
  // Multer setup for image/video uploads
  // ──────────────────────────────────────────────────────────────────────────
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, 'public', 'uploads'));
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  });

  const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
      const ok = /^image\/|^video\//.test(file.mimetype);
      cb(ok ? null : new Error('Only images/videos allowed'), ok);
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers: session cookie management
  // ──────────────────────────────────────────────────────────────────────────
  function setSessionCookie(res, userId) {
    const cookie = `sid=${userId}; Path=/; SameSite=Strict; Max-Age=2592000`;
    res.setHeader('Set-Cookie', cookie);
  }

  function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', 'sid=; Path=/; SameSite=Strict; Max-Age=0');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // API: GET /api/me
  // ──────────────────────────────────────────────────────────────────────────
  app.get('/api/me', async (req, res) => {
    const userId = req.cookies.sid;
    if (!userId) return res.sendStatus(204);

    try {
      const { rows } = await database.query(
        'SELECT id, username, is_admin FROM users WHERE id=$1 AND is_logged_in=TRUE',
        [userId]
      );
      if (!rows.length) {
        clearSessionCookie(res);
        return res.sendStatus(204);
      }
      return res.json(rows[0]);
    } catch (err) {
      console.error(err);
      return res.sendStatus(500);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // API: GET /api/debug - Debug endpoint for troubleshooting (remove in production)
  // ──────────────────────────────────────────────────────────────────────────
  app.get('/api/debug', async (req, res) => {
    try {
      const debugInfo = {
        environment: config.app.environment,
        nodeEnv: process.env.NODE_ENV,
        renderEnv: !!process.env.RENDER,
        databaseConnected: database.isConnected,
        databaseConfig: {
          hasConnectionString: !!config.database.connectionString,
          host: config.database.host,
          database: config.database.database,
          user: config.database.user,
          // Don't expose password
        },
        timestamp: new Date().toISOString()
      };
      await ensureDatabaseSetup();

      // Try a simple database query
      if (database.isConnected) {
        try {
          const result = await database.query('SELECT version();');
          debugInfo.databaseVersion = result.rows[0].version.substring(0, 50);
        } catch (dbErr) {
          debugInfo.databaseError = dbErr.message;
        }
      }

      res.json(debugInfo);
    } catch (err) {
      console.error('Debug endpoint error:', err);
      res.status(500).json({ error: err.message });
    }
  });


  // ──────────────────────────────────────────────────────────────────────────
  // API: GET /api/recommendations
  // ──────────────────────────────────────────────────────────────────────────
  app.get('/api/recommendations', async (req, res) => {
    const userId = req.cookies.sid;
    if (!userId) {
      return res.sendStatus(401);
    }

    try {
      // 1. Get current user's profile
      const { rows: userProfile } = await database.query(
        `SELECT gender, age FROM profiles WHERE user_id = $1`,
        [userId]
      );
      if (
        !userProfile.length ||
        userProfile[0].age == null ||
        !userProfile[0].gender
      ) {
        return res
          .status(400)
          .json({
            message:
              'Please complete your profile (age and gender) to get recommendations'
          });
      }
      const { gender, age } = userProfile[0];
      const ageRange = 5; // ±5 years

      // 2. Find similar users (same gender, similar age, excluding current user, with saved workouts)
      const { rows: similarUsers } = await database.query(
        `
      SELECT DISTINCT u.id
      FROM users u
      JOIN profiles p ON u.id = p.user_id
      WHERE p.gender = $1
        AND p.age BETWEEN $2 AND $3
        AND u.id != $4
        AND u.id IN (SELECT DISTINCT user_id FROM saved_workouts)
      `,
        [gender, age - ageRange, age + ageRange, userId]
      );

      if (similarUsers.length === 0) {
        return res.json({
          message: 'No similar users found with workout data',
          recommendations: []
        });
      }
      const similarUserIds = similarUsers.map((u) => u.id);

      // 3. Get popular exercises among those users
      const { rows: popularExercises } = await database.query(
        `
      SELECT
        ex.exercise_name,
        ex.exercise_muscle,
        ex.exercise_difficulty,
        ex.exercise_equipment_type,
        ex.exercise_instructions,
        COUNT(*)        AS usage_count,
        ROUND(AVG(ex.user_age)::numeric, 1) AS avg_user_age
      FROM (
        SELECT
          sw.user_id,
          p.age AS user_age,
          jsonb_array_elements(sw.workout_data) AS exercise_data
        FROM saved_workouts sw
        JOIN profiles p ON sw.user_id = p.user_id
        WHERE sw.user_id = ANY($1)
      ) AS ex_raw
      CROSS JOIN LATERAL (
        SELECT
          exercise_data->>'name'           AS exercise_name,
          exercise_data->>'muscle'         AS exercise_muscle,
          exercise_data->>'difficulty'     AS exercise_difficulty,
          exercise_data->>'equipmentType'  AS exercise_equipment_type,
          exercise_data->>'instructions'   AS exercise_instructions,
          ex_raw.user_age                  AS user_age
      ) AS ex(exercise_name,exercise_muscle,exercise_difficulty,exercise_equipment_type,exercise_instructions,user_age)
      WHERE ex.exercise_name IS NOT NULL
      GROUP BY
        ex.exercise_name,
        ex.exercise_muscle,
        ex.exercise_difficulty,
        ex.exercise_equipment_type,
        ex.exercise_instructions
      ORDER BY usage_count DESC, ex.exercise_name
      LIMIT 20
      `,
        [similarUserIds]
      );

      // 4. Get popular muscle‐group patterns
      const { rows: popularMuscleGroups } = await database.query(
        `
      SELECT
        muscle_groups,
        COUNT(*)    AS pattern_count,
        ROUND(AVG(user_age)::numeric,1) AS avg_user_age
      FROM (
        SELECT
          sw.id,
          sw.user_id,
          p.age AS user_age,
          array_to_string(
            array_agg(DISTINCT m ORDER BY m),
            ', '
          ) AS muscle_groups
        FROM saved_workouts sw
        JOIN profiles p            ON sw.user_id = p.user_id
        CROSS JOIN unnest(sw.body_parts_worked) AS m
        WHERE sw.user_id = ANY($1)
        GROUP BY sw.id, sw.user_id, p.age
      ) AS patterns
      GROUP BY muscle_groups
      HAVING COUNT(*) >= 2
      ORDER BY pattern_count DESC
      LIMIT 10
      `,
        [similarUserIds]
      );

      // 5. Get recent popular workouts (last 30 days)
      const { rows: recentWorkouts } = await database.query(
        `
      SELECT
        sw.name,
        sw.workout_data,
        sw.body_parts_worked,
        sw.created_at,
        u.username,
        p.age,
        COUNT(*) OVER (PARTITION BY sw.name) AS name_popularity
      FROM saved_workouts sw
      JOIN users    u ON sw.user_id = u.id
      JOIN profiles p ON sw.user_id = p.user_id
      WHERE sw.user_id = ANY($1)
        AND sw.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY sw.created_at DESC, name_popularity DESC
      LIMIT 15
      `,
        [similarUserIds]
      );

      // 6. Assemble final payload
      const recommendations = {
        userProfile: { gender, age, ageRange },
        similarUsersCount: similarUsers.length,
        popularExercises: popularExercises.map((ex) => ({
          name: ex.exercise_name,
          muscle: ex.exercise_muscle,
          difficulty: ex.exercise_difficulty,
          equipmentType: ex.exercise_equipment_type,
          instructions: ex.exercise_instructions,
          usageCount: parseInt(ex.usage_count, 10),
          avgUserAge: parseFloat(ex.avg_user_age)
        })),
        popularMuscleGroups: popularMuscleGroups.map((mg) => ({
          muscleGroups: mg.muscle_groups,
          patternCount: parseInt(mg.pattern_count, 10),
          avgUserAge: parseFloat(mg.avg_user_age)
        })),
        recentWorkouts: recentWorkouts.map((rw) => ({
          name: rw.name,
          workoutData: rw.workout_data,
          bodyPartsWorked: rw.body_parts_worked,
          createdAt: rw.created_at,
          createdBy: rw.username,
          userAge: rw.age,
          namePopularity: parseInt(rw.name_popularity, 10)
        }))
      };

      return res.json(recommendations);
    } catch (err) {
      console.error('Recommendations error:', err);
      return res.sendStatus(500);
    }
  });


  // ──────────────────────────────────────────────────────────────────────────
  // API: GET /api/profile
  // ──────────────────────────────────────────────────────────────────────────
  app.get('/api/profile', async (req, res) => {
    const userId = req.cookies.sid;
    if (!userId) return res.sendStatus(401);

    try {
      const { rows } = await database.query(
        'SELECT gender, age, weight, height FROM profiles WHERE user_id=$1',
        [userId]
      );
      return res.json(rows[0] || {});
    } catch (err) {
      console.error('Profile fetch error:', err);
      return res.sendStatus(500);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // API: PUT /api/profile
  // ──────────────────────────────────────────────────────────────────────────
  app.put('/api/profile', async (req, res) => {
    const userId = req.cookies.sid;
    if (!userId) return res.sendStatus(401);

    try {
      const { gender, age, weight, height } = req.body;
      if (!gender || age == null) {
        return res.status(400).json({ message: 'Gender and age are required fields' });
      }
      if (age < 5 || age > 120) {
        return res.status(400).json({ message: 'Age must be between 5 and 120 years' });
      }
      if (weight != null && (weight <= 0 || weight > 300)) {
        return res.status(400).json({ message: 'Weight must be between 0 and 300 kg' });
      }
      if (height != null && (height < 100 || height > 250)) {
        return res.status(400).json({ message: 'Height must be between 100 and 250 cm' });
      }

      await database.query(
        'UPDATE profiles SET gender=$1, age=$2, weight=$3, height=$4 WHERE user_id=$5',
        [gender, age, weight || null, height || null, userId]
      );
      return res.json({ message: 'Profile updated successfully' });
    } catch (err) {
      console.error('Profile update error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // API: POST /api/register
  // ──────────────────────────────────────────────────────────────────────────
  app.post('/api/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'Missing fields' });
      }
      const result = await database.query(
        'INSERT INTO users (username, email, password, is_logged_in) VALUES ($1,$2,$3,TRUE) RETURNING id, username',
        [username, email, password]
      );
      const user = result.rows[0];
      setSessionCookie(res, user.id);
      return res.status(201).json(user);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ message: 'Email already exists' });
      }
      console.error(err);
      return res.sendStatus(500);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // API: POST /api/login
  // ──────────────────────────────────────────────────────────────────────────
  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const { rows } = await database.query(
        'SELECT id, username FROM users WHERE email=$1 AND password=$2',
        [email, password]
      );
      if (!rows.length) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      const user = rows[0];
      await database.query(
        'UPDATE users SET is_logged_in=TRUE, last_login=NOW() WHERE id=$1',
        [user.id]
      );
      setSessionCookie(res, user.id);
      return res.json(user);
    } catch (err) {
      console.error(err);
      return res.sendStatus(500);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // API: POST /api/logout
  // ──────────────────────────────────────────────────────────────────────────
  app.post('/api/logout', async (req, res) => {
    const userId = req.cookies.sid;
    if (userId) {
      try {
        await database.query('UPDATE users SET is_logged_in=FALSE WHERE id=$1', [userId]);
      } catch (err) {
        console.error(err);
      }
    }
    clearSessionCookie(res);
    return res.sendStatus(204);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // API: POST /api/save-workout
  // ──────────────────────────────────────────────────────────────────────────
  app.post('/api/save-workout', async (req, res) => {
    const userId = req.cookies.sid;
    if (!userId) return res.sendStatus(401);

    try {
      const { name, exercises, bodyParts } = req.body;
      await database.query(
        `INSERT INTO saved_workouts (user_id, name, workout_data, body_parts_worked, created_at)
         VALUES ($1,$2,$3,$4,NOW())`,
        [userId, name, JSON.stringify(exercises), bodyParts]
      );
      await database.query(
        `INSERT INTO workouts (user_id, name) VALUES ($1,$2)`,
        [userId, name]
      );
      return res.sendStatus(201);
    } catch (err) {
      console.error(err);
      return res.sendStatus(500);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // API: GET /api/saved-workouts
  // ──────────────────────────────────────────────────────────────────────────
  app.get('/api/saved-workouts', async (req, res) => {
    const userId = req.cookies.sid;
    if (!userId) return res.sendStatus(401);

    try {
      const { rows } = await database.query(
        `SELECT id, name, workout_data, created_at, body_parts_worked
         FROM saved_workouts
         WHERE user_id=$1
         ORDER BY created_at DESC`,
        [userId]
      );
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.sendStatus(500);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // API: GET /api/muscles
  // ──────────────────────────────────────────────────────────────────────────
  app.get('/api/muscles', async (req, res) => {
    try {
      const { rows } = await database.query('SELECT name FROM muscles ORDER BY name');
      return res.json(rows);
    } catch (err) {
      console.error('Get muscles error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // API: POST /api/add-exercise (admin  media upload!)
  // ──────────────────────────────────────────────────────────────────────────
  app.post(
    '/api/add-exercise',
    upload.single('media'),
    async (req, res) => {
      const userId = req.cookies.sid;
      if (!userId) return res.sendStatus(401);

      // Check admin
      try {
        const { rows } = await database.query(
          'SELECT is_admin FROM users WHERE id=$1',
          [userId]
        );
        if (!rows.length || !rows[0].is_admin) {
          return res.sendStatus(403);
        }
      } catch (err) {
        console.error(err);
        return res.sendStatus(500);
      }

      // Parse form data (multer has populated req.body & req.file)
      const {
        name,
        primary_muscle,
        difficulty,
        equipment_type,
        instructions
      } = req.body;

      // secondary_muscles may be array or CSV
      let secondary_muscles = req.body.secondary_muscles || [];
      if (typeof secondary_muscles === 'string') {
        secondary_muscles = secondary_muscles
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }

      if (!name || !primary_muscle || !difficulty || !equipment_type || !instructions) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Transaction: insert exercise  optional media
      const client = database.client;
      try {
        await client.query('BEGIN');

        const insertEx = await client.query(
          `INSERT INTO exercises
             (name, primary_muscle, secondary_muscles, difficulty, equipment_type, equipment_subtype, instructions)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING id`,
          [
            name,
            primary_muscle,
            secondary_muscles,
            difficulty,
            equipment_type,
            req.body.equipment_subtype || null,
            instructions
          ]
        );
        const exerciseId = insertEx.rows[0].id;

        // If a file was uploaded, record it
        if (req.file) {
          const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
          const mediaPath = `/uploads/${req.file.filename}`;
          await client.query(
            `INSERT INTO exercise_media
               (exercise_id, media_type, media_path)
             VALUES ($1,$2,$3)`,
            [exerciseId, mediaType, mediaPath]
          );
        }

        await client.query('COMMIT');
        return res.status(201).json({ message: 'Exercise added successfully' });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Add exercise error:', err);
        if (err.code === '23503') {
          return res.status(400).json({ message: 'Invalid primary muscle' });
        }
        if (err.code === '23505') {
          return res.status(400).json({ message: 'Exercise name already exists' });
        }
        if (err.code === '23514') {
          return res.status(400).json({ message: 'Invalid difficulty level' });
        }
        return res.sendStatus(500);
      }
    }
  );
    // ──────────────────────────────────────────────────────────────────────────
  // GET /api/user-stats
  // ──────────────────────────────────────────────────────────────────────────

  app.use('/api', require('./routes/user-stats'));



  // ──────────────────────────────────────────────────────────────────────────
  // GET ALL EXERCISES (no filtering)
  // ──────────────────────────────────────────────────────────────────────────
  app.get('/api/exercises', async (req, res) => {
    try {
      const { rows } = await database.query(`
        SELECT
          e.id, e.name, e.primary_muscle, e.secondary_muscles,
          e.difficulty, e.equipment_type, e.equipment_subtype,
          e.instructions,
          COALESCE(
            json_agg(json_build_object('type', m.media_type,'path', m.media_path))
            FILTER (WHERE m.id IS NOT NULL),
            '[]'
          ) AS media
        FROM exercises e
        LEFT JOIN exercise_media m ON m.exercise_id = e.id
        GROUP BY e.id
        ORDER BY e.name
      `);
      return res.json(rows);
    } catch (err) {
      console.error('Fetch all exercises error:', err);
      return res.sendStatus(500);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH EXERCISES by name, muscle or equipment
  // ──────────────────────────────────────────────────────────────────────────
  app.get('/api/exercises/search', async (req, res) => {
    const { search } = req.query;
    const params = [];
    let where = '';

    if (search) {
      where = `
        WHERE
          e.name             ILIKE $1 OR
          e.equipment_type   ILIKE $1 OR
          e.equipment_subtype ILIKE $1 OR
          e.primary_muscle   ILIKE $1 OR
          EXISTS (
            SELECT 1 FROM unnest(e.secondary_muscles) AS sm
            WHERE sm ILIKE $1
          )
      `;
      params.push(`%${search}%`);
    }

    const sql = `
      SELECT
        e.id, e.name, e.primary_muscle, e.secondary_muscles,
        e.difficulty, e.equipment_type, e.equipment_subtype,
        e.instructions,
        COALESCE(
          json_agg(json_build_object('type', m.media_type,'path', m.media_path))
          FILTER (WHERE m.id IS NOT NULL),
          '[]'
        ) AS media
      FROM exercises e
      LEFT JOIN exercise_media m ON m.exercise_id = e.id
      ${where}
      GROUP BY e.id
      ORDER BY e.name
      LIMIT 30
    `;

    try {
      const { rows } = await database.query(sql, params);
      return res.json(rows);
    } catch (err) {
      console.error('Search exercises error:', err);
      return res.sendStatus(500);
    }
  });


  // ──────────────────────────────────────────────────────────────────────────
  // API: GET /exercises.json (legacy, without media)
  // ──────────────────────────────────────────────────────────────────────────
  app.get('/exercises.json', async (req, res) => {
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
        FROM exercises
      `);
      const out = {};
      for (const row of rows) {
        out[row.primary_muscle] ??= { exercises: [] };
        out[row.primary_muscle].exercises.push({
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
      return res.json(out);
    } catch (err) {
      console.error('Error querying exercises.json:', err);
      return res.sendStatus(500);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Fallback for anything else
  // ──────────────────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).send('Not Found');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Start HTTP server & graceful shutdown
  // ──────────────────────────────────────────────────────────────────────────
  const server = http.createServer(app);
  const PORT = process.env.PORT || 3000;
  const HOST = '0.0.0.0'; // Always bind to all interfaces in production

  server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
    console.log(`Access your app at: https://your-app-name.onrender.com`);
  });

  async function shutdown() {
    console.log('Shutting down …');
    server.close(() => console.log('HTTP server stopped'));
    try { await database.disconnect(); } catch { }
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

})();
