import mongoose from 'mongoose';
import 'dotenv/config';
import Student from '../models/users/student.model.js';
import User from '../models/users/user.model.js';
import Attendance from '../models/academic/attendance.model.js';
import Marksheet from '../models/academic/marksheet.model.js';
import '../models/organization/organizationClass.js';
import '../models/school/Section.model.js';
import '../models/school/School.js';

async function testDashboardController() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        const user = await User.findOne({ name: 'eet', role: 'student' }).lean();
        if (!user) {
            console.log("Student 'eet' not found");
            await mongoose.disconnect();
            return;
        }

        const userId = user._id;
        console.log(`User ID: ${userId}`);

        // ==================== 1. STUDENT PROFILE ====================
        let studentProfile = await Student.findOne({ user: userId })
            .populate("user", "name email loginId phone photo")
            .populate("class", "name numericLevel");

        if (studentProfile) {
            if (studentProfile.section && mongoose.Types.ObjectId.isValid(studentProfile.section)) {
                await studentProfile.populate("section", "name");
            }
            studentProfile = studentProfile.toObject();
        }

        if (!studentProfile) {
            console.log("Student profile not found");
            await mongoose.disconnect();
            return;
        }

        // ==================== 2. ATTENDANCE DATA ====================
        let present = 0;
        let absent = 0;
        let late = 0;
        let attendancePercentage = 0;
        let subjectWiseAttendance = [];
        let monthlyAttendanceTrend = [];

        try {
            // Get attendance records for the student
            const attendanceRecords = await Attendance.find({ 
                "entries.student": userId 
            }).sort({ date: -1 }).lean();

            console.log(`Attendance documents found in DB: ${attendanceRecords.length}`);

            if (attendanceRecords && attendanceRecords.length > 0) {
                let totalClasses = 0;
                let presentCount = 0;
                let absentCount = 0;
                let lateCount = 0;

                for (const record of attendanceRecords) {
                    const entry = record.entries?.find(e => e.student.toString() === userId.toString());
                    if (entry) {
                        totalClasses++;
                        if (entry.status === "present") presentCount++;
                        else if (entry.status === "absent") absentCount++;
                        else if (entry.status === "late") lateCount++;
                    } else {
                        console.log(`Entry not found for student inside record ID ${record._id}`);
                    }
                }

                present = presentCount;
                absent = absentCount;
                late = lateCount;
                attendancePercentage = totalClasses > 0 
                    ? parseFloat(((presentCount + lateCount * 0.5) / totalClasses * 100).toFixed(1)) 
                    : 0;

                console.log(`Calculated totals - Present: ${present}, Absent: ${absent}, Late: ${late}, Pct: ${attendancePercentage}`);
            }
        } catch (err) {
            console.error("Error fetching attendance in controller:", err);
        }

        await mongoose.disconnect();
        console.log("Disconnected.");
    } catch (error) {
        console.error("Overall error:", error);
    }
}

testDashboardController();
