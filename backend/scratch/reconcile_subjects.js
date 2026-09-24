import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Period from '../models/modules/Period.js';
import Subject from '../models/modules/Subject.js';

const TARGET_SCHOOL_ID = '69d2300baddb185a657d4e41'; // Blue hills high
const SOURCE_SCHOOL_ID = '69d22dadf2a9b20969cf6374'; // Delhi public school

async function reconcileSubjects() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        // 1. Fetch subjects from the source school
        const sourceSubjects = await Subject.find({ schoolId: SOURCE_SCHOOL_ID }).lean();
        console.log(`Fetched ${sourceSubjects.length} source subjects.`);

        // 2. Clone them to target school if they don't exist
        let clonedCount = 0;
        let existedCount = 0;
        for (const s of sourceSubjects) {
            const exists = await Subject.findOne({
                schoolId: TARGET_SCHOOL_ID,
                subjectCode: s.subjectCode
            });

            if (!exists) {
                const clone = new Subject({
                    subjectName: s.subjectName,
                    subjectCode: s.subjectCode,
                    description: s.description,
                    gradeLevel: s.gradeLevel,
                    credits: s.credits,
                    status: s.status,
                    schoolId: TARGET_SCHOOL_ID
                });
                await clone.save();
                clonedCount++;
            } else {
                existedCount++;
            }
        }
        console.log(`Cloning complete. Cloned: ${clonedCount}, Already Existed: ${existedCount}`);

        // 3. Load target subjects
        const targetSubjects = await Subject.find({ schoolId: TARGET_SCHOOL_ID }).lean();

        // 4. Load target periods
        const targetPeriods = await Period.find({ schoolId: TARGET_SCHOOL_ID });
        console.log(`Found ${targetPeriods.length} periods for target school.`);

        // 5. Associate subjects to periods
        for (const period of targetPeriods) {
            let normGrade = period.gradeLevel;
            if (normGrade && !normGrade.toLowerCase().startsWith('class')) {
                normGrade = `Class ${normGrade}`;
            }

            // Find matching subjects for this grade level
            const matchedSubjects = targetSubjects.filter(s => {
                if (!s.gradeLevel) return false;
                return s.gradeLevel.trim().toLowerCase() === normGrade.trim().toLowerCase();
            });

            if (matchedSubjects.length > 0) {
                period.subjects = matchedSubjects.map(s => s._id);
                await period.save();
                console.log(`Associated ${matchedSubjects.length} subjects to Period "${period.periodName}" (gradeLevel: ${period.gradeLevel})`);
            } else {
                console.log(`No matching subjects found for Period "${period.periodName}" (gradeLevel: ${period.gradeLevel}, normalized: ${normGrade})`);
            }
        }

        console.log('Reconciliation finished successfully.');
        await mongoose.disconnect();
    } catch (err) {
        console.error('Error during reconciliation:', err);
    }
}

reconcileSubjects();
