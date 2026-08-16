import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../modules/auth/user.model.js';
import { ShopSettings } from '../modules/settings/models/shopSettings.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function migrateShopSettings() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mandhi_erp';
  console.log(`Connecting to MongoDB at ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  const users = await User.find({}).exec();
  console.log(`Found ${users.length} users in database.`);

  const rawSettings = await ShopSettings.find({}).exec();
  console.log(`Found ${rawSettings.length} raw ShopSettings documents in database.`);

  if (users.length === 0) {
    console.log('No users found in database.');
    await mongoose.disconnect();
    return;
  }

  // Find primary user (e.g., admin / first user)
  const primaryUser = users[0];

  // If there's an existing ShopSettings record without a userId, attach it to primaryUser
  for (const setting of rawSettings) {
    if (!setting.userId) {
      setting.userId = primaryUser._id;
      if (!setting.ownerName && primaryUser.ownerName) setting.ownerName = primaryUser.ownerName;
      if (!setting.mobile && primaryUser.mobile) setting.mobile = primaryUser.mobile;
      await setting.save();
      console.log(`Attached existing ShopSettings document (${setting._id}) to user ${primaryUser.mobile}`);
    }
  }

  // Ensure EVERY user has a ShopSettings document
  for (const user of users) {
    const existing = await ShopSettings.findOne({ userId: user._id }).exec();
    if (!existing) {
      await ShopSettings.create({
        userId: user._id,
        shopName: `${user.ownerName || 'My'}'s Agri Store`,
        ownerName: user.ownerName || '',
        mobile: user.mobile || '',
        whatsappNumber: user.mobile || '',
      });
      console.log(`Created default user-scoped ShopSettings for user ${user.mobile}`);
    }
  }

  console.log('✅ Migration of ShopSettings to user-scoped multi-tenant architecture completed successfully.');
  await mongoose.disconnect();
}

migrateShopSettings().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
