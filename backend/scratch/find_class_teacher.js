import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import connectDB from '../config/database.js';
import SubjectAssignment from '../models/principal/SubjectAssignment.model.js';
import User from '../models/users/user.model.js';
import Class from '../models/organization/organizationClass.js';

async function run() {
    try {
        await connectDB();
        console.log("--- Connected to DB ---");

        const assignments = await SubjectAssignment.find({ teacherUser: { $ne: null } })
            .populate("teacherUser", "name email loginId")
            .populate("class", "name")
            .lean();

        console.log(`Found ${assignments.length} non-null teacher assignments:`);
        assignments.forEach(a => {
            console.log(`  - Class: ${a.class?.name}, Section: ${a.section}, Teacher: ${a.teacherUser?.name} (${a.teacherUser?.email}, ${a.teacherUser?.loginId})`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
