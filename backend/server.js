const http = require('http');
const https = require('https');
const url = require('url');
// Replace the auth import with the shared auth service
const authService = require('./middleware/sharedAuth');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Service endpoints configuration
const serviceRoutes = {
  '/users': process.env.USER_SERVICE_URL || 'http://localhost:3001',
  '/animals': process.env.ANIMAL_SERVICE_URL || 'http://localhost:3002',
  '/messages': process.env.MESSAGE_SERVICE_URL || 'http://localhost:3003',
  '/media': process.env.MULTIMEDIA_SERVICE_URL || 'http://localhost:3004',
  '/newsletter': process.env.NEWSLETTER_SERVICE_URL || 'http://localhost:3005'
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/users/login',
  '/users/signup',
  '/admin/login',
  '/api-docs'
];

// Create the authenticate middleware function from the auth service
const authenticate = authService.createAuthMiddleware();

// Proxy function to forward requests to microservices
function proxyRequest(req, res, targetUrl) {
  const parsedUrl = url.parse(req.url);
  const options = url.parse(targetUrl + parsedUrl.path);
  
  options.method = req.method;
  options.headers = req.headers;
  
  const proxyReq = (options.protocol === 'https:' ? https : http).request(options, (proxyRes) => {
    // Copy status code
    res.statusCode = proxyRes.statusCode;
    
    // Copy headers
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Pipe response body
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Service Unavailable', details: err.message }));
    }
  });
  
  // Pipe request body to target service
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

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
  
  // Parse the URL
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  try {
    // API documentation routes
    if (path.startsWith('/api-docs')) {
      if (path === '/api-docs' || path === '/api-docs/') {
        const html = fs.readFileSync(path.join(__dirname, 'swagger-ui', 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
      }
      
      // Handle other swagger UI resources
      return;
    }
    
    // Check if route requires authentication
    const isPublicRoute = PUBLIC_ROUTES.some(route => path.startsWith(route));
    
    if (!isPublicRoute) {
      // Use Promise wrapper for the authentication middleware
      await new Promise((resolve, reject) => {
        authenticate(req, res, (err) => {
          if (err) reject(err);
          else resolve();
        });
      }).catch(() => {
        // Authentication failed and response already sent by authenticate middleware
        return;
      });
      
      // If we're here, authentication passed
      if (req.user) {
        // Pass user info in headers to downstream services
        req.headers['x-user-id'] = req.user.id;
        req.headers['x-user-role'] = req.user.isAdmin ? 'admin' : 'user';
      }
    }
    
    // Determine target service
    let targetService = null;
    for (const [route, serviceUrl] of Object.entries(serviceRoutes)) {
      if (path.startsWith(route)) {
        targetService = serviceUrl;
        break;
      }
    }
    
    if (targetService) {
      console.log(`Proxying request to ${targetService}${req.url}`);
      proxyRequest(req, res, targetService);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found' }));
    }
  } catch (err) {
    console.error('Server error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`API Gateway running on http://localhost:${port}`);
});