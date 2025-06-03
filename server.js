// server.js
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');
const config = require('./config/config');
const database = require('./database/database');

class Server {
  constructor() {
    this.server = null;
  }

  getContentType(ext) {
    const types = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };
    return types[ext] || 'text/plain';
  }

  // ─── Serve static files (unchanged) ─────────────────────────────────────────────────
  async serveStatic(req, res) {
    const parsed = url.parse(req.url);
    const filePath = parsed.pathname === '/' ? 'index.html' : parsed.pathname.slice(1);
    const fullPath = path.join(__dirname, 'public', filePath);

    try {
      const data = await fs.readFile(fullPath);
      const ext = path.extname(fullPath);
      const contentType = this.getContentType(ext);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }

  // ─── New: Serve /exercises.json by querying Postgres ─────────────────────────────────
  async serveExercisesFromDb(req, res) {
    try {
      // 1) Fetch all exercises rows
      const result = await database.query(`
        SELECT
          name,
          primary_muscle,
          secondary_muscles,
          difficulty,
          equipment_type,
          equipment_subtype,
          instructions
        FROM exercises
      `);

      
      const rows = result.rows;
      const out = {};

      for (const row of rows) {
        const muscleKey = row.primary_muscle; 
        if (!out[muscleKey]) {
          out[muscleKey] = { exercises: [] };
        }

        out[muscleKey].exercises.push({
          name: row.name,
          primary_muscle: row.primary_muscle,
          secondary_muscles: row.secondary_muscles,
          difficulty: row.difficulty,
          equipment: {
            type: row.equipment_type,
            subtype: row.equipment_subtype
          },
          instructions: row.instructions
        });
      }

      // 3) Send it as JSON
      const body = JSON.stringify(out);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
    } catch (err) {
      console.error('Error querying exercises from DB:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }

  // ─── Main request handler (adjusted) ───────────────────────────────────────────────
  async handleRequest(req, res) {
    // 1) Handle CORS preflight exactly as before
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      return res.end();
    }

    // 2) If client is GET /exercises.json, serve from Postgres
    const parsed = url.parse(req.url);
    if (req.method === 'GET' && parsed.pathname === '/exercises.json') {
      return this.serveExercisesFromDb(req, res);
    }

    // 3) Otherwise, if GET any other path, serve static from /public
    if (req.method === 'GET') {
      return this.serveStatic(req, res);
    }

    // 4) Anything else is 405
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }

  // ─── Server start/stop logic (mostly unchanged) ───────────────────────────────────
  async start() {
    try {
      try {
        await database.connect();
        console.log('Database connected successfully');
      } catch (dbErr) {
        console.log('Database connection failed, but server will continue (no-DB mode)');
        console.log('Database error:', dbErr.message);
      }

      this.server = http.createServer(this.handleRequest.bind(this));
      this.server.listen(config.server.port, config.server.host, () => {
        console.log(`Server running at ${config.server.baseUrl}`);
        console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);
      });
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  }

  async stop() {
    if (this.server) {
      this.server.close();
      console.log('HTTP server stopped');
    }

    try {
      await database.disconnect();
      console.log('Database disconnected');
    } catch (err) {
      console.error('Error during database disconnect:', err);
    }
  }
}

const server = new Server();

process.on('SIGINT', async () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

server.start();
