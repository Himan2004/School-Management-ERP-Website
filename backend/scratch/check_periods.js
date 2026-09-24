import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Period from '../models/modules/Period.js';

async function checkPeriodGrades() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const periods = await Period.find({}).lean();
        periods.forEach(p => {
            console.log(`Period: "${p.periodName}", Section: "${p.section}", gradeLevel: "${p.gradeLevel}"`);
        });
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkPeriodGrades();
