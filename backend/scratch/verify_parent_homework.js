import mongoose from "mongoose";
import "dotenv/config";

// Pre-load schemas to register them with Mongoose
import User from "../models/users/user.model.js";
import Class from "../models/organization/organizationClass.js";
import Section from "../models/school/Section.model.js";
import Parent from "../models/users/parent.model.js";
import Student from "../models/users/student.model.js";
import Homework from "../models/academic/homework.model.js";
import HomeworkSubmission from "../models/academic/HomeworkSubmission.model.js";
import Subject from "../models/modules/Subject.js";

import { getHomeworkStats, getHomeworkList } from "../controllers/parent/homeworkController.js";

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

async function verifyParentHomework() {
    console.log("==========================================");
    console.log("   PARENT HOMEWORK VERIFICATION   ");
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
        query: { student_id: studentId.toString() }
    };

    console.log("\nExecuting getHomeworkStats controller...");
    const resStats = mockRes();
    await getHomeworkStats(req, resStats);
    console.log("Stats response:", JSON.stringify(resStats.data, null, 2));

    console.log("\nExecuting getHomeworkList controller...");
    const resList = mockRes();
    await getHomeworkList(req, resList);
    console.log("List response count:", resList.data?.data?.length || 0);
    console.log("Assigned Homework List:");
    console.log(JSON.stringify(resList.data?.data, null, 2));

    await mongoose.connection.close();
    console.log("\nDatabase connection closed.");
}

verifyParentHomework().catch(err => {
    console.error("Verification failed with error:", err);
    mongoose.connection.close();
});
