import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import all required models
import User from '../models/users/user.model.js';
import Teacher from '../models/users/teacher.model.js';
import Student from '../models/users/student.model.js';
import SubjectAssignment from '../models/principal/SubjectAssignment.model.js';
import Section from '../models/school/Section.model.js';
import Class from '../models/organization/organizationClass.js';
import Subject from '../models/modules/Subject.js';
import Attendance from '../models/academic/attendance.model.js';

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
    console.log('=== DB Connected ===\n');
    try {
        // Step 1: Find the teacher user
        const user = await User.findOne({ name: /Subject teacher 3/i });
        if (!user) { console.log('❌ User not found'); process.exit(); }
        console.log('✅ User:', user.name, '| _id:', user._id, '| school:', user.school);

        // Step 2: Find teacher profile
        const teacher = await Teacher.findOne({ user: user._id, school: user.school });
        if (!teacher) { console.log('❌ Teacher profile not found'); process.exit(); }
        console.log('✅ Teacher profile:', teacher._id);

        // Step 3: Find subject assignments
        const assignments = await SubjectAssignment.find({ 
            teacherUser: user._id, 
            school: user.school 
        }).populate('class subject');
        console.log(`\n✅ Assignments found: ${assignments.length}`);
        assignments.forEach((a, i) => {
            console.log(`   [${i}] Class: ${a.class?.name || 'null'} (${a.class?._id}) | Section: "${a.section}" | Subject: ${a.subject?.subjectName || 'null'} (${a.subject?._id})`);
        });

        if (assignments.length === 0) {
            console.log('❌ No assignments found. This is the root cause.');
            process.exit();
        }

        // Step 4: Extract class IDs and section strings
        const targetClassIds = [...new Set(assignments.map(a => a.class?._id).filter(Boolean))];
        const targetSectionStrings = [...new Set(assignments.map(a => a.section).filter(Boolean))];
        console.log(`\n📋 Target Class IDs: ${JSON.stringify(targetClassIds.map(id => id.toString()))}`);
        console.log(`📋 Target Section Strings: ${JSON.stringify(targetSectionStrings)}`);

        // Step 5: Resolve section ObjectIds
        const sections = await Section.find({ school: user.school, name: { $in: targetSectionStrings } });
        const targetSectionIds = sections.map(s => s._id);
        console.log(`\n📋 Sections found in DB: ${sections.length}`);
        sections.forEach(s => console.log(`   Section: "${s.name}" | _id: ${s._id}`));

        if (targetSectionIds.length === 0) {
            console.log('❌ No section ObjectIds resolved! This means the Section names in SubjectAssignment don\'t match Section documents.');
            // Let's see all sections in this school
            const allSections = await Section.find({ school: user.school });
            console.log(`\n   All sections in school:`);
            allSections.forEach(s => console.log(`   "${s.name}" | _id: ${s._id}`));
        }

        // Step 6: Count students
        console.log('\n--- Student Query ---');
        console.log(`   school: ${user.school}`);
        console.log(`   class: { $in: [${targetClassIds.map(id => id.toString()).join(', ')}] }`);
        console.log(`   section: { $in: [${targetSectionIds.map(id => id.toString()).join(', ')}] }`);
        console.log(`   status: "Active"`);

        const studentsActive = await Student.countDocuments({ 
            class: { $in: targetClassIds }, 
            section: { $in: targetSectionIds },
            school: user.school, 
            status: 'Active' 
        });
        console.log(`\n   Students with status "Active": ${studentsActive}`);

        const studentsLowerActive = await Student.countDocuments({ 
            class: { $in: targetClassIds }, 
            section: { $in: targetSectionIds },
            school: user.school, 
            status: 'active' 
        });
        console.log(`   Students with status "active": ${studentsLowerActive}`);

        const studentsNoStatusFilter = await Student.countDocuments({ 
            class: { $in: targetClassIds }, 
            section: { $in: targetSectionIds },
            school: user.school
        });
        console.log(`   Students (no status filter): ${studentsNoStatusFilter}`);

        const studentsNoSectionFilter = await Student.countDocuments({ 
            class: { $in: targetClassIds }, 
            school: user.school
        });
        console.log(`   Students (no section filter): ${studentsNoSectionFilter}`);

        const allStudentsInSchool = await Student.countDocuments({ school: user.school });
        console.log(`   All students in school: ${allStudentsInSchool}`);

        // Step 7: Show a few students
        const sampleStudents = await Student.find({ school: user.school }).limit(5).select('user class section status rollNo admissionNo');
        console.log('\n--- Sample Students ---');
        for (const s of sampleStudents) {
            console.log(`   Student _id: ${s._id} | class: ${s.class} | section: ${s.section} | status: "${s.status}" | rollNo: "${s.rollNo}" | admissionNo: "${s.admissionNo}"`);
        }

        // Step 8: Check attendance records
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endToday = new Date();
        endToday.setHours(23, 59, 59, 999);
        
        const attendanceCount = await Attendance.countDocuments({
            school: user.school,
            class: { $in: targetClassIds },
            date: { $gte: today, $lte: endToday }
        });
        console.log(`\n--- Attendance for today ---`);
        console.log(`   Records: ${attendanceCount}`);

        console.log('\n=== Debug Complete ===');

    } catch (e) {
        console.error('❌ Error:', e);
    }
    process.exit();
}).catch(err => {
    console.error('DB Connection Error:', err);
    process.exit(1);
});
