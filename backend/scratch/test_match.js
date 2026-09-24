import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Period from '../models/modules/Period.js';
import Subject from '../models/modules/Subject.js';

async function testMatch() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const period = await Period.findOne({});
        console.log('Period schoolId:', period?.schoolId);

        const subject = await Subject.findOne({});
        console.log('Subject schoolId:', subject?.schoolId);

        const subjectsForPeriodSchool = await Subject.find({ schoolId: period?.schoolId }).lean();
        console.log(`Subjects for school ${period?.schoolId}: ${subjectsForPeriodSchool.length}`);
        
        if (subjectsForPeriodSchool.length > 0) {
            console.log('Sample subject schoolId matches period schoolId!');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

testMatch();
