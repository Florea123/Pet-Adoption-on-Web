const { getConnection } = require('../db');
const oracledb = require('oracledb'); 

class MedicalHistory {
  static async create(animal_id, vetNumber, recordDate, description, firstAidNoted) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `INSERT INTO MedicalHistory (animal_id, vetNumber, recordDate, description, first_aid_noted) 
         VALUES (:animal_id, :vetNumber, :recordDate, :description, :firstAidNoted)`,
        { animal_id, vetNumber, recordDate, description, firstAidNoted },
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
        `SELECT * FROM MedicalHistory WHERE animal_id = :animal_id`,
        { animal_id },
        { outFormat: oracledb.OUT_FORMAT_OBJECT } 
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }
  static async deleteByAnimalId(animal_id) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `DELETE FROM MedicalHistory WHERE animal_id = :animal_id`,
        { animal_id },
        { autoCommit: true }
      );
      return result.rowsAffected > 0;
    } finally {
      await connection.close();
    }
  }
}

module.exports = MedicalHistory;