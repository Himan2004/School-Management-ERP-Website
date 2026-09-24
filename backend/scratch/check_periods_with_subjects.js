import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Period from '../models/modules/Period.js';
import Subject from '../models/modules/Subject.js';

async function checkPeriods() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const periods = await Period.find({}).populate('subjects').lean();
        console.log('Total Periods:', periods.length);
        periods.forEach(p => {
            console.log(`Period ID: ${p._id}, periodName: "${p.periodName}", gradeLevel: "${p.gradeLevel}", subjects count: ${p.subjects ? p.subjects.length : 0}`);
            if (p.subjects && p.subjects.length > 0) {
                p.subjects.forEach(s => {
                    console.log(`  - Subject: ${s.subjectName} (${s._id})`);
                });
            }
        });
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkPeriods();
