import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const userSchema = new mongoose.Schema({
    loginId: String,
    password: { type: String, select: true }
}, { strict: false });

const User = mongoose.model('User', userSchema);

async function main() {
    try {
        await mongoose.connect(MONGODB_URI);
        const loginId = "STUDENT.EE.EE.785";
        const newPasswordRaw = "VCwZ5HAi";

        const user = await User.findOne({ loginId: loginId });
        if (!user) {
            console.log("User not found:", loginId);
            return;
        }
        
        console.log("User found. Current pass hash:", user.password);
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPasswordRaw, salt);

        user.password = hashedPassword;
        await user.save();

        console.log("Password successfully updated to:", newPasswordRaw);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

main();
