import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/users/user.model.js';
import axios from 'axios';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  
  const adminUsers = await User.find({ role: 'admin', status: 'active' });
  console.log(`Found ${adminUsers.length} active admin users.`);

  const admin = adminUsers[0];
  console.log(`Testing with admin: ${admin.loginId}, school: ${admin.school}`);
  
  const token = admin.generateToken();
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };

  try {
    const res = await axios.get(`http://localhost:5001/api/admin/attendance/dashboard-stats`, config);
    console.log("SUCCESS:", res.data);
  } catch (err) {
    if (err.response) {
      console.log("FAILED WITH RESP:", err.response.status, err.response.data);
    } else {
      console.log("FAILED WITH ERR:", err.message);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
