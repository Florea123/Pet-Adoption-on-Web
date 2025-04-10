const { getConnection } = require('../db');

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

  static async findById(animalID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Animal WHERE animalID = :animalID`,
        { animalID }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }
}

module.exports = Animal;