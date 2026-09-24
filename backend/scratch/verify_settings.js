import mongoose from "mongoose";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getStudentSettings, updateStudentSettings, updateStudentPassword } from "../controllers/student/studentSettingsController.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const mockRes = () => {
    const res = {};
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.data = data; return res; };
    return res;
};

const userSchema = new mongoose.Schema({ loginId: String }, { strict: false });
let User;
try { User = mongoose.model('User'); } catch (e) { User = mongoose.model('User', userSchema); }

async function verifySettings() {
    console.log("==========================================");
    console.log("    SETTINGS BACKEND VERIFICATION         ");
    console.log("==========================================");

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.\n");

    const studentUser = await User.findOne({ loginId: "STUDENT.EE.EE.785" });
    if (!studentUser) {
        console.log("❌ Student user not found");
        await mongoose.disconnect();
        return;
    }
    console.log(`Found user: ${studentUser.loginId} (${studentUser._id})\n`);

    // 1. GET settings
    console.log("[1/3] Testing getStudentSettings...");
    const getReq = { user: studentUser };
    const getRes = mockRes();
    await getStudentSettings(getReq, getRes);
    if (getRes.data?.success) {
        const d = getRes.data.data;
        console.log("✅ SUCCESS. Profile fetched:");
        console.log(`   Name: ${d.profile.fullName}, Email: ${d.profile.email}`);
        console.log(`   Notifications: emailNotifications=${d.notifications.emailNotifications}`);
        console.log(`   Security: twoFactorAuth=${d.security.twoFactorAuth}, timeout=${d.security.sessionTimeout}min`);
    } else {
        console.log("❌ FAILED:", getRes.data?.message);
    }

    // 2. UPDATE settings
    console.log("\n[2/3] Testing updateStudentSettings...");
    const updateReq = {
        user: studentUser,
        body: {
            profile: { bio: "Updated bio from settings verification test." },
            notifications: { newsletter: true },
            appearance: { fontSize: "large" }
        }
    };
    const updateRes = mockRes();
    await updateStudentSettings(updateReq, updateRes);
    if (updateRes.data?.success) {
        const d = updateRes.data.data;
        console.log("✅ SUCCESS. Updated Settings:");
        console.log(`   bio: ${d.profile.bio}`);
        console.log(`   newsletter: ${d.notifications.newsletter}`);
        console.log(`   fontSize: ${d.appearance.fontSize}`);
    } else {
        console.log("❌ FAILED:", updateRes.data?.message);
    }

    // 3. PASSWORD CHANGE (wrong current password should fail correctly)
    console.log("\n[3/3] Testing updateStudentPassword (wrong password - should fail)...");
    const pwReq = {
        user: studentUser,
        body: { currentPassword: "wrongpassword123", newPassword: "newpass123" }
    };
    const pwRes = mockRes();
    await updateStudentPassword(pwReq, pwRes);
    if (pwRes.statusCode === 400) {
        console.log("✅ Correctly rejected wrong password. Message:", pwRes.data?.message);
    } else {
        console.log("⚠️  Unexpected response:", pwRes.statusCode, pwRes.data?.message);
    }

    console.log("\n==========================================");
    console.log("        VERIFICATION COMPLETE             ");
    console.log("==========================================");
    await mongoose.disconnect();
}

verifySettings().catch(console.error);
