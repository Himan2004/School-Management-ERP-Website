import mongoose from "mongoose";
import dotenv from "dotenv";
import School from "../models/school/School.js";
import User from "../models/users/user.model.js";
import Subject from "../models/modules/Subject.js";

dotenv.config({ path: "../.env" });

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully!");

    // Let's get one school
    const school = await School.findOne();
    if (!school) {
      console.log("No school found!");
      return;
    }
    const schoolId = school._id;
    console.log("Found School:", school.schoolName, "ID:", schoolId);

    console.log("Calculating student statistics...");
    const totalStudents = await User.countDocuments({ school: schoolId, role: "student" });
    const activeStudents = await User.countDocuments({ school: schoolId, role: "student", status: "active" });
    const inactiveStudents = await User.countDocuments({ school: schoolId, role: "student", status: "inactive" });
    console.log("Students:", { totalStudents, activeStudents, inactiveStudents });

    console.log("Calculating subject statistics...");
    const totalSubjects = await Subject.countDocuments({ schoolId });
    const activeSubjects = await Subject.countDocuments({ schoolId, status: 'active' });
    const inactiveSubjects = await Subject.countDocuments({ schoolId, status: 'inactive' });
    console.log("Subjects:", { totalSubjects, activeSubjects, inactiveSubjects });

    console.log("Calculating staff statistics...");
    const totalStaff = await User.countDocuments({ school: schoolId, role: { $in: ["accountant", "support_staff"] } });
    const activeStaff = await User.countDocuments({ school: schoolId, role: { $in: ["accountant", "support_staff"] }, status: 'active' });
    const inactiveStaff = await User.countDocuments({ school: schoolId, role: { $in: ["accountant", "support_staff"] }, status: 'inactive' });
    console.log("Staff:", { totalStaff, activeStaff, inactiveStaff });

    console.log("Calculating teacher statistics...");
    const totalTeachers = await User.countDocuments({ school: schoolId, role: "teacher" });
    const activeTeachers = await User.countDocuments({ school: schoolId, role: "teacher", status: 'active' });
    const inactiveTeachers = await User.countDocuments({ school: schoolId, role: "teacher", status: 'inactive' });
    console.log("Teachers:", { totalTeachers, activeTeachers, inactiveTeachers });

    console.log("Getting previous stats...");
    const previousStats = school.previousStats || {
      students: 0,
      teachers: 0,
      staff: 0,
      subjects: 0
    };
    console.log("Previous stats:", previousStats);

    const calculateTrend = (current, previous) => {
      if (previous === 0) return '+0%';
      const change = ((current - previous) / previous) * 100;
      return (change >= 0 ? '+' : '') + change.toFixed(1) + '%';
    };

    console.log("Calculating trends...");
    console.log("Student trend:", calculateTrend(totalStudents, previousStats.students));

    const lastUpdated = school.previousStats?.updatedAt ? new Date(school.previousStats.updatedAt) : null;
    console.log("Last updated:", lastUpdated);

    const shouldUpdatePrevious = !lastUpdated || (new Date() - lastUpdated) > 24 * 60 * 60 * 1000;
    console.log("Should update previous:", shouldUpdatePrevious);

    if (shouldUpdatePrevious && (totalStudents > 0 || totalTeachers > 0 || totalStaff > 0 || totalSubjects > 0)) {
      console.log("Attempting to update previousStats...");
      school.previousStats = {
        students: totalStudents,
        teachers: totalTeachers,
        staff: totalStaff,
        subjects: totalSubjects,
        updatedAt: new Date()
      };
      await school.save();
      console.log("Saved school successfully!");
    }
  } catch (error) {
    console.error("CRASH ERROR:", error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
