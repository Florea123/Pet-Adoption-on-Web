const { getConnection } = require('../db');
const oracledb = require('oracledb'); 

class FeedingSchedule {
  static async create(animal_id, feeding_time, food_type, notes) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `INSERT INTO FeedingSchedule (animal_id, feeding_time, food_type, notes) 
         VALUES (:animal_id, :feeding_time, :food_type, :notes)`,
        { animal_id, feeding_time, food_type, notes },
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
        `SELECT * FROM FeedingSchedule WHERE animal_id = :animal_id`,
        { animal_id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT } 
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }
}

module.exports = FeedingSchedule;