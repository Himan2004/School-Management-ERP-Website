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

const schoolId = '69fe09eedec901fd9887d235';
const classId = '6a46351b8392991472be01e9'; // Senior KG
const section = 'A';

const teachers = [
    { userId: '6a4819c89bb6b7c5cc0de313', subjects: ['6a326b3be9772d6a67ce1c26', '6a416a90b83ab1e9c7e6a8f7'] }, // Subject Teacher-1 -> maths, science
    { userId: '6a481a909bb6b7c5cc0de87f', subjects: ['6a43bde7119a0a2a37b19f5b'] }, // Subject-teacher 2 -> english
    { userId: '6a481d00d48643be1c1d19d9', subjects: ['6a44074d0c97e1d7f9c99c43', '6a4b4c64a791c3a493c56e46'] } // Subject-teacher 3 -> hindi, general
];

async function run() {
    try {
        await connectDB();
        console.log("--- Connected to DB ---");

        // First clean up any existing subject assignments for Senior KG - A to avoid duplicates
        const deleteRes = await SubjectAssignment.deleteMany({
            school: schoolId,
            class: classId,
            section: section
        });
        console.log(`Cleaned up ${deleteRes.deletedCount} existing SubjectAssignments for Senior KG - A`);

        for (const t of teachers) {
            const user = await User.findById(t.userId);
            if (!user) {
                console.error(`Teacher user ${t.userId} not found!`);
                continue;
            }
            console.log(`\nAssigning ${user.name} (${user.loginId}):`);

            // Update Teacher Profile's assignedClasses
            const teacherProfile = await Teacher.findOne({ user: t.userId });
            if (teacherProfile) {
                if (!teacherProfile.assignedClasses.includes(classId)) {
                    teacherProfile.assignedClasses.push(classId);
                    await teacherProfile.save();
                    console.log(`  Added Class Senior KG to assignedClasses`);
                } else {
                    console.log(`  Class Senior KG already assigned to teacher profile`);
                }
            }

            // Create subject assignments
            for (const subId of t.subjects) {
                await SubjectAssignment.create({
                    organization: schoolId,
                    school: schoolId,
                    academicYear: "2026-2027",
                    class: classId,
                    section: section,
                    subject: subId,
                    teacherUser: t.userId,
                    assignedBy: t.userId
                });
                console.log(`  Created SubjectAssignment for Subject ID: ${subId}`);
            }
        }

        console.log("\n✅ All 3 subject teachers successfully assigned to Senior KG - A!");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
