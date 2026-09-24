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

async function run() {
    await connectDB();
    console.log('--- MongoDB Connected ---');

    // 1. Find all classes
    const classes = await Class.find({ name: /Senior/i }).lean();
    console.log(`Matching classes:`, classes.map(c => ({ name: c.name, id: c._id })));

    for (const c of classes) {
        const students = await Student.find({ class: c._id }).populate('user').lean();
        console.log(`Students in class ${c.name} (${c._id}):`);
        students.forEach(s => {
            console.log(`  - Student Name: ${s.user?.name}, Username: ${s.user?.loginId}, _id: ${s.user?._id}, academicYear: ${s.academicYear}`);
        });
    }

    process.exit(0);
}

run().catch(console.error);
