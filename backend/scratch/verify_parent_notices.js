import mongoose from "mongoose";
import "dotenv/config";

// Pre-load schemas to register them with Mongoose
import User from "../models/users/user.model.js";
import Class from "../models/organization/organizationClass.js";
import Section from "../models/school/Section.model.js";
import Parent from "../models/users/parent.model.js";
import Student from "../models/users/student.model.js";
import Notice from "../models/common/Notice.js";

import { getNotices } from "../controllers/parent/parentNoticeController.js";

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

async function verifyParentNotices() {
    console.log("==========================================");
    console.log("   PARENT NOTICES VERIFICATION   ");
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
    if (!parentDoc) {
        console.log("Parent profile not found for user.");
        await mongoose.connection.close();
        return;
    }

    // Check if there are any notices in the DB
    const totalNotices = await Notice.countDocuments();
    console.log(`Total notices in database: ${totalNotices}`);

    // If no notices, let's seed a sample notice for the child's class and school!
    if (totalNotices === 0 && parentDoc.students?.length > 0) {
        console.log("Seeding a mock notice for testing...");
        const student = await Student.findById(parentDoc.students[0]);
        await Notice.create({
            title: "Annual Sports Meet 2026",
            content: "Dear Parents, the annual sports meet is scheduled next Friday. Please make sure students arrive in physical training uniform.",
            category: "General",
            audience: ["parent"],
            status: "published",
            school: student.school,
            class: student.class,
            section: student.section,
            createdAt: new Date()
        });
        console.log("Mock notice seeded successfully.");
    }

    const req = {
        user: parentDoc.user,
        query: {}
    };
    const res = mockRes();

    console.log("Executing getNotices controller...");
    await getNotices(req, res);

    console.log("Response status code:", res.statusCode || 200);
    console.log("Response data:", JSON.stringify(res.data, null, 2));

    await mongoose.connection.close();
    console.log("Database connection closed.");
}

verifyParentNotices().catch(err => {
    console.error("Verification failed with error:", err);
    mongoose.connection.close();
});
