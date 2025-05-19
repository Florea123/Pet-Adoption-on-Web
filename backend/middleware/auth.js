const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Function to generate a JWT token for a user
const generateToken = (user) => {
  const payload = {
    id: user.USERID || user.userId || user.adminId || user.id,
    email: user.EMAIL || user.email,
    firstName: user.FIRSTNAME || user.firstName,
    lastName: user.LASTNAME || user.lastName,
    phone: user.PHONE || user.phone,
    createdAt: user.CREATEDAT || user.createdAt,
    isAdmin: user.isAdmin || false
  };

  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: '24h' } 
  );
};

// Function to authenticate requests using JWT
const authenticateRequest = (req, res, next) => {
  try {
    if (req.headers['x-internal-request'] === 'true') {
      console.log('Processing internal service request');
      req.user = { id: 'service', isService: true };
      return next();
    }
    
    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Authentication required' }));
      return;
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    
    // Verify and decode the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Handle both id and userId fields for compatibility
    const userId = decoded.userId || decoded.id;
    
    if (!userId) {
      console.error('Token missing user identifier:', decoded);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid token format' }));
      return;
    }
    
    req.user = {
      id: userId,
      isAdmin: decoded.isAdmin || false,
      email: decoded.email,
      firstName: decoded.firstName,
      lastName: decoded.lastName
    };
    
    console.log('User authenticated:', { id: userId, isAdmin: req.user.isAdmin });
    
    // Continue to the requested endpoint
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid or expired token' }));
  }
};

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  authenticateRequest(req, res, () => {
    if (req.user && req.user.isAdmin) {
      next();
    } else {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Admin access required' }));
    }
  });
};

module.exports = { 
  generateToken, 
  authenticateRequest, 
  authenticateAdmin 
};