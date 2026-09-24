/**
 * seed_homework_exams_for_parent.js
 * ----------------------------------
 * Seeds the database with realistic Homework, HomeworkSubmissions, ExamStructures,
 * ExamSchedules, and Marksheets for the children of parent user "PAR-SXPRS2554".
 *
 * Usage: node scripts/seed_homework_exams_for_parent.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Models
import Student from '../models/users/student.model.js';
import User from '../models/users/user.model.js';
import Parent from '../models/users/parent.model.js';
import Subject from '../models/modules/Subject.js';
import AcademicConfig from '../models/organization/AcademicConfig.js';
import ExamStructure from '../models/academic/examStructure.model.js';
import ExamSchedule from '../models/academic/examSchedule.model.js';
import Marksheet from '../models/academic/marksheet.model.js';
import School from '../models/school/School.js';
import Homework from '../models/academic/homework.model.js';
import HomeworkSubmission from '../models/academic/HomeworkSubmission.model.js';

const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(green('✔ Connected to MongoDB'));

    // 1. Find Parent User
    const parentUser = await User.findOne({ loginId: "PAR-SXPRS2554" });
    if (!parentUser) {
      console.log(red('✖ Parent user with loginId "PAR-SXPRS2554" not found.'));
      process.exit(1);
    }
    console.log(bold(`✔ Found Parent User: ${parentUser.name} (${parentUser.loginId})`));

    // 2. Find Parent Profile
    const parentProfile = await Parent.findOne({ user: parentUser._id }).populate({
      path: 'students',
      populate: { path: 'user' }
    });
    if (!parentProfile || !parentProfile.students?.length) {
      console.log(red('✖ Parent profile not found or has no associated students.'));
      process.exit(1);
    }
    console.log(bold(`✔ Found Parent Profile with ${parentProfile.students.length} students.`));

    // 3. Find a Teacher to assign homework
    let teacher = await User.findOne({ role: "teacher" });
    if (!teacher) {
      teacher = await User.findOne({ role: "admin" }) || parentUser;
    }
    console.log(bold(`✔ Using Teacher/Creator user: ${teacher.name} (${teacher.role})`));

    // 4. Seed Data for each student
    for (const student of parentProfile.students) {
      const studentName = student.user?.name || "Student";
      const cleanNameSuffix = studentName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3);
      console.log('─'.repeat(80));
      console.log(bold(`👤 Seeding details for Student: ${studentName} (ID: ${student._id})`));

      const schoolId = student.school;
      const classId = student.class;

      if (!classId) {
        console.log(yellow(`⚠ Student ${studentName} has no class assigned. Skipping.`));
        continue;
      }

      // Fetch School to get Organization
      const schoolObj = await School.findById(schoolId).lean();
      if (!schoolObj) {
        console.log(red(`✖ School matching ID ${schoolId} not found.`));
        continue;
      }
      const orgId = schoolObj.organization;
      console.log(`   🏢 School: "${schoolObj.schoolName}" | Org: "${orgId}"`);

      // A. Clean up old records for this class
      await Homework.deleteMany({ school: schoolId, class: classId });
      await HomeworkSubmission.deleteMany({ student: student.user });
      await ExamStructure.deleteMany({ school: schoolId, applicableClasses: classId });
      await ExamSchedule.deleteMany({ school: schoolId, class: classId });
      await Marksheet.deleteMany({ student: student.user });
      console.log(yellow('   🧹 Cleared old homework, submissions, exams, and marksheets.'));

      // B. Ensure 5 Subjects Exist
      const subjectsData = [
        { name: 'Mathematics', code: `MATH-${cleanNameSuffix}` },
        { name: 'Science', code: `SCI-${cleanNameSuffix}` },
        { name: 'English', code: `ENG-${cleanNameSuffix}` },
        { name: 'Social Studies', code: `SST-${cleanNameSuffix}` },
        { name: 'Computer Science', code: `CS-${cleanNameSuffix}` }
      ];

      const subjects = [];
      for (const sub of subjectsData) {
        let subjectDoc = await Subject.findOne({ schoolId, subjectCode: sub.code });
        if (!subjectDoc) {
          subjectDoc = await Subject.create({
            subjectName: sub.name,
            subjectCode: sub.code,
            schoolId: schoolId,
            classId: classId,
            credits: 4,
            status: 'active'
          });
        }
        subjects.push(subjectDoc);
      }
      console.log(green(`   ✚ Ensured 5 Subjects exist for class.`));

      // C. Seed Homework assignments and Submissions
      const today = new Date();
      for (let i = 0; i < 5; i++) {
        const sub = subjects[i % subjects.length];
        const hw = await Homework.create({
          organization: orgId,
          school: schoolId,
          title: `${sub.subjectName} Homework ${i + 1}`,
          description: `Please solve the assignment questions for ${sub.subjectName} and upload the response sheet.`,
          subject: sub._id,
          class: classId,
          teacher: teacher._id,
          dueDate: new Date(new Date().setDate(today.getDate() + (i - 2))), // some past, some future
          priority: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low"
        });

        // 3 submissions (1 graded, 2 submitted)
        if (i < 3) {
          await HomeworkSubmission.create({
            homework: hw._id,
            student: student.user,
            fileUrl: "https://graphura-school-erp.s3.amazonaws.com/samples/homework_response.pdf",
            fileName: "homework_response.pdf",
            status: i === 1 ? "graded" : "submitted",
            submittedAt: new Date(new Date().setDate(today.getDate() - 1)),
            grade: i === 1 ? "A+" : null,
            teacherFeedback: i === 1 ? "Excellent work and presentation!" : null,
            gradedAt: i === 1 ? new Date() : null
          });
        }
      }
      console.log(green(`   ✚ Seeded 5 Homework tasks with 3 student submissions.`));

      // D. Ensure AcademicConfig exists for the Organization
      let academicConfig = await AcademicConfig.findOne({ organization: orgId });
      if (!academicConfig) {
        academicConfig = await AcademicConfig.create({
          organization: orgId,
          academicYear: {
            label: '2026-2027',
            startDate: new Date('2026-04-01'),
            endDate: new Date('2027-03-31'),
            isActive: true
          },
          classes: [classId],
          gradingSystem: {
            type: 'percentage',
            passingMarks: 33,
            slabs: [
              { grade: 'A+', min: 90, max: 100, gradePoint: 10, remarks: 'Outstanding' },
              { grade: 'A', min: 80, max: 89, gradePoint: 9, remarks: 'Excellent' },
              { grade: 'B+', min: 70, max: 79, gradePoint: 8, remarks: 'Very Good' },
              { grade: 'B', min: 60, max: 69, gradePoint: 7, remarks: 'Good' },
              { grade: 'C', min: 50, max: 59, gradePoint: 6, remarks: 'Satisfactory' },
              { grade: 'D', min: 40, max: 49, gradePoint: 5, remarks: 'Pass' },
              { grade: 'F', min: 0, max: 39, gradePoint: 0, remarks: 'Fail' }
            ]
          },
          createdBy: teacher._id
        });
      }

      // E. Create Mid-Term and Final Exam Structures
      const subjectMarkings = subjects.map(sub => ({
        subject: sub._id,
        theoryMaxMarks: 80,
        practicalMaxMarks: 20,
        totalMaxMarks: 100,
        passingMarks: 33,
        isOptional: false
      }));

      const midTermStructure = await ExamStructure.create({
        organization: orgId,
        school: schoolId,
        academicYear: '2026-2027',
        examName: `Mid-Term Examination 2026`,
        examType: 'Mid Term',
        term: 'term1',
        applicableClasses: [classId],
        subjectMarkings: subjectMarkings,
        gradingConfigRef: academicConfig._id,
        isActive: true,
        createdBy: teacher._id
      });

      const finalStructure = await ExamStructure.create({
        organization: orgId,
        school: schoolId,
        academicYear: '2026-2027',
        examName: `Final Examination 2027`,
        examType: 'Final Term',
        term: 'term2',
        applicableClasses: [classId],
        subjectMarkings: subjectMarkings,
        gradingConfigRef: academicConfig._id,
        isActive: true,
        createdBy: teacher._id
      });

      // F. Create Completed Exam Schedule (Mid-Term) and Upcoming Exam Schedule (Finals)
      const midTermSlots = [
        {
          subject: subjects[0]._id, // Math
          examDate: new Date(new Date().setDate(today.getDate() - 15)),
          startTime: '09:00 AM',
          endTime: '12:00 PM',
          venue: 'Room 101',
          maxMarks: 100,
          durationMinutes: 180
        },
        {
          subject: subjects[1]._id, // Science
          examDate: new Date(new Date().setDate(today.getDate() - 13)),
          startTime: '09:00 AM',
          endTime: '12:00 PM',
          venue: 'Room 102',
          maxMarks: 100,
          durationMinutes: 180
        }
      ];

      const midTermSchedule = await ExamSchedule.create({
        organization: orgId,
        school: schoolId,
        examStructure: midTermStructure._id,
        academicYear: '2026-2027',
        class: classId,
        section: student.section || null,
        slots: midTermSlots,
        status: 'completed',
        createdBy: teacher._id
      });

      const finalSlots = subjects.slice(0, 3).map((sub, idx) => ({
        subject: sub._id,
        examDate: new Date(new Date().setDate(today.getDate() + 5 + idx * 2)),
        startTime: '09:00 AM',
        endTime: '12:00 PM',
        venue: 'Main Examination Hall',
        maxMarks: 100,
        durationMinutes: 180
      }));

      await ExamSchedule.create({
        organization: orgId,
        school: schoolId,
        examStructure: finalStructure._id,
        academicYear: '2026-2027',
        class: classId,
        section: student.section || null,
        slots: finalSlots,
        status: 'published',
        admitCardGenerated: true,
        admitCardGeneratedAt: new Date(),
        createdBy: teacher._id
      });
      console.log(green(`   ✚ Created Exam Schedules (Completed Mid-Term, Upcoming Finals).`));

      // G. Create Marksheet for Mid-Term Exams
      const subjectMarks = [
        {
          subject: subjects[0]._id,
          theoryMarks: 74,
          practicalMarks: 18,
          totalMarks: 92,
          maxMarks: 100,
          passingMarks: 33,
          isAbsent: false,
          isPass: true,
          grade: 'A+',
          gradePoint: 10,
          remarks: 'Outstanding analytical skills.'
        },
        {
          subject: subjects[1]._id,
          theoryMarks: 62,
          practicalMarks: 17,
          totalMarks: 79,
          maxMarks: 100,
          passingMarks: 33,
          isAbsent: false,
          isPass: true,
          grade: 'B+',
          gradePoint: 8,
          remarks: 'Very good. Needs slight improvement in laboratory diagrams.'
        }
      ];

      await Marksheet.create({
        organization: orgId,
        school: schoolId,
        student: student.user,
        examSchedule: midTermSchedule._id,
        examStructure: midTermStructure._id,
        academicYear: '2026-2027',
        class: classId,
        section: student.section || null,
        rollNumber: student.rollNo || '20260901',
        subjectMarks: subjectMarks,
        status: 'published',
        overallGrade: 'A',
        classRank: 3,
        sectionRank: 2,
        publishedAt: new Date(new Date().setDate(today.getDate() - 5))
      });
      console.log(green(`   ✚ Created Published Marksheet with grades.`));
    }

    console.log(bold('\n🎉 Seeding Complete! Homework assignments, submissions, exams, and results populated successfully.'));
    process.exit(0);
  } catch (error) {
    console.error(red('Seeding failed:'), error);
    process.exit(1);
  }
};

run();
