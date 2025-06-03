const { Client } = require('pg');
const config = require('../config/config');

class Database {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            // Use connection string if provided, otherwise use individual parameters
            const connectionConfig = config.database.connectionString 
                ? { connectionString: config.database.connectionString }
                : {
                    host: config.database.host,
                    port: config.database.port,
                    database: config.database.database,
                    user: config.database.user,
                    password: config.database.password
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

    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.end();
            this.isConnected = false;
            console.log('Disconnected from PostgreSQL database');
        }
    }    async initializeTables() {
        try {
            

            // Create muscles table
            await this.client.query(`
                CREATE TABLE IF NOT EXISTS muscles (
                  name VARCHAR PRIMARY KEY
                )
            `);

            // Create exercises table
            await this.client.query(`
                CREATE TABLE IF NOT EXISTS exercises (
                  id SERIAL PRIMARY KEY,
                  name VARCHAR NOT NULL,
                  primary_muscle VARCHAR NOT NULL REFERENCES muscles(name),
                  secondary_muscles TEXT[] NULL, 
                  difficulty VARCHAR NOT NULL,
                  equipment_type VARCHAR NOT NULL,
                  equipment_subtype VARCHAR,
                  instructions TEXT NOT NULL
                )
            `);

            console.log('Database tables initialized successfully');
        } catch (error) {
            console.error('Error initializing database tables:', error);
            throw error;
        }
    }

    async query(text, params) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        try {
            const result = await this.client.query(text, params);
            return result;
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }
}

// Create a single instance to be shared across the application
const database = new Database();

module.exports = database;
