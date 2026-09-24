import 'dotenv/config';
import connectDB from '../config/database.js';
import User from '../models/users/user.model.js';
import School from '../models/school/School.js';
import Student from '../models/users/student.model.js';
import Class from '../models/organization/organizationClass.js';
import Section from '../models/school/Section.model.js';
import Parent from '../models/users/parent.model.js';
import Principal from '../models/users/principal.model.js';
import Admin from '../models/users/admin.model.js';
import Teacher from '../models/users/teacher.model.js';
import Accountant from '../models/users/accountant.model.js';
import StaffProfile from '../models/users/staffProfile.model.js';

async function test() {
  await connectDB();
  console.log("Connected to DB");
  try {
    const skip = 0;
    const limit = 1000;
    const userFilter = {};
    const [total, active, students, teachers, admins, users] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ status: "active" }),
        User.countDocuments({ role: "student" }),
        User.countDocuments({ role: "teacher" }),
        User.countDocuments({ role: "admin" }),
        User.find(userFilter)
          .populate("school", "schoolName principalName")
          .populate({
            path: "profileId",
            options: { strictPopulate: false },
            populate: [
              { path: "class", select: "name", options: { strictPopulate: false } },
              { path: "section", select: "name", options: { strictPopulate: false } },
              { path: "parent", populate: { path: "user", select: "name" }, options: { strictPopulate: false } }
            ]
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);
    console.log("Success! Total users found:", users.length);
  } catch (err) {
    console.error("Query failed with error:", err);
  }
  process.exit(0);
}

test();
