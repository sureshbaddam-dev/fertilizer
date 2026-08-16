import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../modules/auth/user.model.js';
import { generateAccessToken } from '../utils/jwt.utils.js';

async function testRoutes() {
  console.log('🧪 Testing /api/v1/admin/backups Routing Resolution...');

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MAIN_MONGODB_URI || 'mongodb://localhost:27017/mandhi_erp');
    }

    let adminUser = await User.findOne({ role: { $in: ['admin', 'super_admin', 'SUPER_ADMIN', 'ADMIN'] } }).lean();
    if (!adminUser) {
      adminUser = await User.create({
        ownerName: 'Test Admin User',
        mobile: '9888777666',
        passwordHash: 'dummy_hash',
        role: 'admin',
        isActive: true,
      });
    }

    const adminToken = generateAccessToken(adminUser._id, adminUser.role);

    const server = app.listen(5099, async () => {
      console.log('✅ Temporary Test Server running on port 5099');

      try {
        const headers = { Authorization: `Bearer ${adminToken}` };

        // Test 1: GET /api/v1/admin/backups/overview
        const resOverview = await fetch('http://localhost:5099/api/v1/admin/backups/overview', { headers });
        console.log(`1. GET /api/v1/admin/backups/overview -> HTTP ${resOverview.status}`);
        const dataOverview = await resOverview.json();
        console.log('   Response overview:', dataOverview);

        // Test 2: GET /api/v1/admin/backups
        const resBackups = await fetch('http://localhost:5099/api/v1/admin/backups', { headers });
        console.log(`2. GET /api/v1/admin/backups -> HTTP ${resBackups.status}`);
        const dataBackups = await resBackups.json();
        console.log('   Response backups count:', dataBackups.data?.length);

        // Test 3: GET /api/v1/admin/backups/restore/history
        const resRestore = await fetch('http://localhost:5099/api/v1/admin/backups/restore/history', { headers });
        console.log(`3. GET /api/v1/admin/backups/restore/history -> HTTP ${resRestore.status}`);
        const dataRestore = await resRestore.json();
        console.log('   Response restore history count:', dataRestore.data?.length);

        if (resOverview.status === 200 && resBackups.status === 200 && resRestore.status === 200) {
          console.log('\n🎉 ALL /api/v1/admin/backups ROUTES RESOLVED WITH HTTP 200 SUCCESS!\n');
        } else {
          console.error('❌ Route resolution returned non-200 status code.');
        }
      } catch (err) {
        console.error('❌ Route test error:', err.message);
      } finally {
        server.close();
        process.exit(0);
      }
    });
  } catch (err) {
    console.error('❌ Test Setup Failed:', err);
    process.exit(1);
  }
}

testRoutes();
