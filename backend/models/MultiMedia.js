const { getConnection } = require('../db');
const oracledb = require('oracledb');

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
      return result.rows;
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
      return result.rows;
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
}

module.exports = MultiMedia;