import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config();

import Timetable from '../models/academic/timetable.model.js';
import Classes from '../models/organization/organizationClass.js';
import School from '../models/school/School.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const schoolId = '69fe09eedec901fd9887d235';
    
    // Find school
    const school = await School.findById(schoolId).lean();
    console.log(`School: "${school?.schoolName}" Org ID: ${school?.organization}`);

    if (school?.organization) {
      const classes = await Classes.find({ organization: school.organization }).lean();
      console.log(`Classes in Organization (${school.organization}):`);
      classes.forEach(c => {
        console.log(`  - Class: "${c.name}" ID: ${c._id}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
