const http = require('http');
const url = require('url');
const { initialize, closePool } = require('./db');
const userRoutes = require('./routes/userRoutes');
const { authenticateRequest } = require('../middleware/auth');

const PORT = process.env.PORT || 3000;

// Create the server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Internal-Request, X-Service-Name');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // Use the OLD server paths
    
    // Health check
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy' }));
      return;
    }
    
    // User authentication (login)
    if (req.method === 'POST' && req.url.startsWith('/users/login')) {
      await userRoutes.getUserByEmailAndPassword(req, res);
      return;
    }
    
    // User registration (signup)
    if (req.method === 'POST' && req.url.startsWith('/users/signup')) {
      await userRoutes.insertUser(req, res);
      return;
    }
    
    // Get all users with details (admin endpoint)
    if (req.method === 'GET' && req.url.startsWith('/users/all/details')) {
      authenticateRequest(req, res, () => {
        userRoutes.getAllUsersWithDetails(req, res);
      });
      return;
    }
    
    // Delete user
    if (req.method === 'DELETE' && req.url.startsWith('/users/delete')) {
      authenticateRequest(req, res, () => {
        userRoutes.deleteUser(req, res);
      });
      return;
    }

    // Handle 404 for unmatched routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

// Initialize database and start the server
async function startServer() {
  try {
    await initialize();
    
    server.listen(PORT, () => {
      console.log(`User service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await closePool();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});