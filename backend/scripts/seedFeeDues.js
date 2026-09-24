import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Models
import FeeInstallment from '../models/finance/FeeInstallment.model.js';
import FeeStructure from '../models/finance/FeeStructure.model.js';
import FeeHead from '../models/finance/FeeHead.model.js';
import Organization from '../models/organization/Organization.js';
import School from '../models/school/School.js';
import Student from '../models/users/student.model.js';
import Class from '../models/organization/organizationClass.js';
import Section from '../models/school/Section.model.js';
import Parent from '../models/users/parent.model.js';
import User from '../models/users/user.model.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    // 1. Fetch all students
    const students = await Student.find().populate('school');
    console.log(`Found ${students.length} students in the database.`);

    if (students.length === 0) {
      console.log('No students found to seed fee installments for.');
      process.exit(0);
    }

    // Find a general fallback user to act as createdBy
    let fallbackUser = await User.findOne({ role: { $in: ['superAdmin', 'admin', 'principal'] } });
    if (!fallbackUser) {
      fallbackUser = await User.findOne();
    }
    if (!fallbackUser) {
      console.log('No user found in the DB. Creating a dummy admin user...');
      fallbackUser = await User.create({
        name: 'System Admin',
        loginId: 'SYSADMIN100',
        email: 'sysadmin@graphura.com',
        password: 'password123',
        role: 'admin',
        school: students[0].school?._id || new mongoose.Types.ObjectId(),
      });
    }

    for (const student of students) {
      console.log(`\nProcessing student: ${student.name || 'Unnamed'} (ID: ${student._id})`);

      const school = student.school;
      if (!school) {
        console.log(`Warning: Student ${student._id} has no school associated. Skipping.`);
        continue;
      }

      const orgId = school.organization;
      if (!orgId) {
        console.log(`Warning: School ${school._id} has no organization associated. Skipping student.`);
        continue;
      }

      // Check / Fix Student's Class
      let studentClass = await Class.findById(student.class);
      if (!studentClass) {
        console.log(`Student ${student._id} has invalid/stale class ID. Fixing...`);
        // Find if any class exists in this organization
        let existingClass = await Class.findOne({ organization: orgId });
        if (!existingClass) {
          console.log(`No class found for organization ${orgId}. Creating one...`);
          existingClass = await Class.create({
            organization: orgId,
            name: 'Class 1',
            numericLevel: 1,
            isActive: true,
          });
        }
        student.class = existingClass._id;
        studentClass = existingClass;
        console.log(`Assigned class: ${studentClass.name} (${studentClass._id})`);
      }

      // Check / Fix Student's Section
      let studentSection = await Section.findById(student.section);
      if (!studentSection) {
        console.log(`Student ${student._id} has invalid/stale section ID. Fixing...`);
        let existingSection = await Section.findOne({ organization: orgId, school: school._id, classId: studentClass._id });
        if (!existingSection) {
          console.log(`No section found for class ${studentClass.name} and school ${school._id}. Creating section 'A'...`);
          existingSection = await Section.create({
            organization: orgId,
            school: school._id,
            classId: studentClass._id,
            name: 'A',
            className: studentClass.name,
            capacity: 40,
            status: 'active'
          });
        }
        student.section = existingSection._id;
        studentSection = existingSection;
        console.log(`Assigned section: ${studentSection.name} (${studentSection._id})`);
      }

      // Check / Fix Student's Parent
      let studentParent = await Parent.findById(student.parent);
      if (!studentParent) {
        console.log(`Student ${student._id} has invalid parent ID. Fixing...`);
        // Let's create a new Parent profile
        // Create user for parent first
        const parentLoginId = `PRNT_${student._id.toString().slice(-6).toUpperCase()}`;
        let parentUser = await User.findOne({ loginId: parentLoginId });
        if (!parentUser) {
          parentUser = await User.create({
            name: `Parent of ${student.name || 'Student'}`,
            loginId: parentLoginId,
            email: `parent_${student._id.toString().slice(-6)}@example.com`,
            password: 'password123',
            role: 'parent',
            school: school._id
          });
        }

        studentParent = await Parent.create({
          user: parentUser._id,
          students: [student._id],
          fatherName: `Father of ${student.name || 'Student'}`,
          motherName: `Mother of ${student.name || 'Student'}`,
          primaryContact: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
          school: school._id,
          relation: 'father'
        });

        student.parent = studentParent._id;
        console.log(`Created and linked new Parent profile: ${studentParent.fatherName} (${studentParent._id})`);
      }

      // Save student once with all updates to avoid partial validation errors
      await student.save();

      // 2. Find or Create FeeHeads for the organization
      let tuitionHead = await FeeHead.findOne({ organization: orgId, name: /Tuition Fee/i });
      if (!tuitionHead) {
        console.log(`Creating Tuition Fee head for Organization ${orgId}...`);
        tuitionHead = await FeeHead.create({
          organization: orgId,
          name: 'Tuition Fee',
          description: 'Regular monthly/term tuition fee',
          createdBy: fallbackUser._id,
        });
      }

      let libraryHead = await FeeHead.findOne({ organization: orgId, name: /Library Fee/i });
      if (!libraryHead) {
        console.log(`Creating Library Fee head for Organization ${orgId}...`);
        libraryHead = await FeeHead.create({
          organization: orgId,
          name: 'Library Fee',
          description: 'Access to school library resources',
          createdBy: fallbackUser._id,
        });
      }

      let sportsHead = await FeeHead.findOne({ organization: orgId, name: /Sports Fee/i });
      if (!sportsHead) {
        console.log(`Creating Sports Fee head for Organization ${orgId}...`);
        sportsHead = await FeeHead.create({
          organization: orgId,
          name: 'Sports Fee',
          description: 'Sports and outdoor activities fee',
          createdBy: fallbackUser._id,
        });
      }

      // 3. Find or Create FeeStructure for student's class, school, and organization
      let feeStructure = await FeeStructure.findOne({
        organization: orgId,
        classId: studentClass._id,
        isActive: true,
      });

      if (!feeStructure) {
        console.log(`No active FeeStructure found for class ${studentClass.name}. Creating one...`);
        // Define random pricing
        const baseTuition = 15000 + Math.floor(Math.random() * 15) * 1000; // 15k to 30k
        const baseLibrary = 2000 + Math.floor(Math.random() * 4) * 500;   // 2k to 4k
        const baseSports = 3000 + Math.floor(Math.random() * 5) * 500;    // 3k to 5k

        feeStructure = await FeeStructure.create({
          organization: orgId,
          school: school._id,
          academicYear: student.academicYear || '2024-2025',
          classId: studentClass._id,
          feeLines: [
            { feeHeadId: tuitionHead._id, amount: baseTuition },
            { feeHeadId: libraryHead._id, amount: baseLibrary },
            { feeHeadId: sportsHead._id, amount: baseSports }
          ],
          createdBy: fallbackUser._id,
        });
        console.log(`Created FeeStructure: Class=${studentClass.name}, Total=${feeStructure.totalAmount} (${feeStructure._id})`);
      }

      // 4. Create FeeInstallment for student
      // Delete any existing fee installments for this student and academic year to get a clean seed
     const now = new Date();
const y = now.getFullYear();

const targetYear =
    now.getMonth() >= 3
        ? `${y}-${String(y + 1).slice(-2)}`
        : `${y - 1}-${String(y).slice(-2)}`;

      const totalAmount = feeStructure.totalAmount;
      
      // We will define a set of 4 quarterly installments:
      // Quarter 1: Paid (120 days ago)
      // Quarter 2: Paid (60 days ago)
      // Quarter 3: Partially Paid (15 days ago) -> causing overdue pending
      // Quarter 4: Upcoming (30 days from now)

      const q1Amount = Math.round(totalAmount * 0.3);
      const q2Amount = Math.round(totalAmount * 0.3);
      const q3Amount = Math.round(totalAmount * 0.2);
      const q4Amount = totalAmount - (q1Amount + q2Amount + q3Amount); // remaining (approx 20%)

      const q3Paid = Math.round(q3Amount * 0.25); // student paid only 25% of Quarter 3
      
      const installments = [
        {
          installmentNo: 1,
          label: 'Quarter 1 Fee',
          amountDue: q1Amount,
          dueDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // 120 days ago
          amountPaid: q1Amount,
          status: 'paid',
          paidOn: new Date(Date.now() - 118 * 24 * 60 * 60 * 1000),
        },
        {
          installmentNo: 2,
          label: 'Quarter 2 Fee',
          amountDue: q2Amount,
          dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          amountPaid: q2Amount,
          status: 'paid',
          paidOn: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000),
        },
        {
          installmentNo: 3,
          label: 'Quarter 3 Fee',
          amountDue: q3Amount,
          dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago (Overdue!)
          amountPaid: q3Paid,
          status: 'partially_paid',
          paidOn: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
        {
          installmentNo: 4,
          label: 'Quarter 4 Fee',
          amountDue: q4Amount,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now (Upcoming)
          amountPaid: 0,
          status: 'upcoming',
        }
      ];

      const totalPaid = q1Amount + q2Amount + q3Paid;
      const totalDue = totalAmount - totalPaid;

      const feeInstallment = new FeeInstallment({
        organization: orgId,
        school: school._id,
        studentId: student.user,
        feeStructureId: feeStructure._id,
        academicYear: targetYear,
        planType: 'quarterly',
        grossAmount: totalAmount,
        waiverAmount: 0,
        netAmount: totalAmount,
        totalPaid: totalPaid,
        totalDue: totalDue,
        installments: installments,
        status: 'active',
        createdBy: fallbackUser._id,
      });

      await feeInstallment.save();
      console.log(`Created FeeInstallment for ${student.name}: Gross=${totalAmount}, Paid=${totalPaid}, Due=${totalDue}`);
    }
    console.log('\nSeeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

run();
