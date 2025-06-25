// scripts/setup-database.js

const { Client } = require('pg');
const fs        = require('fs').promises;
const path      = require('path');

// --- Load config (with fallback) ---
let config;
try {
  config = require('../config/config');
} catch (error) {
  config = {
    database: {
      host:     'dpg-d1de88buibrs73flusf0-a',
      port:     5432,
      database: 'web_r0ow',
      user:     'web_r0ow_user',
      password: 'hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs',
    }
  };
}

class DatabaseSetup {
  constructor() {
    this.client        = null;
    this.exercisesData = null;
  }

  /** 1) Load exercises.json */
  async loadExercisesData() {
    console.log('📚 Loading exercises.json…');
    const auxPath = path.join(__dirname, '..', 'aux - not needed in code', 'exercises.json');
    const content = await fs.readFile(auxPath, 'utf8');
    this.exercisesData = JSON.parse(content);
    console.log(`✅ Loaded ${Object.keys(this.exercisesData).length} muscle groups`);
  }

  /** 2) Connect */
  async connect() {
    console.log('🔌 Connecting to PostgreSQL…');
    const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
    let opts;

    if (config.database.connectionString) {
      opts = {
        connectionString: config.database.connectionString,
        ssl: isProd ? { rejectUnauthorized: false } : false
      };
    } else {
      opts = {
        host:     config.database.host,
        port:     config.database.port,
        database: config.database.database,
        user:     config.database.user,
        password: config.database.password,
        ssl:      isProd ? { rejectUnauthorized: false } : false
      };
    }

    this.client = new Client(opts);
    await this.client.connect();
    console.log(`✅ Connected → ${opts.database || opts.connectionString}`);
    await this.client.query('SELECT NOW()');
    console.log('✅ Connection verified');
  }

  /** 3) Create types, tables & triggers (including workout_logs + 1/day) */
  async createTables() {
    console.log('\n📦 Creating tables and triggers…');
    await this.client.query(`
      DO $$ BEGIN
        CREATE TYPE gender_enum AS ENUM ('male','female','other');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email    VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMPTZ,
        is_admin BOOLEAN DEFAULT FALSE,
        is_logged_in BOOLEAN DEFAULT FALSE,
        CONSTRAINT users_username_length CHECK (char_length(username) BETWEEN 3 AND 50),
        CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
        CONSTRAINT users_password_length CHECK (char_length(password) >= 6)
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        gender gender_enum,
        age INT CHECK (age BETWEEN 5 AND 120),
        weight FLOAT CHECK (weight > 0 AND weight <= 500),
        height FLOAT CHECK (height >= 50 AND height <= 300)
      );

      CREATE TABLE IF NOT EXISTS muscles (
        name VARCHAR PRIMARY KEY,
        CONSTRAINT muscles_name_not_empty CHECK (char_length(trim(name)) > 0)
      );

      CREATE TABLE IF NOT EXISTS exercises (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        primary_muscle VARCHAR NOT NULL REFERENCES muscles(name),
        secondary_muscles TEXT[],
        difficulty VARCHAR NOT NULL CHECK (difficulty IN ('novice','beginner','intermediate','advanced')),
        equipment_type VARCHAR NOT NULL,
        equipment_subtype VARCHAR,
        instructions TEXT NOT NULL,
        CONSTRAINT exercises_name_not_empty CHECK (char_length(trim(name)) > 0),
        CONSTRAINT exercises_equipment_not_empty CHECK (char_length(trim(equipment_type)) > 0),
        CONSTRAINT exercises_instructions_min_length CHECK (char_length(trim(instructions)) >= 10),
        CONSTRAINT exercises_name_unique UNIQUE (name)
      );

      CREATE TABLE IF NOT EXISTS exercise_media (
        id SERIAL PRIMARY KEY,
        exercise_id INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image','video')),
        media_path TEXT NOT NULL,
        uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS workouts (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT workouts_name_not_empty CHECK (char_length(trim(name)) > 0)
      );

      CREATE TABLE IF NOT EXISTS workout_exercises (
        id SERIAL PRIMARY KEY,
        workout_id INT REFERENCES workouts(id) ON DELETE CASCADE,
        exercise_id INT REFERENCES exercises(id) ON DELETE CASCADE,
        position INT NOT NULL DEFAULT 1 CHECK (position > 0)
      );

      CREATE TABLE IF NOT EXISTS saved_workouts (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR NOT NULL,
        workout_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        body_parts_worked VARCHAR[],
        CONSTRAINT saved_workouts_name_not_empty CHECK (char_length(trim(name)) > 0),
        CONSTRAINT saved_workouts_data_not_empty CHECK (jsonb_array_length(workout_data) > 0)
      );

      -- New workout_logs
      CREATE TABLE IF NOT EXISTS workout_logs (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        saved_workout_id INT NOT NULL REFERENCES saved_workouts(id) ON DELETE CASCADE,
        logged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        log_date DATE    NOT NULL DEFAULT CURRENT_DATE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_log_per_day
        ON workout_logs (user_id, log_date);

      CREATE OR REPLACE FUNCTION sync_log_date()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.log_date := NEW.logged_at::date;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_sync_log_date ON workout_logs;
      CREATE TRIGGER trigger_sync_log_date
        BEFORE INSERT OR UPDATE ON workout_logs
        FOR EACH ROW
        EXECUTE FUNCTION sync_log_date();

      -- Auto-create profile
      CREATE OR REPLACE FUNCTION auto_create_user_profile()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO profiles(user_id,gender,age,weight,height)
        VALUES (NEW.id,NULL,NULL,NULL,NULL);
        RETURN NEW;
      EXCEPTION WHEN OTHERS THEN RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS trigger_auto_create_profile ON users;
      CREATE TRIGGER trigger_auto_create_profile
        AFTER INSERT ON users
        FOR EACH ROW
        EXECUTE FUNCTION auto_create_user_profile();

      -- Auto-assign admin
      CREATE OR REPLACE FUNCTION auto_assign_admin_role()
      RETURNS TRIGGER AS $$
      DECLARE
        email_domain TEXT;
        admin_domains TEXT[] := ARRAY['admin','boss','manager','owner','superuser'];
        dom TEXT;
      BEGIN
        email_domain := substring(NEW.email FROM '@([^\\.]+)');
        FOREACH dom IN ARRAY admin_domains LOOP
          IF email_domain = dom THEN
            UPDATE users SET is_admin = TRUE WHERE id = NEW.id;
            EXIT;
          END IF;
        END LOOP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS trigger_auto_assign_admin ON users;
      CREATE TRIGGER trigger_auto_assign_admin
        AFTER INSERT ON users
        FOR EACH ROW
        EXECUTE FUNCTION auto_assign_admin_role();
    `);
    console.log('✅ Tables and triggers created');
  }

