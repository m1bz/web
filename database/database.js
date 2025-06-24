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
    // Always prefer a full URI if provided, with SSL in production.
    let connectionConfig = {
      connectionString: config.database.connectionString,
      ssl: config.app.environment === 'production'
           ? { rejectUnauthorized: false }
           : false
    };

    // Fallback to individual params if no URI (e.g. local dev)
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

    // Debug info
    console.log('🔌 Attempting database connection...');
    console.log(`Environment: ${config.app.environment}`);
    if (connectionConfig.connectionString) {
      console.log(
        `Raw connection string: ${connectionConfig.connectionString.substring(0, 50)}…`
      );
      try {
        const url = new URL(connectionConfig.connectionString);
        console.log(
          `Connecting to: ${url.hostname}:${url.port || '5432'} database=${url.pathname.slice(1)}`
        );
        console.log(`Username: ${url.username}`);
      } catch (urlErr) {
        console.error(`❌ Invalid connection string format: ${urlErr.message}`);
        console.log(`Connection string was: ${connectionConfig.connectionString}`);
      }
    } else {
      console.log(
        `Connecting to: ${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`
      );
    }
    console.log(`SSL enabled: ${!!connectionConfig.ssl}`);

    try {
      this.client = new Client(connectionConfig);
      await this.client.connect();
      this.isConnected       = true;
      this.connectionRetries = 0;
      console.log(`✅ Connected to PostgreSQL → ${config.database.database}`);

      // Reconnect-on-error logic
      this.client.on('error', (err) => {
        console.error('PostgreSQL client error:', err);
        this.isConnected = false;
        if (['ECONNRESET','ENOTFOUND'].includes(err.code)) {
          this.handleConnectionLoss();
        }
      });

      // Create tables & triggers if missing
      await this.initializeTables();
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      this.isConnected = false;

      // Provide more context on common errors
      if (error.code === 'ENOTFOUND') {
        const hostUsed = connectionConfig.connectionString
          ? new URL(connectionConfig.connectionString).hostname
          : connectionConfig.host;
        throw new Error(`Database host not found: ${hostUsed}`);
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          `Connection refused. Is PostgreSQL running on port ${connectionConfig.port || 5432}?`
        );
      }
      if (error.code === '28P01') {
        throw new Error('Authentication failed. Check username/password.');
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
    console.log(`Reconnecting… (${this.connectionRetries}/${this.maxRetries})`);
    setTimeout(async () => {
      try {
        await this.connect();
        console.log('✅ Reconnected to database');
      } catch (err) {
        console.error('Reconnection failed:', err);
      }
    }, 5000 * this.connectionRetries);
  }

  /* ─────────────────────────────────────────────────────────── */
  async initializeTables() {
    try {
      // (…all your table & trigger creation SQL from before…)
      // I’m omitting for brevity since it’s unchanged.
    } catch (err) {
      console.error('Error initializing tables:', err);
      if (err.code !== '42P07' && err.code !== '42601') throw err;
    }
  }

  /* ─────────────────────────────────────────────────────────── */
  async query(text, params) {
    if (!this.isConnected) {
      throw new Error('Database not connected. Please try again later.');
    }
    try {
      return await this.client.query(text, params);
    } catch (err) {
      console.error('Database query error:', err);
      if (['ECONNRESET','57P01'].includes(err.code)) {
        this.isConnected = false;
        this.handleConnectionLoss();
        throw new Error('Database connection lost. Please try again.');
      }
      throw err;
    }
  }

  /* ─────────────────────────────────────────────────────────── */
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.end();
        this.isConnected = false;
        console.log('Disconnected from PostgreSQL');
      } catch (err) {
        console.error('Error during disconnect:', err);
      }
    }
  }
}

module.exports = new Database();