// database/database.js

const { Client } = require('pg');
const config       = require('../config/config');

class Database {
  constructor() {
    this.client            = null;
    this.isConnected       = false;
    this.connectionRetries = 0;
    this.maxRetries        = 3;
  }

  /* ─────────────────────────────────────────────────────────── */
  async connect() {
    // Preferred: use full DATABASE_URL in prod (with SSL), fallback to parts in dev
    let connectionConfig = {
      connectionString: config.database.connectionString,
      ssl: config.app.environment === 'production'
           ? { rejectUnauthorized: false }
           : false
    };

    if (!connectionConfig.connectionString) {
      connectionConfig = {
        host:     config.database.host,
        port:     config.database.port,
        database: config.database.database,
        user:     config.database.user,
        password: config.database.password,
        ssl:      config.app.environment === 'production'
                  ? { rejectUnauthorized: false }
                  : false
      };
    }

    // Debug logging
    console.log('🔌 Attempting database connection...');
    console.log(`Environment: ${config.app.environment}`);

    if (connectionConfig.connectionString) {
      console.log(
        `Raw connection string: ${connectionConfig.connectionString.substring(
          0,
          50
        )}...`
      );
      try {
        const url = new URL(connectionConfig.connectionString);
        console.log(
          `Using connection string to: ${url.hostname}:${url.port}/${url.pathname.substring(
            1
          )}`
        );
        console.log(`Username: ${url.username}`);
        console.log(`Port: ${url.port || 'default'}`);
      } catch (urlError) {
        console.error(`❌ Invalid connection string format: ${urlError.message}`);
        console.log(`Connection string: ${connectionConfig.connectionString}`);
      }
    } else {
      console.log(
        `Using individual params to: ${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`
      );
    }

    console.log(`SSL enabled: ${!!connectionConfig.ssl}`);

    try {
      this.client        = new Client(connectionConfig);
      await this.client.connect();
      this.isConnected   = true;
      this.connectionRetries = 0;
      console.log(`✅ Connected to PostgreSQL → ${config.database.database}`);

      // Setup error handler
      this.client.on('error', (err) => {
        console.error('PostgreSQL client error:', err);
        this.isConnected = false;
        if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
          this.handleConnectionLoss();
        }
      });

      // Initialize schema
      await this.initializeTables();
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      this.isConnected = false;

      // Specific errors
      if (error.code === 'ENOTFOUND') {
        const hostUsed = connectionConfig.connectionString
          ? new URL(connectionConfig.connectionString).hostname
          : connectionConfig.host;
        throw new Error(
          `Database host not found: ${hostUsed}. Check your DATABASE_URL environment variable.`
        );
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          `Database connection refused. Is PostgreSQL running on port ${
            connectionConfig.port || 5432
          }?`
        );
      }
      if (error.code === '28P01') {
        throw new Error('Database authentication failed. Check username and password.');
      }
      if (error.code === '3D000') {
        throw new Error(
          `Database "${connectionConfig.database}" does not exist.`
        );
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
    console.log(
      `Attempting to reconnect... (${this.connectionRetries}/${this.maxRetries})`
    );

    setTimeout(async () => {
      try {
        await this.connect();
        console.log('Successfully reconnected to database');
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, 5000 * this.connectionRetries);
  }

  /* ─────────────────────────────────────────────────────────── */
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

      // Create tables with IF NOT EXISTS
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

        /* ---------------- exercise_media ---------------- */
        CREATE TABLE IF NOT EXISTS exercise_media (
          id            SERIAL PRIMARY KEY,
          exercise_id   INT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
          media_type    VARCHAR(10) NOT NULL CHECK (media_type IN ('image','video')),
          media_path    TEXT NOT NULL,
          uploaded_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        /* ---------------- workouts ---------------- */
        CREATE TABLE IF NOT EXISTS workouts (
          id         SERIAL PRIMARY KEY,
          user_id    INT REFERENCES users(id) ON DELETE CASCADE,
          name       VARCHAR NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT workouts_name_not_empty CHECK (char_length(trim(name)) > 0)
        );

        CREATE TABLE IF NOT EXISTS workout_exercises (
          id          SERIAL PRIMARY KEY,
          workout_id  INT REFERENCES workouts(id) ON DELETE CASCADE,
          exercise_id INT REFERENCES exercises(id) ON DELETE CASCADE,
          position    INT NOT NULL DEFAULT 1 CHECK (position > 0)
        );

        /* ---------------- saved_workouts ---------------- */
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

      // Triggers
      await this.client.query(`
        -- Auto-create profile
        CREATE OR REPLACE FUNCTION auto_create_user_profile()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO profiles (user_id, gender, age, weight, height)
          VALUES (NEW.id, NULL, NULL, NULL, NULL);
          RETURN NEW;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Failed to auto-create profile for user %: %', NEW.id, SQLERRM;
          RETURN NEW;
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
          domain TEXT;
        BEGIN
          email_domain := substring(NEW.email from '@([^.]+)');
          FOREACH domain IN ARRAY admin_domains LOOP
            IF email_domain = domain THEN
              UPDATE users SET is_admin = TRUE WHERE id = NEW.id;
              RAISE NOTICE 'Admin privileges granted to user % with email %', NEW.username, NEW.email;
              EXIT;
            END IF;
          END LOOP;
          RETURN NEW;
        EXCEPTION WHEN OTHERS THEN
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

      console.log('Database tables and triggers initialized successfully');
    } catch (error) {
      console.error('Error initializing tables:', error);
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

  /* ─────────────────────────────────────────────────────────── */
  async query(text, params) {
    if (!this.isConnected) {
      throw new Error('Database not connected. Please try again later.');
    }
    try {
      return await this.client.query(text, params);
    } catch (error) {
      console.error('Database query error:', error);
      if (error.code === 'ECONNRESET' || error.code === '57P01') {
        this.isConnected = false;
        this.handleConnectionLoss();
        throw new Error('Database connection lost. Please try again.');
      }
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