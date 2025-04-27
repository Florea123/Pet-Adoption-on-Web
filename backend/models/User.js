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

  static async findByEmailAndPassword(email, password) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Users WHERE email = :email AND password = :password`,
        { email, password },
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
        `SELECT USERID FROM Users WHERE email = :email`,
        { email },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows[0];
    } finally {
      await connection.close();
    }
  }

  static async getAllUsersWithDetails() {
    const connection = await getConnection();
    try {
      // Query users with their addresses using JOIN
      const result = await connection.execute(
        `SELECT u.*, a.addressID, a.Street, a.City, a.State, a.ZipCode, a.Country
         FROM Users u
         LEFT JOIN Address a ON u.userID = a.userID`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      // Transform the flat results into a nested structure
      const users = {};
      
      result.rows.forEach(row => {
        const userId = row.USERID;
        
        if (!users[userId]) {
          // Create the user object
          users[userId] = {
            USERID: row.USERID,
            FIRSTNAME: row.FIRSTNAME,
            LASTNAME: row.LASTNAME,
            EMAIL: row.EMAIL,
            PHONE: row.PHONE,
            CREATEDAT: row.CREATEDAT,
            address: null
          };
        }
        
        // Add address if it exists
        if (row.ADDRESSID) {
          users[userId].address = {
            ADDRESSID: row.ADDRESSID,
            STREET: row.STREET,
            CITY: row.CITY,
            STATE: row.STATE,
            ZIPCODE: row.ZIPCODE,
            COUNTRY: row.COUNTRY
          };
        }
      });
      
      return Object.values(users);
    } finally {
      await connection.close();
    }
  }
}

module.exports = User;