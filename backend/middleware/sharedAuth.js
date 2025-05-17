const jwt = require('jsonwebtoken');
const http = require('http');
const url = require('url');
require('dotenv').config();

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    this.authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
    
    // Cache for verified tokens to reduce load
    this.tokenCache = new Map();
    
    // Clean cache periodically
    setInterval(() => this.cleanTokenCache(), 600000); // 10 minutes
  }
  
  cleanTokenCache() {
    const now = Date.now();
    for (const [token, data] of this.tokenCache.entries()) {
      if (now > data.expires) {
        this.tokenCache.delete(token);
      }
    }
  }
  
  // Verify token locally
  verifyToken(token) {
    return new Promise((resolve, reject) => {
      // Check cache first
      if (this.tokenCache.has(token)) {
        const cached = this.tokenCache.get(token);
        if (Date.now() < cached.expires) {
          return resolve(cached.user);
        } else {
          this.tokenCache.delete(token);
        }
      }
      
      jwt.verify(token, this.jwtSecret, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          // Cache the result
          const expires = Date.now() + 300000; // 5 minutes
          this.tokenCache.set(token, { user: decoded, expires });
          resolve(decoded);
        }
      });
    });
  }
  
  // Middleware for authentication
  authenticate(req, res, next) {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return;
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token directly or via auth service
    this.verifyToken(token)
      .then(decoded => {
        req.user = decoded;
        next();
      })
      .catch(err => {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid token', details: err.message }));
      });
  }
  
  // Helper for creating an auth middleware
  createAuthMiddleware() {
    return (req, res, next) => this.authenticate(req, res, next);
  }
  
  // Helper for creating an admin auth middleware
  createAdminAuthMiddleware() {
    return (req, res, next) => {
      this.authenticate(req, res, () => {
        if (req.user && req.user.isAdmin) {
          next();
        } else {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Admin access required' }));
        }
      });
    };
  }
}

// Export a singleton instance
const authService = new AuthService();
module.exports = authService;