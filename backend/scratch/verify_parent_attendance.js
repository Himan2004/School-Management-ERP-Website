import mongoose from "mongoose";
import "dotenv/config";

// Pre-load schemas to register them with Mongoose
import User from "../models/users/user.model.js";
import Class from "../models/organization/organizationClass.js";
import Section from "../models/school/Section.model.js";
import Parent from "../models/users/parent.model.js";
import Student from "../models/users/student.model.js";
import Attendance from "../models/academic/attendance.model.js";
import StudentLeave from "../models/academic/StudentLeave.model.js";
import School from "../models/school/School.js";

import { 
    getAttendanceSummary, 
    getAttendanceCalendar, 
    getLeaveRequests, 
    getAttendanceList 
} from "../controllers/parent/attendanceController.js";

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function verifyParentAttendance() {
    console.log("==========================================");
    console.log("   PARENT ATTENDANCE VERIFICATION   ");
    console.log("==========================================");
    
    console.log("Connecting to Database...");
    if (!process.env.MONGODB_URI) {
        console.error("Error: MONGODB_URI is not defined in process.env");
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.\n");

    console.log("Searching for parent user PAR-SXPRS2554...");
    const parentUser = await User.findOne({ loginId: "PAR-SXPRS2554" });
    if (!parentUser) {
        console.log("Parent user not found.");
        await mongoose.connection.close();
        return;
    }

    const parentDoc = await Parent.findOne({ user: parentUser._id }).populate("user");
    if (!parentDoc || !parentDoc.students?.length) {
        console.log("Parent profile not found or has no students.");
        await mongoose.connection.close();
        return;
    }

    const studentId = parentDoc.students[0];
    const student = await Student.findById(studentId);

    // Let's seed a sample daily attendance record if none exist
    const attendanceCount = await Attendance.countDocuments({ "entries.student": student.user });
    console.log(`Total attendance records for student: ${attendanceCount}`);
    if (attendanceCount === 0) {
        console.log("Seeding dummy attendance record for student...");
        await Attendance.create({
            school: student.school,
            class: student.class,
            section: student.section,
            attendanceType: "daily",
            date: new Date(),
            entries: [{
                student: student.user,
                status: "present",
                remarks: "On Time"
            }],
            takenBy: parentUser._id
        });
        console.log("Attendance record seeded successfully.");
    }

    // Let's also check leave requests
    const leaveCount = await StudentLeave.countDocuments({ student: student.user });
    console.log(`Total leave requests for student: ${leaveCount}`);
    if (leaveCount === 0) {
        console.log("Seeding dummy leave request for student...");
        const schoolObj = await School.findById(student.school);
        if (schoolObj) {
            await StudentLeave.create({
                organization: schoolObj.organization,
                school: student.school,
                class: student.class,
                section: student.section,
                student: student.user,
                leaveType: "sick",
                fromDate: new Date(),
                toDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                totalDays: 2,
                reason: "Fever",
                appliedBy: parentUser._id,
                status: "approved"
            });
            console.log("Leave request seeded successfully.");
        } else {
            console.log("School not found, skipping leave request seeding.");
        }
    }

    // Call getAttendanceSummary
    const req = {
        user: parentDoc.user,
        query: { student_id: studentId.toString() }
    };
    
    console.log("\n[1/3] Testing getAttendanceSummary...");
    const resSummary = mockRes();
    await getAttendanceSummary(req, resSummary);
    console.log("Summary response:", JSON.stringify(resSummary.data, null, 2));

    console.log("\n[2/3] Testing getLeaveRequests...");
    const resLeaves = mockRes();
    await getLeaveRequests(req, resLeaves);
    console.log("Leaves response (count):", resLeaves.data?.data?.length);

    console.log("\n[3/3] Testing getAttendanceList...");
    const resList = mockRes();
    await getAttendanceList(req, resList);
    console.log("List response (first record):", JSON.stringify(resList.data?.data?.[0], null, 2));

    await mongoose.connection.close();
    console.log("\nDatabase connection closed.");
}

verifyParentAttendance().catch(err => {
    console.error("Verification failed with error:", err);
    mongoose.connection.close();
});
