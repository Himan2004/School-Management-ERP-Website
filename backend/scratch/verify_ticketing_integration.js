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
import Ticket from '../models/common/Ticket.js';
import Class from '../models/organization/organizationClass.js';
import Section from '../models/school/Section.model.js';

async function verify() {
    try {
        await connectDB();
        console.log("--- Connected to DB ---");

        // 1. Find Student and Teacher
        const studentUser = await User.findOne({ loginId: "STU-SXPTS2706" });
        if (!studentUser) {
            console.error("❌ Test student user not found!");
            return;
        }
        console.log(`Found Student User: ${studentUser.name} (${studentUser._id})`);

        const studentProfile = await Student.findOne({ user: studentUser._id }).populate("class section");
        if (!studentProfile) {
            console.error("❌ Student profile not found!");
            return;
        }
        console.log(`Student Class: ${studentProfile.class?.name || 'N/A'}, Section: ${studentProfile.section?.name || 'N/A'}`);

        // Find a teacher user
        const teacherUser = await User.findOne({ role: "teacher" });
        if (!teacherUser) {
            console.error("❌ Teacher user not found!");
            return;
        }
        console.log(`Found Teacher User: ${teacherUser.name} (${teacherUser._id})`);

        // Find or create a mock subject assignment to link teacher to student's class & section
        let assignment = await SubjectAssignment.findOne({
            teacherUser: teacherUser._id,
            class: studentProfile.class?._id,
            section: studentProfile.section?.name
        });

        if (!assignment) {
            console.log("Mocking a SubjectAssignment for teacher to match student's class/section...");
            assignment = await SubjectAssignment.create({
                organization: studentProfile.school, // mock mapping
                school: studentProfile.school,
                academicYear: "2026-2027",
                class: studentProfile.class?._id,
                section: studentProfile.section?.name || "A",
                subject: studentProfile.class?._id, // mock ref
                teacherUser: teacherUser._id,
                assignedBy: teacherUser._id
            });
            console.log("Mock SubjectAssignment created successfully");
        } else {
            console.log("Existing SubjectAssignment found for this teacher and student class/section");
        }

        // Find an admin user
        const adminUser = await User.findOne({ role: "admin" });
        if (!adminUser) {
            console.error("❌ Admin user not found!");
            return;
        }
        console.log(`Found Admin User: ${adminUser.name} (${adminUser._id})`);

        // 2. Simulate Student creating an academic support ticket
        console.log("\n--- Creating Student Academic Ticket ---");
        const category = "academic";
        const dbCategory = "academic";
        const assignedToRole = "teacher";

        const ticket = await Ticket.create({
            organization: studentProfile.school, // mock matching
            school: studentProfile.school,
            title: "Doubt in Science homework",
            description: "I am unable to understand the second question on page 24.",
            category: dbCategory,
            priority: "medium",
            raisedBy: studentUser._id,
            raisedByRole: "student",
            assignedToRole,
            class: studentProfile.class?.name || "",
            section: studentProfile.section?.name || "",
            status: "open"
        });
        console.log(`Ticket created: ID ${ticket._id}`);
        console.log(`Ticket class: "${ticket.class}", section: "${ticket.section}", assignedToRole: "${ticket.assignedToRole}"`);

        // 3. Test Teacher Querying Help Desk
        console.log("\n--- Testing Teacher Help Desk Query ---");
        const teacherAssignments = await SubjectAssignment.find({ teacherUser: teacherUser._id }).populate('class');
        const classSectionQueries = teacherAssignments.map(a => ({
            class: a.class?.name,
            section: a.section
        })).filter(q => q.class && q.section);

        console.log("Teacher's classSectionQueries:", classSectionQueries);

        const teacherTickets = await Ticket.find({
            school: studentProfile.school,
            $or: [
                {
                    assignedToRole: "teacher",
                    $or: classSectionQueries.length > 0 ? classSectionQueries : [{ class: "__none__" }]
                },
                { assignedTo: teacherUser._id },
                { receiverId: teacherUser._id },
                { "escalationLog.escalatedBy": teacherUser._id }
            ]
        });

        const foundTeacherTicket = teacherTickets.find(t => t._id.toString() === ticket._id.toString());
        if (foundTeacherTicket) {
            console.log("✅ Success! Teacher successfully retrieved the student's academic ticket!");
        } else {
            console.error("❌ Failure! Teacher could not retrieve the student's ticket!");
        }

        // 4. Test Admin Querying Help Desk
        console.log("\n--- Testing Admin Help Desk Query ---");
        const adminTickets = await Ticket.find({
            school: studentProfile.school,
            $or: [
                {
                    assignedToRole: "admin",
                    $or: [{ assignedTo: adminUser._id }, { receiverId: adminUser._id }, { receiverId: { $exists: false } }, { receiverId: null }]
                },
                { assignedToRole: "teacher", category: "academic" }, // Admin also sees teacher academic tickets
                { "escalationLog.escalatedBy": adminUser._id }
            ]
        });

        const foundAdminTicket = adminTickets.find(t => t._id.toString() === ticket._id.toString());
        if (foundAdminTicket) {
            console.log("✅ Success! Admin successfully retrieved the student's academic ticket!");
        } else {
            console.error("❌ Failure! Admin could not retrieve the student's ticket!");
        }

        // Clean up
        await Ticket.findByIdAndDelete(ticket._id);
        console.log("\nCleaned up student test ticket");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
