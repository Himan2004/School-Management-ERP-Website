import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import connectDB from '../config/database.js';
import User from '../models/users/user.model.js';

async function run() {
    await connectDB();
    console.log('--- MongoDB Connected ---');

    const loginId = 'STU-SXPTS2706';
    const user = await User.findOne({ loginId: loginId });
    if (!user) {
        console.error(`User ${loginId} not found!`);
        process.exit(1);
    }

    user.password = 'Student@123';
    await user.save();
    console.log(`Successfully updated password for ${loginId} to 'Student@123'`);

    process.exit(0);
}

run().catch(console.error);
