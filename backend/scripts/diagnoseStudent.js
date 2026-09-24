/**
 * diagnoseStudent.js
 * ------------------
 * Full diagnosis: check student profile, class field, and query test
 * for attendance, homework, and timetable records.
 *
 * Usage: node scripts/diagnoseStudent.js <studentUserId>
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Student    from '../models/users/student.model.js';
import User       from '../models/users/user.model.js';
import Class      from '../models/organization/organizationClass.js';
import Attendance from '../models/academic/attendance.model.js';
import Homework   from '../models/academic/homework.model.js';
import Timetable  from '../models/academic/timetable.model.js';

const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(green('✔  Connected to MongoDB\n'));

    // ── 1. Find all students ────────────────────────────────────────────────
    const students = await Student.find({})
      .populate('user', 'name email loginId role')
      .populate('class', 'name numericLevel')
      .lean();

    console.log(bold(`Total students in DB: ${students.length}`));
    console.log('─'.repeat(70));

    for (const s of students) {
      const userName  = s.user?.name  || 'Unknown';
      const userEmail = s.user?.email || '—';
      const userId    = s.user?._id   || s.user;

      console.log(bold(`\n👤 ${userName} (${userEmail})`));
      console.log(`   USER ID       : ${userId}`);
      console.log(`   STUDENT ID    : ${s._id}`);
      console.log(`   CLASS (raw)   : ${JSON.stringify(s.class)}`);
      console.log(`   CLASS ID      : ${s.class?._id || s.class}`);
      console.log(`   CLASS NAME    : ${s.class?.name || red('MISSING')}`);
      console.log(`   ACADEMIC YEAR : ${s.academicYear}`);
      console.log(`   SCHOOL        : ${s.school}`);

      const classId = s.class?._id || s.class;

      // ── 2. Test Attendance query ──────────────────────────────────────────
      const attendanceByUser  = await Attendance.find({ 'entries.student': userId }).limit(5).lean();
      const attendanceByClass = classId
        ? await Attendance.find({ class: classId }).limit(5).lean()
        : [];

      console.log(`\n   📋 Attendance records (by userId)  : ${attendanceByUser.length}`);
      console.log(`   📋 Attendance records (by classId) : ${classId ? attendanceByClass.length : red('SKIPPED — classId is null')}`);

      // ── 3. Test Homework query ────────────────────────────────────────────
      const homeworkByClass = classId
        ? await Homework.find({ class: classId }).limit(5).lean()
        : [];
      console.log(`   📝 Homework records (by classId)   : ${classId ? homeworkByClass.length : red('SKIPPED — classId is null')}`);

      // ── 4. Test Timetable query ───────────────────────────────────────────
      const timetableByClass = classId
        ? await Timetable.find({ class: classId }).limit(5).lean()
        : [];
      console.log(`   📅 Timetable records (by classId)  : ${classId ? timetableByClass.length : red('SKIPPED — classId is null')}`);

      // ── 5. Count all classes in DB ────────────────────────────────────────
      const allClasses = await Class.find({}).lean();
      console.log(`\n   📦 Total Class docs in DB: ${allClasses.length}`);
      if (allClasses.length > 0) {
        console.log(`   Classes: ${allClasses.map(c => `"${c.name}" (${c._id})`).join(', ')}`);
      }

      // ── 6. Check if student's class doc exists ────────────────────────────
      if (classId) {
        const classDoc = await Class.findById(classId).lean();
        if (classDoc) {
          console.log(green(`   ✔  Class doc found: "${classDoc.name}"`));
        } else {
          console.log(red(`   ✘  Class doc with ID ${classId} NOT FOUND in Class collection!`));
          console.log(red(`      This is a stale reference — the class was deleted from DB!`));
        }
      } else {
        console.log(red(`   ✘  No classId to look up — student.class is null`));
      }

      // ── 7. Raw student doc (no populate) ─────────────────────────────────
      const rawStudent = await Student.findById(s._id).lean();
      console.log(`\n   RAW student.class value: ${JSON.stringify(rawStudent.class)}`);
    }

    console.log('\n' + '─'.repeat(70));
    console.log(bold('Diagnosis complete.'));
    process.exit(0);
  } catch (err) {
    console.error(red('Diagnosis failed:'), err);
    process.exit(1);
  }
};

run();
