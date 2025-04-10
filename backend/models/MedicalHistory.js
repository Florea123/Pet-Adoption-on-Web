const { getConnection } = require('../db');

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
        { animal_id }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }
}

module.exports = MedicalHistory;