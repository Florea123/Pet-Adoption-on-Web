const { getConnection } = require('../db');
const oracledb = require('oracledb'); 

class User {
  static async create(firstName, lastName, email, password, phone) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `INSERT INTO Users (firstName, lastName, email, password, phone) 
         VALUES (:firstName, :lastName, :email, :password, :phone)`,
        { firstName, lastName, email, password, phone },
        { autoCommit: true }
      );
      return result;
    } finally {
      await connection.close();
    }
  }

  static async findById(userID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Users WHERE userID = :userID`,
        { userID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT } 
      );
      return result.rows[0]; 
    } finally {
      await connection.close();
    }
  }

  static async findByEmail(email) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Users WHERE email = :email`,
        { email },
        { outFormat: oracledb.OUT_FORMAT_OBJECT } 
      );
      return result.rows[0]; 
    } finally {
      await connection.close();
    }
  }
  
}

module.exports = User;