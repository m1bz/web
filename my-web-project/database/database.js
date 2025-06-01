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
    }

    async initializeTables() {
        try {
            // Create users table
            await this.client.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create workouts table
            await this.client.query(`
                CREATE TABLE IF NOT EXISTS workouts (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    name VARCHAR(100) NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    exercises JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Create exercise_logs table
            await this.client.query(`
                CREATE TABLE IF NOT EXISTS exercise_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    workout_id INTEGER REFERENCES workouts(id),
                    exercise_name VARCHAR(100) NOT NULL,
                    sets INTEGER,
                    reps INTEGER,
                    weight DECIMAL(5,2),
                    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
