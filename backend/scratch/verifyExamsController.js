/**
 * verifyExamsController.js
 * ------------------------
 * Direct unit-style integration test to execute getStudentExams and getStudentAdmitCard
 * controllers, capturing their response structures to verify flawless mapping.
 *
 * Usage: node scratch/verifyExamsController.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/users/user.model.js';
import Student from '../models/users/student.model.js';
import { getStudentExams } from '../controllers/student/studentExamController.js';
import { getStudentAdmitCard } from '../controllers/student/studentAdmitCardController.js';

const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

const verify = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(green('✔ Connected to MongoDB\n'));

    // 1. Find the test student user
    const studentProfile = await Student.findOne({ name: /Aarav/ }).lean()
                        || await Student.findOne({}).lean();

    if (!studentProfile) {
      console.error(red('✖ Test student profile not found in database.'));
      process.exit(1);
    }

    const user = await User.findById(studentProfile.user).lean();
    if (!user) {
      console.error(red('✖ Associated user not found.'));
      process.exit(1);
    }

    console.log(bold(`👤 Running verification for Student User: "${user.name}" (ID: ${user._id})`));
    console.log('─'.repeat(70));

    // 2. Mock request & response for getStudentExams
    const reqExams = {
      user: {
        _id: user._id,
        school: studentProfile.school,
        role: 'student'
      }
    };

    let examsPayload = null;
    const resExams = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        examsPayload = data;
        return this;
      }
    };

    console.log(yellow('🔄 Invoking getStudentExams controller...'));
    await getStudentExams(reqExams, resExams);

    if (resExams.statusCode !== 200 || !examsPayload?.success) {
      console.error(red('✖ getStudentExams returned failure!'), resExams.statusCode, examsPayload);
    } else {
      console.log(green('✔ getStudentExams returned success (200)'));
      console.log(`   - Upcoming count: ${examsPayload.data?.upcoming?.length}`);
      console.log(`   - Completed count: ${examsPayload.data?.completed?.length}`);
      console.log(`   - Results count  : ${examsPayload.data?.results?.length}`);
      
      console.log(bold('\n🔎 SAMPLE UPCOMING EXAM SLOT DATA:'));
      console.dir(examsPayload.data?.upcoming?.[0], { depth: null });

      console.log(bold('\n🔎 SAMPLE COMPLETED EXAM SLOT DATA:'));
      console.dir(examsPayload.data?.completed?.[0], { depth: null });

      console.log(bold('\n🔎 SAMPLE DETAILED RESULT CARD DATA:'));
      console.dir(examsPayload.data?.results?.[0], { depth: null });
    }

    console.log('\n' + '─'.repeat(70));

    // 3. Mock request & response for getStudentAdmitCard
    const reqAdmit = {
      user: {
        _id: user._id,
        school: studentProfile.school,
        role: 'student'
      }
    };

    let admitPayload = null;
    const resAdmit = {
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (data) {
        admitPayload = data;
        return this;
      }
    };

    console.log(yellow('🔄 Invoking getStudentAdmitCard controller...'));
    await getStudentAdmitCard(reqAdmit, resAdmit);

    if (resAdmit.statusCode !== 200 || !admitPayload?.success) {
      console.error(red('✖ getStudentAdmitCard returned failure!'), resAdmit.statusCode, admitPayload);
    } else {
      console.log(green('✔ getStudentAdmitCard returned success (200)'));
      console.log(`   - Exam Name: ${admitPayload.data?.examName}`);
      console.log(`   - Total Subjects listed on Admit Card: ${admitPayload.data?.subjects?.length}`);
      
      console.log(bold('\n🔎 SAMPLE ADMIT CARD SUBJECT DATA:'));
      console.dir(admitPayload.data?.subjects?.[0], { depth: null });
    }

    process.exit(0);
  } catch (err) {
    console.error(red('✖ Verification failed due to exception:'), err);
    process.exit(1);
  }
};

verify();
