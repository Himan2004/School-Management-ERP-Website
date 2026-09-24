import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import connectDB from '../config/database.js';
import User from '../models/users/user.model.js';
import Student from '../models/users/student.model.js';
import Class from '../models/organization/organizationClass.js';
import Section from '../models/school/Section.model.js';
import SubjectAssignment from '../models/principal/SubjectAssignment.model.js';
import Subject from '../models/modules/Subject.js';

async function run() {
    await connectDB();
    console.log('--- MongoDB Connected ---');

    // Find student by loginId
    const studentUser = await User.findOne({ loginId: "STU-SXPTS2706" });
    if (!studentUser) {
        console.log('Student STU-SXPTS2706 not found');
        process.exit(0);
    }
    console.log(`Found student: ${studentUser.name} (${studentUser.loginId}), _id: ${studentUser._id}`);

    const studentProfile = await Student.findOne({ user: studentUser._id }).populate('class section');
    if (!studentProfile) {
        console.log('Student profile not found');
        process.exit(0);
    }
    console.log(`Class: ${studentProfile.class?.name} (${studentProfile.class?._id}), Section: ${studentProfile.section?.name} (${studentProfile.section?._id}), AcademicYear: ${studentProfile.academicYear}`);

    // Fetch SubjectAssignments
    const assignments = await SubjectAssignment.find({
        class: studentProfile.class?._id,
        // Let's search with or without section first
    }).populate('subject').populate('teacherUser');

    console.log(`SubjectAssignments count for class ${studentProfile.class?.name}: ${assignments.length}`);
    for (const a of assignments) {
        console.log(`  - Subject: ${a.subject?.subjectName || a.subject?.name}, Teacher: ${a.teacherUser?.name}, Section: ${a.section}`);
    }

    process.exit(0);
}

run().catch(console.error);
