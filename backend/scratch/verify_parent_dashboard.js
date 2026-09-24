import mongoose from "mongoose";
import "dotenv/config";

// Pre-load schemas to register them with Mongoose
import User from "../models/users/user.model.js";
import Class from "../models/organization/organizationClass.js";
import Section from "../models/school/Section.model.js";
import Parent from "../models/users/parent.model.js";
import Student from "../models/users/student.model.js";

import { getParentDashboardStats } from "../controllers/parent/dashboardController.js";

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

async function verifyParentDashboard() {
    console.log("==========================================");
    console.log("   PARENT DASHBOARD VERIFICATION   ");
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
        console.log("Parent user not found. Searching for any parent...");
        const parentDoc = await Parent.findOne().populate("user");
        if (!parentDoc) {
            console.log("No parents found.");
            await mongoose.connection.close();
            return;
        }
        testParent(parentDoc);
    } else {
        const parentDoc = await Parent.findOne({ user: parentUser._id }).populate("user");
        if (!parentDoc) {
            console.log("Parent profile not found for user.");
            await mongoose.connection.close();
            return;
        }
        await testParent(parentDoc);
    }
}

async function testParent(parentDoc) {
    console.log(`Found parent: ${parentDoc.fatherName || parentDoc.motherName || "Parent"} (User ID: ${parentDoc.user?._id})`);
    
    const req = {
        user: parentDoc.user,
        query: {}
    };
    const res = mockRes();

    console.log("Executing getParentDashboardStats...");
    await getParentDashboardStats(req, res);

    console.log("Response status code:", res.statusCode || 200);
    console.log("Response data:", JSON.stringify(res.data, null, 2));

    await mongoose.connection.close();
    console.log("Database connection closed.");
}

verifyParentDashboard().catch(err => {
    console.error("Verification failed with error:", err);
    mongoose.connection.close();
});
