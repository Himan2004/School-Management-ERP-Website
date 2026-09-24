import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import connectDB from '../config/database.js';
import User from '../models/users/user.model.js';
import Student from '../models/users/student.model.js';
import Teacher from '../models/users/teacher.model.js';
import SubjectAssignment from '../models/principal/SubjectAssignment.model.js';
import Class from '../models/organization/organizationClass.js';
import Section from '../models/school/Section.model.js';
import Subject from '../models/organization/organizationSubjects.js';

async function run() {
    try {
        await connectDB();
        console.log("--- Connected to DB ---");

        // 1. Find the student user and profile
        const studentUser = await User.findOne({ loginId: "STU-SXPTS2706" });
        if (!studentUser) {
            console.error("❌ Student user 'STU-SXPTS2706' not found!");
            return;
        }
        console.log(`Found Student User: ${studentUser.name} (${studentUser._id})`);

        const studentProfile = await Student.findOne({ user: studentUser._id }).populate("class section");
        if (!studentProfile) {
            console.error("❌ Student profile not found!");
            return;
        }
        const studentClassId = studentProfile.class?._id;
        const studentClassName = studentProfile.class?.name;
        const studentSectionName = studentProfile.section?.name || "A";
        const schoolId = studentProfile.school;

        console.log(`Student is in Class: ${studentClassName} (${studentClassId}), Section: ${studentSectionName}, School: ${schoolId}`);

        // 2. Find ALL teachers in this school
        const teacherProfiles = await Teacher.find({ school: schoolId });
        console.log(`Found ${teacherProfiles.length} teachers in school ${schoolId}`);

        // 3. Find all subjects for the student's class
        const classSubjects = await Subject.find({ classId: studentClassId });
        console.log(`Found ${classSubjects.length} subjects for class ${studentClassName}`);

        if (classSubjects.length === 0) {
            const anySubject = await Subject.findOne();
            if (anySubject) {
                classSubjects.push(anySubject);
            }
        }

        // 4. Assign all teachers to the student's class and section
        for (const teacherProfile of teacherProfiles) {
            const teacherUser = await User.findById(teacherProfile.user);
            if (!teacherUser) continue;

            console.log(`\nAssigning Teacher: ${teacherUser.name} (${teacherUser.loginId})`);

            // Add class to teacher assignedClasses
            if (!teacherProfile.assignedClasses.includes(studentClassId)) {
                teacherProfile.assignedClasses.push(studentClassId);
                await teacherProfile.save();
                console.log(`  Added Class ${studentClassName} to teacher profile`);
            } else {
                console.log(`  Teacher already has Class ${studentClassName}`);
            }

            // Create subject assignments for each subject
            for (const sub of classSubjects) {
                const existingAssignment = await SubjectAssignment.findOne({
                    school: schoolId,
                    class: studentClassId,
                    section: studentSectionName,
                    subject: sub._id,
                    teacherUser: teacherUser._id
                });

                if (!existingAssignment) {
                    await SubjectAssignment.create({
                        organization: schoolId, // mock matching
                        school: schoolId,
                        academicYear: "2026-2027",
                        class: studentClassId,
                        section: studentSectionName,
                        subject: sub._id,
                        teacherUser: teacherUser._id,
                        assignedBy: teacherUser._id
                    });
                    console.log(`  Created SubjectAssignment for Subject ${sub.subjectName || sub.name}`);
                } else {
                    console.log(`  SubjectAssignment already exists for Subject ${sub.subjectName || sub.name}`);
                }
            }
        }

        console.log("\n✅ All school teachers successfully assigned to student's class and section!");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
