import mongoose from 'mongoose';
import { envConfig } from './env.config.js';

let backupConnection = null;

export const getBackupDbConnection = async () => {
  if (backupConnection && (backupConnection.readyState === 1 || backupConnection.readyState === 2)) {
    if (backupConnection.readyState === 1) return backupConnection;
  }

  const uri = process.env.BACKUP_MONGODB_URI || envConfig.mongo.backupUri || envConfig.mongo.mainUri || envConfig.mongo.uri;
  
  let finalUri = uri;
  // If no separate BACKUP_MONGODB_URI was specified, isolate in 'vedixa_backups' database
  if (!process.env.BACKUP_MONGODB_URI && finalUri.includes('/')) {
    if (finalUri.includes('?')) {
      const parts = finalUri.split('?');
      const lastSlash = parts[0].lastIndexOf('/');
      parts[0] = parts[0].substring(0, lastSlash + 1) + 'vedixa_backups';
      finalUri = parts.join('?');
    } else {
      const lastSlash = finalUri.lastIndexOf('/');
      finalUri = finalUri.substring(0, lastSlash + 1) + 'vedixa_backups';
    }
  }

  try {
    backupConnection = await mongoose.createConnection(finalUri).asPromise();
    console.log('✅ Backup MongoDB Atlas Connection established to database:', backupConnection.name);
    return backupConnection;
  } catch (err) {
    console.error('❌ Failed to connect to Backup MongoDB Atlas:', err.message);
    throw err;
  }
};
