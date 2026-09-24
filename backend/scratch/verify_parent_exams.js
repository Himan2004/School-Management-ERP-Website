import mongoose from "mongoose";
import "dotenv/config";

// Pre-load schemas to register them with Mongoose
import User from "../models/users/user.model.js";
import Class from "../models/organization/organizationClass.js";
import Section from "../models/school/Section.model.js";
import Parent from "../models/users/parent.model.js";
import Student from "../models/users/student.model.js";
import ExamSchedule from "../models/academic/examSchedule.model.js";
import ExamStructure from "../models/academic/examStructure.model.js";
import Marksheet from "../models/academic/marksheet.model.js";
import Subject from "../models/modules/Subject.js";

import { 
    getStudentSchedules, 
    getStudentResults, 
    getStudentPerformanceTrend, 
    getStudentSubjectAnalysis 
} from "../controllers/parent/parentExamController.js";

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

async function verifyParentExams() {
    console.log("==========================================");
    console.log("   PARENT EXAMS & ANALYTICS VERIFICATION   ");
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
    console.log(`Found linked student Aarav Kumar (User ID: ${student.user})`);

    const req = {
        user: parentDoc.user,
        params: { studentId: studentId.toString() },
        query: { student_id: studentId.toString() }
    };

    console.log("\n[1/4] Testing getStudentSchedules...");
    const resSchedules = mockRes();
    await getStudentSchedules(req, resSchedules);
    console.log("Schedules Count:", resSchedules.data?.data?.length || 0);

    console.log("\n[2/4] Testing getStudentResults...");
    const resResults = mockRes();
    await getStudentResults(req, resResults);
    console.log("Results Count:", resResults.data?.data?.length || 0);

    // Calculate unique exams matching the logic in ParentExam.jsx
    const uniqueExams = new Set();
    const schedulesList = resSchedules.data?.data || [];
    const resultsList = resResults.data?.data || [];

    resultsList.forEach(res => {
        const name = res.examSchedule?.examStructure?.examName || "Exam";
        uniqueExams.add(name);
    });
    schedulesList.forEach(sch => {
        const name = sch.examStructure?.examName || "Scheduled Exam";
        uniqueExams.add(name);
    });

    console.log(`\n➡ Unique Exams count calculated for UI stats card: ${uniqueExams.size}`);
    console.log("Unique exam names:", Array.from(uniqueExams));

    console.log("\n[3/4] Testing getStudentPerformanceTrend (New Exams Controller)...");
    const resTrend = mockRes();
    await getStudentPerformanceTrend(req, resTrend);
    console.log("Performance Trend data:", JSON.stringify(resTrend.data?.data, null, 2));

    console.log("\n[4/4] Testing getStudentSubjectAnalysis (New Exams Controller)...");
    const resAnalysis = mockRes();
    await getStudentSubjectAnalysis(req, resAnalysis);
    console.log("Subject Analysis data:", JSON.stringify(resAnalysis.data?.data, null, 2));

    await mongoose.connection.close();
    console.log("\nDatabase connection closed.");
}

verifyParentExams().catch(err => {
    console.error("Verification failed with error:", err);
    mongoose.connection.close();
});
