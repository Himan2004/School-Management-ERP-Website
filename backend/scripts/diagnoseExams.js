/**
 * diagnoseExams.js
 * ----------------
 * Diagnoses exam schedules and marksheet documents in the database to see
 * why they might not be appearing for the student.
 *
 * Usage: node scripts/diagnoseExams.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Student      from '../models/users/student.model.js';
import ExamSchedule from '../models/academic/examSchedule.model.js';
import Marksheet    from '../models/academic/marksheet.model.js';
import Class        from '../models/organization/organizationClass.js';

const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(green('✔  Connected to MongoDB\n'));

    // 1. Get all Class documents
    const classes = await Class.find({}).lean();
    console.log(bold(`📦 Available Classes in DB: ${classes.length}`));
    classes.forEach(c => console.log(`   - "${c.name}" (ID: ${c._id})`));
    console.log('─'.repeat(70));

    // 2. Get all ExamSchedules in DB
    const allSchedules = await ExamSchedule.find({}).lean();
    console.log(bold(`📅 Total ExamSchedules in DB: ${allSchedules.length}`));
    for (const sch of allSchedules) {
      console.log(`\n   Exam Schedule ID: ${sch._id}`);
      console.log(`   School          : ${sch.school}`);
      console.log(`   Class           : ${sch.class}`);
      console.log(`   Section         : ${sch.section}`);
      console.log(`   Status          : ${sch.status}`);
      console.log(`   Date            : ${sch.date}`);
      console.log(`   Syllabus        : ${sch.syllabus}`);
      
      // Look up class name
      const matchingClass = classes.find(c => c._id.toString() === sch.class?.toString());
      console.log(`   Class Name      : ${matchingClass ? green(matchingClass.name) : red('UNKNOWN / NOT FOUND')}`);
    }
    console.log('\n' + '─'.repeat(70));

    // 3. Get all Marksheets in DB
    const allMarksheets = await Marksheet.find({}).lean();
    console.log(bold(`📝 Total Marksheets in DB: ${allMarksheets.length}`));
    for (const ms of allMarksheets) {
      console.log(`\n   Marksheet ID    : ${ms._id}`);
      console.log(`   Student (User)  : ${ms.student}`);
      console.log(`   Class           : ${ms.class}`);
      console.log(`   Status          : ${ms.status}`);
      console.log(`   Marks Obtained  : ${ms.marksObtained} / ${ms.maxMarks}`);
      
      // Look up class name
      const matchingClass = classes.find(c => c._id.toString() === ms.class?.toString());
      console.log(`   Class Name      : ${matchingClass ? green(matchingClass.name) : red('UNKNOWN / NOT FOUND')}`);
    }
    console.log('\n' + '─'.repeat(70));

    // 4. Test Student specific fetch
    const aarav = await Student.findOne({ name: /Aarav/ }).lean() 
               || await Student.findOne({}).lean();
    
    if (aarav) {
      console.log(bold(`👤 Testing for Student: ${aarav.name || 'Test Student'}`));
      console.log(`   User ID         : ${aarav.user}`);
      console.log(`   Student ID      : ${aarav._id}`);
      console.log(`   Class           : ${aarav.class}`);
      console.log(`   School          : ${aarav.school}`);
      console.log(`   Section         : ${aarav.section}`);

      const schedulesForAarav = await ExamSchedule.find({
        school: aarav.school,
        class: aarav.class,
        $or: [{ section: null }, { section: aarav.section }],
        status: { $in: ['published', 'ongoing', 'completed'] }
      }).lean();

      console.log(`\n   → Matching ExamSchedules found: ${schedulesForAarav.length}`);
      schedulesForAarav.forEach((sch, idx) => {
        console.log(`     ${idx + 1}. ID: ${sch._id}, Date: ${sch.date}, Status: ${sch.status}`);
      });

      const marksheetsForAarav = await Marksheet.find({
        student: aarav.user,
        status: 'published'
      }).lean();
      console.log(`   → Matching Marksheets found: ${marksheetsForAarav.length}`);
      marksheetsForAarav.forEach((ms, idx) => {
        console.log(`     ${idx + 1}. ID: ${ms._id}, Obtained: ${ms.marksObtained}/${ms.maxMarks}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error(red('Diagnosis failed:'), err);
    process.exit(1);
  }
};

run();
