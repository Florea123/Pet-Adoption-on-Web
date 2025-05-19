const { getConnection } = require("../db");
const oracledb = require("oracledb");

class User {
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

  static async create(firstName, lastName, email, password, phone, city, isAdmin = 0) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `INSERT INTO Users 
         (firstName, lastName, email, password, phone, city, isAdmin) 
         VALUES 
         (:firstName, :lastName, :email, :password, :phone, :city, :isAdmin)
         RETURNING userId INTO :userId`,
        { 
          firstName, 
          lastName, 
          email, 
          password,
          phone, 
          city, 
          isAdmin,
          userId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        },
        { autoCommit: true }
      );
      
      return { 
        userId: result.outBinds.userId[0],
        firstName,
        lastName,
        email,
        phone,
        city,
        isAdmin 
      };
    } finally {
      await connection.close();
    }
  }

  static async findById(userId) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT * FROM Users WHERE userId = :userId`,
        { userId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows[0];
    } finally {
      await connection.close();
    }
  }

  static async getAll() {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `SELECT userId, firstName, lastName, email, phone, city, isAdmin FROM Users`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows;
    } finally {
      await connection.close();
    }
  }

  static async delete(userId) {
    const connection = await getConnection();
    try {
      const result = await connection.execute(
        `DELETE FROM Users WHERE userId = :userId`,
        { userId },
        { autoCommit: true }
      );
      return result.rowsAffected > 0;
    } finally {
      await connection.close();
    }
  }

  static async verifyPassword(user, password) {
    return user.PASSWORD === password;
  }

  static async getAllUsersWithDetails() {
    const connection = await getConnection();
    try {

      const result = await connection.execute(
        `SELECT u.*, a.addressID, a.Street, a.City, a.State, a.ZipCode, a.Country
         FROM Users u
         LEFT JOIN Address a ON u.userID = a.userID`,
        {},
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

 
      const users = {};
      
      result.rows.forEach(row => {
        const userId = row.USERID;
        
        if (!users[userId]) {
          users[userId] = {
            USERID: row.USERID,
            FIRSTNAME: row.FIRSTNAME,
            LASTNAME: row.LASTNAME,
            EMAIL: row.EMAIL,
            PHONE: row.PHONE,
            CREATEDAT: row.CREATEDAT,
            ISADMIN: row.ISADMIN,
            address: null
          };
        }
        
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