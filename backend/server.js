const http = require('http');
const util = require('util');
const { rssHandler } = require('./rss.js');
const { 
  getUserByEmailAndPassword, 
  insertUser, 
  getAllUsersWithDetails,
  deleteUser
} = require('./routes/UserRoute');
const { authenticate } = require('./middleware/auth');
const { 
  getAllAnimals, 
  getAnimalDetailsById, 
  findBySpecies, 
  createAnimal,
  deleteAnimal,
  getTopAnimalsByCity
} = require('./routes/AnimalRoute');
const fileUtils = require('./utils/fileStorageUtils');
const { 
  sendMessage, 
  getConversation, 
  getConversations, 
  markMessagesAsRead,
  getUnreadCount
} = require('./routes/MessageRoute');
const { adminLogin } = require('./routes/AdminRoute');
const {
  getSubscriptions,
  updateSubscriptions
} = require('./routes/NewsletterRoute');
const nodemailer = require('nodemailer');
require('dotenv').config();
const port = 3000;
const fs = require('fs');
const path = require('path');
const { getConnection } = require('./db');
const { normalizeWithAI } = require('./aiNormalize.js');

const OpenAPIRequestValidator = require('openapi-request-validator').default;
const jsYaml = require('js-yaml');

const openApiDocument = jsYaml.load(fs.readFileSync('./openapi.yaml', 'utf8'));

const validators = {};
Object.keys(openApiDocument.paths).forEach(path => {
  const pathObj = openApiDocument.paths[path];
  validators[path] = {};
  
  Object.keys(pathObj).forEach(method => {
    validators[path][method] = new OpenAPIRequestValidator({
      parameters: pathObj[method].parameters,
      requestBody: pathObj[method].requestBody,
      schemas: openApiDocument.components.schemas
    });
  });
});

// Use in your route handler
function validateRequest(req, pathKey, method) {
  if (validators[pathKey] && validators[pathKey][method]) {
    const errors = validators[pathKey][method].validate({
      headers: req.headers,
      params: {}, 
      query: {}, 
      body: req.body 
    });
    return errors;
  }
  return null;
}

let emailConfigValid = false;
const emailAddress = process.env.EMAIL_ADDRESS;
const emailPassword = process.env.EMAIL_PASSWORD;

async function validateEmailConfig() {
  if (!emailAddress || !emailPassword) {
    console.error('Email configuration missing. Check your .env file for EMAIL_ADDRESS and EMAIL_PASSWORD.');
    return false;
  }

  try {
    console.log(`Testing email connection for ${emailAddress}...`);
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailAddress,
        pass: emailPassword
      }
    });

    await transporter.verify();
    console.log('✅ Email configuration is valid and connected to Gmail successfully!');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    console.error('Newsletter emails will not be sent until this is resolved.');
    return false;
  }
}

function withAuth(handler) {
  return (req, res) => authenticate(req, res, () => handler(req, res));
}

// Get configured multer instance
const upload = fileUtils.configureStorage();


// XSS Protection middleware - sanitize request body
function sanitizeRequestBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    // Recursive function to sanitize strings in an object
    function sanitizeObject(obj) {
      const sanitized = {};
      
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
          sanitized[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitized[key] = sanitizeObject(obj[key]);
        } else {
          sanitized[key] = obj[key];
        }
      });
      
      return sanitized;
    }
    
    // Basic string sanitization
    function sanitizeString(str) {
      return str
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
    
    req.body = sanitizeObject(req.body);
  }
  
  next();
}

// security headers
function addSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: http://localhost:3000 https://maps.gstatic.com https://maps.googleapis.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' http://localhost:3000 https://maps.googleapis.com; font-src 'self' https://fonts.gstatic.com");
  res.setHeader('Referrer-Policy', 'same-origin');
}


