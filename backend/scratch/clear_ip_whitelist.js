import mongoose from "mongoose";
import "dotenv/config";

async function clearIpWhitelist() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        const { default: SystemSettings } = await import("../models/graphura/SystemSettings.js");
        const settings = await SystemSettings.findOne();

        if (settings) {
            console.log("Checking security settings...");
            if (settings.security && settings.security.ipWhitelist && settings.security.ipWhitelist.length > 0) {
                console.log(`Current Whitelist: ${settings.security.ipWhitelist}`);
                settings.security.ipWhitelist = []; // Clear it
                await settings.save();
                console.log("✅ IP Whitelist cleared successfully.");
            } else {
                console.log("ℹ️ IP Whitelist is already empty.");
            }
        } else {
            console.warn("⚠️ SystemSettings not found. Skipping.");
        }

        await mongoose.disconnect();
        console.log("Disconnected.");
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

clearIpWhitelist();
