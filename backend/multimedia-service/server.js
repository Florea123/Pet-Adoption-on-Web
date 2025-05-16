const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const MultiMedia = require('./src/models/MultiMedia'); 
const MediaController = require('./src/controllers/MediaController'); // Add this import
const fileUtils = require('../utils/fileStorageUtils');

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  req.query = parsedUrl.query;
  
  res.setHeader('Access-Control-Allow-Origin', '*');  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;  
    res.end();
    return;
  }
  
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method === 'GET' && parsedUrl.pathname.startsWith('/media/animal/')) {
      const animalId = parsedUrl.pathname.split('/media/animal/')[1];
      if (!animalId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Animal ID is required' }));
        return;
      }
      req.params = { animalId }; // Add params to request
      await MediaController.getMediaByAnimalId(req, res); // Use the controller
      return;
    }

    if (req.method === 'POST' && parsedUrl.pathname === '/media/upload') {
      const body = await parseBody(req);
      const { animalID, media, url, description, upload_date } = body;
      if (!animalID || !media || !url) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing required fields' }));
        return;
      }
      await MultiMedia.create(animalID, media, url, description, upload_date || new Date());
      res.statusCode = 201;
      res.end(JSON.stringify({ message: 'Media uploaded successfully' }));
      return;
    }

    if (req.method === 'GET' && parsedUrl.pathname.startsWith('/media/file/')) {
      const fileName = parsedUrl.pathname.split('/media/file/')[2];
      if (!fileName) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'File name is required' }));
        return;
      }
      const filePath = fileUtils.getFilePath(fileName);
      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'File not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': fileUtils.getMimeType(fileName) });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    if (req.method === 'DELETE' && parsedUrl.pathname.startsWith('/media/animal/')) {
      const animalID = parsedUrl.pathname.split('/media/animal/')[1];
      if (!animalID) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Animal ID is required' }));
        return;
      }
      if (typeof MultiMedia.deleteByAnimalId === 'function') {
        await MultiMedia.deleteByAnimalId(animalID);
        res.statusCode = 200;
        res.end(JSON.stringify({ message: 'All media deleted for animal' }));
      } else {
        res.statusCode = 501;
        res.end(JSON.stringify({ error: 'Delete not implemented' }));
      }
      return;
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Route not found' }));
  } catch (err) {
    console.error('Server error:', err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

const PORT = process.env.PORT || 3004;
server.listen(PORT, () => {
  console.log(`Multimedia Service running on port ${PORT}`);
});