  /** 4a) Populate muscle groups */
  async populateMuscles() {
    console.log('  📝 Adding muscle groups…');
    const muscles = Object.keys(this.exercisesData);
    let added = 0;
    for (const m of muscles) {
      const r = await this.client.query(
        'INSERT INTO muscles(name) VALUES($1) ON CONFLICT DO NOTHING RETURNING name',
        [m]
      );
      if (r.rows.length) added++;
    }
    console.log(`    → ${added}/${muscles.length} muscles added`);
  }

  /** 4b) Populate exercises */
  async populateExercises() {
    console.log('  💪 Adding exercises…');
    let total = 0;
    for (const [muscle, grp] of Object.entries(this.exercisesData)) {
      if (!Array.isArray(grp.exercises)) continue;
      for (const ex of grp.exercises) {
        const diff = ex.difficulty === 'novice' ? 'beginner' : ex.difficulty;
        const typ  = ex.equipment?.type || 'bodyweight';
        const sub  = ex.equipment?.subtype || null;
        const sec  = ex.secondary_muscles || [];
        await this.client.query(
          `INSERT INTO exercises
             (name,primary_muscle,secondary_muscles,difficulty,
              equipment_type,equipment_subtype,instructions)
           VALUES($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT DO NOTHING`,
          [ex.name, muscle, sec, diff, typ, sub, ex.instructions]
        );
        total++;
      }
    }
    console.log(`    → ${total} exercises processed`);
  }

  /** 4c) Populate users (1 admin + 12 regular) */
  async populateUsers() {
    console.log('  👥 Adding 12+ users in age groups…');
    const userGroups = [
      [{ username: 'alex_20', email: 'alex@example.com', age: 20, weight: 70, height: 175 },
       { username: 'ben_21',  email: 'ben@example.com', age: 21, weight: 68, height: 172 },
       { username: 'chris_22',email: 'chris@example.com',age: 22, weight: 72, height: 178 }],
      [{ username: 'david_28',email: 'david@example.com',age: 28, weight: 80, height: 180 },
       { username: 'ethan_29',email: 'ethan@example.com',age: 29, weight: 75, height: 177 },
       { username: 'frank_30',email: 'frank@example.com',age: 30, weight: 82, height: 183 }],
      [{ username: 'george_38',email: 'george@example.com',age: 38, weight: 85, height: 175 },
       { username: 'henry_39',email: 'henry@example.com',age: 39, weight: 88, height: 178 },
       { username: 'ivan_40', email: 'ivan@example.com', age: 40, weight: 90, height: 180 }],
      [{ username: 'jack_48', email: 'jack@example.com', age: 48, weight: 92, height: 176 },
       { username: 'kevin_49',email: 'kevin@example.com', age: 49, weight: 87, height: 174 },
       { username: 'luke_50', email: 'luke@example.com', age: 50, weight: 89, height: 179 }]
    ];

    // Admin user
    try {
      const res = await this.client.query(
        `INSERT INTO users(username,email,password,is_admin,created_at)
         VALUES($1,$2,$3,TRUE,NOW())
         ON CONFLICT(email) DO NOTHING RETURNING id`,
        ['admin','admin@admin.com','admin123']
      );
      if (res.rows[0]) {
        await this.client.query(
          `UPDATE profiles SET gender='male',age=35,weight=85,height=185
           WHERE user_id=$1`,
          [res.rows[0].id]
        );
      }
    } catch {}

    // Regular users
    let total = 0;
    for (const group of userGroups) {
      for (const u of group) {
        const r = await this.client.query(
          `INSERT INTO users(username,email,password,created_at)
           VALUES($1,$2,$3,NOW())
           ON CONFLICT(email) DO NOTHING RETURNING id`,
          [u.username,u.email,'password123']
        );
        if (r.rows[0]) {
          await this.client.query(
            `UPDATE profiles SET gender='male',age=$1,weight=$2,height=$3
             WHERE user_id=$4`,
            [u.age,u.weight,u.height,r.rows[0].id]
          );
          total++;
        }
      }
    }
    console.log(`    → ${total} regular users added`);
  }

