// scripts/setup.js

const { Client } = require('pg');
const fs        = require('fs').promises;
const path      = require('path');
const config    = require('../config/config');

class DatabaseSetup {
  constructor() {
    this.client       = null;
    this.exercisesData= null;
  }

  async connect() {
    console.log('🔌 Connecting to PostgreSQL…');

    // Mirror config/config.js logic:
    let opts = {};
    if (config.database.connectionString) {
      opts = {
        connectionString: config.database.connectionString,
        ssl: { rejectUnauthorized: false }
      };
    } else {
      opts = {
        host:     config.database.host,
        port:     config.database.port,
        database: config.database.database,
        user:     config.database.user,
        password: config.database.password,
        ssl:      { rejectUnauthorized: false }
      };
    }

    this.client = new Client(opts);
    await this.client.connect();
    console.log(`✅ Connected → ${opts.database || opts.connectionString}`);
  }

  // …rest of your loadExercisesData(), createTables(), populateData(), etc.…
}

if (require.main === module) {
  new DatabaseSetup().run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = DatabaseSetup;
