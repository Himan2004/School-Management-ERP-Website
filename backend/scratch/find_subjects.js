import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import connectDB from '../config/database.js';
import Subject from '../models/modules/Subject.js';
import Class from '../models/organization/organizationClass.js';

async function run() {
    try {
        await connectDB();
        console.log("--- Connected to DB ---");

        const seniorKG = await Class.findOne({ name: "Senior KG" });
        if (!seniorKG) {
            console.error("Senior KG class not found!");
            return;
        }

        const subjects = await Subject.find({
            $or: [
                { classId: seniorKG._id },
                { assignedClasses: seniorKG._id }
            ]
        });

        console.log(`Found ${subjects.length} subjects for Senior KG:`);
        subjects.forEach(s => {
            console.log(`  - Name: "${s.subjectName}", Code: "${s.subjectCode}", ID: ${s._id}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
