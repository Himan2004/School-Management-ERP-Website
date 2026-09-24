import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testApis() {
    try {
        // Connect to db to get the token directly if possible, or just mock the controller call
        // Actually, it's easier to just invoke the controller function directly to see the error.
        
        const { getTeacherDashboardStats } = await import('../controllers/subjectTeacher/subjectTeacherDashboardController.js');
        const { getSubjectWiseAttendance } = await import('../controllers/subjectTeacher/subjectTeacherAttendanceController.js');
        
        await mongoose.connect(process.env.MONGODB_URI);
        const User = (await import('../models/users/user.model.js')).default;
        
        const user = await User.findOne({ name: /Subject teacher 3/i });
        if (!user) throw new Error("User not found");
        
        const req = {
            user: { _id: user._id, school: user.school },
            query: { timeRange: 'week' }
        };
        
        const res = {
            status: function(code) { this.statusCode = code; return this; },
            json: function(data) { console.log('Response:', this.statusCode, data); return this; }
        };
        
        console.log('Testing getTeacherDashboardStats...');
        await getTeacherDashboardStats(req, res);
        
        console.log('\nTesting getSubjectWiseAttendance...');
        req.query = {};
        await getSubjectWiseAttendance(req, res);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
testApis();
