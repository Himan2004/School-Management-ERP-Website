import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Organization from '../models/organization/Organization.js';
import SuperAdmin from '../models/superAdmin/SuperAdmin.js';
import User from '../models/users/user.model.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    console.log('\n--- Organizations and SuperAdmins ---');
    const orgs = await Organization.find().lean();
    for (const org of orgs) {
      const saProfile = await SuperAdmin.findById(org.superAdminProfile).lean();
      console.log(`Org: "${org.organizationName}" (${org._id}) - Status: ${org.status}`);
      console.log(`  SuperAdmin Profile: Name="${saProfile?.name}", Email="${saProfile?.email}", Phone="${saProfile?.phoneNumber}"`);
      
      // Let's check if there are users with superadmin roles or anything
      const user = await User.findOne({ email: saProfile?.email }).lean();
      if (user) {
        console.log(`  User: LoginID="${user.loginId}", Role="${user.role}", Status="${user.status}"`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
