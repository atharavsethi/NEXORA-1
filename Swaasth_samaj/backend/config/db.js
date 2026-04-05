const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI || 'mongodb://localhost:27017/sakhi_circle';
    
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const fs = require('fs');
      const path = require('path');
      const dbPath = path.join(__dirname, '../local-db');
      if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });
      
      const mongoServer = await MongoMemoryServer.create({
        instance: { dbPath, port: 27055 }
      });
      uri = mongoServer.getUri();
      console.log(`🧠 Portable MongoDB spun up at ${uri} with persistent storage in /local-db`);
    } catch (e) {
      console.log('⚠️ Could not start portable MongoDB. Falling back to default local DB.');
    }

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
