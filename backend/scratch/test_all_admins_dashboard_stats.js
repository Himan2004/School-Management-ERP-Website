import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/users/user.model.js";
import School from "../models/school/School.js";
import Subject from "../models/modules/Subject.js";
import { getDashboardStats } from "../controllers/admin/adminController.js";

dotenv.config({ path: "../.env" });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    const admins = await User.find({ role: "admin" });
    console.log(`Found ${admins.length} admins.`);

    for (const admin of admins) {
      console.log(`Testing admin: ${admin.loginId} (${admin.name})`);
      // Simulate req and res
      const req = {
        user: await User.findById(admin._id).populate("school"),
        role: "admin"
      };
      
      const res = {
        statusCode: 200,
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: function(data) {
          console.log(`Response Code: ${this.statusCode}`);
          if (!data.success) {
            console.error("ERROR DATA:", data);
          } else {
            console.log("SUCCESS");
          }
        }
      };

      try {
        await getDashboardStats(req, res);
      } catch (err) {
        console.error("EXCEPTION FOR ADMIN:", admin.loginId, err);
      }
      console.log("-----------------------------------------");
    }
  } catch (error) {
    console.error("Global crash:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
