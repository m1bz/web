// config/config.js

// Detect production environment
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

// Pull in a DATABASE_URL if Render/Heroku set one
const rawDatabaseUrl = process.env.DATABASE_URL || '';
const connectionString = rawDatabaseUrl.replace(/^DATABASE_URL=/i, '') || undefined;

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || (isProduction ? '0.0.0.0' : 'localhost'),
    baseUrl: process.env.BASE_URL ||
      (isProduction
        ? 'https://your-app-name.onrender.com'
        : 'http://localhost:3000'),
  },

  database: {
    // Use a full URL in production, otherwise fallback to individual params
    connectionString,

    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 5432,
    database: process.env.DB_NAME     || 'web',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
  },

  app: {
    name:        'Spartacus Fitness',
    environment: isProduction ? 'production' : 'development',
  },

  static: {
    publicDir:  'public',
    uploadsDir: 'uploads',
  },

  security: {
    sessionSecret:
      process.env.SESSION_SECRET ||
      'your-super-secret-key-change-this-in-production',
    corsOrigins: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  },
};
