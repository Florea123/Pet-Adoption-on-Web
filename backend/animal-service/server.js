const http = require('http');
const url = require('url');
const { initialize: initDb, closePool } = require('./db');
const AnimalController = require('./src/controllers/AnimalController');
const HealthCheck = require('../shared/health');
const authService = require('../middleware/sharedAuth');
const serviceClient = require('./utils/serviceClient');

// Parse request body helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON body'));
      }
    });
  });
}

// Initialize health checks
const health = new HealthCheck('animal-service');
health.addDatabaseCheck();
health.addMemoryCheck(300);

// Update these URLs to match your actual service URLs
const mediaServiceUrl = process.env.MULTIMEDIA_SERVICE_URL || 'http://localhost:3004';
const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const messageServiceUrl = process.env.MESSAGE_SERVICE_URL || 'http://localhost:3003';
const newsletterServiceUrl = process.env.NEWSLETTER_SERVICE_URL || 'http://localhost:3005';

// Add dependency checks with correct URLs
health.addDependencyCheck('media-service', mediaServiceUrl);
health.addDependencyCheck('user-service', userServiceUrl);
health.addDependencyCheck('message-service', messageServiceUrl);
health.addDependencyCheck('newsletter-service', newsletterServiceUrl);

// Authentication middleware
const authenticate = authService.createAuthMiddleware();
const authenticateAdmin = authService.createAdminAuthMiddleware();

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  req.query = parsedUrl.query;
  
  try {
    // Health check endpoints
    if (path === '/health') {
      await health.handleHealthRequest(req, res);
      return;
    }
    
    if (path === '/ready') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'READY' }));
      return;
    }
    
    if (path === '/live') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // ----- Animal Routes -----
    
    // Get all animals
    if ((path === '/animals' || path === '/animals/all') && req.method === 'GET') {
      try {
        await new Promise((resolve, reject) => {
          authenticate(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        await AnimalController.getAllAnimals(req, res);
      } catch (err) {
        // Authentication middleware already handled response
      }
      return;
    }
    
    // Get animal details by ID
    if (path.match(/^\/animals\/\d+$/) && req.method === 'GET') {
      try {
        await new Promise((resolve, reject) => {
          authenticate(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        const animalId = path.split('/')[2];
        req.params = { animalId };
        await AnimalController.getAnimalDetailsById(req, res);
      } catch (err) {
        // Authentication middleware already handled response
      }
      return;
    }
    
    // Find animals by species
    if (path.startsWith('/animals/species/') && req.method === 'GET') {
      try {
        await new Promise((resolve, reject) => {
          authenticate(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        const species = path.split('/animals/species/')[1];
        req.params = { species };
        await AnimalController.findBySpecies(req, res);
      } catch (err) {
        // Authentication middleware already handled response
      }
      return;
    }
    
    // Create animal - support both /animals and /animals/create endpoints
    if ((path === '/animals' || path === '/animals/create') && req.method === 'POST') {
      try {
        await new Promise((resolve, reject) => {
          authenticate(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        req.body = await parseBody(req);
        await AnimalController.createAnimal(req, res);
      } catch (err) {
        if (!res.headersSent) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      }
      return;
    }
    
    // Delete animal
    if (path.match(/^\/animals\/\d+$/) && req.method === 'DELETE') {
      try {
        await new Promise((resolve, reject) => {
          authenticate(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        const animalId = parseInt(path.split('/')[2]);
        req.params = { animalId };
        await AnimalController.deleteAnimal(req, res);
      } catch (err) {
        // Authentication middleware already handled response
      }
      return;
    }
    
    // Get top animals by city
    if (path === '/animals/top-by-city' && req.method === 'GET') {
      try {
        await new Promise((resolve, reject) => {
          authenticate(req, res, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        
        await AnimalController.getTopAnimalsByCity(req, res);
      } catch (err) {
        // Authentication middleware already handled response
      }
      return;
    }
    
    // Route not found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route not found' }));
  } catch (err) {
    console.error('Server error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }
});

// Start server
async function startServer() {
  try {
    const dbInitialized = await initDb();
    if (!dbInitialized) {
      console.error('Failed to initialize database, exiting');
      process.exit(1);
    }
    
    const port = process.env.PORT || 3002;
    server.listen(port, () => {
      console.log(`Animal service running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down animal service...');
  await closePool();
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});

startServer();