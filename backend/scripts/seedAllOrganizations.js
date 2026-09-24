import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// Models
import Organization from '../models/organization/Organization.js';
import School from '../models/school/School.js';
import Class from '../models/organization/organizationClass.js';
import Section from '../models/school/Section.model.js';
import Student from '../models/users/student.model.js';
import Parent from '../models/users/parent.model.js';
import User from '../models/users/user.model.js';
import FeeHead from '../models/finance/FeeHead.model.js';
import FeeStructure from '../models/finance/FeeStructure.model.js';
import FeeInstallment from '../models/finance/FeeInstallment.model.js';
import Expense from '../models/finance/Expense.model.js';
import FeePayment from '../models/finance/FeePayment.model.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const organizations = await Organization.find();
    console.log(`Found ${organizations.length} organizations in total.`);

    // Find a general system fallback user to act as creator
    let sysAdmin = await User.findOne({ role: { $in: ['superAdmin', 'admin', 'principal'] } });
    if (!sysAdmin) {
      sysAdmin = await User.findOne();
    }

    for (const org of organizations) {
      console.log(`\n========================================`);
      console.log(`Processing Organization: "${org.organizationName}" (${org._id})`);

      // 1. Ensure at least one School exists
      let school = await School.findOne({ organization: org._id });
      if (!school) {
        console.log(`  - No school found. Creating school "Main Branch"...`);
        school = await School.create({
          organization: org._id,
          schoolName: 'Main Branch',
          address: 'Default Address',
          officialPhone: '9999999999',
          officialEmail: `branch_${org._id.toString().slice(-4)}@example.com`,
          principalName: 'Principal Name',
          principalEmail: `principal_${org._id.toString().slice(-4)}@example.com`,
          isActive: true,
        });
      }
      console.log(`  - Using School: ${school.schoolName || school.name} (${school._id})`);

      if (!sysAdmin) {
        console.log(`  - Creating a system admin user...`);
        sysAdmin = await User.create({
          name: 'System Admin',
          loginId: 'SYSADMIN100',
          email: 'sysadmin@graphura.com',
          password: 'password123',
          role: 'admin',
          school: school._id,
        });
      }

      // 2. Ensure at least one Class exists
      let classDoc = await Class.findOne({ organization: org._id });
      if (!classDoc) {
        console.log(`  - No class found. Creating "Class 1"...`);
        classDoc = await Class.create({
          organization: org._id,
          name: 'Class 1',
          numericLevel: 1,
          isActive: true,
        });
      }
      console.log(`  - Using Class: ${classDoc.name} (${classDoc._id})`);

      // 3. Ensure at least one Section exists
      let sectionDoc = await Section.findOne({ organization: org._id, school: school._id, classId: classDoc._id });
      if (!sectionDoc) {
        console.log(`  - No section found. Creating section "A"...`);
        sectionDoc = await Section.create({
          organization: org._id,
          school: school._id,
          classId: classDoc._id,
          name: 'A',
          className: classDoc.name,
          capacity: 40,
          status: 'active',
        });
      }
      console.log(`  - Using Section: ${sectionDoc.name} (${sectionDoc._id})`);

      // 4. Ensure at least 2 Students exist
      let studentDocs = await Student.find({ school: school._id });
      if (studentDocs.length < 2) {
        const needed = 2 - studentDocs.length;
        console.log(`  - Found ${studentDocs.length} students. Seeding ${needed} more...`);
        
        for (let i = 0; i < needed; i++) {
          const rand = Math.floor(100 + Math.random() * 900);
          const studentName = `Student ${rand}`;
          const loginId = `STU-${org._id.toString().slice(-4).toUpperCase()}-${rand}`;

          // Create User document
          const studentUser = await User.create({
            name: studentName,
            loginId: loginId,
            email: `student_${rand}@example.com`,
            password: 'password123',
            role: 'student',
            school: school._id,
            status: 'active',
          });

          // Create Parent User and Profile
          const parentLoginId = `PRNT-${org._id.toString().slice(-4).toUpperCase()}-${rand}`;
          const parentUser = await User.create({
            name: `Parent of ${studentName}`,
            loginId: parentLoginId,
            email: `parent_${rand}@example.com`,
            password: 'password123',
            role: 'parent',
            school: school._id,
            status: 'active',
          });

          const parentProfile = await Parent.create({
            user: parentUser._id,
            fatherName: `Father of ${studentName}`,
            motherName: `Mother of ${studentName}`,
            primaryContact: `99${Math.floor(10000000 + Math.random() * 90000000)}`,
            school: school._id,
            relation: 'father',
          });

          // Create Student profile
          const studentProfile = await Student.create({
            user: studentUser._id,
            rollNo: String(i + 1),
            class: classDoc._id,
            section: sectionDoc._id,
            academicYear: '2024-25',
            parent: parentProfile._id,
            school: school._id,
            status: 'active',
          });

          studentDocs.push(studentProfile);
          console.log(`    + Created student ${studentName} (${studentProfile._id})`);
        }
      }

      // 5. Ensure FeeHeads exist
      let tuitionHead = await FeeHead.findOne({ organization: org._id, name: /Tuition Fee/i });
      if (!tuitionHead) {
        console.log(`  - Creating Tuition Fee head...`);
        tuitionHead = await FeeHead.create({
          organization: org._id,
          name: 'Tuition Fee',
          description: 'Regular monthly/term tuition fee',
          createdBy: sysAdmin._id,
        });
      }

      let libraryHead = await FeeHead.findOne({ organization: org._id, name: /Library Fee/i });
      if (!libraryHead) {
        console.log(`  - Creating Library Fee head...`);
        libraryHead = await FeeHead.create({
          organization: org._id,
          name: 'Library Fee',
          description: 'Access to school library resources',
          createdBy: sysAdmin._id,
        });
      }

      // 6. Ensure FeeStructure exists
      let feeStructure = await FeeStructure.findOne({ organization: org._id, classId: classDoc._id, isActive: true });
      if (!feeStructure) {
        console.log(`  - Creating FeeStructure...`);
        feeStructure = await FeeStructure.create({
          organization: org._id,
          school: school._id,
          academicYear: '2024-25',
          classId: classDoc._id,
          feeLines: [
            { feeHeadId: tuitionHead._id, amount: 20000 },
            { feeHeadId: libraryHead._id, amount: 5000 }
          ],
          createdBy: sysAdmin._id,
        });
        console.log(`    + Created FeeStructure with Total=${feeStructure.totalAmount}`);
      }

      // 7. Seed FeeInstallments for all students of this Organization
      console.log(`  - Generating FeeInstallments and FeePayments for students...`);
      for (const student of studentDocs) {
        // Delete old ones to have clean state
        await FeeInstallment.deleteMany({
          studentId: student.user,
          academicYear: '2024-25',
        });
        await FeePayment.deleteMany({
          studentId: student.user,
          academicYear: '2024-25',
        });

        const totalAmount = feeStructure.totalAmount;
        const q1Amount = Math.round(totalAmount * 0.3); // 7500
        const q2Amount = Math.round(totalAmount * 0.3); // 7500
        const q3Amount = Math.round(totalAmount * 0.2); // 5000
        const q4Amount = totalAmount - (q1Amount + q2Amount + q3Amount); // 5000 (approx 20%)

        const q3Paid = Math.round(q3Amount * 0.25); // 1250 paid (3750 pending)

        const installments = [
          {
            installmentNo: 1,
            label: 'Quarter 1 Fee',
            amountDue: q1Amount,
            dueDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
            amountPaid: q1Amount,
            status: 'paid',
            paidOn: new Date(Date.now() - 118 * 24 * 60 * 60 * 1000),
          },
          {
            installmentNo: 2,
            label: 'Quarter 2 Fee',
            amountDue: q2Amount,
            dueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
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
          organization: org._id,
          school: school._id,
          studentId: student.user,
          feeStructureId: feeStructure._id,
          academicYear: '2024-25',
          planType: 'quarterly',
          grossAmount: totalAmount,
          waiverAmount: 0,
          netAmount: totalAmount,
          totalPaid: totalPaid,
          totalDue: totalDue,
          installments: installments,
          status: 'active',
          createdBy: sysAdmin._id,
        });

        await feeInstallment.save();

        const savedInsts = feeInstallment.installments;

        // Seed FeePayment for Installment 1 (Fully paid)
        await FeePayment.create({
          organization: org._id,
          school: school._id,
          studentId: student.user,
          feeInstallmentId: feeInstallment._id,
          installmentSlotId: savedInsts[0]._id,
          academicYear: '2024-25',
          amountPaid: q1Amount,
          paymentMode: ['upi', 'cash', 'net_banking'][Math.floor(Math.random() * 3)],
          paymentStatus: 'success',
          paymentDate: savedInsts[0].paidOn,
          collectedBy: sysAdmin._id,
        });

        // Seed FeePayment for Installment 2 (Fully paid)
        await FeePayment.create({
          organization: org._id,
          school: school._id,
          studentId: student.user,
          feeInstallmentId: feeInstallment._id,
          installmentSlotId: savedInsts[1]._id,
          academicYear: '2024-25',
          amountPaid: q2Amount,
          paymentMode: ['card', 'upi', 'net_banking'][Math.floor(Math.random() * 3)],
          paymentStatus: 'success',
          paymentDate: savedInsts[1].paidOn,
          collectedBy: sysAdmin._id,
        });

        // Seed FeePayment for Installment 3 (Partially paid)
        await FeePayment.create({
          organization: org._id,
          school: school._id,
          studentId: student.user,
          feeInstallmentId: feeInstallment._id,
          installmentSlotId: savedInsts[2]._id,
          academicYear: '2024-25',
          amountPaid: q3Paid,
          paymentMode: 'cash',
          paymentStatus: 'success',
          paymentDate: savedInsts[2].paidOn,
          collectedBy: sysAdmin._id,
        });
      }
      console.log(`  - Successfully seeded FeeInstallments & FeePayments for ${studentDocs.length} students.`);

      // 8. Seed Expense records for the School
      console.log(`  - Seeding operational expenses...`);
      await Expense.deleteMany({ organization: org._id });

      const expenseData = [
        { title: 'Electricity Bill', category: 'electricity', amount: 15000 + Math.floor(Math.random() * 5000), dateOffset: 12, mode: 'upi' },
        { title: 'Water Bill', category: 'water', amount: 3000 + Math.floor(Math.random() * 1000), dateOffset: 10, mode: 'cash' },
        { title: 'Internet charges', category: 'it_infrastructure', amount: 6500, dateOffset: 8, mode: 'card' },
        { title: 'Lab Supplies', category: 'lab', amount: 22000, dateOffset: 6, mode: 'bank_transfer' },
        { title: 'Office Salaries', category: 'salaries', amount: 120000 + Math.floor(Math.random() * 50000), dateOffset: 25, mode: 'bank_transfer' },
        { title: 'General Maintenance', category: 'maintenance', amount: 25000, dateOffset: 4, mode: 'bank_transfer' },
        { title: 'Stationery Items', category: 'stationery', amount: 4500, dateOffset: 2, mode: 'cash' }
      ];

      for (const exp of expenseData) {
        await Expense.create({
          organization: org._id,
          school: school._id,
          title: exp.title,
          category: exp.category,
          amount: exp.amount,
          expenseDate: new Date(Date.now() - exp.dateOffset * 24 * 60 * 60 * 1000),
          paymentMode: exp.mode,
          paymentStatus: 'paid',
          recordedBy: sysAdmin._id
        });
      }
    }

    console.log('\nAll organizations successfully seeded!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
};

run();
