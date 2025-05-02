const http = require('http');
const util = require('util');
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

const server = http.createServer(async (req, res) => {
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

    // Add media pipe route
    if (req.method === 'GET' && req.url.startsWith('/media/pipe/')) {
      try {
        const mediaId = parseInt(req.url.split('/media/pipe/')[1]);
        if (isNaN(mediaId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid media ID' }));
          return;
        }
        
        const MultiMedia = require('./models/MultiMedia');
        await MultiMedia.pipeMediaStream(mediaId, res);
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

async function startServer() {

  emailConfigValid = await validateEmailConfig();

  global.emailConfigValid = emailConfigValid;
  
  server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

startServer();