const server = http.createServer(async (req, res) => {
  // security headers
  addSecurityHeaders(res);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // User routes
    if (req.method === 'POST' && req.url.startsWith('/users/login')) {
      await getUserByEmailAndPassword(req, res);
      return;
    }

    if (req.method === 'POST' && req.url.startsWith('/users/signup')) {
      await insertUser(req, res);
      return;
    }

    if(req.method ==='POST' && req.url.startsWith('/admin/login')) {
      return adminLogin(req, res);
    }

    if (req.method === 'GET' && req.url.startsWith('/users/all/details')) {
      authenticate(req, res, () => {
        const decodedToken = req.user;
        
        if (!decodedToken.isAdmin) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Access denied. Admin privileges required.' }));
          return;
        }
        
        getAllUsersWithDetails(req, res);
      });
      return; 
    }

    // Add user delete route 
    if (req.method === 'DELETE' && req.url.startsWith('/users/delete')) {
      authenticate(req, res, () => {
        const decodedToken = req.user;
        
        if (!decodedToken.isAdmin) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Access denied. Admin privileges required.' }));
          return;
        }
        
        deleteUser(req, res);
      });
      return;
    }

    // Animal routes
    if(req.method === 'GET' && req.url.startsWith('/animals/all')) {
      return withAuth(getAllAnimals)(req, res);
    } 

    if (req.method === 'POST' && req.url.startsWith('/animals/details')) {
      return withAuth(getAnimalDetailsById)(req, res);
    }

    if (req.method === 'POST' && req.url.startsWith('/animals/species')) {
      return withAuth(findBySpecies)(req, res);
    }

    if (req.method === 'POST' && req.url.startsWith('/animals/create')) {
      return withAuth(createAnimal)(req, res);
    }

    if (req.method === 'DELETE' && req.url.startsWith('/animals/delete')) {
      return withAuth(deleteAnimal)(req, res);
    }

    if (req.method === 'GET' && req.url.startsWith('/animals/top-by-city')) {
      return withAuth(getTopAnimalsByCity)(req, res);
    }
    
    // File upload route
    if (req.method === 'POST' && req.url.startsWith('/upload')) {

      const processUpload = util.promisify((req, res, next) => {
        upload.single('file')(req, res, (err) => {
          if (err) return next(err);
          next();
        });
      });
      
      try {
        await processUpload(req, res);
        
        if (!req.file) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No file uploaded' }));
          return;
        }
        
        // Debug info about the uploaded file
        console.log('Uploaded file details:', {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          filename: req.file.filename,
          path: req.file.path,
          size: req.file.size
        });
        
        // Generate the URL 
        const mediaType = req.body.mediaType || 'photo';
        const fileName = req.file.filename;
        const storagePath = fileUtils.getPublicUrl(mediaType, fileName);
        
   
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true,
          filePath: storagePath
        }));
      } catch (err) {
        console.error('Error handling file upload:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to upload file' }));
      }
      return;
    }

    // Add media pipe route with query parameter support for optimizing mobile requests
    if (req.method === 'GET' && req.url.startsWith('/media/pipe/')) {
      try {
        // Parse the URL to extract ID and query parameters
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathParts = url.pathname.split('/media/pipe/');
        const mediaId = parseInt(pathParts[1]);
        
        if (isNaN(mediaId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid media ID' }));
          return;
        }
        
        // Parse options from query parameters
        const options = {};
        
        if (url.searchParams.has('width')) {
          options.width = url.searchParams.get('width');
        }
        
        const MultiMedia = require('./models/MultiMedia');
        await MultiMedia.pipeMediaStream(mediaId, res, options, req);
        return;
      } catch (err) {
        console.error('Error serving media pipe:', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Media pipe error' }));
        }
        return;
      }
    }

    // Message routes
    if (req.method === 'POST' && req.url.startsWith('/messages/send')) {
      return withAuth(sendMessage)(req, res);
    }

    if (req.method === 'POST' && req.url.startsWith('/messages/conversation')) {
      return withAuth(getConversation)(req, res);
    }

    if (req.method === 'GET' && req.url.startsWith('/messages/conversations')) {
      return withAuth(getConversations)(req, res);
    }

    if (req.method === 'POST' && req.url.startsWith('/messages/read')) {
      return withAuth(markMessagesAsRead)(req, res);
    }

    if(req.method === 'GET' && req.url.startsWith('/messages/unread-count')) {
      return withAuth(getUnreadCount)(req, res);
    }

    // Newsletter routes
    if (req.method === 'GET' && req.url.startsWith('/newsletter/subscriptions')) {
      return withAuth(getSubscriptions)(req, res);
    }

    if (req.method === 'POST' && req.url.startsWith('/newsletter/update')) {
      return withAuth(updateSubscriptions)(req, res);
    }

    // API documentation routes
    if (req.method === 'GET' && req.url.startsWith('/api-docs')) {
      try {
        // Serve Swagger UI files
        if (req.url === '/api-docs' || req.url === '/api-docs/') {
          const html = fs.readFileSync(path.join(__dirname, 'swagger-ui', 'index.html'));
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html);
          return;
        }
        
        // Serve OpenAPI spec
        if (req.url === '/api-docs/openapi.yaml') {
          const yaml = fs.readFileSync(path.join(__dirname, 'openapi.yaml'));
          res.writeHead(200, { 'Content-Type': 'text/yaml' });
          res.end(yaml);
          return;
        }
        
        // Serve other static files for Swagger UI
        const filePath = path.join(__dirname, 'swagger-ui', req.url.replace('/api-docs/', ''));
        if (fs.existsSync(filePath)) {
          const contentType = getContentType(filePath);
          const content = fs.readFileSync(filePath);
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content);
          return;
        }
      } catch (err) {
        console.error('Error serving API docs:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Error serving API documentation' }));
        return;
      }
    }
    // RSS feed route
    if (req.method === 'GET' && req.url === '/rss') {
      return rssHandler(req, res);
    }

    // AI normalization route
    if (req.method === 'POST' && req.url === '/ai/normalize') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const { text, type } = JSON.parse(body);
          
          // Validate input
          if (!text || typeof text !== 'string') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid text parameter' }));
            return;
          }
          
          console.log(`AI normalization request: "${text}" (type: ${type})`);
          
          try {
            const result = await normalizeWithAI(text, type);
            console.log(`AI normalization result: "${result}"`);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ normalized: result }));
          } catch (aiError) {
            console.error('AI normalization error:', aiError);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              error: 'AI normalization failed', 
              details: aiError.message 
            }));
          }
          
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
        }
      });
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

