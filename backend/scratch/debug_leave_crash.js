import mongoose from 'mongoose';
import 'dotenv/config';
import User from '../models/users/user.model.js';
import Student from '../models/users/student.model.js';

async function debugLeave() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        const user = await User.findOne({ name: 'eet', role: 'student' });
        if (!user) {
            console.log("User 'eet' not found");
            await mongoose.disconnect();
            return;
        }

        const studentProfile = await Student.findOne({ user: user._id });
        if (!studentProfile) {
            console.log("Student profile not found for " + user.name);
        } else {
            console.log("Student Profile Fields:");
            console.log("class:", studentProfile.class);
            console.log("section:", studentProfile.section);
            console.log("school:", studentProfile.school);
            console.log("academicYear:", studentProfile.academicYear);
        }

        await mongoose.disconnect();
        console.log("Disconnected.");
    } catch (error) {
        console.error("Error:", error);
    }
}
debugLeave();
