const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbConfig = {
  user: process.env.MESSAGES_DATABASE,
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

module.exports = { getConnection };