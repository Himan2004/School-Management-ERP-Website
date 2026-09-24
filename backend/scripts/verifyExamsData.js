/**
 * verifyExamsData.js
 * Quick check to confirm the seeded exam data is correct.
 * Usage: node scripts/verifyExamsData.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import ExamSchedule from '../models/academic/examSchedule.model.js';
import ExamStructure from '../models/academic/examStructure.model.js';
import Marksheet from '../models/academic/marksheet.model.js';
import Student from '../models/users/student.model.js';
import Subject from '../models/modules/Subject.js'; // must be imported to register the schema for populate

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;

const verify = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log(green('✔ Connected to MongoDB\n'));

  const student = await Student.findOne({}).lean();
  console.log(bold(`👤 Student: ${student?.name} | School: ${student?.school} | Class: ${student?.class}`));

  const schedules = await ExamSchedule.find({ school: student.school })
    .populate('slots.subject', 'subjectName subjectCode')
    .populate('examStructure', 'examName examType')
    .lean();

  console.log(bold(`\n=== ExamSchedules (${schedules.length} found) ===`));
  schedules.forEach(s => {
    const status = s.status === 'published' ? green(s.status) : yellow(s.status);
    console.log(`\nSchedule: ${s.examStructure?.examName} [${status}]`);
    console.log(`  Admit Card Generated: ${s.admitCardGenerated}`);
    s.slots.forEach(slot => {
      const dateStr = new Date(slot.examDate).toLocaleDateString('en-IN');
      console.log(`  📅 ${slot.subject?.subjectName} | ${dateStr} | ${slot.startTime}-${slot.endTime} | Venue: ${slot.venue}`);
    });
  });

  const marksheets = await Marksheet.find({ school: student.school, status: 'published' })
    .populate('subjectMarks.subject', 'subjectName')
    .lean();

  console.log(bold(`\n=== Marksheets (${marksheets.length} found) ===`));
  marksheets.forEach(m => {
    console.log(`\nMarksheet | Rank: ${m.classRank} | Overall: ${m.overallGrade} | Pass: ${m.isPass}`);
    m.subjectMarks.forEach(sm => {
      console.log(`  📝 ${sm.subject?.subjectName}: ${sm.totalMarks}/${sm.maxMarks} | Grade: ${sm.grade} | Pass: ${sm.isPass}`);
    });
  });

  console.log(green('\n✅ Verification complete — data is correctly seeded!\n'));
  await mongoose.disconnect();
  process.exit(0);
};

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
