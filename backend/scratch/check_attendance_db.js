import mongoose from 'mongoose';
import 'dotenv/config';
import '../../backend/models/finance/Payroll.model.js';
import '../../backend/models/finance/Salaryslip.model.js';
import '../../backend/models/users/user.model.js';

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB.");

        const teacherUserId = new mongoose.Types.ObjectId("6a2151f39709eabab2846ad3");
        const schoolId = new mongoose.Types.ObjectId("69fe09eedec901fd9887d235");
        const orgId = new mongoose.Types.ObjectId("69fe003e86110688cfd614de");

        const Payroll = mongoose.model("Payroll");
        const SalarySlip = mongoose.model("SalarySlip");

        // 1. Check/Create Payroll document for Shanu Kumar
        let payroll = await Payroll.findOne({ staffId: teacherUserId });
        if (!payroll) {
            console.log("No Payroll record found for Shanu Kumar. Creating one...");
            payroll = await Payroll.create({
                organization: orgId,
                school: schoolId,
                staffId: teacherUserId,
                staffRole: 'teacher',
                basicSalary: 60000,
                allowances: [
                    { name: 'HRA', amount: 8000, isTaxable: true },
                    { name: 'TA', amount: 3000, isTaxable: true }
                ],
                grossSalary: 71000,
                deductions: [
                    {
                        name: 'PF',
                        deductionType: 'percentage',
                        value: 12,
                        appliesOn: 'basic',
                        isEmployerContribution: false
                    }
                ],
                netSalary: 63800,
                paymentMode: 'bank_transfer',
                effectiveFrom: new Date('2026-04-01'),
                isActive: true,
                createdBy: teacherUserId
            });
            console.log("Created Payroll record:", payroll._id);
        } else {
            console.log("Existing Payroll record found:", payroll._id);
        }

        // 2. Delete any existing slips for Shanu Kumar to avoid duplicates and reseed fresh
        await SalarySlip.deleteMany({ staffId: teacherUserId });
        console.log("Deleted old salary slips.");

        // 3. Create 3 salary slips: April, May, June 2026
        const newSlips = [
            {
                organization: orgId,
                school: schoolId,
                staffId: teacherUserId,
                payrollId: payroll._id,
                month: 4,
                year: 2026,
                totalWorkingDays: 26,
                daysPresent: 25,
                daysAbsent: 1,
                basicSalary: 60000,
                payableBasic: 57692,
                allowances: [
                    { name: 'HRA', amount: 8000, isTaxable: true },
                    { name: 'TA', amount: 3000, isTaxable: true }
                ],
                deductions: [
                    { name: 'PF', amount: 7200, isEmployerContribution: false }
                ],
                totalAllowances: 11000,
                totalDeductions: 7200,
                grossSalary: 68692,
                netSalary: 61492,
                paymentStatus: 'paid',
                paymentMode: 'bank_transfer',
                paymentDate: new Date('2026-05-01'),
                paymentReference: 'TXN-9481940194',
                generatedBy: teacherUserId
            },
            {
                organization: orgId,
                school: schoolId,
                staffId: teacherUserId,
                payrollId: payroll._id,
                month: 5,
                year: 2026,
                totalWorkingDays: 27,
                daysPresent: 27,
                daysAbsent: 0,
                basicSalary: 60000,
                payableBasic: 60000,
                allowances: [
                    { name: 'HRA', amount: 8000, isTaxable: true },
                    { name: 'TA', amount: 3000, isTaxable: true }
                ],
                deductions: [
                    { name: 'PF', amount: 7200, isEmployerContribution: false }
                ],
                totalAllowances: 11000,
                totalDeductions: 7200,
                grossSalary: 71000,
                netSalary: 63800,
                paymentStatus: 'paid',
                paymentMode: 'bank_transfer',
                paymentDate: new Date('2026-06-01'),
                paymentReference: 'TXN-8591040182',
                generatedBy: teacherUserId
            },
            {
                organization: orgId,
                school: schoolId,
                staffId: teacherUserId,
                payrollId: payroll._id,
                month: 6,
                year: 2026,
                totalWorkingDays: 26,
                daysPresent: 26,
                daysAbsent: 0,
                basicSalary: 60000,
                payableBasic: 60000,
                allowances: [
                    { name: 'HRA', amount: 8000, isTaxable: true },
                    { name: 'TA', amount: 3000, isTaxable: true }
                ],
                deductions: [
                    { name: 'PF', amount: 7200, isEmployerContribution: false }
                ],
                totalAllowances: 11000,
                totalDeductions: 7200,
                grossSalary: 71000,
                netSalary: 63800,
                paymentStatus: 'paid',
                paymentMode: 'bank_transfer',
                paymentDate: new Date('2026-07-01'),
                paymentReference: 'TXN-7391039103',
                generatedBy: teacherUserId
            }
        ];

        const seededSlips = await SalarySlip.insertMany(newSlips);
        console.log(`Successfully seeded ${seededSlips.length} salary slips for Shanu Kumar!`);

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error seeding payroll/salaries:", error);
    }
}

seed();
