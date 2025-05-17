const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const MultiMedia = require('./src/models/MultiMedia'); 
const MediaController = require('./src/controllers/MediaController');
const fileUtils = require('../utils/fileStorageUtils');
const { handleHealthCheck } = require('../shared/basicHealth');

// Helper to check if request is multipart/form-data
function isMultipartFormData(req) {
  const contentType = req.headers['content-type'] || '';
  return contentType.startsWith('multipart/form-data');
}

// Parse JSON body helper
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

// Handle file upload using multer from fileStorageUtils
function handleFileUpload(req, res) {
  return new Promise((resolve, reject) => {
    // Get multer instance configured in fileStorageUtils
    const upload = fileUtils.configureStorage();
    
    // Process the request with multer
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('File upload error:', err);
        return reject(err);
      }
      
      if (!req.file) {
        return reject(new Error('No file uploaded'));
      }
      
      // Get media type (will be set by multer's fileFilter)
      const mediaType = req.body.mediaType || 'photo';
      
      // Get public URL (using the utility function)
      const fileUrl = fileUtils.getPublicUrl(mediaType, req.file.filename);
      
      resolve({
        file: req.file,
        mediaType,
        fileUrl,
        animalID: req.body.animalID
      });
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
  
  // Add the health check endpoint
  if (req.method === 'GET' && parsedUrl.pathname === '/health') {
    handleHealthCheck(req, res, 'multimedia-service');
    return;
  }
  
  try {
    // NEW ENDPOINT: Create multimedia entry in database
    if (req.method === 'POST' && parsedUrl.pathname === '/multimedia/create') {
      const body = await parseBody(req);
      const { animalID, media, url, description } = body;
      
      // Validate required fields
      if (!animalID) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'animalID is required' }));
        return;
      }
      
      if (!media || !['photo', 'video', 'audio'].includes(media)) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ 
          error: 'Valid media type is required (photo, video, or audio)' 
        }));
        return;
      }
      
      if (!url) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'url is required' }));
        return;
      }
      
      // Create the multimedia record
      try {
        const upload_date = body.upload_date || new Date();
        await MultiMedia.create(animalID, media, url, description || '', upload_date);
        
        // Return success response
        res.statusCode = 201;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ 
          success: true,
          message: 'Multimedia created successfully', 
          data: { animalID, media, url, description, upload_date }
        }));
      } catch (dbError) {
        console.error('Error creating multimedia record:', dbError);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Database error creating multimedia record' }));
      }
      return;
    }

    // Handle file uploads - check for multipart/form-data
    if (req.method === 'POST' && parsedUrl.pathname === '/media/upload' && isMultipartFormData(req)) {
      try {
        console.log('Processing file upload with multer...');
        const uploadResult = await handleFileUpload(req, res);
        
        // Save to database if animalID was provided
        if (uploadResult.animalID) {
          await MultiMedia.create(
            uploadResult.animalID,
            uploadResult.mediaType,
            uploadResult.fileUrl,
            req.body.description || '',
            new Date()
          );
          console.log(`Media saved to database for animal ${uploadResult.animalID}`);
        }
        
        // Send success response
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.end(JSON.stringify({
          message: 'File uploaded successfully',
          filePath: uploadResult.fileUrl,
          fileName: uploadResult.file.filename,
          size: uploadResult.file.size
        }));
        return;
      } catch (error) {
        console.error('Error handling file upload:', error);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 400;
        res.end(JSON.stringify({ error: error.message }));
        return;
      }
    }
    
    // Handle regular JSON media upload
    if (req.method === 'POST' && parsedUrl.pathname === '/media/upload') {
      const body = await parseBody(req);
      const { animalID, media, url, description, upload_date } = body;
      if (!animalID || !media || !url) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing required fields' }));
        return;
      }
      await MultiMedia.create(animalID, media, url, description, upload_date || new Date());
      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Media uploaded successfully' }));
      return;
    }

    // Get media for an animal
    if (req.method === 'GET' && parsedUrl.pathname.startsWith('/media/animal/')) {
      const animalId = parsedUrl.pathname.split('/media/animal/')[1];
      if (!animalId) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Animal ID is required' }));
        return;
      }
      req.params = { animalId };
      await MediaController.getMediaByAnimalId(req, res);
      return;
    }

    // Serve media files - use the streamFile utility
    if (req.method === 'GET' && (
        parsedUrl.pathname.startsWith('/server/') || 
        parsedUrl.pathname.startsWith('/media/file/')
    )) {
      let filePath;
      
      if (parsedUrl.pathname.startsWith('/server/')) {
        // Direct server file path
        filePath = fileUtils.resolveFilePath(parsedUrl.pathname);
      } else {
        // Media file path from database
        const mediaPath = parsedUrl.pathname.replace('/media/file/', '');
        filePath = path.join(fileUtils.getProjectRoot(), mediaPath);
      }
      
      if (!filePath || !fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'File not found' }));
        return;
      }
      
      // Use the streamFile utility
      await fileUtils.streamFile(filePath, res);
      return;
    }

    // Delete media for an animal
    if (req.method === 'DELETE' && parsedUrl.pathname.startsWith('/media/animal/')) {
      const animalID = parsedUrl.pathname.split('/media/animal/')[1];
      if (!animalID) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Animal ID is required' }));
        return;
      }
      
      // Get all media for this animal
      const media = await MultiMedia.getAllByAnimalId(animalID);
      
      // Delete files from disk
      for (const item of media) {
        if (item.URL) {
          fileUtils.deleteFile(item.URL);
        }
      }
      
      // Delete records from database
      await MultiMedia.deleteByAnimalId(animalID);
      
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ 
        message: 'All media deleted for animal',
        count: media.length
      }));
      return;
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Route not found' }));
  } catch (err) {
    console.error('Server error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
  }
});

const PORT = process.env.PORT || 3004;
server.listen(PORT, () => {
  console.log(`Multimedia Service running on port ${PORT}`);
});