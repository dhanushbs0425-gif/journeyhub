/**
 * JourneyHub Database Connection Configuration
 * Connects to MongoDB with automatic fallback to MongoMemoryServer
 * for zero-friction MCA evaluation and standalone operation.
 */
const mongoose = require('mongoose');

let memoryServerInstance = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  const configuredUri = process.env.MONGODB_URI;

  if (configuredUri) {
    try {
      console.log(`[DB] Attempting connection to configured MONGODB_URI...`);
      const conn = await mongoose.connect(configuredUri, {
        serverSelectionTimeoutMS: 4000
      });
      console.log(`[DB] Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (err) {
      console.warn(`[DB] Configured MONGODB_URI connection failed: ${err.message}`);
    }
  }

  // Try local default MongoDB instance
  const defaultLocalUri = 'mongodb://127.0.0.1:27017/journeyhub';
  try {
    console.log(`[DB] Attempting connection to local MongoDB at ${defaultLocalUri}...`);
    const conn = await mongoose.connect(defaultLocalUri, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[DB] Connected to local MongoDB daemon.`);
    return conn;
  } catch (localErr) {
    console.log(`[DB] Local daemon not reachable (${localErr.message}).`);
  }

  // Fallback to high-performance MongoMemoryServer
  try {
    if (!memoryServerInstance) {
      console.log(`[DB] Starting embedded MongoDB engine (MongoMemoryServer)...`);
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create({
        instance: { startupTimeout: 45000 }
      });
    }
    const memoryUri = memoryServerInstance.getUri();
    const conn = await mongoose.connect(memoryUri, {
      dbName: 'journeyhub'
    });
    console.log(`[DB] Connected to Embedded MongoDB Server successfully at ${memoryUri}`);
    return conn;
  } catch (memErr) {
    console.error(`[DB] Fatal: Could not connect to any MongoDB instance:`, memErr);
    throw memErr;
  }
}

async function disconnectDB(forceStopMemory = false) {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (forceStopMemory && memoryServerInstance) {
    await memoryServerInstance.stop();
    memoryServerInstance = null;
  }
  console.log('[DB] Database disconnected.');
}

function isMemoryDB() {
  return memoryServerInstance !== null;
}

module.exports = {
  connectDB,
  disconnectDB,
  isMemoryDB
};
