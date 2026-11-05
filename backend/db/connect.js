import mongoose from 'mongoose';

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not configured');
  mongoose.set('bufferCommands', false);
  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB_NAME || 'skilllens',
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 10000
  });
  return mongoose.connection;
}
