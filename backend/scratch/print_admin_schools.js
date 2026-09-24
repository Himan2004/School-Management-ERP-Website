import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/users/user.model.js';
import School from '../models/school/School.js';

async function printAdmins() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admins = await User.find({ role: 'admin' }).populate('school').lean();
        console.log(`Found ${admins.length} admins:`);
        admins.forEach(admin => {
            console.log(`- LoginId: ${admin.loginId}, Name: ${admin.name}, School ID: ${admin.school?._id}, School Name: ${admin.school?.schoolName}`);
        });
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

printAdmins();
