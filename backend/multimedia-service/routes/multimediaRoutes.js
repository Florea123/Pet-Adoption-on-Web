const url = require('url');
const querystring = require('querystring');
const MultiMedia = require('../models/MultiMedia');

// Helper function to parse request body
const parseRequestBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const parsedBody = body ? JSON.parse(body) : {};
        resolve(parsedBody);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', (error) => {
      reject(error);
    });
  });
};

// Get all multimedia for an animal
async function getMultimediaByAnimalId(req, res) {
  try {
    const parsedUrl = url.parse(req.url, true);
    const pathParts = parsedUrl.pathname.split('/');
    const animalId = pathParts[pathParts.length - 1];

    if (!animalId || isNaN(animalId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Valid animal ID is required' }));
      return;
    }

    const multimedia = await MultiMedia.findByAnimalId(animalId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(multimedia));
  } catch (error) {
    console.error('Error getting multimedia:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}

// Get one photo for an animal
async function getOnePhotoByAnimalId(req, res) {
  try {
    const parsedUrl = url.parse(req.url, true);
    const pathParts = parsedUrl.pathname.split('/');
    const animalId = pathParts[pathParts.length - 2]; 

    if (!animalId || isNaN(animalId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Valid animal ID is required' }));
      return;
    }

    const multimedia = await MultiMedia.findByAnimalIdOnePhoto(animalId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(multimedia));
  } catch (error) {
    console.error('Error getting multimedia:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}

// Create new multimedia
async function createMultimedia(req, res) {
  try {
    const body = await parseRequestBody(req);
    const { animalID, mediaType, url, description } = body;

    if (!animalID || !mediaType || !url) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'animalID, mediaType, and url are required' }));
      return;
    }

    const upload_date = new Date();
    const id = await MultiMedia.create(animalID, mediaType, url, description || '', upload_date);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      id, 
      message: 'Multimedia created successfully' 
    }));
  } catch (error) {
    console.error('Error creating multimedia:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}

// Delete multimedia for an animal
async function deleteMultimediaByAnimalId(req, res) {
  try {
    const parsedUrl = url.parse(req.url, true);
    const pathParts = parsedUrl.pathname.split('/');
    const animalId = pathParts[pathParts.length - 1];

    if (!animalId || isNaN(animalId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Valid animal ID is required' }));
      return;
    }

    const deleted = await MultiMedia.deleteByAnimalId(animalId);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      success: deleted,
      message: deleted ? 'Multimedia deleted successfully' : 'No multimedia found to delete'
    }));
  } catch (error) {
    console.error('Error deleting multimedia:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
}

// Stream a multimedia file
async function streamMultimedia(req, res) {
  try {
    const parsedUrl = url.parse(req.url, true);
    const pathParts = parsedUrl.pathname.split('/');
    const mediaId = pathParts[pathParts.length - 1];

    if (!mediaId || isNaN(mediaId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Valid media ID is required' }));
      return;
    }

    // The streaming is handled inside this method
    await MultiMedia.streamFile(res, mediaId);
  } catch (error) {
    console.error('Error streaming multimedia:', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }
}

module.exports = {
  getMultimediaByAnimalId,
  getOnePhotoByAnimalId,
  createMultimedia,
  deleteMultimediaByAnimalId,
  streamMultimedia
};