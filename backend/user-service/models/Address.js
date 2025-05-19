const { getConnection } = require('../db');
const oracledb = require('oracledb'); 

class Address {

  static async create(userID, street, city, state, zipCode, country) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `INSERT INTO Address (userID, Street, City, State, ZipCode, Country) 
         VALUES (:userID, :street, :city, :state, :zipCode, :country)`,
        { userID, street, city, state, zipCode, country },
        { autoCommit: true }
      );
      return result;
    } catch (error) {
      console.error('Error creating address:', error);
      throw error;
    } finally {
      await connection.close();
    }
  }

  static async findByUserId(userID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Address WHERE userID = :userID`,
        { userID },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding address by user ID:', error);
      throw error;
    } finally {
      await connection.close();
    }
  }

  static async update(addressID, updateData) {
    const connection = await getConnection();
    try {
      const updateFields = [];
      const bindParams = { addressID };
      
      // Build dynamic update statement
      Object.entries(updateData).forEach(([key, value]) => {
        const columnName = key.charAt(0).toUpperCase() + key.slice(1);
        updateFields.push(`${columnName} = :${key}`);
        bindParams[key] = value;
      });
      
      if (updateFields.length === 0) {
        return { rowsAffected: 0 };
      }
      
      const sql = `UPDATE Address SET ${updateFields.join(', ')} WHERE addressID = :addressID`;
      const result = await connection.execute(sql, bindParams, { autoCommit: true });
      
      return result;
    } catch (error) {
      console.error('Error updating address:', error);
      throw error;
    } finally {
      await connection.close();
    }
  }

  static async delete(addressID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `DELETE FROM Address WHERE addressID = :addressID`,
        { addressID },
        { autoCommit: true }
      );
      return result;
    } catch (error) {
      console.error('Error deleting address:', error);
      throw error;
    } finally {
      await connection.close();
    }
  }

  static async deleteByUserId(userID) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `DELETE FROM Address WHERE userID = :userID`,
        { userID },
        { autoCommit: true }
      );
      return result;
    } catch (error) {
      console.error('Error deleting addresses by user ID:', error);
      throw error;
    } finally {
      await connection.close();
    }
  }
}

module.exports = Address;