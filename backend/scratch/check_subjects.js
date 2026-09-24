import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Subject from '../models/modules/Subject.js';

async function checkSubjects() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const subjects = await Subject.find({}).lean();
        console.log('Total Subjects:', subjects.length);
        subjects.slice(0, 15).forEach(s => {
            console.log(`Subject: ${s.subjectName}, Code: ${s.subjectCode}, gradeLevel: "${s.gradeLevel}", classId: ${s.classId}`);
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkSubjects();
