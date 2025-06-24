// config/config.js

// Detect production environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

// Load & sanitize the raw DATABASE_URL (in case it accidentally
// includes the literal "DATABASE_URL=" prefix)
const rawDatabaseUrl = process.env.DATABASE_URL || '';
const connectionString = rawDatabaseUrl.replace(/^DATABASE_URL=/i, '');

const config = {
  server: {
    port: process.env.PORT || 3000,
    host:
      process.env.HOST ||
      (isProduction ? '0.0.0.0' : 'localhost'),
    baseUrl:
      process.env.BASE_URL ||
      (isProduction
        ? 'https://your-app-name.onrender.com'
        : 'http://localhost:3000'),
  },

  database: {
    // In production Render will inject DATABASE_URL;
    // we’ve stripped any "DATABASE_URL=" prefix above.
    connectionString: connectionString || undefined,

    // Local/dev overrides (only used if connectionString is empty)
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
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

module.exports = config;