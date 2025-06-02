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

  async handleRequest(req, res) {
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      return res.end();
    }

    if (req.method === 'GET') {
      return this.serveStatic(req, res);
    }

    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }

  async start() {
    try {
      try {
        await database.connect();
        console.log('Database connected successfully');
      } catch (dbErr) {
        console.log('Database connection failed, but server will continue without DB-dependent features');
        console.log('Database error:', dbErr.message);
      }

      this.server = http.createServer(this.handleRequest.bind(this));
      this.server.listen(config.server.port, config.server.host, () => {
        console.log(`Server running at ${config.server.baseUrl}`);
        console.log(`Serving files from: ${path.join(__dirname, 'public')}`);
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
