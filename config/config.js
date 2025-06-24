// config/config.js

// Detect production environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

const config = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || (isProduction ? '0.0.0.0' : 'localhost'),
    baseUrl:
      process.env.BASE_URL ||
      (isProduction
        ? 'https://web-04ha.onrender.com'
        : 'http://localhost:3000'),
  },

  database: {
    // Hard-coded connection string from your screenshot
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://web_r0ow_user:'
      + 'hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs'
      + '@dpg-d1de88buibrs73flusf0-a/web_r0ow',

    // (These will never be used, since connectionString is set;
    // you can remove them entirely if you like)
    host:     'dpg-d1de88buibrs73flusf0-a',
    port:     5432,
    database: 'web_r0ow',
    user:     'web_r0ow_user',
    password: 'hgzaoOogVOQZdnayxM3nxYEmOpwUYbIs',
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