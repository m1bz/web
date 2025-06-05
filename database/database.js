
// database/database.js

const { Client } = require('pg');
const config     = require('../config/config');

class Database {
  constructor() {
    this.client = null;
    this.isConnected = false;
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

    this.client = new Client(connectionConfig);
    await this.client.connect();
    this.isConnected = true;
    console.log(`Connected to PostgreSQL → ${config.database.database}`);
    await this.initializeTables();
  }

  /* ─────────────────────────────────────────────────────────── */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.end();
      this.isConnected = false;
      console.log('Disconnected from PostgreSQL');
    }
  }

  /* ───────────────────────────────────────────────────────────
     Ensure ALL required tables exist
     ─────────────────────────────────────────────────────────── */
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

      // Then create all tables
      await this.client.query(`
        /* ---------------- users ---------------- */
        CREATE TABLE IF NOT EXISTS users (
          id            SERIAL PRIMARY KEY,
          username      VARCHAR(255)       NOT NULL,
          email         VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255)       NOT NULL,
          created_at    TIMESTAMPTZ        DEFAULT CURRENT_TIMESTAMP,
          last_login    TIMESTAMPTZ,
          is_admin      BOOLEAN            DEFAULT FALSE,
          is_logged_in  BOOLEAN            DEFAULT FALSE
        );

        /* ---------------- profiles ---------------- */
        CREATE TABLE IF NOT EXISTS profiles (
          id        SERIAL PRIMARY KEY,
          user_id   INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          gender    gender_enum,
          age       INT    CHECK (age BETWEEN 5 AND 120),
          weight    FLOAT  CHECK (weight > 0),
          height    FLOAT  CHECK (height > 0)
        );

        /* ---------------- muscles ---------------- */
        CREATE TABLE IF NOT EXISTS muscles (
          name VARCHAR PRIMARY KEY
        );

        /* ---------------- exercises ---------------- */
        CREATE TABLE IF NOT EXISTS exercises (
          id               SERIAL PRIMARY KEY,
          name             VARCHAR NOT NULL,
          primary_muscle   VARCHAR NOT NULL REFERENCES muscles(name),
          secondary_muscles TEXT[],
          difficulty       VARCHAR NOT NULL,
          equipment_type   VARCHAR NOT NULL,
          equipment_subtype VARCHAR,
          instructions     TEXT NOT NULL
        );

        /* ---------------- workouts / workout_exercises ---------------- */
        CREATE TABLE IF NOT EXISTS workouts (
          id         SERIAL PRIMARY KEY,
          user_id    INT REFERENCES users(id) ON DELETE CASCADE,
          name       VARCHAR NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS workout_exercises (
          id          SERIAL PRIMARY KEY,
          workout_id  INT REFERENCES workouts(id)   ON DELETE CASCADE,
          exercise_id INT REFERENCES exercises(id)  ON DELETE CASCADE,
          position    INT NOT NULL DEFAULT 1
        );

        /* ---------------- saved_workouts (JSON snapshot, plus viz) ----- */
        CREATE TABLE IF NOT EXISTS saved_workouts (
          id               SERIAL PRIMARY KEY,
          user_id          INT REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR NOT NULL,
          workout_data     JSONB       NOT NULL,
          created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          body_parts_worked VARCHAR[]
        );      `);

      // Create auto-profile creation trigger function and trigger
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
        ' LANGUAGE plpgsql;        DROP TRIGGER IF EXISTS trigger_auto_create_profile ON users;
        CREATE TRIGGER trigger_auto_create_profile
          AFTER INSERT ON users
          FOR EACH ROW
          EXECUTE FUNCTION auto_create_user_profile();

        /* ---------------- Auto-assign admin role trigger ---------------- */        CREATE OR REPLACE FUNCTION auto_assign_admin_role()
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
    } catch (error) {
      console.error('Error initializing tables:', error);
      throw error;
    }
  }

  async query(text, params) {
    if (!this.isConnected) throw new Error('Database not connected');
    try {
      return await this.client.query(text, params);
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
}

module.exports = new Database();