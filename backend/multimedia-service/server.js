const http = require('http');
const url = require('url');
const { initialize, closePool } = require('./db');
const multimediaRoutes = require('./routes/multimediaRoutes');
const { authenticateRequest } = require('../middleware/auth');
require('dotenv').config();

const PORT = process.env.PORT || 3002;

// Request tracking map to debounce API calls
const mediaRequestTracker = new Map();
const REQUEST_COOLDOWN = 2000; 
const MEDIA_CACHE_TTL = 60 * 60; // 1 hour in seconds


function shouldProcessMediaRequest(pipePath, isInternal) {
  // Generate a key based on the path and request type
  const requestKey = `${pipePath}:${isInternal ? 'internal' : 'external'}`;
  const now = Date.now();
  
  if (mediaRequestTracker.has(requestKey)) {
    const lastRequest = mediaRequestTracker.get(requestKey);
    
    // Too many identical requests in quick succession
    if (now - lastRequest < REQUEST_COOLDOWN) {
      console.log(`[DEBOUNCED] Throttling duplicate request for ${requestKey}`);
      return false;
    }
  }
  
  mediaRequestTracker.set(requestKey, now);
  
  // Cleanup old entries periodically
  if (mediaRequestTracker.size > 100) {
    const cutoffTime = now - (REQUEST_COOLDOWN * 2);
    for (const [key, timestamp] of mediaRequestTracker.entries()) {
      if (timestamp < cutoffTime) {
        mediaRequestTracker.delete(key);
      }
    }
  }
  
  return true;
}

// Create the HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Internal-Request, X-Service-Name');
  
  // Add strong caching headers for all responses to reduce reload loops
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600'); // 1 hour 
  res.setHeader('Surrogate-Control', 'max-age=86400');  // 1 day for CDNs if used

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse URL properly
  const parsedUrl = url.parse(req.url, true);
  const pathSegments = parsedUrl.pathname.split('/').filter(segment => segment);
  console.log(`Processing request: ${req.method} ${parsedUrl.pathname}`);
  console.log(`Path segments:`, pathSegments);
  
  try {
    // Health check endpoint
    if (parsedUrl.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy' }));
      return;
    }

    let startIndex = pathSegments[0] === 'api' ? 1 : 0;

    // Handle all multimedia routes
    if (pathSegments.length > startIndex && pathSegments[startIndex] === 'multimedia') {
      
      // GET /api/multimedia/animal/{id}
      if (req.method === 'GET' && 
          pathSegments.length > startIndex + 2 && 
          pathSegments[startIndex + 1] === 'animal' && 
          !isNaN(parseInt(pathSegments[startIndex + 2]))) {
        
        const animalId = parseInt(pathSegments[startIndex + 2]);
        
        // GET /api/multimedia/animal/{id}/one - One photo only
        if (pathSegments.length > startIndex + 3 && pathSegments[startIndex + 3] === 'one') {
          console.log(`Fetching one photo for animal ID: ${animalId}`);
          req.animalId = animalId;
          authenticateRequest(req, res, () => multimediaRoutes.getOnePhotoByAnimalId(req, res));
          return;
        } 
        
        // GET /api/multimedia/animal/{id} - All multimedia
        else if (pathSegments.length === startIndex + 3) {
          console.log(`Fetching all multimedia for animal ID: ${animalId}`);
          req.animalId = animalId;
          authenticateRequest(req, res, () => multimediaRoutes.getMultimediaByAnimalId(req, res));
          return;
        }
      }
      
      // DELETE /api/multimedia/animal/{id}
      else if (req.method === 'DELETE' && 
               pathSegments.length > startIndex + 2 && 
               pathSegments[startIndex + 1] === 'animal' && 
               !isNaN(parseInt(pathSegments[startIndex + 2]))) {
        
        const animalId = parseInt(pathSegments[startIndex + 2]);
        console.log(`Deleting multimedia for animal ID: ${animalId}`);
        req.animalId = animalId;
        authenticateRequest(req, res, () => multimediaRoutes.deleteMultimediaByAnimalId(req, res));
        return;
      }
      
      // POST /api/multimedia/create
      else if (req.method === 'POST' && 
               pathSegments.length === startIndex + 2 && 
               pathSegments[startIndex + 1] === 'create') {
        console.log('Creating multimedia');
        authenticateRequest(req, res, () => multimediaRoutes.createMultimedia(req, res));
        return;
      }
      
      // GET /api/multimedia/stream/{id}
      else if (req.method === 'GET' && 
               pathSegments.length > startIndex + 2 && 
               pathSegments[startIndex + 1] === 'stream' && 
               !isNaN(parseInt(pathSegments[startIndex + 2]))) {
        
        const mediaId = parseInt(pathSegments[startIndex + 2]);
        console.log(`Streaming media ID: ${mediaId}`);
        req.mediaId = mediaId;
        multimediaRoutes.streamMultimedia(req, res);
        return;
      }
    }
    
    // Upload file endpoint 
    if ((parsedUrl.pathname === '/api/multimedia/upload' || 
         parsedUrl.pathname === '/upload') && 
        req.method === 'POST') {
      console.log('Processing file upload');
      authenticateRequest(req, res, () => multimediaRoutes.uploadFile(req, res));
      return;
    }

    if (req.method === 'GET' && req.url.startsWith('/media/pipe/')) {
      try {
        const isInternalRequest = req.headers['x-internal-request'] === 'true';
        
        if (!shouldProcessMediaRequest(req.url, isInternalRequest)) {
          res.writeHead(429, { 
            'Content-Type': 'application/json',
            'Retry-After': '2',
            'Cache-Control': 'private, max-age=0, no-cache'
          });
          res.end(JSON.stringify({ 
            error: 'Too many requests',
            message: 'Please try again later'
          }));
          return;
        }
        
        // Parse the URL to extract ID
        const url = new URL(req.url, `http://${req.headers.host}`);
        const pathParts = url.pathname.split('/media/pipe/');
        const mediaId = parseInt(pathParts[1]);
        
        if (isNaN(mediaId)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid media ID' }));
          return;
        }
        
        if (isInternalRequest) {
          const MultiMedia = require('./models/MultiMedia');
          const mediaRecord = await MultiMedia.findById(mediaId);
          
          if (!mediaRecord) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Media not found' }));
            return;
          }
          
          res.writeHead(200, { 
            'Content-Type': 'application/json',
            'Cache-Control': `public, max-age=${MEDIA_CACHE_TTL}, immutable`,
            'ETag': `"media-${mediaId}-${Date.now()}"` 
          });
          res.end(JSON.stringify([{
            ...mediaRecord,
            pipeUrl: `/media/pipe/${mediaRecord.ID}`,
            cached: true
          }]));
          return;
        }
        
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

    // If no route matches
    console.log(`No route matched: ${req.method} ${parsedUrl.pathname}`);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      error: 'Not Found',
      message: `No handler found for ${req.method} ${parsedUrl.pathname}`,
      pathSegments
    }));

  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error', message: error.message }));
  }
});

async function startServer() {
  try {
    await initialize();
    
    server.listen(PORT, () => {
      console.log(`Multimedia service running on port ${PORT}`);
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