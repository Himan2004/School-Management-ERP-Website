import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from '../config/database.js';
import User from '../models/users/user.model.js';

async function run() {
    await connectDB();
    console.log('--- MongoDB Connected ---');

    const u = await User.findOne({ loginId: 'PRL-FSX7493' });
    if (u) {
        console.log(`Principal found: ${u.name}, loginId: ${u.loginId}, school ID: ${u.school}`);
    } else {
        console.log('Principal PRL-FSX7493 not found');
    }

    process.exit(0);
}

run().catch(console.error);
