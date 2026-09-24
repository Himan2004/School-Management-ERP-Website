import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/users/user.model.js';
import axios from 'axios';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log("Connected to DB");

  const adminUsers = await User.find({ role: 'admin', status: 'active' });
  console.log(`Found ${adminUsers.length} active admin users.`);
  if (adminUsers.length === 0) {
    console.log("No active admin users found.");
    process.exit(1);
  }

  const admin = adminUsers[0];
  console.log("Using active admin user:", admin.loginId, admin.email, "status:", admin.status);

  const token = admin.generateToken();
  console.log("Generated token.");

  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  const endpoints = [
    "/api/admin/dashboard-stats",
    "/api/admin/events/upcoming",
    "/api/admin/dashboard/activities",
    "/api/admin/attendance/dashboard-stats"
  ];

  for (const ep of endpoints) {
    console.log(`\nTesting endpoint: ${ep}...`);
    try {
      const res = await axios.get(`http://localhost:5001${ep}`, config);
      console.log(`SUCCESS [${ep}]: Status ${res.status}`);
    } catch (err) {
      if (err.response) {
        console.log(`FAILED [${ep}]: Status ${err.response.status} -`, JSON.stringify(err.response.data));
      } else {
        console.log(`FAILED [${ep}]:`, err.message);
      }
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
