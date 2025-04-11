const jwt = require('jsonwebtoken');
require('dotenv').config();

const secret = process.env.JWT_SECRET || 'your_jwt_secret';

// Function to generate a JWT token for a user
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.USERID, 
      email: user.EMAIL,
      firstName: user.FIRSTNAME,
      lastName: user.LASTNAME,
      phone: user.PHONE,
    },
    secret,
    { expiresIn: '1h' }
  );
};

// Middleware to authenticate requests using JWT
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Authorization header missing' }));
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Token missing' }));
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded; 
    next(); 
  } catch (err) {
    console.error('JWT verification failed:', err);
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid or expired token' }));
  }
};

module.exports = { generateToken, authenticate };