import mongoose from 'mongoose';
import 'dotenv/config';
import School from '../models/school/School.js';
import User from '../models/users/user.model.js';
import SalarySlip from '../models/finance/Salaryslip.model.js';

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const loginId = 'SXP5655';
        const user = await User.findOne({ loginId }).populate('school');
        if (!user) {
            console.log("User SXP5655 not found!");
            process.exit(1);
        }
        console.log(`User: ${user.name}, User ID: ${user._id}, School ID: ${user.school?._id}`);
        
        // Find any existing salary slip in the database to clone payroll structure from
        const templateSlip = await SalarySlip.findOne({});
        if (!templateSlip) {
            console.log("No salary slip templates found in DB to clone!");
            process.exit(1);
        }

        console.log("Cloning salary slip structure from template:", templateSlip._id);

        const newSlips = [
            {
                organization: user.school?.organization || templateSlip.organization,
                school: user.school?._id,
                staffId: user._id,
                payrollId: templateSlip.payrollId,
                month: 4,
                year: 2026,
                totalWorkingDays: 26,
                daysPresent: 24,
                daysAbsent: 2,
                basicSalary: 50000,
                payableBasic: 46153,
                netSalary: 48000,
                paymentStatus: 'paid',
                paymentMode: 'bank_transfer',
                paymentDate: new Date('2026-05-01'),
                paymentReference: 'TXN-9481940194',
                generatedBy: user._id
            },
            {
                organization: user.school?.organization || templateSlip.organization,
                school: user.school?._id,
                staffId: user._id,
                payrollId: templateSlip.payrollId,
                month: 5,
                year: 2026,
                totalWorkingDays: 27,
                daysPresent: 27,
                daysAbsent: 0,
                basicSalary: 50000,
                payableBasic: 50000,
                netSalary: 52000,
                paymentStatus: 'paid',
                paymentMode: 'bank_transfer',
                paymentDate: new Date('2026-06-01'),
                paymentReference: 'TXN-8591040182',
                generatedBy: user._id
            },
            {
                organization: user.school?.organization || templateSlip.organization,
                school: user.school?._id,
                staffId: user._id,
                payrollId: templateSlip.payrollId,
                month: 6,
                year: 2026,
                totalWorkingDays: 26,
                daysPresent: 25,
                daysAbsent: 1,
                basicSalary: 50000,
                payableBasic: 48076,
                netSalary: 50000,
                paymentStatus: 'paid',
                paymentMode: 'bank_transfer',
                paymentDate: new Date('2026-07-01'),
                paymentReference: 'TXN-7391039103',
                generatedBy: user._id
            }
        ];

        for (const s of newSlips) {
            // Check if slip already exists for this month/year
            const existing = await SalarySlip.findOne({ staffId: user._id, month: s.month, year: s.year });
            if (!existing) {
                await SalarySlip.create(s);
                console.log(`Created salary slip for month ${s.month}/${s.year}`);
            } else {
                console.log(`Salary slip for month ${s.month}/${s.year} already exists.`);
            }
        }

        console.log("Seeding complete!");
        await mongoose.disconnect();
    } catch (error) {
        console.error("Error during seeding:", error.message);
    }
}

seed();
