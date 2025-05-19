const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Connection configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: process.env.DB_CONNECTION_STRING
};

// Get a connection from the pool
async function getConnection() {
  try {
    return await oracledb.getConnection(dbConfig);
  } catch (error) {
    console.error("Error getting database connection:", error);
    throw error;
  }
}

// Initialize the connection pool
async function initialize() {
  try {
    await oracledb.createPool(dbConfig);
    console.log("Connection pool created successfully");
  } catch (error) {
    console.error("Error creating connection pool:", error);
    throw error;
  }
}

// Close the connection pool
async function closePool() {
  try {
    await oracledb.getPool().close();
    console.log("Connection pool closed successfully");
  } catch (error) {
    console.error("Error closing connection pool:", error);
    throw error;
  }
}

module.exports = { 
  getConnection, 
  initialize, 
  closePool 
};