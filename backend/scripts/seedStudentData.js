/**
 * seedStudentData.js
 * ------------------
 * Comprehensive seed script to populate database with:
 * - Subjects
 * - Exam Structures and Schedules
 * - Marksheets with grades
 * - Attendance records
 *
 * Usage: node scripts/seedStudentData.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Models
import Student from '../models/users/student.model.js';
import User from '../models/users/user.model.js';
import Subject from '../models/modules/Subject.js';
import AcademicConfig from '../models/organization/AcademicConfig.js';
import ExamStructure from '../models/academic/examStructure.model.js';
import ExamSchedule from '../models/academic/examSchedule.model.js';
import Marksheet from '../models/academic/marksheet.model.js';
import Attendance from '../models/academic/attendance.model.js';
import Class from '../models/organization/organizationClass.js';
import School from '../models/school/School.js';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const blue = (s) => `\x1b[34m${s}\x1b[0m`;
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(green('✔ Connected to MongoDB'));

    // 1. Find Students
    const students = await Student.find({}).populate('user').limit(10);
    if (students.length === 0) {
      console.log(red('✖ No students found. Please create students first.'));
      process.exit(1);
    }

    const testStudent = students[0];
    console.log(bold(`\n👤 Using Test Student: ${testStudent.name || 'Unknown'}`));

    const schoolId = testStudent.school;
    const classId = testStudent.class;
    const academicYear = testStudent.academicYear;

    // Fetch School
    const schoolObj = await School.findById(schoolId).lean();
    if (!schoolObj) {
      console.log(red(`✖ School not found.`));
      process.exit(1);
    }
    const orgId = schoolObj.organization;

    console.log(blue(`🏢 School: ${schoolObj.name}`));
    console.log(blue(`📚 Class: ${classId}`));

    // ====== CREATE SUBJECTS ======
    console.log(bold('\n=== SEEDING SUBJECTS ==='));

    const subjectsData = [
      { name: 'Mathematics', code: 'MATH', theory: 80, practical: 20 },
      { name: 'Science', code: 'SCI', theory: 70, practical: 30 },
      { name: 'English', code: 'ENG', theory: 100, practical: 0 },
      { name: 'Social Studies', code: 'SST', theory: 100, practical: 0 },
      { name: 'Computer Science', code: 'CS', theory: 50, practical: 50 }
    ];

    const subjects = [];
    for (const subData of subjectsData) {
      let subjectDoc = await Subject.findOne({
        schoolId,
        subjectCode: subData.code
      });

      if (!subjectDoc) {
        subjectDoc = await Subject.create({
          subjectName: subData.name,
          subjectCode: subData.code,
          type: subData.practical > 0 ? 'Both' : 'Theory',
          theoryMarks: subData.theory,
          practicalMarks: subData.practical,
          passMarks: 35,
          schoolId,
          status: 'Active'
        });
        console.log(green(`✚ Created Subject: ${subData.name} (${subData.code})`));
      } else {
        console.log(yellow(`✔ Subject exists: ${subData.name}`));
      }
      subjects.push(subjectDoc);
    }

    // ====== CREATE ACADEMIC CONFIG ======
    console.log(bold('\n=== ENSURING ACADEMIC CONFIG ==='));

    let academicConfig = await AcademicConfig.findOne({ organization: orgId });
    if (!academicConfig) {
      academicConfig = await AcademicConfig.create({
        organization: orgId,
        academicYear: {
          label: '2024-2025',
          startDate: new Date('2024-04-01'),
          endDate: new Date('2025-03-31'),
          isActive: true
        },
        classes: [classId],
        gradingSystem: {
          type: 'percentage',
          scale: 100,
          grades: [
            { grade: 'A+', min: 90, max: 100 },
            { grade: 'A', min: 80, max: 89 },
            { grade: 'B+', min: 70, max: 79 },
            { grade: 'B', min: 60, max: 69 },
            { grade: 'C', min: 50, max: 59 },
            { grade: 'D', min: 40, max: 49 },
            { grade: 'F', min: 0, max: 39 }
          ]
        }
      });
      console.log(green('✚ Created Academic Config'));
    } else {
      console.log(yellow('✔ Academic Config exists'));
    }

    // ====== CREATE EXAM STRUCTURE ======
    console.log(bold('\n=== CREATING EXAM STRUCTURE ==='));

    let examStructure = await ExamStructure.findOne({
      school: schoolId,
      academicYear: '2024-2025'
    });

    if (!examStructure) {
      examStructure = await ExamStructure.create({
        school: schoolId,
        academicYear: '2024-2025',
        examType: 'Final Term',
        totalExams: subjects.length,
        subjects: subjects.map(s => s._id),
        passingPercentage: 35,
        gradingSystem: {
          scale: 100,
          type: 'percentage'
        }
      });
      console.log(green('✚ Created Exam Structure'));
    } else {
      console.log(yellow('✔ Exam Structure exists'));
    }

    // ====== FETCH EXISTING EXAM SCHEDULES ======
    console.log(bold('\n=== FETCHING EXAM SCHEDULES ==='));

    const existingSchedules = await ExamSchedule.find({
      school: schoolId,
      academicYear: academicYear
    }).populate('slots.subject');

    console.log(cyan(`✔ Found ${existingSchedules.length} exam schedules`));

    // ====== CREATE MARKSHEETS ======
    console.log(bold('\n=== CREATING MARKSHEETS ==='));

    let marksheetCount = 0;
    for (const student of students.slice(0, 5)) {
      for (const subject of subjects) {
        const existingMarksheet = await Marksheet.findOne({
          student: student._id,
          examStructure: examStructure._id,
          academicYear: '2024-2025'
        });

        if (!existingMarksheet) {
          // Generate realistic marks
          const baseScore = 55 + Math.random() * 40;
          const theoryMarks = Math.round((baseScore / 100) * subject.theoryMarks);
          const practicalMarks = subject.practicalMarks > 0 
            ? Math.round((baseScore / 100) * subject.practicalMarks)
            : 0;
          
          const totalMarks = theoryMarks + practicalMarks;
          const maxMarksTotal = subject.theoryMarks + subject.practicalMarks;
          const percentage = Math.round((totalMarks / maxMarksTotal) * 100);
          const passingMarks = Math.round(maxMarksTotal * 0.4); // 40% is passing
          
          let grade = 'F';
          if (percentage >= 90) grade = 'A+';
          else if (percentage >= 80) grade = 'A';
          else if (percentage >= 70) grade = 'B+';
          else if (percentage >= 60) grade = 'B';
          else if (percentage >= 50) grade = 'C';
          else if (percentage >= 40) grade = 'D';

          const marksheet = await Marksheet.create({
            organization: orgId,
            student: student._id,
            school: schoolId,
            class: classId,
            examSchedule: existingSchedules[0]?._id || new mongoose.Types.ObjectId(),
            examStructure: examStructure._id,
            academicYear: academicYear,
            subjectMarks: [{
              subject: subject._id,
              theoryMarks,
              practicalMarks,
              totalMarks,
              maxMarks: maxMarksTotal,
              passingMarks,
              isAbsent: false,
              isPass: totalMarks >= passingMarks,
              grade,
              gradePoint: percentage >= 90 ? 10 : percentage >= 80 ? 9 : percentage >= 70 ? 8 : percentage >= 60 ? 7 : percentage >= 50 ? 6 : percentage >= 40 ? 5 : 0,
              remarks: percentage >= 60 ? 'Good' : 'Need improvement'
            }],
            totalMarksObtained: totalMarks,
            totalMaxMarks: maxMarksTotal,
            percentage,
            overallGrade: grade,
            isPass: totalMarks >= passingMarks,
            status: 'published',
            submittedAt: new Date(),
            remarks: percentage >= 60 ? 'Satisfactory performance' : 'Needs improvement'
          });

          console.log(green(`✚ Created Marksheet for Student - ${subject.subjectName} (${percentage}%)`));
          marksheetCount++;
        }
      }
    }
    console.log(cyan(`\n📊 Total marksheets created: ${marksheetCount}`));

    // ====== CREATE ATTENDANCE ======
    console.log(bold('\n=== CREATING ATTENDANCE RECORDS ==='));

    // Get an admin user for markedBy
    const User = (await import('../models/users/user.model.js')).default;
    const adminUser = await User.findOne({ role: { $in: ['admin', 'superAdmin', 'teacher'] } });
    const markedByUserId = adminUser ? adminUser._id : new mongoose.Types.ObjectId();
    const markedByRole = adminUser?.role || 'admin';

    const attendanceMonths = ['2024-04', '2024-05', '2024-06'];
    let attendanceCount = 0;
    
    for (const student of students.slice(0, 5)) {
      for (const month of attendanceMonths) {
        const monthDate = new Date(`${month}-01`);
        const existingAttendance = await Attendance.findOne({
          school: schoolId,
          class: classId,
          date: { $gte: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), 
                   $lt: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1) }
        });

        if (!existingAttendance) {
          const daysInMonth = new Date(month.split('-')[0], month.split('-')[1], 0).getDate();
          const entries = [];

          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(`${month}-${String(day).padStart(2, '0')}`);
            const dayOfWeek = date.getDay();

            // Skip weekends
            if (dayOfWeek === 0 || dayOfWeek === 6) continue;

            // 92% attendance rate
            const status = Math.random() > 0.08 ? 'present' : (Math.random() > 0.5 ? 'absent' : 'late');

            entries.push({
              student: student._id,
              status,
              remarks: status === 'late' ? 'Arrived late' : ''
            });
          }

          if (entries.length > 0) {
            try {
              const attendance = await Attendance.create({
                organization: orgId,
                school: schoolId,
                class: classId,
                academicYear: academicYear,
                date: monthDate,
                markedBy: markedByUserId,
                markedByRole,
                entries
              });

              console.log(green(`✚ Created Attendance for ${month} (${entries.length} days)`));
              attendanceCount++;
            } catch (err) {
              if (err.code === 11000) {
                console.log(yellow(`✔ Attendance already exists for ${month}`));
              } else {
                throw err;
              }
            }
          }
        } else {
          console.log(yellow(`✔ Attendance already exists for ${month}`));
        }
      }
    }

    console.log(cyan(`\n📅 Total attendance records created: ${attendanceCount}`));

    console.log(bold(cyan('\n✅ SEEDING COMPLETED SUCCESSFULLY!\n')));
    console.log(yellow('Summary:'));
    console.log(`  • Subjects: ${subjects.length}`);
    console.log(`  • Students with marks: ${Math.min(5, students.length)}`);
    console.log(`  • Subjects per student: ${subjects.length}`);
    console.log(`  • Attendance months: ${attendanceMonths.length}`);

    process.exit(0);
  } catch (error) {
    console.error(red(`\n✖ Error during seeding: ${error.message}`));
    console.error(error);
    process.exit(1);
  }
};

seed();
