const oracledb = require('oracledb');

const dbConfig = {
  user: 'student_app',
  password: 'password123',
  connectString: 'localhost:1521/XE',
};

async function getConnection() {
  try {
    return await oracledb.getConnection(dbConfig);
  } catch (err) {
    console.error('Error connecting to the database:', err);
    throw err;
  }
}

module.exports = { getConnection };