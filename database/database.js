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

  async connect() {
    // If you have a connectionString (eg. in production), use it with SSL:
    let connectionConfig = {};
    if (config.database.connectionString) {
      connectionConfig = {
        connectionString: config.database.connectionString,
        ssl: config.app.environment === 'production'
             ? { rejectUnauthorized: false }
             : false
      };
    } else {
      // Otherwise, connect locally using individual params:
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

    console.log('🔌 Attempting database connection...');
    console.log(`Environment: ${config.app.environment}`);
    if (connectionConfig.connectionString) {
      console.log(`Using connection string → ${connectionConfig.connectionString.substring(0,50)}…`);
    } else {
      console.log(`Host: ${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}`);
    }
    console.log(`SSL: ${!!connectionConfig.ssl}`);

    try {
      this.client = new Client(connectionConfig);
      await this.client.connect();
      this.isConnected       = true;
      this.connectionRetries = 0;
      console.log(`✅ Connected to PostgreSQL → ${connectionConfig.database}`);

      // On client errors, try to reconnect
      this.client.on('error', err => {
        console.error('PostgreSQL client error:', err);
        this.isConnected = false;
        if (['ECONNRESET','ENOTFOUND'].includes(err.code)) {
          this.handleConnectionLoss();
        }
      });

      // Initialize tables/triggers if missing
      await this.initializeTables();
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.isConnected = false;

      // Give hints on common failure modes
      if (error.code === 'ENOTFOUND') {
        throw new Error(`Database host not found: ${connectionConfig.host}`);
      }
      if (error.code === 'ECONNREFUSED') {
        throw new Error(
          `Connection refused. Is PostgreSQL running on port ${connectionConfig.port}?`
        );
      }
      if (error.code === '28P01') {
        throw new Error('Auth failed. Check DB user/password.');
      }
      if (error.code === '3D000') {
        throw new Error(`Database "${connectionConfig.database}" does not exist.`);
      }
      throw error;
    }
  }

  async handleConnectionLoss() {
    if (this.connectionRetries >= this.maxRetries) {
      console.error('Max reconnection attempts reached');
      return;
    }
    this.connectionRetries++;
    console.log(`🔄 Reconnecting… (${this.connectionRetries}/${this.maxRetries})`);
    setTimeout(() => this.connect(), 2000 * this.connectionRetries);
  }

  async initializeTables() {
    // your CREATE TABLE / TRIGGER SQL here…
    // no changes needed if your setup script already ran
  }

  async query(text, params) {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }
    try {
      return await this.client.query(text, params);
    } catch (err) {
      console.error('Database query error:', err);
      if (['ECONNRESET','57P01'].includes(err.code)) {
        this.isConnected = false;
        this.handleConnectionLoss();
        throw new Error('Lost DB connection; retrying…');
      }
      throw err;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.end();
      this.isConnected = false;
      console.log('🔌 Disconnected from PostgreSQL');
    }
  }
}

module.exports = new Database();
