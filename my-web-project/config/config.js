

const config = {
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000'
    },
    
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'web',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'admin',
        connectionString: process.env.DATABASE_URL || null
    },
    
    app: {
        name: 'Spartacus Fitness',
        environment: process.env.NODE_ENV || 'development'
    },
    
    static: {
        publicDir: 'public',
        uploadsDir: 'uploads'
    },
    
    security: {
        sessionSecret: process.env.SESSION_SECRET || 'your-super-secret-key-change-this-in-production',
        corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000', 'http://127.0.0.1:3000']
    }
};

module.exports = config;
