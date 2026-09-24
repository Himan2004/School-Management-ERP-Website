import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Period from '../models/modules/Period.js';
import Subject from '../models/modules/Subject.js';
import User from '../models/users/user.model.js';
import School from '../models/school/School.js';

async function checkSchoolIds() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const schools = await School.find({}).lean();
        console.log('--- Schools in Database ---');
        schools.forEach(s => console.log(`School ID: ${s._id}, Name: ${s.schoolName || s.name}`));

        console.log('\n--- Distinct School IDs in Periods ---');
        const periodSchools = await Period.distinct('schoolId');
        periodSchools.forEach(id => console.log(id));

        console.log('\n--- Distinct School IDs in Subjects ---');
        const subjectSchools = await Subject.distinct('schoolId');
        subjectSchools.forEach(id => console.log(id));

        console.log('\n--- Distinct School IDs in Users ---');
        const userSchools = await User.distinct('school');
        userSchools.forEach(id => console.log(id));

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkSchoolIds();
