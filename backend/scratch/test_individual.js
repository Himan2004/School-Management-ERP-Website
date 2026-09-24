import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/users/user.model.js';
import axios from 'axios';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  
  const adminUsers = await User.find({ role: 'admin', status: 'active' });
  console.log(`Found ${adminUsers.length} active admin users.`);

  for (let i = 0; i < Math.min(5, adminUsers.length); i++) {
    const admin = adminUsers[i];
    console.log(`\n========================================`);
    console.log(`Testing Admin ${i+1}: ID=${admin._id}, LoginID=${admin.loginId}, Email=${admin.email}, School=${admin.school}`);
    
    const token = admin.generateToken();
    const config = {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 5000
    };

    const endpoints = [
      "/api/admin/dashboard-stats",
      "/api/admin/events/upcoming",
      "/api/admin/dashboard/activities",
      "/api/admin/attendance/dashboard-stats"
    ];

    for (const ep of endpoints) {
      try {
        const res = await axios.get(`http://localhost:5001${ep}`, config);
        console.log(`  SUCCESS [${ep}]: Status ${res.status}`);
      } catch (err) {
        if (err.response) {
          console.log(`  FAILED [${ep}]: Status ${err.response.status} -`, JSON.stringify(err.response.data));
        } else {
          console.log(`  FAILED [${ep}]: ${err.message}`);
        }
      }
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
