import mongoose from 'mongoose';
import 'dotenv/config';
import School from '../models/school/School.js';
import User from '../models/users/user.model.js';
import SalarySlip from '../models/finance/Salaryslip.model.js';

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const loginId = 'SXP5655';
        const user = await User.findOne({ loginId }).populate('school');
        if (!user) {
            console.log("User SXP5655 not found!");
            process.exit(1);
        }
        console.log(`User: ${user.name}, Role: ${user.role}, User ID: ${user._id}`);
        
        const slips = await SalarySlip.find({ staffId: user._id });
        console.log(`Salary slips count for teacher: ${slips.length}`);
        slips.forEach(s => {
            console.log(`- Month: ${s.month}, Year: ${s.year}, Net: ${s.netSalary}, Status: ${s.paymentStatus}, StaffId: ${s.staffId}`);
        });

        // Let's also print all salary slips in the database to see if staffId is different or if they belong to a different teacher/staff user ID
        const allSlips = await SalarySlip.find({}).limit(10);
        console.log(`Total salary slips in DB: ${await SalarySlip.countDocuments()}`);
        allSlips.forEach(s => {
            console.log(`- Slip: Month: ${s.month}, Year: ${s.year}, Net: ${s.netSalary}, Status: ${s.paymentStatus}, StaffId: ${s.staffId}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error.message);
    }
}

inspect();
