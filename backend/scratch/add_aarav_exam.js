import mongoose from "mongoose";
import "dotenv/config";

// Pre-load schemas to register them with Mongoose
import User from "../models/users/user.model.js";
import Class from "../models/organization/organizationClass.js";
import Section from "../models/school/Section.model.js";
import Student from "../models/users/student.model.js";
import ExamSchedule from "../models/academic/examSchedule.model.js";
import ExamStructure from "../models/academic/examStructure.model.js";
import Marksheet from "../models/academic/marksheet.model.js";
import Subject from "../models/modules/Subject.js";

async function run() {
    console.log("==========================================");
    console.log("    ADD NEW EXAM FOR AARAV KUMAR          ");
    console.log("==========================================");
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.\n");

    const student = await Student.findOne({ _id: "6a01d0d1bfced48a4bdfbed9" }).populate("user");
    if (!student) {
        console.error("Student Aarav Kumar not found!");
        await mongoose.connection.close();
        process.exit(1);
    }
    console.log(`Found Aarav Kumar: User ID is ${student.user?._id}`);

    // Let's find an existing Marksheet for this student to copy organization/school config
    const existingMarksheet = await Marksheet.findOne({ student: student.user?._id });
    if (!existingMarksheet) {
        console.error("No existing marksheet found for Aarav to clone!");
        await mongoose.connection.close();
        process.exit(1);
    }
    console.log(`Found existing marksheet for examStructure ID: ${existingMarksheet.examStructure}`);

    // Load the original ExamStructure
    const origStructure = await ExamStructure.findById(existingMarksheet.examStructure);
    if (!origStructure) {
        console.error("Original ExamStructure not found!");
        await mongoose.connection.close();
        process.exit(1);
    }

    // 1. Clone & create new ExamStructure
    const newExamName = "Monthly Test 1";
    // Check if it already exists to avoid duplicates
    let newStructure = await ExamStructure.findOne({
        organization: origStructure.organization,
        school: origStructure.school,
        academicYear: origStructure.academicYear,
        examName: newExamName
    });

    if (!newStructure) {
        const structureData = origStructure.toObject();
        delete structureData._id;
        delete structureData.createdAt;
        delete structureData.updatedAt;
        structureData.examName = newExamName;
        structureData.examType = "Class Test";
        newStructure = await ExamStructure.create(structureData);
        console.log(`Created new ExamStructure: ${newStructure._id} (${newStructure.examName})`);
    } else {
        console.log(`ExamStructure "${newExamName}" already exists: ${newStructure._id}`);
    }

    // Load the original ExamSchedule
    const origSchedule = await ExamSchedule.findById(existingMarksheet.examSchedule);
    if (!origSchedule) {
        console.error("Original ExamSchedule not found!");
        await mongoose.connection.close();
        process.exit(1);
    }

    // 2. Clone & create new ExamSchedule
    let newSchedule = await ExamSchedule.findOne({
        school: origSchedule.school,
        examStructure: newStructure._id,
        class: origSchedule.class,
        section: origSchedule.section,
        academicYear: origSchedule.academicYear
    });

    if (!newSchedule) {
        const scheduleData = origSchedule.toObject();
        delete scheduleData._id;
        delete scheduleData.createdAt;
        delete scheduleData.updatedAt;
        scheduleData.examStructure = newStructure._id;
        scheduleData.status = "published";
        if (scheduleData.slots?.length) {
            // Set slot dates to today
            scheduleData.slots.forEach(slot => {
                slot.examDate = new Date();
            });
        }
        newSchedule = await ExamSchedule.create(scheduleData);
        console.log(`Created new ExamSchedule: ${newSchedule._id}`);
    } else {
        console.log(`ExamSchedule already exists: ${newSchedule._id}`);
    }

    // 3. Clone & create new Marksheet result
    let newMarksheet = await Marksheet.findOne({
        student: student.user?._id,
        examSchedule: newSchedule._id
    });

    if (!newMarksheet) {
        const marksheetData = existingMarksheet.toObject();
        delete marksheetData._id;
        delete marksheetData.createdAt;
        delete marksheetData.updatedAt;
        marksheetData.examSchedule = newSchedule._id;
        marksheetData.examStructure = newStructure._id;
        marksheetData.status = "published";
        marksheetData.publishedAt = new Date();
        
        // Let's modify scores slightly so we can visually identify it in the graphs
        marksheetData.subjectMarks.forEach(sm => {
            if (sm.theoryMarks) sm.theoryMarks = Math.min(sm.maxMarks, Math.floor(sm.theoryMarks * 0.9));
        });
        
        newMarksheet = await Marksheet.create(marksheetData);
        console.log(`Created new Marksheet: ${newMarksheet._id} with percentage ${newMarksheet.percentage}%`);
    } else {
        console.log(`Marksheet already exists: ${newMarksheet._id}`);
    }

    console.log("\n✔ All done successfully!");
    await mongoose.connection.close();
    console.log("Database connection closed.");
}

run().catch(async (err) => {
    console.error("Error occurred:", err);
    await mongoose.connection.close();
});
