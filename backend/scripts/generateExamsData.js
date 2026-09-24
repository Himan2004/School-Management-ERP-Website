/**
 * generateExamsData.js
 * -------------------
 * Seeds the database with realistic ExamStructures, ExamSchedules, and a published Marksheet
 * for our test student (Aarav / Test Student) in Class 8.
 *
 * Usage: node scripts/generateExamsData.js
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
import Subject from '../models/modules/Subject.js';
import AcademicConfig from '../models/organization/AcademicConfig.js';
import ExamStructure from '../models/academic/examStructure.model.js';
import ExamSchedule from '../models/academic/examSchedule.model.js';
import Marksheet from '../models/academic/marksheet.model.js';
import Class from '../models/organization/organizationClass.js';
import School from '../models/school/School.js';

const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(green('✔ Connected to MongoDB'));

    // 1. Find Aarav (Test Student)
    const aarav = await Student.findOne({ name: /Aarav/ }).lean()
               || await Student.findOne({}).lean();

    if (!aarav) {
      console.log(red('✖ No student found in the database. Please create a student first.'));
      process.exit(1);
    }

    console.log(bold(`👤 Found Test Student: ${aarav.name} (Class ID: ${aarav.class})`));

    const schoolId = aarav.school;
    const classId = aarav.class;
    
    // Fetch School to get Organization
    const schoolObj = await School.findById(schoolId).lean();
    if (!schoolObj) {
      console.log(red(`✖ School matching ID ${schoolId} not found.`));
      process.exit(1);
    }
    const orgId = schoolObj.organization;
    console.log(bold(`🏢 Associated School: "${schoolObj.name}" | Organization: "${orgId}"`));

    // 2. Ensure Subjects Exist
    const subjectsData = [
      { name: 'Mathematics', code: 'MATH8' },
      { name: 'Science', code: 'SCI8' },
      { name: 'English', code: 'ENG8' }
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
        console.log(green(`✚ Created Subject: ${sub.name} (${sub.code})`));
      } else {
        console.log(`✔ Subject exists: ${sub.name} (${sub.code})`);
      }
      subjects.push(subjectDoc);
    }

    // 3. Ensure AcademicConfig exists for the Organization
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
        createdBy: aarav.user
      });
      console.log(green(`✚ Created AcademicConfig for Organization`));
    } else {
      console.log('✔ AcademicConfig exists for Organization');
    }

    // 4. Ensure Mid-Term & Final Exam Structures Exist
    // Clean old ones to avoid duplicates or issues
    await ExamStructure.deleteMany({ school: schoolId, academicYear: '2024-2025' });
    console.log(yellow('🧹 Cleared old ExamStructures'));

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
      academicYear: '2024-2025',
      examName: 'Mid-Term Examination 2024',
      examType: 'mid_term',
      term: 'term1',
      applicableClasses: [classId],
      subjectMarkings: subjectMarkings,
      gradingConfigRef: academicConfig._id,
      isActive: true,
      createdBy: aarav.user
    });
    console.log(green(`✚ Created Mid-Term ExamStructure`));

    const finalStructure = await ExamStructure.create({
      organization: orgId,
      school: schoolId,
      academicYear: '2024-2025',
      examName: 'Final Examination 2025',
      examType: 'final_term',
      term: 'term2',
      applicableClasses: [classId],
      subjectMarkings: subjectMarkings,
      gradingConfigRef: academicConfig._id,
      isActive: true,
      createdBy: aarav.user
    });
    console.log(green(`✚ Created Final ExamStructure`));

    // 5. Create Exam Schedules
    await ExamSchedule.deleteMany({ school: schoolId, class: classId });
    console.log(yellow('🧹 Cleared old ExamSchedules'));

    const today = new Date();
    
    // Mid-Term Schedule (10 Days Ago)
    const midTermSlots = [
      {
        subject: subjects[0]._id, // Math
        examDate: new Date(new Date().setDate(today.getDate() - 12)),
        startTime: '09:00 AM',
        endTime: '12:00 PM',
        venue: 'Hall A',
        maxMarks: 100,
        durationMinutes: 180
      },
      {
        subject: subjects[1]._id, // Science
        examDate: new Date(new Date().setDate(today.getDate() - 10)),
        startTime: '09:00 AM',
        endTime: '12:00 PM',
        venue: 'Hall B',
        maxMarks: 100,
        durationMinutes: 180
      }
    ];

    const midTermSchedule = await ExamSchedule.create({
      organization: orgId,
      school: schoolId,
      examStructure: midTermStructure._id,
      academicYear: '2024-2025',
      class: classId,
      section: aarav.section || null,
      slots: midTermSlots,
      status: 'completed',
      createdBy: aarav.user
    });
    console.log(green(`✚ Created Completed Mid-Term ExamSchedule`));

    // Final Schedule (5 Days in Future)
    const finalSlots = [
      {
        subject: subjects[0]._id, // Math
        examDate: new Date(new Date().setDate(today.getDate() + 5)),
        startTime: '09:00 AM',
        endTime: '12:00 PM',
        venue: 'Hall A',
        maxMarks: 100,
        durationMinutes: 180
      },
      {
        subject: subjects[1]._id, // Science
        examDate: new Date(new Date().setDate(today.getDate() + 7)),
        startTime: '09:00 AM',
        endTime: '12:00 PM',
        venue: 'Hall B',
        maxMarks: 100,
        durationMinutes: 180
      },
      {
        subject: subjects[2]._id, // English
        examDate: new Date(new Date().setDate(today.getDate() + 10)),
        startTime: '09:00 AM',
        endTime: '12:00 PM',
        venue: 'Hall A',
        maxMarks: 100,
        durationMinutes: 180
      }
    ];

    const finalSchedule = await ExamSchedule.create({
      organization: orgId,
      school: schoolId,
      examStructure: finalStructure._id,
      academicYear: '2024-2025',
      class: classId,
      section: aarav.section || null,
      slots: finalSlots,
      status: 'published',
      admitCardGenerated: true,
      admitCardGeneratedAt: new Date(),
      createdBy: aarav.user
    });
    console.log(green(`✚ Created Upcoming Published Final ExamSchedule (Admit Card Ready)`));

    // 6. Create Published Marksheet for Completed Mid-Term Exams
    await Marksheet.deleteMany({ student: aarav.user });
    console.log(yellow('🧹 Cleared old Marksheets for Aarav'));

    const subjectMarks = [
      {
        subject: subjects[0]._id,
        theoryMarks: 72,
        practicalMarks: 18,
        totalMarks: 90,
        maxMarks: 100,
        passingMarks: 33,
        isAbsent: false,
        isPass: true,
        grade: 'A+',
        gradePoint: 10,
        remarks: 'Outstanding logical reasoning!'
      },
      {
        subject: subjects[1]._id,
        theoryMarks: 65,
        practicalMarks: 15,
        totalMarks: 80,
        maxMarks: 100,
        passingMarks: 33,
        isAbsent: false,
        isPass: true,
        grade: 'A',
        gradePoint: 9,
        remarks: 'Excellent concept visualization.'
      }
    ];

    const marksheet = await Marksheet.create({
      organization: orgId,
      school: schoolId,
      student: aarav.user,
      examSchedule: midTermSchedule._id,
      examStructure: midTermStructure._id,
      academicYear: '2024-2025',
      class: classId,
      section: aarav.section || null,
      rollNumber: aarav.rollNo || '2024001',
      subjectMarks: subjectMarks,
      status: 'published',
      overallGrade: 'A',
      classRank: 5,
      sectionRank: 3,
      publishedAt: new Date(new Date().setDate(today.getDate() - 5))
    });
    console.log(green(`✚ Created Published Marksheet for Mid-Term Exams`));

    console.log(bold('\n🎉  Seeding Complete! Database is fully realigned and loaded for Aarav.'));
    process.exit(0);
  } catch (error) {
    console.error(red('Seeding failed:'), error);
    process.exit(1);
  }
};

seed();
