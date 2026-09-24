import mongoose from 'mongoose';
import 'dotenv/config';
import User from './models/users/user.model.js';

async function findAdmins() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admins = await User.find({ role: 'admin' }).limit(5);
        if (admins.length > 0) {
            console.log("Found Admins:");
            admins.forEach(admin => {
                console.log(`- Login ID: ${admin.loginId}, Name: ${admin.name}, School: ${admin.school}`);
            });
            console.log("\nNote: Passwords are hashed, so you might need to reset one if you don't know it.");
        } else {
            console.log("No admins found in the database.");
        }
        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error.message);
    }
}

findAdmins();
