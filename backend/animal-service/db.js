const oracledb = require('oracledb');
const EventEmitter = require('events');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Database events emitter
const dbEvents = new EventEmitter();

const dbConfig = {
  user: process.env.ANIMAL_DATABASE,
  password: process.env.PASSWORD_DATABASE,
  connectString: `localhost:1521/${process.env.SERVICE_NAME}`,
  poolMin: 2,
  poolMax: 10,
  poolIncrement: 1
};

// Initialize connection pool
async function initialize() {
  try {
    await oracledb.createPool(dbConfig);
    console.log('Animal service database pool created successfully');
    return true;
  } catch (err) {
    console.error('Error creating database connection pool:', err);
    return false;
  }
}

// Get a connection from the pool
async function getConnection() {
  try {
    return await oracledb.getConnection();
  } catch (err) {
    console.error('Error getting database connection:', err);
    throw err;
  }
}

// Close the connection pool
async function closePool() {
  try {
    await oracledb.getPool().close(0);
    console.log('Database connection pool closed');
  } catch (err) {
    console.error('Error closing database pool:', err);
  }
}

// Emit data change events for consistency across services
function emitDataChange(entityType, operation, entityId) {
  const event = {
    service: 'animal-service',
    entityType,
    operation,
    entityId,
    timestamp: new Date().toISOString()
  };
  
  dbEvents.emit('data-change', event);
  console.log(`Data change event emitted: ${operation} on ${entityType} ${entityId}`);
  
  // Publish to event bus (implementation depends on your chosen event bus)
  // publishEvent('animal-events', event); 
}

module.exports = {
  initialize,
  getConnection,
  closePool,
  dbEvents,
  emitDataChange
};