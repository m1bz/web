```javascript
class DatabaseSetup {
  // ...existing code...

  async populateData() {
    console.log('\n🌱 Populating database with initial data (preserving existing data)...');

    try {
      // Check if we should populate or skip
      const shouldPopulate = await this.checkIfPopulationNeeded();
      
      if (shouldPopulate.muscles) {
        await this.populateMuscles();
      } else {
        console.log('  ⏭️  Muscles table already populated, preserving existing data');
      }

      if (shouldPopulate.exercises) {
        await this.populateExercises();
      } else {
        console.log('  ⏭️  Exercises table already populated, preserving existing data');
      }

      if (shouldPopulate.users) {
        await this.populateUsers();
      } else {
        console.log('  ⏭️  Users table already populated, preserving existing data');
      }

      if (shouldPopulate.workouts) {
        await this.populateWorkouts();
      } else {
        console.log('  ⏭️  Workouts table already populated, preserving existing data');
      }

      console.log('✅ Database population completed (existing data preserved)');
    } catch (error) {
      console.error('❌ Error populating data:', error.message);
      throw error;
    }
  }

  async checkIfPopulationNeeded() {
    console.log('  🔍 Checking which tables need initial data...');

    const checks = {
      muscles: false,
      exercises: false,
      users: false,
      workouts: false
    };

    try {
      // Check muscles
      const musclesResult = await this.client.query('SELECT COUNT(*) FROM muscles');
      const muscleCount = parseInt(musclesResult.rows[0].count);
      checks.muscles = muscleCount === 0;
      console.log(`    Muscles: ${muscleCount} found, ${checks.muscles ? 'will populate' : 'will skip'}`);

      // Check exercises
      const exercisesResult = await this.client.query('SELECT COUNT(*) FROM exercises');
      const exerciseCount = parseInt(exercisesResult.rows[0].count);
      checks.exercises = exerciseCount === 0;
      console.log(`    Exercises: ${exerciseCount} found, ${checks.exercises ? 'will populate' : 'will skip'}`);

      // Check users (excluding admin to allow re-adding if missing)
      const usersResult = await this.client.query(`SELECT COUNT(*) FROM users WHERE email != 'admin@admin.com'`);
      const userCount = parseInt(usersResult.rows[0].count);
      checks.users = userCount === 0;
      console.log(`    Users: ${userCount} found, ${checks.users ? 'will populate' : 'will skip'}`);

      // Check workouts
      const workoutsResult = await this.client.query('SELECT COUNT(*) FROM saved_workouts');
      const workoutCount = parseInt(workoutsResult.rows[0].count);
      checks.workouts = workoutCount === 0;
      console.log(`    Workouts: ${workoutCount} found, ${checks.workouts ? 'will populate' : 'will skip'}`);

      // Always ensure admin user exists
      const adminResult = await this.client.query(`SELECT COUNT(*) FROM users WHERE email = 'admin@admin.com'`);
      const adminCount = parseInt(adminResult.rows[0].count);
      if (adminCount === 0) {
        console.log('    Admin user missing, will create');
        await this.createAdminUser();
      } else {
        console.log('    Admin user exists, preserving');
      }

    } catch (error) {
      console.log('    ⚠️  Error checking tables, will attempt to populate:', error.message);
      // Default to populating if we can't check
      checks.muscles = true;
      checks.exercises = true;
      checks.users = true;
      checks.workouts = true;
    }

    return checks;
  }

  async createAdminUser() {
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
        console.log('    ✅ Admin user created successfully');
      }
    } catch (error) {
      console.log(`    ⚠️  Error creating admin user: ${error.message}`);
    }
  }

  // ...existing code...

  async verifySetup() {
    console.log('\n🔍 Verifying database setup...');

    try {
      const tables = ['users', 'profiles', 'muscles', 'exercises', 'workouts', 'workout_exercises', 'saved_workouts', 'exercise_media'];

      for (const table of tables) {
        const result = await this.client.query(
          `SELECT COUNT(*) as count FROM ${table}`
        );
        const count = result.rows[0].count;
        console.log(`    ✅ ${table}: ${count} records`);
      }

      // Check for custom exercise media
      const mediaResult = await this.client.query(`
        SELECT COUNT(*) as count FROM exercise_media
      `);
      const mediaCount = parseInt(mediaResult.rows[0].count);
      if (mediaCount > 0) {
        console.log(`    🎬 Custom exercise media preserved: ${mediaCount} files`);
      }

      // Check for custom exercises
      const customExercisesResult = await this.client.query(`
        SELECT COUNT(*) as count FROM exercises 
        WHERE name NOT IN (
          SELECT DISTINCT jsonb_array_elements_text(
            jsonb_path_query_array($1, '$.*[*].exercises[*].name')
          )
        )
      `, [JSON.stringify(this.exercisesData)]);
      
      const customExerciseCount = parseInt(customExercisesResult.rows[0].count);
      if (customExerciseCount > 0) {
        console.log(`    💪 Custom exercises preserved: ${customExerciseCount} exercises`);
      }

      // ...existing verification code...

    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      throw error;
    }
  }

  // ...existing code...

  async run() {
    try {
      console.log('🚀 Starting Database Setup (Preserving Existing Data)\n');

      await this.loadExercisesData();
      await this.connect();
      await this.createTables();
      await this.populateData();
      await this.verifySetup();

      console.log('\n🎉 Database setup completed successfully!');
      console.log('\n📋 Summary:');
      console.log('   • All tables created/verified');
      console.log('   • Existing data preserved (exercises, media, users, workouts)');
      console.log('   • New data only added where tables were empty');
      console.log('   • Your uploaded videos and custom exercises are safe');
      console.log('   • Admin user ensured to exist');

    } catch (error) {
      console.error('\n💥 Setup failed:', error.message);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// ...existing code...
```