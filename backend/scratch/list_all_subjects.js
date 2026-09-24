import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Subject from '../models/modules/Subject.js';

async function listAllSubjects() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const subjects = await Subject.find({}).lean();
        console.log(`Total subjects: ${subjects.length}`);
        
        const countsByGrade = {};
        const schools = {};
        subjects.forEach(s => {
            countsByGrade[s.gradeLevel] = (countsByGrade[s.gradeLevel] || 0) + 1;
            schools[s.schoolId] = (schools[s.schoolId] || 0) + 1;
        });
        
        console.log('Counts by gradeLevel:', countsByGrade);
        console.log('Counts by schoolId:', schools);
        
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

listAllSubjects();
