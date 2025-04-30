const oracledb = require('oracledb');
const { getConnection } = require('../db');

class Admin {
  static async findByEmailAndPassword(email, password) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Admins WHERE email = :email AND password = :password`,
        { email, password },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
    
      if (result.rows && result.rows.length > 0) {
        const admin = result.rows[0];
        admin.isAdmin = true; 
        return admin;
      }
      return null;
    } finally {
      await connection.close();
    }
  }

  static async findByEmail(email) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT adminId, email FROM Admins WHERE email = :email`,
        { email },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      
      if (result.rows && result.rows.length > 0) {
        const admin = result.rows[0];
        admin.isAdmin = true;
        return admin;
      }
      return null;
    } finally {
      await connection.close();
    }
  }
}

module.exports = Admin;