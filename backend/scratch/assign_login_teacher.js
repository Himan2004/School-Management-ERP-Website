import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import connectDB from '../config/database.js';
import Teacher from '../models/users/teacher.model.js';
import SubjectAssignment from '../models/principal/SubjectAssignment.model.js';
import User from '../models/users/user.model.js';
import Student from '../models/users/student.model.js';
import Subject from '../models/modules/Subject.js';

const classId = '6a46351b8392991472be01e9'; // Senior KG
const section = 'A';

async function run() {
    try {
        await connectDB();
        console.log("--- Connected to DB ---");

        // 1. Find the target teacher user by login ID
        const user = await User.findOne({ loginId: "SXP4899" });
        if (!user) {
            console.error("❌ Teacher user 'SXP4899' not found in database!");
            return;
        }
        console.log(`Found Teacher User: ${user.name} (${user._id}, ${user.email})`);

        // 2. Find student profile to match school
        const studentUser = await User.findOne({ loginId: "STU-SXPTS2706" });
        if (!studentUser) {
            console.error("❌ Student user 'STU-SXPTS2706' not found!");
            return;
        }
        const studentProfile = await Student.findOne({ user: studentUser._id });
        if (!studentProfile) {
            console.error("❌ Student profile not found!");
            return;
        }
        const schoolId = studentProfile.school;
        console.log(`School ID is: ${schoolId}`);

        // 3. Find Teacher Profile
        const teacherProfile = await Teacher.findOne({ user: user._id });
        if (!teacherProfile) {
            console.error("❌ Teacher profile not found!");
            return;
        }

        // Add class to teacher assignedClasses
        if (!teacherProfile.assignedClasses.includes(classId)) {
            teacherProfile.assignedClasses.push(classId);
            await teacherProfile.save();
            console.log(`Added Class Senior KG to assignedClasses for ${user.name}`);
        } else {
            console.log(`Class Senior KG already assigned to teacher profile for ${user.name}`);
        }

        // 4. Create SubjectAssignments for the teacher in this class and section
        // Clean up existing assignments for this class, section, and subjects so we can overwrite
        const classSubjects = await Subject.find({
            $or: [
                { classId: classId },
                { assignedClasses: classId }
            ]
        });
        console.log(`Found ${classSubjects.length} subjects for class Senior KG`);

        for (const sub of classSubjects) {
            // Delete existing assignments for this combination to overwrite
            const delRes = await SubjectAssignment.deleteMany({
                school: schoolId,
                class: classId,
                section: section,
                subject: sub._id
            });
            if (delRes.deletedCount > 0) {
                console.log(`  Deleted ${delRes.deletedCount} old assignment(s) for Subject: ${sub.subjectName}`);
            }

            await SubjectAssignment.create({
                organization: schoolId,
                school: schoolId,
                academicYear: "2026-2027",
                class: classId,
                section: section,
                subject: sub._id,
                teacherUser: user._id,
                assignedBy: user._id
            });
            console.log(`  Created SubjectAssignment for Subject: ${sub.subjectName}`);
        }

        console.log("\n✅ Teacher SXP4899 successfully assigned to Senior KG - A!");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
