import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { User } from '../modules/auth/user.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function updateDevPasswords() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  try {
    const targetPassword = 'pass123';
    const hash = await bcrypt.hash(targetPassword, 10);

    const userA = await User.findOne({ mobile: '9876543211' }).select('+passwordHash');
    if (userA) {
      userA.passwordHash = hash;
      userA.isActive = true;
      userA.isMobileVerified = true;
      await userA.save();
      console.log('✓ Updated User A (9876543211 / b.suresh) password hash for pass123');
    }

    const userB = await User.findOne({ mobile: '9876543212' }).select('+passwordHash');
    if (userB) {
      userB.passwordHash = hash;
      userB.isActive = true;
      userB.isMobileVerified = true;
      await userB.save();
      console.log('✓ Updated User B (9876543212 / dhoni) password hash for pass123');
    }

    // Verify User A
    const uACheck = await User.findOne({ mobile: '9876543211' }).select('+passwordHash');
    const matchA = await uACheck.comparePassword('pass123');
    console.log(`USER A (9876543211) FOUND = ${Boolean(uACheck)}`);
    console.log(`USER A (9876543211) PASSWORD MATCH = ${matchA}`);

    // Verify User B
    const uBCheck = await User.findOne({ mobile: '9876543212' }).select('+passwordHash');
    const matchB = await uBCheck.comparePassword('pass123');
    console.log(`USER B (9876543212) FOUND = ${Boolean(uBCheck)}`);
    console.log(`USER B (9876543212) PASSWORD MATCH = ${matchB}`);

  } finally {
    await mongoose.disconnect();
  }
}

updateDevPasswords().catch((err) => {
  console.error('Update dev passwords error:', err);
  process.exit(1);
});
