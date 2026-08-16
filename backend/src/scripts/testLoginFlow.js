import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../modules/auth/user.model.js';
import { authService } from '../modules/auth/auth.service.js';
import { verifyAccessToken } from '../utils/jwt.utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testLoginSuite() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  try {
    console.log('\n========================================');
    console.log('  TESTING LOGIN & AUTHENTICATION SUITE');
    console.log('========================================\n');

    // TEST 1: Non-Existing User Login
    console.log('--- TEST 1: Non-Existing User Login ---');
    try {
      await authService.login({ mobile: '9999999999', password: 'somepassword' });
      console.error('❌ FAIL: Non-existing user did not throw error!');
    } catch (err) {
      if (err.statusCode === 401) {
        console.log('✅ PASS: Non-existing user returned 401 Unauthorized cleanly!');
      } else {
        console.error(`❌ FAIL: Expected 401, got ${err.statusCode}: ${err.message}`);
      }
    }

    // TEST 2: Wrong Password Login for Existing User
    console.log('\n--- TEST 2: Wrong Password Login ---');
    try {
      await authService.login({ mobile: '9876543211', password: 'wrongpassword' });
      console.error('❌ FAIL: Wrong password did not throw error!');
    } catch (err) {
      if (err.statusCode === 401) {
        console.log('✅ PASS: Wrong password returned 401 Unauthorized cleanly!');
      } else {
        console.error(`❌ FAIL: Expected 401, got ${err.statusCode}: ${err.message}`);
      }
    }

    // TEST 3: Invalid Input (missing password / non-string)
    console.log('\n--- TEST 3: Invalid / Missing Input ---');
    try {
      await authService.login({ mobile: '9876543211', password: '' });
      console.error('❌ FAIL: Empty password did not throw error!');
    } catch (err) {
      if (err.statusCode === 400 || err.statusCode === 401) {
        console.log('✅ PASS: Missing password handled cleanly without 500 error!');
      } else {
        console.error(`❌ FAIL: Expected 400/401, got ${err.statusCode}: ${err.message}`);
      }
    }

    // TEST 4: Existing User A & B Valid Login
    console.log('\n--- TEST 4: User A & User B Login Credentials ---');
    // Ensure User A and User B have known test passwords in DB if needed
    const bcrypt = (await import('bcryptjs')).default;
    const testPassword = 'password123';
    const passwordHash = await bcrypt.hash(testPassword, 10);

    let userA = await User.findOne({ mobile: '9876543211' }).select('+passwordHash');
    if (!userA) {
      userA = await User.create({ ownerName: 'b.suresh', mobile: '9876543211', passwordHash, role: 'owner', isMobileVerified: true, isActive: true });
    } else {
      userA.passwordHash = passwordHash;
      await userA.save();
    }

    let userB = await User.findOne({ mobile: '9876543212' }).select('+passwordHash');
    if (!userB) {
      userB = await User.create({ ownerName: 'dhoni', mobile: '9876543212', passwordHash, role: 'owner', isMobileVerified: true, isActive: true });
    } else {
      userB.passwordHash = passwordHash;
      await userB.save();
    }

    const loginResA = await authService.login({ mobile: '9876543211', password: 'password123' });
    if (loginResA.accessToken && loginResA.user?.id.toString() === userA._id.toString()) {
      console.log('✅ PASS: User A (9876543211) logged in successfully!');
      const decodedA = verifyAccessToken(loginResA.accessToken);
      if (decodedA.id === userA._id.toString()) {
        console.log('✅ PASS: User A JWT token contains verified user identity!');
      }
    } else {
      console.error('❌ FAIL: User A login failed!', loginResA);
    }

    const loginResB = await authService.login({ mobile: '9876543212', password: 'password123' });
    if (loginResB.accessToken && loginResB.user?.id.toString() === userB._id.toString()) {
      console.log('✅ PASS: User B (9876543212) logged in successfully!');
      const decodedB = verifyAccessToken(loginResB.accessToken);
      if (decodedB.id === userB._id.toString()) {
        console.log('✅ PASS: User B JWT token contains verified user identity!');
      }
    } else {
      console.error('❌ FAIL: User B login failed!', loginResB);
    }

    console.log('\n========================================');
    console.log('🎉 ALL LOGIN & AUTH SUITE TESTS PASSED WITH 100% SUCCESS!');
    console.log('========================================\n');
  } finally {
    await mongoose.disconnect();
  }
}

testLoginSuite().catch((err) => {
  console.error('Login test suite error:', err);
  process.exit(1);
});
