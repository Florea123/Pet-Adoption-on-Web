const { getConnection } = require('../db');
const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');

class MultiMedia {
  static async create(animalID, media, url, description, upload_date) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `INSERT INTO MultiMedia (animalID, media, url, description, upload_date) 
         VALUES (:animalID, :media, :url, :description, :upload_date)`,
        { animalID, media, url, description, upload_date },
        { autoCommit: true }
      );
      return result;
    } finally {
      await connection.close();
    }
  }

  static async findByAnimalId(animalID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM MultiMedia WHERE animalID = :animalID`,
        { animalID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      // Process the records to include pipe URLs
      const processedRecords = result.rows.map(record => {
        return {
          ...record,
          pipeUrl: `/media/pipe/${record.ID}`
        };
      });
      
      return processedRecords;
    } finally {
      await connection.close();
    }
  }

  static async findByAnimalIdOnePhoto(animalID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM MultiMedia WHERE animalID = :animalID AND ROWNUM = 1`,
        { animalID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      // Process the records to include pipe URLs
      const processedRecords = result.rows.map(record => {
        return {
          ...record,
          pipeUrl: `/media/pipe/${record.ID}`
        };
      });
      
      return processedRecords;
    } finally {
      await connection.close();
    }
  }

  static async deleteByAnimalId(animalID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `DELETE FROM MultiMedia WHERE animalID = :animalID`,
        { animalID },
        { autoCommit: true }
      );
      return result.rowsAffected > 0;
    } finally {
      await connection.close();
    }
  }
  
  static async findById(id) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM MultiMedia WHERE id = :id`,
        { id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      return result.rows[0];
    } finally {
      await connection.close();
    }
  }
  
  static async pipeMediaStream(id, res) {
    try {
      // Get media record
      const mediaRecord = await this.findById(id);
      
      if (!mediaRecord) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Media not found' }));
        return;
      }
      
      // The URL should be in the format: /server/{mediaType}/{fileName}
      const urlPath = mediaRecord.URL;
      if (!urlPath || !urlPath.startsWith('/server/')) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid media path' }));
        return;
      }
      
      // Convert URL path to filesystem path
      const filePath = path.join(__dirname, '..', '..', urlPath);
      
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Media file not found' }));
        return;
      }
      
      // Determine MIME type based on media type and file extension
      let mimeType = 'application/octet-stream';
      const ext = path.extname(filePath).toLowerCase();
      
      if (mediaRecord.MEDIA === 'photo') {
        if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        else if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.webp') mimeType = 'image/webp';
      } else if (mediaRecord.MEDIA === 'video') {
        if (ext === '.mp4') mimeType = 'video/mp4';
        else if (ext === '.webm') mimeType = 'video/webm';
      } else if (mediaRecord.MEDIA === 'audio') {
        if (ext === '.mp3') mimeType = 'audio/mpeg';
        else if (ext === '.wav') mimeType = 'audio/wav';
      }
      
      // Set appropriate headers
      res.writeHead(200, { 
        'Content-Type': mimeType,
        'Cache-Control': 'max-age=31536000' // Cache for 1 year
      });
      
      // Stream the file to the client
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Error streaming file' }));
        }
      });
      
    } catch (error) {
      console.error('Error in pipeMediaStream:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  }
}

module.exports = MultiMedia;