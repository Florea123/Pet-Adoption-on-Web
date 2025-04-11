const { getConnection } = require('../db');
const oracledb = require('oracledb'); 

class Relations {
  static async create(animalId, friendWith) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `INSERT INTO Relations (animalId, friendWith) 
         VALUES (:animalId, :friendWith)`,
        { animalId, friendWith },
        { autoCommit: true }
      );
      return result;
    } finally {
      await connection.close();
    }
  }

  static async findByAnimalId(animalId) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Relations WHERE animalId = :animalId`,
        { animalId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }
}

module.exports = Relations;