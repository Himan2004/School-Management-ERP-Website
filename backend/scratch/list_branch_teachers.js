import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import connectDB from '../config/database.js';
import User from '../models/users/user.model.js';
import Teacher from '../models/users/teacher.model.js';

async function run() {
    try {
        await connectDB();
        console.log("--- Connected to DB ---");

        const teacherProfiles = await Teacher.find({ school: "69fe09eedec901fd9887d235" });
        const userIds = teacherProfiles.map(p => p.user);

        const users = await User.find({ _id: { $in: userIds } });
        console.log(`Found ${users.length} teachers in Branch 1:`);
        users.forEach(u => {
            console.log(`  - Name: "${u.name}", Email: "${u.email}", LoginId: "${u.loginId}"`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
