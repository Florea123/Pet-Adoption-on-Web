const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
  user: process.env.USER_DATABASE, 
  password: process.env.PASSWORD_DATABASE, 
  connectString: `localhost:1521/${process.env.SERVICE_NAME}`,
};

async function getConnection() {
  try {
    return await oracledb.getConnection(dbConfig);
  } catch (err) {
    console.error('Error connecting to the database:', err);
    throw err;
  }
}

async function testConnection() {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute('SELECT 1 FROM DUAL');
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Error closing test connection:', closeErr);
      }
    }
  }
}

module.exports = { getConnection, testConnection };