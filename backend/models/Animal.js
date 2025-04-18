const { getConnection } = require('../db');
const oracledb = require('oracledb'); 

class Animal {
  static async create(userID, name, breed, species, age, gender) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `INSERT INTO Animal (userID, name, breed, species, age, gender) 
         VALUES (:userID, :name, :breed, :species, :age, :gender)`,
        { userID, name, breed, species, age, gender },
        { autoCommit: true }
      );
      return result;
    } finally {
      await connection.close();
    }
  }

  static async getAll() {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Animal`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }

  static async findById(animalID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Animal WHERE animalID = :animalID`,
        { animalID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows[0];
    } finally {
      await connection.close();
    }
  }

  static async findByUserId(userID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Animal WHERE userID = :userID`,
        { userID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }

  static async findBySpecies(species) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Animal WHERE species = :species`,
        { species },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }

  static async deleteAnimalWithRelatedData(animalID) {
    const connection = await getConnection();
    try {
      // Import required models first
      const Relations = require('./Relations');
      const MultiMedia = require('./MultiMedia');
      const FeedingSchedule = require('./FeedingSchedule');
      const MedicalHistory = require('./MedicalHistory');
      
      try {
        await Relations.deleteByAnimalId(animalID);
        console.log(`Relations deleted`);
      } catch (err) {
        console.error('Error deleting relations:', err);
      }
      
      try {
        await MultiMedia.deleteByAnimalId(animalID);
        console.log(`Multimedia deleted`);
      } catch (err) {
        console.error('Error deleting multimedia:', err);
      }
      
      try {
        await FeedingSchedule.deleteByAnimalId(animalID);
        console.log(`Feeding schedule deleted`);
      } catch (err) {
        console.error('Error deleting feeding schedule:', err);
      }
      
      try {
        await MedicalHistory.deleteByAnimalId(animalID);
        console.log(`Medical history deleted`);
      } catch (err) {
        console.error('Error deleting medical history:', err);
      }

      const animalResult = await connection.execute(
        `DELETE FROM Animal WHERE animalID = :animalID`,
        { animalID },
        { autoCommit: true } 
      );
      
      return animalResult.rowsAffected > 0;
    } catch (error) {
      console.error('Error in deleteAnimalWithRelatedData:', error);
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error('Error closing connection:', err);
        }
      }
    }
  }
}

module.exports = Animal;