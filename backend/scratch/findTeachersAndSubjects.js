import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config();

import User from '../models/users/user.model.js';
import Subject from '../models/modules/Subject.js';
import Classes from '../models/organization/organizationClass.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const schoolId = '69fe09eedec901fd9887d235';

    // Find teachers
    const teachers = await User.find({ school: schoolId, role: 'teacher' }).select('name email').lean();
    console.log(`Teachers in school:`);
    teachers.forEach(t => console.log(`  - ${t.name} (${t._id})`));

    // Find subjects
    const subjects = await Subject.find({}).select('subjectName subjectCode').lean();
    console.log(`Subjects:`);
    subjects.forEach(s => console.log(`  - ${s.subjectName} (${s._id})`));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
