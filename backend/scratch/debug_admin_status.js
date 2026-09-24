import mongoose from "mongoose";
import "dotenv/config";
import GraphuraAdmin from "../models/graphura/GraphuraAdmin.js";

async function checkAdminStatus() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        const email = process.env.GRAPHURA_ADMIN_EMAIL;
        console.log(`Checking status for: ${email}`);

        const admin = await GraphuraAdmin.findOne({ email });

        const { default: SystemSettings } = await import("../models/graphura/SystemSettings.js");
        const settings = await SystemSettings.findOne();

        console.log("✅ System Settings Found:");
        console.log(JSON.stringify(settings?.security || {}, null, 2));

        if (!admin) {
            console.error("❌ Graphura Admin not found in database.");
        } else {
            console.log("✅ Admin Found:");
            console.log({
                id: admin._id,
                email: admin.email,
                isActive: admin.isActive,
                status: admin.status, // might be undefined, checking just in case
                role: admin.role
            });

            if (admin.isActive === false) {
                console.log("⚠️ Account is explicitly INACTIVE. Reactivating...");
                admin.isActive = true;
                await admin.save();
                console.log("✅ Account REACTIVATED.");
            }
        }

        await mongoose.disconnect();
        console.log("Disconnected.");
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

checkAdminStatus();
