
// config/config.js

// Detect production environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

const config = {
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || (isProduction ? '0.0.0.0' : 'localhost'),
        baseUrl: process.env.BASE_URL || (isProduction ? 'https://web-04ha.onrender.com' : 'http://localhost:3000')
    },    database: {        // In production, prefer DATABASE_URL connection string
        connectionString: process.env.DATABASE_URL || (isProduction ? null : 'postgresql://web_r0ow_user:hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs@dpg-d1de88buibrs73flusf0-a.oregon-postgres.render.com/web_r0ow'),
        
        // Fallback individual parameters (only used if connectionString is not available)
        host: process.env.DB_HOST || 'dpg-d1de88buibrs73flusf0-a.oregon-postgres.render.com',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'web_r0ow',
        user: process.env.DB_USER || 'web_r0ow_user',
        password: process.env.DB_PASSWORD || 'hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs'
    },
    
    app: {
        name: 'Spartacus Fitness',
        environment: isProduction ? 'production' : 'development'
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
