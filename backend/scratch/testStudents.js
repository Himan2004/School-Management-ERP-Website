import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/users/student.model.js';

dotenv.config({ path: 'backend/.env' });

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(async () => {
    console.log('DB Connected');
    try {
        const students = await Student.find({}).limit(5).populate('class section');
        console.log('Students:', JSON.stringify(students, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit();
}).catch(console.error);
