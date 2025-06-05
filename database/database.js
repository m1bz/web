const { Client } = require('pg');
const config = require('../config/config');

class Database {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 3;
  }

  /* ─────────────────────────────────────────────────────────── */
  async connect() {
    const connectionConfig = config.database.connectionString
      ? { connectionString: config.database.connectionString }
      : {
          host    : config.database.host,
          port    : config.database.port,
          database: config.database.database,
          user    : config.database.user,
          password: config.database.password
        };

    try {
      this.client = new Client(connectionConfig);
      await this.client.connect();
      this.isConnected = true;
      this.connectionRetries = 0;
      console.log(`Connected to PostgreSQL → ${config.database.database}`);
      
      // Set up error handling for connection
      this.client.on('error', (err) => {
        console.error('PostgreSQL client error:', err);
        this.isConnected = false;
        
        // Attempt to reconnect for connection issues
        if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
          this.handleConnectionLoss();
        }
      });
      
      await this.initializeTables();
    } catch (error) {
      console.error('Database connection failed:', error);
      this.isConnected = false;
      
      // Handle specific connection errors
      if (error.code === 'ENOTFOUND') {
        throw new Error(`Database host not found: ${connectionConfig.host || 'localhost'}`);
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Database connection refused. Is PostgreSQL running on port ${connectionConfig.port || 5432}?`);
      }
      if (error.code === '28P01') {
        throw new Error('Database authentication failed. Check username and password.');
      }
      if (error.code === '3D000') {
        throw new Error(`Database "${connectionConfig.database}" does not exist.`);
      }
      
      throw error;
    }
  }

  /* ─────────────────────────────────────────────────────────── */
  async handleConnectionLoss() {
    if (this.connectionRetries >= this.maxRetries) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.connectionRetries++;
    console.log(`Attempting to reconnect... (${this.connectionRetries}/${this.maxRetries})`);
    
    setTimeout(async () => {
      try {
        await this.connect();
        console.log('Successfully reconnected to database');
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, 5000 * this.connectionRetries); // Progressive delay
  }

  /* ─────────────────────────────────────────────────────────── */
  // ...existing code...

async initializeTables() {
  try {
    // First, create the custom type if it doesn't exist
    await this.client.query(`
      DO $$ BEGIN
        CREATE TYPE gender_enum AS ENUM ('male','female','other');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create tables with error handling
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
        
        -- Add constraints for validation
        CONSTRAINT users_username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 50),
        CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
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
        
        -- Add constraints
        CONSTRAINT exercises_name_not_empty CHECK (char_length(trim(name)) > 0),
        CONSTRAINT exercises_equipment_not_empty CHECK (char_length(trim(equipment_type)) > 0),
        CONSTRAINT exercises_instructions_min_length CHECK (char_length(trim(instructions)) >= 10),
        
        -- Unique constraint for exercise names
        CONSTRAINT exercises_name_unique UNIQUE (name)
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

    // Create triggers with error handling
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
        -- Extract domain from email (between @ and . or end of string)
        email_domain := substring(NEW.email from ''@([^.]+)'');
        
        -- Check if email domain matches any admin domains
        FOREACH domain IN ARRAY admin_domains
        LOOP
          IF email_domain = domain THEN
            -- Update user to admin
            UPDATE users 
            SET is_admin = TRUE 
            WHERE id = NEW.id;
            
            RAISE NOTICE ''Admin privileges granted to user % with email %'', NEW.username, NEW.email;
            EXIT; -- Exit loop once match is found
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
    
    console.log('Database tables and triggers initialized successfully');
    
  } catch (error) {
    console.error('Error initializing tables:', error);
    
    // Handle specific initialization errors
    if (error.code === '42P07') {
      console.log('Tables already exist, skipping creation');
    } else if (error.code === '42601') {
      console.error('SQL syntax error in table creation');
      throw new Error('Database schema has syntax errors');
    } else {
      throw error;
    }
  }
}

  async query(text, params) {
    if (!this.isConnected) {
      throw new Error('Database not connected. Please try again later.');
    }
    
    try {
      return await this.client.query(text, params);
    } catch (error) {
      console.error('Database query error:', error);
      
      // Handle connection-related errors
      if (error.code === 'ECONNRESET' || error.code === '57P01') {
        this.isConnected = false;
        this.handleConnectionLoss();
        throw new Error('Database connection lost. Please try again.');
      }
      
      // Re-throw the original error for handling in the calling code
      throw error;
    }
  }

  /* ─────────────────────────────────────────────────────────── */
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.end();
        this.isConnected = false;
        console.log('Disconnected from PostgreSQL');
      } catch (error) {
        console.error('Error during disconnect:', error);
      }
    }
  }
}

module.exports = new Database();