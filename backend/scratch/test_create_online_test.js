import "dotenv/config";
import mongoose from "mongoose";

const dbUrl = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/GraphuraSchool";
await mongoose.connect(dbUrl);
console.log("Connected to MongoDB.");

import School from "../models/school/School.js";
import Organization from "../models/organization/Organization.js";
import Class from "../models/organization/organizationClass.js";
import User from "../models/users/user.model.js";
import Teacher from "../models/users/teacher.model.js";
import OnlineTest from "../models/academic/OnlineTest.model.js";
import Notice from "../models/common/Notice.js";
import Notification from "../models/common/Notification.js";
import { createTest } from "../controllers/teacher/onlineTestController.js";

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

try {
    // 1. Get teacher Subject Teacher 3
    const teacherUser = await User.findOne({ name: { $regex: "Subject Teacher 3", $options: "i" } }).populate({
        path: "school",
        populate: {
            path: "organization"
        }
    });

    if (!teacherUser) {
        console.error("Subject Teacher 3 not found!");
        process.exit(1);
    }
    console.log(`Teacher found. School ID: ${teacherUser.school?._id}, Org ID: ${teacherUser.school?.organization?._id}`);

    // Clean up old tests with the same test title
    await OnlineTest.deleteMany({ title: "Today's Live Physics Mock Test" });
    await Notice.deleteMany({ title: "New Online Test: Today's Live Physics Mock Test" });

    const req = {
        user: {
            _id: teacherUser._id,
            school: teacherUser.school,
            name: teacherUser.name,
            role: "teacher"
        },
        body: {
            title: "Today's Live Physics Mock Test",
            description: "Live practice mock test for Term 1 physics.",
            examType: "weekly_test",
            subject: "Social Science",
            class: "class 10",
            section: "All Sections",
            duration: 45,
            totalMarks: 50,
            passingMarks: 20,
            startDate: new Date().toISOString().split("T")[0],
            startTime: "10:00",
            endDate: new Date().toISOString().split("T")[0],
            endTime: "11:00",
            status: "published",
            instructions: "Answer all questions correctly.",
            randomizeQuestions: false,
            showResults: true,
            allowReview: true,
            allowRetake: false,
            maxAttempts: 1,
            questions: [
                {
                    type: "mcq",
                    question: "What is the speed of light in a vacuum?",
                    options: ["3x10^8 m/s", "3x10^6 m/s", "3x10^5 m/s", "3x10^7 m/s"],
                    correctAnswer: "3x10^8 m/s",
                    marks: 5,
                    difficulty: "easy"
                }
            ]
        }
    };

    const res = mockRes();
    await createTest(req, res);
    console.log("Create Test Controller Response Status:", res.statusCode || 201);
    console.log("Response Data:", res.data);

    // Verify online test document exists
    const testDoc = await OnlineTest.findOne({ title: "Today's Live Physics Mock Test" });
    console.log("OnlineTest document exists in DB:", !!testDoc);

    // Verify notice exists
    const noticeDoc = await Notice.findOne({ title: "New Online Test: Today's Live Physics Mock Test" });
    console.log("Notice document exists in DB:", !!noticeDoc);

} catch (err) {
    console.error("Error:", err);
} finally {
    await mongoose.connection.close();
}
