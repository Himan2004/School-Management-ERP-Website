import mongoose from 'mongoose';
import 'dotenv/config';
import User from './models/users/user.model.js';
import bcrypt from 'bcryptjs';

async function resetAdminPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const loginId = 'ADM-SDX6069';
        const newPassword = 'Admin@123456';
        
        const user = await User.findOne({ loginId });
        if (user) {
            user.password = newPassword; // The pre-save hook in user.model.js will hash this
            await user.save();
            console.log(`✅ Password for ${loginId} has been reset to: ${newPassword}`);
        } else {
            console.log(`❌ Admin with Login ID ${loginId} not found.`);
        }
        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error.message);
    }
}

resetAdminPassword();
