const { getConnection } = require("../../db");
const oracledb = require("oracledb");
const fileUtils = require("../../../utils/fileStorageUtils");

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
      const processedRecords = result.rows.map((record) => {
        return {
          ...record,
          pipeUrl: `/media/pipe/${record.ID}`,
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
      const processedRecords = result.rows.map((record) => {
        return {
          ...record,
          pipeUrl: `/media/pipe/${record.ID}`,
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
      const mediaRecords = await this.findByAnimalId(animalID);

      // Delete the files 
      for (const record of mediaRecords) {
        if (record.URL) {
          const deleted = fileUtils.deleteFile(record.URL);
          if (!deleted) {
            console.warn(`Could not delete file for media ID ${record.ID}`);
          }
        }
      }

      const result = await connection.execute(
        `DELETE FROM MultiMedia WHERE animalID = :animalID`,
        { animalID },
        { autoCommit: true }
      );

      return result.rowsAffected > 0;
    } catch (error) {
      console.error("Error in deleteByAnimalId:", error);
      throw error;
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
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Media not found" }));
        return;
      }

      // The URL should be in the format: /server/{mediaType}/{fileName}
      const urlPath = mediaRecord.URL;
      if (!urlPath) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid media path" }));
        return;
      }

      // Use the utility function to resolve the file path and stream it
      const filePath = fileUtils.resolveFilePath(urlPath);
      await fileUtils.streamFile(filePath, res);
      
    } catch (error) {
      console.error("Error in pipeMediaStream:", error);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
  }
}

module.exports = MultiMedia;
