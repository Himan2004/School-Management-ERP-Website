import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import connectDB from '../config/database.js';

// Import all required models
import User from '../models/users/user.model.js';
import Student from '../models/users/student.model.js';
import Class from '../models/organization/organizationClass.js';
import Section from '../models/school/Section.model.js';
import Subject from '../models/modules/Subject.js';
import ExamStructure from '../models/academic/examStructure.model.js';
import ExamSchedule from '../models/academic/examSchedule.model.js';
import Marksheet from '../models/academic/marksheet.model.js';
import StudyMaterial from '../models/academic/studyMaterial.model.js';
import StudentLeave from '../models/academic/StudentLeave.model.js';
import Homework from '../models/academic/homework.model.js';
import AcademicConfig from '../models/organization/AcademicConfig.js';
import School from '../models/school/School.js';

async function seed() {
    try {
        await connectDB();
        console.log('--- MongoDB Connected ---');

        const loginId = 'STU-SXPTS2706';
        const user = await User.findOne({ loginId: loginId });
        if (!user) {
            console.error(`User ${loginId} not found!`);
            process.exit(1);
        }

        const student = await Student.findOne({ user: user._id });
        if (!student) {
            console.error(`Student profile not found for user ${user._id}`);
            process.exit(1);
        }

        const schoolId = student.school;
        const classId = student.class;
        
        console.log(`Found student: ${user.name}`);
        console.log(`School ID: ${schoolId}`);
        console.log(`Class ID: ${classId}`);

        const school = await School.findById(schoolId);
        if (!school) {
            console.error(`School ${schoolId} not found`);
            process.exit(1);
        }
        const organizationId = school.organization;
        console.log(`Organization ID: ${organizationId}`);

        // 1. Resolve or create Section
        let sectionId = student.section;
        let sectionName = 'A';
        let sectionDoc;

        if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) {
            sectionDoc = await Section.findById(sectionId);
        }

        if (!sectionDoc) {
            // Find or create Section A for this class & school
            sectionDoc = await Section.findOne({ school: schoolId, class: classId });
            if (!sectionDoc) {
                sectionDoc = await Section.create({
                    school: schoolId,
                    class: classId,
                    name: 'A',
                    capacity: 30
                });
                console.log(`Created Section 'A'`);
            } else {
                console.log(`Found existing Section: ${sectionDoc.name}`);
            }
            student.section = sectionDoc._id;
            await student.save();
        }
        sectionId = sectionDoc._id;
        sectionName = sectionDoc.name;

        // 2. Ensure Class Teacher exists and is assigned as homeroomTeacher to Section
        let teacherUser = null;
        if (sectionDoc.homeroomTeacher) {
            teacherUser = await User.findById(sectionDoc.homeroomTeacher);
        }

        if (!teacherUser) {
            // Find any teacher at this school, or create one
            teacherUser = await User.findOne({ school: schoolId, role: 'teacher' });
            if (!teacherUser) {
                teacherUser = await User.create({
                    name: 'Sarah Jenkins',
                    email: 'jenkins.teacher@school.edu',
                    loginId: 'TCH-JENKINS',
                    password: 'Password@123',
                    role: 'teacher',
                    school: schoolId,
                    phone: '9876543210'
                });
                console.log('Created new Class Teacher: Sarah Jenkins');
            } else {
                console.log(`Found existing teacher: ${teacherUser.name}`);
            }
            
            sectionDoc.homeroomTeacher = teacherUser._id;
            await sectionDoc.save();
            console.log(`Assigned ${teacherUser.name} as homeroom teacher to Section ${sectionName}`);
        }

        // 3. Find or create AcademicConfig
        let academicConfig = await AcademicConfig.findOne({ organization: organizationId });
        if (!academicConfig) {
            academicConfig = await AcademicConfig.create({
                organization: organizationId,
                academicYear: {
                    label: '2026-2027',
                    startDate: new Date('2026-06-01'),
                    endDate: new Date('2027-04-30'),
                    isActive: true
                },
                classes: [classId],
                createdBy: teacherUser._id
            });
            console.log('Created AcademicConfig for organization');
        } else {
            console.log('Found existing AcademicConfig');
        }

        // 4. Find or create subjects
        const subjectsData = [
            { name: 'Mathematics', code: 'MATH101' },
            { name: 'Science', code: 'SCI101' },
            { name: 'English', code: 'ENG101' },
            { name: 'Computer Science', code: 'CS101' },
            { name: 'Social Studies', code: 'SST101' }
        ];

        const subjectsList = [];
        for (const sub of subjectsData) {
            let sDoc = await Subject.findOne({ schoolId, subjectCode: sub.code });
            if (!sDoc) {
                sDoc = await Subject.create({
                    schoolId,
                    subjectName: sub.name,
                    subjectCode: sub.code,
                    credits: 4,
                    type: 'Theory'
                });
                console.log(`Created Subject: ${sub.name}`);
            }
            subjectsList.push(sDoc);
        }

        // 5. Create Exam Structures
        let term1ExamStructure = await ExamStructure.findOne({ school: schoolId, examName: 'Mid Term' });
        if (!term1ExamStructure) {
            term1ExamStructure = await ExamStructure.create({
                organization: organizationId,
                school: schoolId,
                examName: 'Mid Term',
                examType: 'Mid Term',
                academicYear: '2026-2027',
                gradingConfigRef: academicConfig._id,
                createdBy: teacherUser._id,
                subjectMarkings: subjectsList.map(s => ({
                    subject: s._id,
                    totalMaxMarks: 100,
                    passingMarks: 40
                }))
            });
            console.log('Created Mid Term Exam Structure');
        }

        let term2ExamStructure = await ExamStructure.findOne({ school: schoolId, examName: 'End Term' });
        if (!term2ExamStructure) {
            term2ExamStructure = await ExamStructure.create({
                organization: organizationId,
                school: schoolId,
                examName: 'End Term',
                examType: 'Final Term',
                academicYear: '2026-2027',
                gradingConfigRef: academicConfig._id,
                createdBy: teacherUser._id,
                subjectMarkings: subjectsList.map(s => ({
                    subject: s._id,
                    totalMaxMarks: 100,
                    passingMarks: 40
                }))
            });
            console.log('Created End Term Exam Structure');
        }

        // 6. Create Exam Schedules
        let midTermSchedule = await ExamSchedule.findOne({ school: schoolId, examStructure: term1ExamStructure._id });
        if (!midTermSchedule) {
            const slots = subjectsList.map((s, idx) => {
                const examDate = new Date();
                examDate.setDate(examDate.getDate() - 30 + idx); // 30 days ago
                return {
                    subject: s._id,
                    examDate: examDate,
                    startTime: '09:00 AM',
                    endTime: '12:00 PM',
                    durationMinutes: 180,
                    venue: 'Main Hall',
                    maxMarks: 100
                };
            });

            midTermSchedule = await ExamSchedule.create({
                organization: organizationId,
                school: schoolId,
                class: classId,
                section: sectionName,
                academicYear: '2026-2027',
                examStructure: term1ExamStructure._id,
                examDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                slots: slots,
                status: 'completed',
                instructions: ['Bring ID Card', 'Report 15 mins early', 'Calculators not allowed'],
                admitCardGenerated: true,
                createdBy: teacherUser._id
            });
            console.log('Created Mid Term Exam Schedule (Completed)');
        }

        let endTermSchedule = await ExamSchedule.findOne({ school: schoolId, examStructure: term2ExamStructure._id });
        if (!endTermSchedule) {
            const slots = subjectsList.map((s, idx) => {
                const examDate = new Date();
                examDate.setDate(examDate.getDate() + 15 + idx); // 15 days in future
                return {
                    subject: s._id,
                    examDate: examDate,
                    startTime: '09:30 AM',
                    endTime: '12:30 PM',
                    durationMinutes: 180,
                    venue: 'Exams Wing Room 3',
                    maxMarks: 100
                };
            });

            endTermSchedule = await ExamSchedule.create({
                organization: organizationId,
                school: schoolId,
                class: classId,
                section: sectionName,
                academicYear: '2026-2027',
                examStructure: term2ExamStructure._id,
                examDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                slots: slots,
                status: 'published',
                instructions: ['Report at Room 3', 'Bring your own pens', 'No electronic devices'],
                admitCardGenerated: true,
                createdBy: teacherUser._id
            });
            console.log('Created End Term Exam Schedule (Upcoming)');
        }

        // 7. Create Marksheets (Only published for Mid Term, End Term results pending)
        let midTermMarksheet = await Marksheet.findOne({ student: user._id, examStructure: term1ExamStructure._id });
        if (!midTermMarksheet) {
            const scores = [85, 78, 92, 88, 74];
            const subjectMarks = subjectsList.map((s, idx) => ({
                subject: s._id,
                theoryMarks: scores[idx] - 20,
                practicalMarks: 10,
                internalMarks: 10,
                totalMarks: scores[idx],
                maxMarks: 100,
                passingMarks: 40,
                grade: scores[idx] >= 90 ? 'A+' : scores[idx] >= 80 ? 'A' : scores[idx] >= 70 ? 'B+' : 'B',
                isPass: true,
                remarks: 'Good progress'
            }));

            const totalScore = scores.reduce((a,b)=>a+b, 0);
            const percentage = totalScore / scores.length;

            midTermMarksheet = await Marksheet.create({
                organization: organizationId,
                school: schoolId,
                class: classId,
                student: user._id,
                examSchedule: midTermSchedule._id,
                examStructure: term1ExamStructure._id,
                academicYear: '2026-2027',
                subjectMarks: subjectMarks,
                overallPercentage: percentage,
                percentage: percentage,
                sgpa: parseFloat((percentage / 10).toFixed(2)),
                cgpa: parseFloat((percentage / 10).toFixed(2)),
                grade: percentage >= 80 ? 'A' : 'B',
                creditsEarned: 20,
                status: 'published',
                publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                remarks: 'Excellent work in Term 1!'
            });
            console.log('Created Mid Term Marksheet (Published)');
        }

        // 8. Create Study Materials
        const materialsData = [
            { title: 'Algebra Practice Set 1', subjectName: 'Mathematics', fileType: 'PDF', fileSize: '1.2 MB', pages: 15 },
            { title: 'Mechanics & Force Concepts', subjectName: 'Science', fileType: 'Video', fileSize: '45.8 MB', duration: '20 mins' },
            { title: 'Grammar and Verb Tenses', subjectName: 'English', fileType: 'Document', fileSize: '450 KB', pages: 8 },
            { title: 'Introduction to Javascript', subjectName: 'Computer Science', fileType: 'PDF', fileSize: '3.4 MB', pages: 42 }
        ];

        for (const mat of materialsData) {
            let mDoc = await StudyMaterial.findOne({ school: schoolId, title: mat.title });
            if (!mDoc) {
                mDoc = await StudyMaterial.create({
                    school: schoolId,
                    uploadedBy: teacherUser._id,
                    applicableClasses: [classId],
                    title: mat.title,
                    description: `Comprehensive guide and notes for ${mat.subjectName} class curriculum.`,
                    subjectName: mat.subjectName,
                    fileType: mat.fileType,
                    format: mat.fileType === 'Video' ? 'Video Tutorial' : 'Notes',
                    difficultyLevel: 'All Levels',
                    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                    fileSize: mat.fileSize,
                    pages: mat.pages || null,
                    duration: mat.duration || null,
                    downloadCount: Math.floor(Math.random() * 50) + 10,
                    views: Math.floor(Math.random() * 200) + 50,
                    rating: parseFloat((4 + Math.random()).toFixed(1)),
                    status: 'published'
                });
                console.log(`Created Study Material: ${mat.title}`);
            }
        }

        // 9. Create Homework
        const homeworks = [
            { title: 'Solve Linear Equations Exercise 4B', subject: 'Mathematics' },
            { title: 'Write Chemistry Lab Report on Acid-Base Reaction', subject: 'Science' }
        ];

        for (const hw of homeworks) {
            const sDoc = subjectsList.find(s => s.subjectName === hw.subject);
            let hwDoc = await Homework.findOne({ school: schoolId, title: hw.title });
            if (!hwDoc) {
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 3);
                hwDoc = await Homework.create({
                    organization: organizationId,
                    school: schoolId,
                    class: classId,
                    section: sectionId,
                    subject: sDoc ? sDoc._id : null,
                    title: hw.title,
                    description: 'Please complete and submit by the due date.',
                    dueDate: dueDate,
                    priority: 'medium',
                    type: 'Assignment',
                    teacher: teacherUser._id,
                    isActive: true
                });
                console.log(`Created Homework: ${hw.title}`);
            }
        }

        // 10. Create Leave Requests
        let sickLeave = await StudentLeave.findOne({ student: user._id, leaveType: 'sick' });
        if (!sickLeave) {
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - 5);
            const toDate = new Date();
            toDate.setDate(toDate.getDate() - 4);
            
            sickLeave = await StudentLeave.create({
                organization: organizationId,
                school: schoolId,
                student: user._id,
                class: classId,
                section: sectionName,
                leaveType: 'sick',
                fromDate: fromDate,
                toDate: toDate,
                totalDays: 2,
                reason: 'Recovering from seasonal flu and fever.',
                status: 'approved',
                approvedBy: teacherUser._id,
                approvedAt: new Date(),
                appliedBy: user._id
            });
            console.log('Created Approved Sick Leave Application');
        }

        let casualLeave = await StudentLeave.findOne({ student: user._id, leaveType: 'casual' });
        if (!casualLeave) {
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() + 10);
            const toDate = new Date();
            toDate.setDate(toDate.getDate() + 11);
            
            casualLeave = await StudentLeave.create({
                organization: organizationId,
                school: schoolId,
                student: user._id,
                class: classId,
                section: sectionName,
                leaveType: 'casual',
                fromDate: fromDate,
                toDate: toDate,
                totalDays: 2,
                reason: 'Family function in hometown.',
                status: 'pending',
                appliedBy: user._id
            });
            console.log('Created Pending Casual Leave Application');
        }

        console.log('\n--- Seeding completed successfully! ---');
        process.exit(0);

    } catch (err) {
        console.error('Error during seeding:', err);
        process.exit(1);
    }
}

seed();