  /** 4d) Populate saved_workouts */
  async populateWorkouts() {
    console.log('  🏋️ Adding mock workouts…');
    // fetch users
    const us = await this.client.query(`
      SELECT u.id,p.age
      FROM users u JOIN profiles p ON u.id=p.user_id
      WHERE u.email!='admin@admin.com'
      ORDER BY u.id LIMIT 12
    `);
    const users = us.rows;
    if (!users.length) return;

    const exs = await this.client.query(`
      SELECT name,primary_muscle,difficulty,equipment_type,instructions
      FROM exercises ORDER BY primary_muscle,name
    `);
    const byMuscle = {};
    for (const e of exs.rows) {
      byMuscle[e.primary_muscle] = byMuscle[e.primary_muscle]||[];
      byMuscle[e.primary_muscle].push(e);
    }

    const templates = [
      { name:'Push Day',   muscles:['chest','triceps','front-shoulders'], difficulty:'beginner' },
      { name:'Pull Day',   muscles:['lats','biceps','traps'],            difficulty:'intermediate' },
      { name:'Leg Day',    muscles:['quads','glutes','hamstrings'],      difficulty:'beginner' },
      { name:'Upper Body', muscles:['chest','lats','front-shoulders'],   difficulty:'intermediate' },
      { name:'Core Focus', muscles:['abdominals','obliques'],            difficulty:'beginner' },
      { name:'Full Body',  muscles:['chest','quads','lats'],             difficulty:'beginner' }
    ];

    let created = 0;
    for (let i=0; i<users.length; i++) {
      const user = users[i];
      const tpl  = templates[i % templates.length];
      const workoutData = [];
      const parts = [];

      for (const m of tpl.muscles) {
        const candidates = byMuscle[m]||[];
        const picks = candidates
          .filter(ex => ex.difficulty===tpl.difficulty ||
            (tpl.difficulty==='intermediate' && ex.difficulty==='beginner'))
          .slice(0,2);

        for (const ex of picks) {
          workoutData.push({
            name: ex.name,
            muscle: ex.primary_muscle,
            difficulty: ex.difficulty,
            equipmentType: ex.equipment_type,
            instructions: ex.instructions
          });
        }
        if (picks.length) parts.push(m);
      }

      if (!workoutData.length) continue;
      const daysAgo = Math.floor(Math.random()*60)+1;
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate()-daysAgo);

      await this.client.query(
        `INSERT INTO saved_workouts(user_id,name,workout_data,body_parts_worked,created_at)
         VALUES($1,$2,$3,$4,$5)`,
        [
          user.id,
          `${tpl.name} - ${user.id}`,
          JSON.stringify(workoutData),
          parts,
          createdAt
        ]
      );
      created++;
    }
    console.log(`    → ${created} mock workouts added`);
  }

  /** 5) Verify */
  async verifySetup() {
    console.log('\n🔍 Verifying setup…');
    const tables = [
      'users','profiles','muscles','exercises',
      'workouts','workout_exercises','saved_workouts','workout_logs'
    ];
    for (const t of tables) {
      const r = await this.client.query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`    • ${t}: ${r.rows[0].count}`);
    }
    console.log('✅ Verification complete');
  }

  /** 6) Disconnect */
  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log('🔌 Disconnected');
    }
  }

  /** Run all */
  async run() {
    try {
      console.log('🚀 Starting database setup…');
      await this.loadExercisesData();
      await this.connect();
      await this.createTables();
      await this.populateMuscles();
      await this.populateExercises();
      await this.populateUsers();
      await this.populateWorkouts();
      await this.verifySetup();
      console.log('\n🎉 Database setup finished!');
    } catch (err) {
      console.error('\n💥 Setup failed:', err.message || err);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Only run when executed directly
if (require.main === module) {
  new DatabaseSetup().run();
}

module.exports = DatabaseSetup;
