const oracledb = require('oracledb');
const { getConnection } = require('../db');

class Admin {
  static async findByEmailAndPassword(email, password) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT a.adminData.adminId AS adminId, 
                a.adminData.email AS email, 
                a.adminData.password AS password, 
                a.adminData.createdAt AS createdAt
         FROM Admins a
         WHERE a.adminData.email = :email AND a.adminData.password = :password`,
        { email, password },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (result.rows && result.rows.length > 0) {
        return result.rows[0]; 
      }
      return null;
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('A apărut o eroare în baza de date. Vă rugăm să verificați datele introduse și să încercați din nou.');
    } finally {
      await connection.close();
    }
  }

  static async findByEmail(email) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT a.adminData.adminId AS adminId, 
                a.adminData.email AS email, 
                a.adminData.password AS password, 
                a.adminData.createdAt AS createdAt
         FROM Admins a
         WHERE a.adminData.email = :email`,
        { email },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (result.rows && result.rows.length > 0) {
        return result.rows[0]; // Returnăm obiectul complet
      }
      return null;
    } catch (error) {
      console.error('Database error:', error);
      throw new Error('A apărut o eroare în baza de date. Vă rugăm să încercați din nou.');
    } finally {
      await connection.close();
    }
  }
}

module.exports = Admin;