async function checkDatabaseConnection() {
  try {
    console.log('🔍 Checking database connection...');
    const connection = await getConnection();
    
    const result = await connection.execute('SELECT 1 FROM DUAL');
    await connection.close();
    
    if (result.rows && result.rows.length > 0) {
      console.log('✅ Database connection successful');
      return true;
    } else {
      console.error('❌ Database connection test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

async function connectWithRetry(maxRetries = 5, retryDelay = 5000) {
  for (let i = 0; i < maxRetries; i++) {
    console.log(`📡 Connection attempt ${i + 1}/${maxRetries}`);
    
    const isConnected = await checkDatabaseConnection();
    if (isConnected) {
      return true;
    }
    
    if (i < maxRetries - 1) {
      console.log(`⏳ Retrying in ${retryDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  console.error('❌ Failed to connect to database after all retries');
  return false;
}

async function startServer() {
  try {
    console.log('🚀 Starting server initialization...');
    
    const dbConnected = await connectWithRetry();
    if (!dbConnected) {
      console.error('❌ Cannot start server without database connection');
      console.error('Please check your database configuration in .env file:');
      console.error('- USER_DATABASE');
      console.error('- PASSWORD_DATABASE'); 
      console.error('- SERVICE_NAME');
      process.exit(1);
    }

    emailConfigValid = await validateEmailConfig();
    global.emailConfigValid = emailConfigValid;
    
    process.on('SIGINT', async () => {
      console.log('\n⏹️  Shutting down server gracefully...');
      try {
        const connection = await getConnection();
        await connection.close();
        console.log('📡 Database connections closed');
      } catch (error) {
        console.log('⚠️  Database already disconnected');
      }
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n⏹️  Received SIGTERM, shutting down gracefully...');
      try {
        const connection = await getConnection();
        await connection.close();
        console.log('📡 Database connections closed');
      } catch (error) {
        console.log('⚠️  Database already disconnected');
      }
      process.exit(0);
    });
    
    server.listen(port, () => {
      console.log('✅ Server started successfully!');
      console.log(`🌐 Server running on http://localhost:${port}`);
      console.log(`📚 API Documentation: http://localhost:${port}/api-docs`);
      console.log(`📡 Database: Connected`);
      console.log(`📧 Email: ${emailConfigValid ? 'Configured' : 'Not configured'}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

function getContentType(filePath) {
  const extname = String(path.extname(filePath)).toLowerCase();
  switch (extname) {
    case '.html':
      return 'text/html';
    case '.js':
      return 'text/javascript';
    case '.css':
      return 'text/css';
    case '.json':
      return 'application/json';
    case '.yaml':
    case '.yml':
      return 'text/yaml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}