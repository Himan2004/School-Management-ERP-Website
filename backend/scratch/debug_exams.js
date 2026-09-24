import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import connectDB from '../config/database.js';
import OrganizationSubjects from '../models/organization/organizationSubjects.js';
import Subject from '../models/modules/Subject.js';

async function run() {
    await connectDB();
    console.log('Connected');

    const orgSubs = await OrganizationSubjects.find({}).lean();
    console.log(`Found ${orgSubs.length} organizationSubjects:`);
    orgSubs.forEach(o => {
        console.log(`  - Name: ${o.name}, Code: ${o.code}, ID: ${o._id}, Org: ${o.organization}`);
    });

    const schoolSubs = await Subject.find({}).lean();
    console.log(`Found ${schoolSubs.length} school Subjects:`);
    schoolSubs.forEach(s => {
        console.log(`  - Name: ${s.subjectName}, Code: ${s.subjectCode}, ID: ${s._id}, School: ${s.schoolId}`);
    });

    process.exit(0);
}

run();
