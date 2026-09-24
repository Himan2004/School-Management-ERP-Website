import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config();

import Timetable from '../models/academic/timetable.model.js';
import Classes from '../models/organization/organizationClass.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const timetables = await Timetable.find({})
      .populate('class', 'name')
      .lean();

    console.log(`Total Timetables: ${timetables.length}`);
    timetables.forEach(t => {
      console.log(`- ID: ${t._id}`);
      console.log(`  Class ID: ${t.class?._id || t.class}`);
      console.log(`  Class Name: ${t.class?.name || 'Unknown'}`);
      console.log(`  Academic Year: ${t.academicYear}`);
      console.log(`  Is Active: ${t.isActive}`);
      console.log(`  Is Published: ${t.isPublished}`);
      console.log(`  Schedule Days: ${t.schedule?.map(d => d.day).join(', ')}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
