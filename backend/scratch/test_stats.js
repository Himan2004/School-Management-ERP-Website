import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/users/user.model.js';
import School from '../models/school/School.js';
import axios from 'axios';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  
  const adminUsers = await User.find({ role: 'admin', status: 'active' });
  console.log(`Found ${adminUsers.length} active admin users.`);

  for (let i = 0; i < adminUsers.length; i++) {
    const admin = adminUsers[i];
    const token = admin.generateToken();
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };

    try {
      const res = await axios.get(`http://localhost:5001/api/admin/dashboard-stats`, config);
      console.log(`Admin ${admin.loginId} (${admin.email}): SUCCESS 200`);
    } catch (err) {
      if (err.response) {
        console.log(`Admin ${admin.loginId} (${admin.email}): FAILED ${err.response.status} - ${err.response.data.message}`);
      } else {
        console.log(`Admin ${admin.loginId} (${admin.email}): ERR ${err.message}`);
      }
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
