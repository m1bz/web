const { Client } = require('pg');
const config = require('../config/config');
const DatabaseSetup = require('./update-database');

class DatabaseReset {
  constructor() {
    this.client = null;
  }

  async connect() {
    console.log('🔌 Connecting to PostgreSQL for reset...');
    
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
      console.log('✅ Connected successfully');
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      throw error;
    }
  }

  async dropAllTables() {
    console.log('\n🗑️  Dropping all tables...');
    
    try {
      // Drop tables in correct order (respecting foreign key constraints)
      const tables = [
        'saved_workouts',
        'workout_exercises', 
        'workouts',
        'exercises',
        'muscles',
        'profiles',
        'users'
      ];

      for (const table of tables) {
        await this.client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`    ✅ Dropped ${table}`);
      }

      // Drop custom types
      await this.client.query('DROP TYPE IF EXISTS gender_enum CASCADE');
      console.log('    ✅ Dropped custom types');

      // Drop functions
      await this.client.query('DROP FUNCTION IF EXISTS auto_create_user_profile() CASCADE');
      await this.client.query('DROP FUNCTION IF EXISTS auto_assign_admin_role() CASCADE');
      console.log('    ✅ Dropped functions');

    } catch (error) {
      console.error('❌ Error dropping tables:', error.message);
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
      console.log('🔄 Starting Spartacus Database Reset\n');
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('⚠️  This will DELETE ALL DATA. Continue? (yes/no): ', resolve);
      });
      
      readline.close();

      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Reset cancelled');
        return;
      }

      await this.connect();
      await this.dropAllTables();
      await this.disconnect();
      
      console.log('\n🔄 Recreating database...');
      const setup = new DatabaseSetup();
      await setup.run();
      
    } catch (error) {
      console.error('\n💥 Reset failed:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const reset = new DatabaseReset();
  reset.run();
}

module.exports = DatabaseReset;