import mongoose from "mongoose";
import "dotenv/config";

// Pre-load schemas to register them with Mongoose
import User from "../models/users/user.model.js";
import Class from "../models/organization/organizationClass.js";
import Section from "../models/school/Section.model.js";
import Student from "../models/users/student.model.js";
import Attendance from "../models/academic/attendance.model.js";
import School from "../models/school/School.js";

async function run() {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.\n");

    // Find Aarav Kumar student
    const student = await Student.findOne({ _id: "6a01d0d1bfced48a4bdfbed9" }).populate("user");
    if (!student) {
        console.error("Student Aarav Kumar not found!");
        await mongoose.connection.close();
        process.exit(1);
    }
    console.log(`Found Aarav Kumar: User ID is ${student.user?._id}`);

    const schoolObj = await School.findById(student.school);
    if (!schoolObj) {
        console.error("School not found!");
        await mongoose.connection.close();
        process.exit(1);
    }

    const teacher = await User.findOne({ role: "teacher", school: student.school }) || await User.findOne({ role: "admin" });

    // Determine section name
    let sectionName = "A";
    if (student.section) {
        if (mongoose.Types.ObjectId.isValid(student.section)) {
            const sectionObj = await Section.findById(student.section);
            if (sectionObj) {
                sectionName = sectionObj.name;
            }
        } else {
            sectionName = student.section.toString();
        }
    }

    // Define today's date at midnight UTC
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Delete existing daily class attendance for Aarav for today if any exists to avoid duplicate key error
    const deleteResult = await Attendance.deleteMany({
        school: student.school,
        class: student.class,
        section: sectionName,
        date: today,
        attendanceType: "class"
    });
    if (deleteResult.deletedCount > 0) {
        console.log(`Deleted ${deleteResult.deletedCount} existing attendance record(s) for today.`);
    }

    // Create daily attendance
    const attendanceDoc = await Attendance.create({
        organization: schoolObj.organization,
        school: student.school,
        academicYear: student.academicYear || "2025-2026",
        class: student.class,
        section: sectionName,
        attendanceType: "class",
        date: today,
        markedBy: teacher._id,
        markedByRole: teacher.role === "teacher" ? "teacher" : "admin",
        entries: [{
            student: student.user?._id,
            status: "present",
            remarks: "Marked present today via verify script"
        }]
    });

    console.log(`\n✔ Attendance marked successfully for today: ${today.toLocaleDateString("en-IN")}`);
    console.log(`Status: Present`);
    console.log("Attendance record:", JSON.stringify(attendanceDoc, null, 2));

    await mongoose.connection.close();
    console.log("Database connection closed.");
}

run().catch(async (err) => {
    console.error("Error occurred:", err);
    await mongoose.connection.close();
});
