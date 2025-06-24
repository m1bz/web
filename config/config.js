
// config/config.js

const config = {
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000'
    },
    
    database: {
        host: process.env.DB_HOST || 'dpg-d1de88buibrs73flusf0-a',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'web_r0ow',
        user: process.env.DB_USER || 'web_r0ow_user',
        password: process.env.DB_PASSWORD || 'hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs',
        connectionString: process.env.DATABASE_URL || 'postgresql://web_r0ow_user:hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs@dpg-d1de88buibrs73flusf0-a/web_r0ow'
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
