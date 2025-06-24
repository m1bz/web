const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Import config - adjust path if needed
let config;
try {
  config = require('../config/config');
} catch (error) {  // Fallback config if file doesn't exist
  config = {
    database: {
      host: 'dpg-d1de88buibrs73flusf0-a',
      port: 5432,
      database: 'web_r0ow', // ← Changed from 'web' to 'web1' to match your server
      user: 'web_r0ow_user',
      password: 'hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs'
    }
  };
}

class DatabaseSetup {
  constructor() {
    this.client = null;
    this.exercisesData = null;
  }

  async connect() {
    console.log('🔌 Connecting to PostgreSQL...');
    const connectionConfig = config.database.connectionString
      ? {
        connectionString: config.database.connectionString,
        ssl: { rejectUnauthorized: false } // Required for Render
      }
      : {
        host: config.database.host || 'dpg-d1de88buibrs73flusf0-a',
        port: config.database.port || 5432,
        database: config.database.database || 'web_r0ow', // ← Fixed default
        user: config.database.user || 'web_r0ow_user',
        password: config.database.password || 'hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs',
        ssl: { rejectUnauthorized: false } // Required for Render
      };

    try {
      this.client = new Client(connectionConfig);
      await this.client.connect();
      console.log(`✅ Connected to PostgreSQL → ${connectionConfig.database}`);

      // Test the connection
      await this.client.query('SELECT NOW()');
      console.log('✅ Database connection verified');

    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async loadExercisesData() {
    console.log('📚 Loading exercises from exercises.json...');

    try {
      const auxPath = path.join(__dirname, '..', 'aux - not needed in code', 'exercises.json');
      const exercisesContent = await fs.readFile(auxPath, 'utf8');

      this.exercisesData = JSON.parse(exercisesContent);
      console.log(`✅ Loaded exercises data with ${Object.keys(this.exercisesData).length} muscle groups`);
    } catch (error) {
      console.error('❌ Failed to load exercises.json:', error.message);
      throw error;
    }
  }

  async createTables() {
    console.log('\n📦 Creating database tables (matching server expectations)...');

    try {
      // Create custom types first
      await this.client.query(`
        DO $$ BEGIN
          CREATE TYPE gender_enum AS ENUM ('male','female','other');
        EXCEPTION
          WHEN duplicate_object THEN 
            RAISE NOTICE 'Type gender_enum already exists, skipping creation';
        END $$;
      `);

      // Create tables exactly as your database.js expects them
      await this.client.query(`
        /* ---------------- users ---------------- */
        CREATE TABLE IF NOT EXISTS users (
          id            SERIAL PRIMARY KEY,
          username      VARCHAR(255)       NOT NULL,
          email         VARCHAR(255) UNIQUE NOT NULL,
          password      VARCHAR(255)       NOT NULL,
          created_at    TIMESTAMPTZ        DEFAULT CURRENT_TIMESTAMP,
          last_login    TIMESTAMPTZ,
          is_admin      BOOLEAN            DEFAULT FALSE,
          is_logged_in  BOOLEAN            DEFAULT FALSE,
          
          CONSTRAINT users_username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 50),
          CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
          CONSTRAINT users_password_length CHECK (char_length(password) >= 6)
        );

        /* ---------------- profiles ---------------- */
        CREATE TABLE IF NOT EXISTS profiles (
          id        SERIAL PRIMARY KEY,
          user_id   INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          gender    gender_enum,
          age       INT    CHECK (age BETWEEN 5 AND 120),
          weight    FLOAT  CHECK (weight > 0 AND weight <= 500),
          height    FLOAT  CHECK (height >= 50 AND height <= 300)
        );

        /* ---------------- muscles ---------------- */
        CREATE TABLE IF NOT EXISTS muscles (
          name VARCHAR PRIMARY KEY,
          CONSTRAINT muscles_name_not_empty CHECK (char_length(trim(name)) > 0)
        );

        /* ---------------- exercises ---------------- */
        CREATE TABLE IF NOT EXISTS exercises (
          id               SERIAL PRIMARY KEY,
          name             VARCHAR NOT NULL,
          primary_muscle   VARCHAR NOT NULL REFERENCES muscles(name),
          secondary_muscles TEXT[],
          difficulty       VARCHAR NOT NULL CHECK (difficulty IN ('novice', 'beginner', 'intermediate', 'advanced')),
          equipment_type   VARCHAR NOT NULL,
          equipment_subtype VARCHAR,
          instructions     TEXT NOT NULL,
          
          CONSTRAINT exercises_name_not_empty CHECK (char_length(trim(name)) > 0),
          CONSTRAINT exercises_equipment_not_empty CHECK (char_length(trim(equipment_type)) > 0),
          CONSTRAINT exercises_instructions_min_length CHECK (char_length(trim(instructions)) >= 10),
          CONSTRAINT exercises_name_unique UNIQUE (name)
        );

         CREATE TABLE IF NOT EXISTS exercise_media (
           id            SERIAL PRIMARY KEY,
           exercise_id   INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
           media_type    VARCHAR(10) NOT NULL
                   CHECK (media_type IN ('image','video')),
             media_path    TEXT NOT NULL,
             uploaded_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
       );

        /* ---------------- workouts / workout_exercises ---------------- */
        CREATE TABLE IF NOT EXISTS workouts (
          id         SERIAL PRIMARY KEY,
          user_id    INT REFERENCES users(id) ON DELETE CASCADE,
          name       VARCHAR NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT workouts_name_not_empty CHECK (char_length(trim(name)) > 0)
        );

        CREATE TABLE IF NOT EXISTS workout_exercises (
          id          SERIAL PRIMARY KEY,
          workout_id  INT REFERENCES workouts(id)   ON DELETE CASCADE,
          exercise_id INT REFERENCES exercises(id)  ON DELETE CASCADE,
          position    INT NOT NULL DEFAULT 1 CHECK (position > 0)
        );

        /* ---------------- saved_workouts (JSON snapshot, plus viz) ----- */
        CREATE TABLE IF NOT EXISTS saved_workouts (
          id               SERIAL PRIMARY KEY,
          user_id          INT REFERENCES users(id) ON DELETE CASCADE,
          name             VARCHAR NOT NULL,
          workout_data     JSONB       NOT NULL,
          created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          body_parts_worked VARCHAR[],
          
          CONSTRAINT saved_workouts_name_not_empty CHECK (char_length(trim(name)) > 0),
          CONSTRAINT saved_workouts_data_not_empty CHECK (jsonb_array_length(workout_data) > 0)
        );
      `);

      // Create triggers exactly as in your database.js
      await this.client.query(`
        /* ---------------- Auto-create profile trigger ---------------- */
        CREATE OR REPLACE FUNCTION auto_create_user_profile()
        RETURNS TRIGGER AS '
        BEGIN
          INSERT INTO profiles (user_id, gender, age, weight, height)
          VALUES (NEW.id, NULL, NULL, NULL, NULL);
          RETURN NEW;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING ''Failed to auto-create profile for user %: %'', NEW.id, SQLERRM;
            RETURN NEW;
        END;
        ' LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_auto_create_profile ON users;
        CREATE TRIGGER trigger_auto_create_profile
          AFTER INSERT ON users
          FOR EACH ROW
          EXECUTE FUNCTION auto_create_user_profile();

        /* ---------------- Auto-assign admin role trigger ---------------- */
        CREATE OR REPLACE FUNCTION auto_assign_admin_role()
        RETURNS TRIGGER AS '
        DECLARE
          email_domain TEXT;
          admin_domains TEXT[] := ARRAY[''admin'', ''boss'', ''manager'', ''owner'', ''superuser''];
          domain TEXT;
        BEGIN
          email_domain := substring(NEW.email from ''@([^.]+)'');
          
          FOREACH domain IN ARRAY admin_domains
          LOOP
            IF email_domain = domain THEN
              UPDATE users 
              SET is_admin = TRUE 
              WHERE id = NEW.id;
              
              RAISE NOTICE ''Admin privileges granted to user % with email %'', NEW.username, NEW.email;
              EXIT;
            END IF;
          END LOOP;
          
          RETURN NEW;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING ''Failed to check admin role for user %: %'', NEW.id, SQLERRM;
            RETURN NEW;
        END;
        ' LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trigger_auto_assign_admin ON users;
        CREATE TRIGGER trigger_auto_assign_admin
          AFTER INSERT ON users
          FOR EACH ROW
          EXECUTE FUNCTION auto_assign_admin_role();
      `);

      console.log('✅ Tables and triggers created successfully (matching server expectations)');

    } catch (error) {
      console.error('❌ Error creating tables:', error.message);
      throw error;
    }
  }

  // ... rest of your methods stay the same ...
  async populateData() {
    console.log('\n🌱 Populating database with mock data...');

    try {
      await this.populateMuscles();
      await this.populateExercises();
      await this.populateUsers();
      await this.populateWorkouts();

      console.log('✅ Database populated successfully');
    } catch (error) {
      console.error('❌ Error populating data:', error.message);
      throw error;
    }
  }

  async populateMuscles() {
    console.log('  📝 Adding muscle groups from exercises.json...');

    const primaryMuscles = Object.keys(this.exercisesData);

    let musclesAdded = 0;
    for (const muscle of primaryMuscles) {
      try {
        const result = await this.client.query(
          'INSERT INTO muscles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING name',
          [muscle]
        );
        if (result.rows.length > 0) {
          musclesAdded++;
        }
      } catch (error) {
        console.log(`    ⚠️  Error adding muscle ${muscle}: ${error.message}`);
      }
    }

    console.log(`    ✅ Added ${musclesAdded} muscle groups: ${primaryMuscles.join(', ')}`);
  }

  async populateExercises() {
    console.log('  💪 Adding exercises from exercises.json...');

    let totalExercises = 0;

    for (const [muscleGroup, data] of Object.entries(this.exercisesData)) {
      if (!data.exercises || !Array.isArray(data.exercises)) continue;

      for (const exercise of data.exercises) {
        try {
          const difficulty = exercise.difficulty === 'novice' ? 'beginner' : exercise.difficulty;
          const equipmentType = exercise.equipment?.type || 'bodyweight';
          const equipmentSubtype = exercise.equipment?.subtype || null;
          const secondaryMuscles = exercise.secondary_muscles || [];

          await this.client.query(
            `INSERT INTO exercises (name, primary_muscle, secondary_muscles, difficulty, equipment_type, equipment_subtype, instructions)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (name) DO NOTHING`,
            [
              exercise.name,
              muscleGroup,
              secondaryMuscles,
              difficulty,
              equipmentType,
              equipmentSubtype,
              exercise.instructions
            ]
          );
          totalExercises++;
        } catch (error) {
          console.log(`    ⚠️  Error adding exercise ${exercise.name}: ${error.message}`);
        }
      }
    }
    console.log(`    ✅ Added ${totalExercises} exercises from exercises.json`);
  }

  async populateUsers() {
    console.log('  👥 Adding 12+ users in age groups...');

    // Groups of 3 users with similar ages (±3 years)
    const userGroups = [
      // Group 1: Ages 20-23
      [
        { username: 'alex_20', email: 'alex@example.com', age: 20, weight: 70, height: 175 },
        { username: 'ben_21', email: 'ben@example.com', age: 21, weight: 68, height: 172 },
        { username: 'chris_22', email: 'chris@example.com', age: 22, weight: 72, height: 178 }
      ],
      // Group 2: Ages 28-31
      [
        { username: 'david_28', email: 'david@example.com', age: 28, weight: 80, height: 180 },
        { username: 'ethan_29', email: 'ethan@example.com', age: 29, weight: 75, height: 177 },
        { username: 'frank_30', email: 'frank@example.com', age: 30, weight: 82, height: 183 }
      ],
      // Group 3: Ages 38-41
      [
        { username: 'george_38', email: 'george@example.com', age: 38, weight: 85, height: 175 },
        { username: 'henry_39', email: 'henry@example.com', age: 39, weight: 88, height: 178 },
        { username: 'ivan_40', email: 'ivan@example.com', age: 40, weight: 90, height: 180 }
      ],
      // Group 4: Ages 48-51
      [
        { username: 'jack_48', email: 'jack@example.com', age: 48, weight: 92, height: 176 },
        { username: 'kevin_49', email: 'kevin@example.com', age: 49, weight: 87, height: 174 },
        { username: 'luke_50', email: 'luke@example.com', age: 50, weight: 89, height: 179 }
      ]
    ];

    // Add admin user first
    try {
      const result = await this.client.query(
        `INSERT INTO users (username, email, password, is_admin, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        ['admin', 'admin@admin.com', 'admin123', true]
      );

      if (result.rows.length > 0) {
        const userId = result.rows[0].id;
        await this.client.query(
          `UPDATE profiles 
           SET gender = $1, age = $2, weight = $3, height = $4
           WHERE user_id = $5`,
          ['male', 35, 85, 185, userId]
        );
      }
    } catch (error) {
      console.log(`    ⚠️  Admin user might already exist`);
    }

    // Add the 12 regular users
    let totalUsersAdded = 0;
    for (const group of userGroups) {
      for (const user of group) {
        try {
          const result = await this.client.query(
            `INSERT INTO users (username, email, password, is_admin, created_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (email) DO NOTHING
             RETURNING id`,
            [user.username, user.email, 'password123', false]
          );

          if (result.rows.length > 0) {
            const userId = result.rows[0].id;

            await this.client.query(
              `UPDATE profiles 
               SET gender = $1, age = $2, weight = $3, height = $4
               WHERE user_id = $5`,
              ['male', user.age, user.weight, user.height, userId]
            );
            totalUsersAdded++;
          }
        } catch (error) {
          console.log(`    ⚠️  User ${user.username} might already exist`);
        }
      }
    }
    console.log(`    ✅ Added ${totalUsersAdded} users in 4 age groups`);
  }

  async populateWorkouts() {
    console.log('  🏋️ Adding mock workouts with server-compatible format...');

    try {
      // Get users for workouts (excluding admin)
      const usersResult = await this.client.query(`
        SELECT u.id, u.username, p.age 
        FROM users u
        JOIN profiles p ON u.id = p.user_id
        WHERE u.email != 'admin@admin.com' 
        ORDER BY u.id 
        LIMIT 12
      `);
      const users = usersResult.rows;

      if (users.length === 0) {
        console.log('    ⚠️  No users found, skipping workouts');
        return;
      }

      // Get exercises from database 
      const exercisesResult = await this.client.query(`
        SELECT name, primary_muscle, secondary_muscles, difficulty, equipment_type, instructions 
        FROM exercises 
        ORDER BY primary_muscle, name
      `);
      const exercises = exercisesResult.rows;

      if (exercises.length === 0) {
        console.log('    ⚠️  No exercises found, skipping workouts');
        return;
      }

      // Group exercises by muscle
      const exercisesByMuscle = {};
      exercises.forEach(ex => {
        if (!exercisesByMuscle[ex.primary_muscle]) {
          exercisesByMuscle[ex.primary_muscle] = [];
        }
        exercisesByMuscle[ex.primary_muscle].push(ex);
      });

      const workoutTemplates = [
        {
          name: 'Push Day Workout',
          muscles: ['chest', 'triceps', 'front-shoulders'],
          difficulty: 'beginner'
        },
        {
          name: 'Pull Day Workout',
          muscles: ['lats', 'biceps', 'traps'],
          difficulty: 'intermediate'
        },
        {
          name: 'Leg Day Workout',
          muscles: ['quads', 'glutes', 'hamstrings'],
          difficulty: 'beginner'
        },
        {
          name: 'Upper Body Strength',
          muscles: ['chest', 'lats', 'front-shoulders'],
          difficulty: 'intermediate'
        },
        {
          name: 'Core & Abs Focus',
          muscles: ['abdominals', 'obliques'],
          difficulty: 'beginner'
        },
        {
          name: 'Full Body Beginner',
          muscles: ['chest', 'quads', 'lats'],
          difficulty: 'beginner'
        }
      ];

      let workoutsCreated = 0;
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const template = workoutTemplates[i % workoutTemplates.length];

        const workoutExercises = [];
        const bodyParts = [];

        // Select 2-3 exercises for each muscle group
        for (const muscle of template.muscles) {
          if (exercisesByMuscle[muscle]) {
            const muscleExercises = exercisesByMuscle[muscle]
              .filter(ex => ex.difficulty === template.difficulty ||
                (template.difficulty === 'intermediate' && ex.difficulty === 'beginner'))
              .slice(0, 2);

            // Convert to SERVER FORMAT - this is critical!
            const serverFormatExercises = muscleExercises.map(ex => ({
              name: ex.name,
              muscle: ex.primary_muscle,          // SERVER EXPECTS "muscle" 
              difficulty: ex.difficulty,
              equipmentType: ex.equipment_type,   // SERVER EXPECTS "equipmentType"
              instructions: ex.instructions
            }));

            workoutExercises.push(...serverFormatExercises);
            if (!bodyParts.includes(muscle)) {
              bodyParts.push(muscle);
            }
          }
        }

        if (workoutExercises.length > 0) {
          // Random timestamps over past 60 days
          const daysAgo = Math.floor(Math.random() * 60) + 1;
          const createdAt = new Date();
          createdAt.setDate(createdAt.getDate() - daysAgo);

          // Create workout in saved_workouts table with SERVER-COMPATIBLE format
          await this.client.query(
            `INSERT INTO saved_workouts (user_id, name, workout_data, body_parts_worked, created_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              user.id,
              `${template.name} - ${user.username}`,
              JSON.stringify(workoutExercises), // This matches server expectations!
              bodyParts,
              createdAt
            ]
          );

          workoutsCreated++;
        }
      }
      console.log(`    ✅ Added ${workoutsCreated} mock workouts with server-compatible format`);
    } catch (error) {
      console.log('    ⚠️  Error creating workouts:', error.message);
    }
  }

  async verifySetup() {
    console.log('\n🔍 Verifying database setup...');

    try {
      const tables = ['users', 'profiles', 'muscles', 'exercises', 'workouts', 'workout_exercises', 'saved_workouts'];

      for (const table of tables) {
        const result = await this.client.query(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        const count = result.rows[0].count;
        console.log(`    ✅ ${table}: ${count} records`);
      }

      // Check workout data format - should show proper field names
      const sampleWorkout = await this.client.query(`
        SELECT workout_data FROM saved_workouts LIMIT 1
      `);

      if (sampleWorkout.rows.length > 0) {
        const firstExercise = sampleWorkout.rows[0].workout_data[0];
        console.log(`    ✅ Sample exercise format:`, {
          name: firstExercise?.name,
          muscle: firstExercise?.muscle,           // Should show muscle name
          equipmentType: firstExercise?.equipmentType
        });
      }

      // Show age distribution
      const ageGroups = await this.client.query(`
        SELECT 
          CASE 
            WHEN age BETWEEN 20 AND 23 THEN '20-23'
            WHEN age BETWEEN 28 AND 31 THEN '28-31'
            WHEN age BETWEEN 38 AND 41 THEN '38-41'
            WHEN age BETWEEN 48 AND 51 THEN '48-51'
            ELSE 'other'
          END as age_group,
          COUNT(*) as users_count
        FROM profiles 
        WHERE gender = 'male' AND age IS NOT NULL
        GROUP BY age_group
        ORDER BY age_group
      `);

      console.log('\n    👥 User age distribution:');
      ageGroups.rows.forEach(group => {
        console.log(`      ${group.age_group}: ${group.users_count} users`);
      });

      // Test triggers
      const triggerTest = await this.client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.triggers 
        WHERE trigger_name IN ('trigger_auto_create_profile', 'trigger_auto_assign_admin')
      `);
      console.log(`    ✅ Active triggers: ${triggerTest.rows[0].count}`);

    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log('🔌 Disconnected from PostgreSQL');
    }
  }

  async run() {
    try {
      console.log('🚀 Starting Complete Database Setup\n');

      await this.loadExercisesData();
      await this.connect();
      await this.createTables();
      await this.populateData();
      await this.verifySetup();

      console.log('\n🎉 Database setup completed successfully!');
      console.log('\n📋 Summary:');
      console.log('   • All tables created matching server expectations');
      console.log('   • Triggers match database.js exactly');
      console.log('   • 1 admin + 12 regular male users in 4 age groups');
      console.log('   • All muscle groups and exercises from exercises.json');
      console.log('   • Sample workouts in server-compatible format');
      console.log('   • Server should work correctly now');

    } catch (error) {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Run if called directly
if (require.main === module) {
  const setup = new DatabaseSetup();
  setup.run();
}

module.exports = DatabaseSetup;