const http = require('http');
const url = require('url');
const { initialize, closePool } = require('./db');
const animalRoutes = require('./routes/animalRoutes');
const { authenticateRequest } = require('../middleware/auth');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

// Create the HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  try {
    // Health check endpoint
    if (path === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy' }));
      return;
    }

    // Get all animals
    if ((path === '/api/animals' || path === '/animals/all') && req.method === 'GET') {
      authenticateRequest(req, res, () => animalRoutes.getAllAnimals(req, res));
      return;
    }

    // Get animal details
    if ((path === '/api/animals/details' || path === '/animals/details') && req.method === 'POST') {
      authenticateRequest(req, res, () => animalRoutes.getAnimalDetailsById(req, res));
      return;
    }

    // Find by species
    if ((path === '/api/animals/species' || path === '/animals/species') && req.method === 'POST') {
      authenticateRequest(req, res, () => animalRoutes.findBySpecies(req, res));
      return;
    }

    // Create animal
    if ((path === '/api/animals/create' || path === '/animals/create') && req.method === 'POST') {
      authenticateRequest(req, res, () => animalRoutes.createAnimal(req, res));
      return;
    }

    // Delete animal
    if ((path === '/api/animals/delete' || path === '/animals/delete') && req.method === 'DELETE') {
      authenticateRequest(req, res, () => animalRoutes.deleteAnimal(req, res));
      return;
    }
    
    // Get top animals by city
    if ((path === '/api/animals/top-by-city' || path === '/animals/top-by-city') && req.method === 'GET') {
      authenticateRequest(req, res, () => animalRoutes.getTopAnimalsByCity(req, res));
      return;
    }

    // If no route matches
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));

  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

// Initialize database connection and start the server
async function startServer() {
  try {
    await initialize();
    
    server.listen(PORT, () => {
      console.log(`Animal service running on port ${PORT}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down...');
      await closePool();
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();