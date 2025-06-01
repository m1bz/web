const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');
const config = require('./config/config');
const database = require('./database/database');

class Server {
    constructor() {
        this.server = null;
        this.routes = new Map();
        this.setupRoutes();
    }

    setupRoutes() {
        // Static file routes
        this.routes.set('GET /', this.serveFile.bind(this, 'public/index.html'));
        this.routes.set('GET /workout-selection', this.serveFile.bind(this, 'public/workout-selection.html'));
        this.routes.set('GET /exercise-selection', this.serveFile.bind(this, 'public/exercise-selection.html'));
        this.routes.set('GET /my-workouts', this.serveFile.bind(this, 'public/my-workouts.html'));
        this.routes.set('GET /search-results', this.serveFile.bind(this, 'public/search-results.html'));
        
        // API routes
        this.routes.set('GET /api/workouts', this.getWorkouts.bind(this));
        this.routes.set('POST /api/workouts', this.createWorkout.bind(this));
        this.routes.set('GET /api/exercises', this.getExercises.bind(this));
        this.routes.set('POST /api/exercise-logs', this.logExercise.bind(this));
        this.routes.set('GET /api/search', this.searchContent.bind(this));
    }

    async serveFile(filePath, req, res) {
        try {
            const fullPath = path.join(__dirname, filePath);
            const data = await fs.readFile(fullPath);
            
            const ext = path.extname(filePath);
            const contentType = this.getContentType(ext);
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        } catch (error) {
            console.error('Error serving file:', error);
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
        }
    }

    async serveStaticFile(req, res, filePath) {
        try {
            const fullPath = path.join(__dirname, 'public', filePath);
            const data = await fs.readFile(fullPath);
            
            const ext = path.extname(filePath);
            const contentType = this.getContentType(ext);
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        } catch (error) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
        }
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
            '.svg': 'image/svg+xml'
        };
        return types[ext] || 'text/plain';
    }    async getWorkouts(req, res) {
        try {
            if (!database.isConnected) {
                this.sendJSON(res, { 
                    error: 'Database not connected',
                    workouts: [] 
                }, 503);
                return;
            }
            
            const result = await database.query('SELECT * FROM workouts ORDER BY created_at DESC');
            this.sendJSON(res, { workouts: result.rows });
        } catch (error) {
            console.error('Error fetching workouts:', error);
            this.sendJSON(res, { error: 'Failed to fetch workouts' }, 500);
        }
    }

    async createWorkout(req, res) {
        try {
            if (!database.isConnected) {
                this.sendJSON(res, { 
                    error: 'Database not connected' 
                }, 503);
                return;
            }
            
            const body = await this.parseRequestBody(req);
            const { name, type, exercises } = body;
            
            const result = await database.query(
                'INSERT INTO workouts (name, type, exercises) VALUES ($1, $2, $3) RETURNING *',
                [name, type, JSON.stringify(exercises)]
            );
            
            this.sendJSON(res, { workout: result.rows[0] }, 201);
        } catch (error) {
            console.error('Error creating workout:', error);
            this.sendJSON(res, { error: 'Failed to create workout' }, 500);
        }
    }

    async getExercises(req, res) {
        const exercises = [
            { name: 'Push-ups', category: 'push', muscleGroups: ['chest', 'shoulders', 'triceps'] },
            { name: 'Pull-ups', category: 'pull', muscleGroups: ['back', 'biceps'] },
            { name: 'Squats', category: 'legs', muscleGroups: ['quads', 'glutes'] },
            { name: 'Shoulder Press', category: 'push', muscleGroups: ['shoulders', 'triceps'] },
            { name: 'Rows', category: 'pull', muscleGroups: ['back', 'biceps'] },
            { name: 'Lunges', category: 'legs', muscleGroups: ['quads', 'glutes', 'hamstrings'] }
        ];
        
        this.sendJSON(res, { exercises });
    }    async logExercise(req, res) {
        try {
            if (!database.isConnected) {
                this.sendJSON(res, { 
                    error: 'Database not connected' 
                }, 503);
                return;
            }
            
            const body = await this.parseRequestBody(req);
            const { exerciseName, sets, reps, weight } = body;
            
            const result = await database.query(
                'INSERT INTO exercise_logs (exercise_name, sets, reps, weight) VALUES ($1, $2, $3, $4) RETURNING *',
                [exerciseName, sets, reps, weight]
            );
            
            this.sendJSON(res, { log: result.rows[0] }, 201);
        } catch (error) {
            console.error('Error logging exercise:', error);
            this.sendJSON(res, { error: 'Failed to log exercise' }, 500);
        }
    }

    async searchContent(req, res) {
        const urlParts = url.parse(req.url, true);
        const query = urlParts.query.q || '';
        
        const searchResults = [
            'JavaScript Tutorial',
            'HTML Basics',
            'CSS Styling Guide',
            'Web Development Tools',
            'React Framework',
            'Node.js Backend',
            'Database Integration',
            'API Development',
            'Push Workout',
            'Pull Workout',
            'Legs Workout',
            'Strength Training',
            'Cardio Exercises'
        ].filter(item => item.toLowerCase().includes(query.toLowerCase()));
        
        this.sendJSON(res, { results: searchResults });
    }

    async parseRequestBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    sendJSON(res, data, statusCode = 200) {
        res.writeHead(statusCode, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end(JSON.stringify(data));
    }

    async handleRequest(req, res) {
        const method = req.method;
        const urlParts = url.parse(req.url, true);
        const pathname = urlParts.pathname;
        
        // Handle CORS preflight requests
        if (method === 'OPTIONS') {
            res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            res.end();
            return;
        }

        // Check for exact route match
        const routeKey = `${method} ${pathname}`;
        if (this.routes.has(routeKey)) {
            await this.routes.get(routeKey)(req, res);
            return;
        }

        // Handle static files
        if (pathname.startsWith('/')) {
            let filePath = pathname === '/' ? 'index.html' : pathname.substring(1);
            await this.serveStaticFile(req, res, filePath);
            return;
        }

        // 404 Not Found
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }    async start() {
        try {
            // Try to connect to database
            try {
                await database.connect();
                console.log(' Database connected successfully');
            } catch (dbError) {
                console.log('  Database connection failed, but server will continue without database functionality');
                console.log('Database error:', dbError.message);
            }
            
            // Create HTTP server
            this.server = http.createServer(this.handleRequest.bind(this));
            
            // Start listening
            this.server.listen(config.server.port, config.server.host, () => {
                console.log(` Spartacus Fitness Server running at ${config.server.baseUrl}`);
                console.log(` Serving files from: ${path.join(__dirname, 'public')}`);
                console.log(`  Database config: ${config.database.database}`);
                console.log(` Environment: ${config.app.environment}`);
            });
            
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    }

    async stop() {
        if (this.server) {
            this.server.close();
            await database.disconnect();
            console.log('Server stopped');
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Shutting down gracefully...');
    await server.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Shutting down gracefully...');
    await server.stop();
    process.exit(0);
});

// Start the server
const server = new Server();
server.start();
