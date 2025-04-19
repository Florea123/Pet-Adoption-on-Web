const http = require('http');
const fs = require('fs');
const path = require('path');
const multer = require('multer'); 
const util = require('util');
const { getUserByEmailAndPassword, insertUser } = require('./routes/UserRoute');
const { authenticate } = require('./middleware/auth');
const { 
  getAllAnimals, 
  getAnimalDetailsById, 
  findBySpecies, 
  createAnimal,
  deleteAnimal 
} = require('./routes/AnimalRoute');

const port = 3000;

function withAuth(handler) {
  return (req, res) => authenticate(req, res, () => handler(req, res));
}

// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const mediaType = req.body.mediaType || 'photo';
    const dir = path.join(__dirname, '..', 'server', mediaType);
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Use the filename provided in the request or generate a unique filename
    const fileName = req.body.fileName || `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, fileName);
  }
});

const upload = multer({ storage: storage });

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

    // Animal routes
    if(req.method === 'GET' && req.url.startsWith('/animals/all')) {
      return withAuth(getAllAnimals)(req, res);
    } 

    if (req.method === 'POST' && req.url.startsWith('/animals/details')) {
      return withAuth(getAnimalDetailsById)(req, res);
      return;
    }

    if (req.method === 'POST' && req.url.startsWith('/animals/species')) {
      return withAuth(findBySpecies)(req, res);
      return;
    }

    if (req.method === 'POST' && req.url.startsWith('/animals/create')) {
      return withAuth(createAnimal)(req, res);
    }

    if (req.method === 'DELETE' && req.url.startsWith('/animals/delete')) {
      return withAuth(deleteAnimal)(req, res);
    }

    // File upload route
    if (req.method === 'POST' && req.url.startsWith('/upload')) {
      // Use multer middleware through a wrapper for our http server
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
        
        // Return the file path that was saved
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true,
          filePath: `/server/${req.body.mediaType}/${req.file.filename}` 
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
        // The response is handled within the pipeMediaStream method
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

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});