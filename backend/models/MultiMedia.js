const { getConnection } = require('../db');
const  oracledb = require('oracledb');

class MultiMedia {
  static async create(animal_id, media, url, description, upload_date) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `INSERT INTO MultiMedia (animal_id, media, url, description, upload_date) 
         VALUES (:animal_id, :media, :url, :description, :upload_date)`,
        { animal_id, media, url, description, upload_date },
        { autoCommit: true }
      );
      return result;
    } finally {
      await connection.close();
    }
  }

  static async findByAnimalId(animal_id) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM MultiMedia WHERE animal_id = :animal_id`,
        { animal_id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }

  static async findByAnimalIdOnePhoto(animal_id) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM MultiMedia WHERE animal_id = :animal_id AND ROWNUM = 1`,
        { animal_id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }
}

module.exports = MultiMedia;