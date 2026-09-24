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
import School from '../models/school/School.js';

async function run() {
    await connectDB();
    console.log('--- MongoDB Connected ---');

    // Find student named "eet" or "eer"
    const users = await User.find({ name: { $regex: /ee/i } }).lean();
    console.log('Found matching users:', users.map(u => ({ name: u.name, id: u._id, loginId: u.loginId })));

    for (const u of users) {
        const student = await Student.findOne({ user: u._id }).populate('school').lean();
        if (student) {
            console.log(`Student name: ${u.name}`);
            console.log(`School details:`, student.school ? { name: student.school.schoolName, id: student.school._id } : 'No school populated');
        }
    }

    process.exit(0);
}

run().catch(console.error);
