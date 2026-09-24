import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testPostApis() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = (await import('../models/users/user.model.js')).default;
        const Student = (await import('../models/users/student.model.js')).default;
        
        const user = await User.findOne({ name: /Subject teacher 3/i });
        if (!user) throw new Error("User not found");
        
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );
        
        // Find a student to mark attendance
        const student = await Student.findOne({ school: user.school });
        
        console.log("Testing markAttendance...");
        try {
            const res = await axios.post('http://localhost:5001/api/subject-teacher/attendance/mark', {
                studentId: student._id.toString(),
                status: 'present',
                date: new Date().toISOString()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Mark Attendance Success:", res.status, res.data);
        } catch (e) {
            console.error("Mark Attendance Error:", e.response ? e.response.status : e.message);
            if (e.response && e.response.data) console.error(e.response.data);
        }

        console.log("Testing applyLeave...");
        try {
            const res2 = await axios.post('http://localhost:5001/api/subject-teacher/attendance/leave', {
                studentId: student._id.toString(),
                leaveType: 'full_day',
                date: new Date().toISOString(),
                reason: 'Sick'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Apply Leave Success:", res2.status, res2.data);
        } catch (e) {
            console.error("Apply Leave Error:", e.response ? e.response.status : e.message);
            if (e.response && e.response.data) console.error(e.response.data);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
testPostApis();
