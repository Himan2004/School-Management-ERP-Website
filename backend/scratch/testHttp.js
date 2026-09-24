import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testHttp() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = (await import('../models/users/user.model.js')).default;
        
        const user = await User.findOne({ name: /Subject teacher 3/i });
        if (!user) throw new Error("User not found");
        
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "30d" }
        );
        
        console.log("Token generated:", token);
        
        try {
            const res = await axios.get('http://localhost:5001/api/subject-teacher/dashboard/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Dashboard Stats Success:", res.status, res.data);
        } catch (e) {
            console.error("Dashboard Stats Error:", e.response ? e.response.status : e.message);
            if (e.response && e.response.data) console.error(e.response.data);
        }

        try {
            const res2 = await axios.get('http://localhost:5001/api/subject-teacher/attendance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Attendance Success:", res2.status, res2.data);
        } catch (e) {
            console.error("Attendance Error:", e.response ? e.response.status : e.message);
            if (e.response && e.response.data) console.error(e.response.data);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
testHttp();
