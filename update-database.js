const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config/config');

class DatabaseSetup {
  constructor() {
    this.client = null;
    this.exercisesData = null;
  }

  async connect() {
    console.log('🔌 Connecting to PostgreSQL...');
    
    const connectionConfig = config.database.connectionString
      ? { connectionString: config.database.connectionString }
      : {
          host: config.database.host || 'localhost',
          port: config.database.port || 5432,
          database: config.database.database || 'web',
          user: config.database.user || 'postgres',
          password: config.database.password || 'admin'
        };

    try {
      this.client = new Client(connectionConfig);
      await this.client.connect();
      console.log(`✅ Connected to PostgreSQL → ${connectionConfig.database}`);
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  async loadExercisesData() {
  console.log('📚 Loading exercises from exercises.json...');
  
  try {
    // REMOVE the '..' - stay in current directory
    const exercisesPath = path.join(__dirname, 'public', 'exercises.json');
    
    // Try public folder first, then aux folder
    let exercisesContent;
    try {
      exercisesContent = await fs.readFile(exercisesPath, 'utf8');
    } catch {
      // REMOVE the '..' here too
      const auxPath = path.join(__dirname, 'aux - not needed in code', 'exercises.json');
      exercisesContent = await fs.readFile(auxPath, 'utf8');
    }
    
    this.exercisesData = JSON.parse(exercisesContent);
    console.log(`✅ Loaded exercises data with ${Object.keys(this.exercisesData).length} muscle groups`);
  } catch (error) {
    console.error('❌ Failed to load exercises.json:', error.message);
    throw error;
  }
}

  async createDatabase() {
    console.log('\n📦 Creating database schema...');
    
    try {
      // Create custom types
      await this.client.query(`
        DO $$ BEGIN
          CREATE TYPE gender_enum AS ENUM ('male','female','other');
        EXCEPTION
          WHEN duplicate_object THEN 
            RAISE NOTICE 'Type gender_enum already exists, skipping creation';
        END $$;
      `);
      console.log('✅ Custom types created');

      // Create tables
      await this.client.query(`
        /* ---------------- users table ---------------- */
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

        /* ---------------- profiles table ---------------- */
        CREATE TABLE IF NOT EXISTS profiles (
          id        SERIAL PRIMARY KEY,
          user_id   INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          gender    gender_enum,
          age       INT    CHECK (age BETWEEN 5 AND 120),
          weight    FLOAT  CHECK (weight > 0 AND weight <= 500),
          height    FLOAT  CHECK (height >= 50 AND height <= 300)
        );

        /* ---------------- muscles table ---------------- */
        CREATE TABLE IF NOT EXISTS muscles (
          name VARCHAR PRIMARY KEY,
          CONSTRAINT muscles_name_not_empty CHECK (char_length(trim(name)) > 0)
        );

        /* ---------------- exercises table ---------------- */
        CREATE TABLE IF NOT EXISTS exercises (
          id               SERIAL PRIMARY KEY,
          name             VARCHAR NOT NULL,
          primary_muscle   VARCHAR NOT NULL REFERENCES muscles(name),
          secondary_muscles TEXT[],
          difficulty       VARCHAR NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'novice')),
          equipment_type   VARCHAR NOT NULL,
          equipment_subtype VARCHAR,
          instructions     TEXT NOT NULL,
          
          CONSTRAINT exercises_name_not_empty CHECK (char_length(trim(name)) > 0),
          CONSTRAINT exercises_equipment_not_empty CHECK (char_length(trim(equipment_type)) > 0),
          CONSTRAINT exercises_instructions_min_length CHECK (char_length(trim(instructions)) >= 10),
          CONSTRAINT exercises_name_unique UNIQUE (name)
        );

        /* ---------------- workouts table ---------------- */
        CREATE TABLE IF NOT EXISTS workouts (
          id         SERIAL PRIMARY KEY,
          user_id    INT REFERENCES users(id) ON DELETE CASCADE,
          name       VARCHAR NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT workouts_name_not_empty CHECK (char_length(trim(name)) > 0)
        );

        /* ---------------- workout_exercises table ---------------- */
        CREATE TABLE IF NOT EXISTS workout_exercises (
          id          SERIAL PRIMARY KEY,
          workout_id  INT REFERENCES workouts(id)   ON DELETE CASCADE,
          exercise_id INT REFERENCES exercises(id)  ON DELETE CASCADE,
          position    INT NOT NULL DEFAULT 1 CHECK (position > 0)
        );

        /* ---------------- saved_workouts table ---------------- */
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
      console.log('✅ Tables created successfully');

      // Create triggers
      await this.createTriggers();
      console.log('✅ Triggers created successfully');

    } catch (error) {
      console.error('❌ Error creating database schema:', error.message);
      throw error;
    }
  }

  async createTriggers() {
    await this.client.query(`
      /* ---------------- Auto-create profile trigger ---------------- */
      CREATE OR REPLACE FUNCTION auto_create_user_profile()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO profiles (user_id, gender, age, weight, height)
        VALUES (NEW.id, NULL, NULL, NULL, NULL);
        RETURN NEW;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Failed to auto-create profile for user %: %', NEW.id, SQLERRM;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_auto_create_profile ON users;
      CREATE TRIGGER trigger_auto_create_profile
        AFTER INSERT ON users
        FOR EACH ROW
        EXECUTE FUNCTION auto_create_user_profile();

      /* ---------------- Auto-assign admin role trigger ---------------- */
      CREATE OR REPLACE FUNCTION auto_assign_admin_role()
      RETURNS TRIGGER AS $$
      DECLARE
        email_domain TEXT;
        admin_domains TEXT[] := ARRAY['admin', 'boss', 'manager', 'owner', 'superuser'];
        domain TEXT;
      BEGIN
        email_domain := substring(NEW.email from '@([^.]+)');
        
        FOREACH domain IN ARRAY admin_domains
        LOOP
          IF email_domain = domain THEN
            UPDATE users 
            SET is_admin = TRUE 
            WHERE id = NEW.id;
            
            RAISE NOTICE 'Admin privileges granted to user % with email %', NEW.username, NEW.email;
            EXIT;
          END IF;
        END LOOP;
        
        RETURN NEW;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Failed to check admin role for user %: %', NEW.id, SQLERRM;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trigger_auto_assign_admin ON users;
      CREATE TRIGGER trigger_auto_assign_admin
        AFTER INSERT ON users
        FOR EACH ROW
        EXECUTE FUNCTION auto_assign_admin_role();
    `);
  }

  async populateData() {
    console.log('\n🌱 Populating initial data...');

    try {
      // 1. Populate muscles from exercises.json
      await this.populateMuscles();
      
      // 2. Populate 12 male users in age groups
      await this.populateUsers();
      
      // 3. Populate exercises from exercises.json
      await this.populateExercises();
      
      // 4. Populate sample workouts
      await this.populateSampleWorkouts();

      console.log('✅ Database populated successfully');
    } catch (error) {
      console.error('❌ Error populating data:', error.message);
      throw error;
    }
  }

  async populateMuscles() {
    console.log('\n💪 Adding PRIMARY muscle groups from exercises.json...');
  
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
    
    console.log(`    ✅ Added ${musclesAdded} PRIMARY muscle groups only`);
    console.log(`    📋 Muscles: ${primaryMuscles.join(', ')}`);
  }

  async populateUsers() {
    console.log('  👥 Adding 12 male users in age groups...');
    
    // 12 users grouped by age (every 3 users are ±5 years apart)
    const userGroups = [
      // Group 1: Ages 20-25 (Young adults)
      [
        { username: 'alex_young', email: 'alex@example.com', age: 22, weight: 70, height: 175 },
        { username: 'ben_college', email: 'ben@example.com', age: 24, weight: 68, height: 172 },
        { username: 'chris_student', email: 'chris@example.com', age: 21, weight: 72, height: 178 }
      ],
      // Group 2: Ages 28-33 (Early career)
      [
        { username: 'david_pro', email: 'david@example.com', age: 30, weight: 80, height: 180 },
        { username: 'ethan_dev', email: 'ethan@example.com', age: 28, weight: 75, height: 177 },
        { username: 'frank_engineer', email: 'frank@example.com', age: 32, weight: 82, height: 183 }
      ],
      // Group 3: Ages 38-43 (Mid career)
      [
        { username: 'george_manager', email: 'george@example.com', age: 40, weight: 85, height: 175 },
        { username: 'henry_consultant', email: 'henry@example.com', age: 38, weight: 88, height: 178 },
        { username: 'ivan_director', email: 'ivan@example.com', age: 42, weight: 90, height: 180 }
      ],
      // Group 4: Ages 48-53 (Senior career)
      [
        { username: 'jack_executive', email: 'jack@example.com', age: 50, weight: 92, height: 176 },
        { username: 'kevin_senior', email: 'kevin@example.com', age: 48, weight: 87, height: 174 },
        { username: 'luke_veteran', email: 'luke@example.com', age: 52, weight: 89, height: 179 }
      ]
    ];

    // Add admin user
    const adminUser = {
      username: 'admin',
      email: 'admin@admin.com',
      password: 'admin123',
      is_admin: true,
      profile: { gender: 'male', age: 35, weight: 85, height: 185 }
    };

    try {
      const result = await this.client.query(
        `INSERT INTO users (username, email, password, is_admin, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [adminUser.username, adminUser.email, adminUser.password, adminUser.is_admin]
      );

      if (result.rows.length > 0) {
        const userId = result.rows[0].id;
        await this.client.query(
          `UPDATE profiles 
           SET gender = $1, age = $2, weight = $3, height = $4
           WHERE user_id = $5`,
          [adminUser.profile.gender, adminUser.profile.age, adminUser.profile.weight, adminUser.profile.height, userId]
        );
      }
    } catch (error) {
      console.log(`    ⚠️  Admin user might already exist`);
    }

    // Add the 12 male users
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
            
            // Update profile with male gender and specific stats
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
    console.log(`    ✅ Added ${totalUsersAdded} male users in 4 age groups (±5 years each)`);
  }

  async populateExercises() {
    console.log('  💪 Adding exercises from exercises.json...');
    
    let totalExercises = 0;
    
    for (const [muscleGroup, data] of Object.entries(this.exercisesData)) {
      for (const exercise of data.exercises) {
        try {
          // Map difficulty levels (novice -> beginner for consistency)
          const difficulty = exercise.difficulty === 'novice' ? 'beginner' : exercise.difficulty;
          
          // Handle equipment type and subtype
          const equipmentType = exercise.equipment.type;
          const equipmentSubtype = exercise.equipment.subtype || null;
          
          // Handle secondary muscles
          const secondaryMuscles = exercise.secondary_muscles || [];
          
          await this.client.query(
            `INSERT INTO exercises (name, primary_muscle, secondary_muscles, difficulty, equipment_type, equipment_subtype, instructions)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (name) DO NOTHING`,
            [
              exercise.name,
              muscleGroup, // Use the key as primary muscle
              secondaryMuscles,
              difficulty,
              equipmentType,
              equipmentSubtype,
              exercise.instructions
            ]
          );
          totalExercises++;
        } catch (error) {
          console.log(`    ⚠️  Exercise ${exercise.name} might already exist or have issues: ${error.message}`);
        }
      }
    }
    console.log(`    ✅ Added ${totalExercises} exercises from exercises.json`);
  }

  async populateSampleWorkouts() {
    console.log('  🏋️ Adding sample workouts...');
    
    try {
      // Get some users for sample workouts (excluding admin)
      const usersResult = await this.client.query(`
        SELECT id, username 
        FROM users 
        WHERE email != 'admin@admin.com' 
        ORDER BY id 
        LIMIT 8
      `);
      const users = usersResult.rows;

      if (users.length === 0) {
        console.log('    ⚠️  No users found, skipping sample workouts');
        return;
      }

      // Get exercises grouped by muscle
      const exercisesResult = await this.client.query(`
        SELECT name, primary_muscle, secondary_muscles, difficulty, equipment_type, instructions 
        FROM exercises 
        ORDER BY primary_muscle, name
      `);
      const exercises = exercisesResult.rows;

      if (exercises.length === 0) {
        console.log('    ⚠️  No exercises found, skipping sample workouts');
        return;
      }

      // Group exercises by muscle for easier selection
      const exercisesByMuscle = {};
      exercises.forEach(ex => {
        if (!exercisesByMuscle[ex.primary_muscle]) {
          exercisesByMuscle[ex.primary_muscle] = [];
        }
        exercisesByMuscle[ex.primary_muscle].push(ex);
      });

      const sampleWorkouts = [
        // Beginner workouts
        {
          user_id: users[0].id,
          name: 'Beginner Push Workout',
          muscles: ['chest', 'triceps', 'front-shoulders'],
          difficulty: 'beginner'
        },
        {
          user_id: users[1].id,
          name: 'Beginner Pull Workout',
          muscles: ['lats', 'biceps', 'traps-middle'],
          difficulty: 'beginner'
        },
        {
          user_id: users[2].id,
          name: 'Beginner Leg Workout',
          muscles: ['quads', 'glutes', 'hamstrings'],
          difficulty: 'beginner'
        },
        
        // Intermediate workouts
        {
          user_id: users[3].id,
          name: 'Upper Body Strength',
          muscles: ['chest', 'lats', 'front-shoulders', 'biceps', 'triceps'],
          difficulty: 'intermediate'
        },
        {
          user_id: users[4].id,
          name: 'Lower Body Power',
          muscles: ['quads', 'glutes', 'hamstrings', 'calves'],
          difficulty: 'intermediate'
        },
        {
          user_id: users[5].id,
          name: 'Core & Abs Focus',
          muscles: ['abdominals', 'obliques', 'lowerback'],
          difficulty: 'intermediate'
        },
        
        // Advanced workouts
        {
          user_id: users[6].id,
          name: 'Advanced Full Body',
          muscles: ['chest', 'lats', 'quads', 'glutes', 'front-shoulders', 'abdominals'],
          difficulty: 'advanced'
        },
        {
          user_id: users[7].id,
          name: 'Athlete Training',
          muscles: ['traps-middle', 'hamstrings', 'lowerback', 'rear-shoulders'],
          difficulty: 'advanced'
        }
      ];

      let workoutsCreated = 0;
      for (const workout of sampleWorkouts) {
        const workoutExercises = [];
        const bodyParts = [];

        // Select 3-5 exercises for each muscle group in the workout
        for (const muscle of workout.muscles) {
          if (exercisesByMuscle[muscle]) {
            const muscleExercises = exercisesByMuscle[muscle]
              .filter(ex => ex.difficulty === workout.difficulty || 
                          (workout.difficulty === 'advanced' && ex.difficulty === 'intermediate') ||
                          (workout.difficulty === 'intermediate' && ex.difficulty === 'beginner'))
              .slice(0, 2); // Take 2 exercises per muscle group
            
            workoutExercises.push(...muscleExercises);
            if (!bodyParts.includes(muscle)) {
              bodyParts.push(muscle);
            }
          }
        }

        if (workoutExercises.length > 0) {
          // Add some random timestamps to make workouts seem created over time
          const daysAgo = Math.floor(Math.random() * 30) + 1;
          const createdAt = new Date();
          createdAt.setDate(createdAt.getDate() - daysAgo);

          await this.client.query(
            `INSERT INTO saved_workouts (user_id, name, workout_data, body_parts_worked, created_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              workout.user_id,
              workout.name,
              JSON.stringify(workoutExercises),
              bodyParts,
              createdAt
            ]
          );
          workoutsCreated++;
        }
      }
      console.log(`    ✅ Added ${workoutsCreated} sample workouts`);
    } catch (error) {
      console.log('    ⚠️  Error creating sample workouts:', error.message);
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

      // Show age groups
      const ageGroups = await this.client.query(`
        SELECT 
          CASE 
            WHEN age BETWEEN 20 AND 25 THEN '20-25'
            WHEN age BETWEEN 28 AND 33 THEN '28-33'
            WHEN age BETWEEN 38 AND 43 THEN '38-43'
            WHEN age BETWEEN 48 AND 53 THEN '48-53'
            ELSE 'other'
          END as age_group,
          COUNT(*) as users_count
        FROM profiles 
        WHERE gender = 'male' AND age IS NOT NULL
        GROUP BY age_group
        ORDER BY age_group
      `);
      
      console.log('\n    👥 Male users by age group:');
      ageGroups.rows.forEach(group => {
        console.log(`      ${group.age_group}: ${group.users_count} users`);
      });

      // Test triggers
      const triggerTest = await this.client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.triggers 
        WHERE trigger_name IN ('trigger_auto_create_profile', 'trigger_auto_assign_admin')
      `);
      console.log(`    ✅ triggers: ${triggerTest.rows[0].count} active`);

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
      console.log('🚀 Starting Spartacus Database Setup\n');
      
      await this.loadExercisesData();
      await this.connect();
      await this.createDatabase();
      await this.populateData();
      await this.verifySetup();
      
      console.log('\n🎉 Database setup completed successfully!');
      console.log('\n📋 Summary:');
      console.log('   • Database schema created');
      console.log('   • Triggers installed');
      console.log('   • 12 male users in 4 age groups (±5 years)');
      console.log('   • All exercises from exercises.json loaded');
      console.log('   • Sample workouts created');
      console.log('   • Ready for use');
      
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