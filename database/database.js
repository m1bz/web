const { Client } = require('pg');
const config = require('../config/config');

class Database {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /* ─────────────────────────────────────────────────────────── */
  async connect() {
    try {
      /* use DATABASE_URL if supplied, otherwise individual params */
      const connectionConfig = config.database.connectionString
        ? { connectionString: config.database.connectionString }
        : {
            host:     config.database.host,
            port:     config.database.port,
            database: config.database.database,
            user:     config.database.user,
            password: config.database.password,
          };

      this.client = new Client(connectionConfig);
      await this.client.connect();
      this.isConnected = true;
      console.log(`Connected to PostgreSQL database: ${config.database.database}`);

      await this.initializeTables();
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  /* ─────────────────────────────────────────────────────────── */
  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.end();
      this.isConnected = false;
      console.log('Disconnected from PostgreSQL database');
    }
  }

  /* ───────────────────────────────────────────────────────────
     Ensure ALL required tables exist.
     Muscles & exercises already existed;  workouts tables are NEW
     ─────────────────────────────────────────────────────────── */
  async initializeTables() {
    try {
      /* -------- muscles -------- */
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS muscles (
          name VARCHAR PRIMARY KEY
        )
      `);

      /* -------- exercises -------- */
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS exercises (
          id               SERIAL PRIMARY KEY,
          name             VARCHAR NOT NULL,
          primary_muscle   VARCHAR NOT NULL REFERENCES muscles(name),
          secondary_muscles TEXT[] NULL,
          difficulty       VARCHAR NOT NULL,
          equipment_type   VARCHAR NOT NULL,
          equipment_subtype VARCHAR,
          instructions     TEXT NOT NULL
        )
      `);

      /* =======================================================
         NEW TABLES FOR GENERATED WORKOUT STORAGE
         (mock user_id for now – ties workouts to users later)
         ======================================================= */

      /* master workouts table */
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS workouts (
          id         SERIAL PRIMARY KEY,
          user_id    INTEGER,
          name       VARCHAR NOT NULL,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

      /* junction table linking workouts ↔ exercises */
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS workout_exercises (
          id          SERIAL PRIMARY KEY,
          workout_id  INTEGER NOT NULL REFERENCES workouts(id)   ON DELETE CASCADE,
          exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
          position    INTEGER NOT NULL DEFAULT 1                 -- order in workout
        )
      `);

      console.log('Database tables initialized successfully');
    } catch (error) {
      console.error('Error initializing database tables:', error);
      throw error;
    }
  }

  /* ─────────────────────────────────────────────────────────── */
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

/* export singleton */
module.exports = new Database();
