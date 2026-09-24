import "dotenv/config";
import GraphuraAdmin from "../models/graphura/GraphuraAdmin.js";

export const seedGraphuraAdmin = async () => {
    try {
        const { GRAPHURA_ADMIN_EMAIL, GRAPHURA_ADMIN_PASSWORD, GRAPHURA_ADMIN_KEY } = process.env;

        if (!GRAPHURA_ADMIN_EMAIL || !GRAPHURA_ADMIN_PASSWORD || !GRAPHURA_ADMIN_KEY) {
            console.error("❌ Missing env vars");
            return;
        }

        const existing = await GraphuraAdmin.findOne({ email: GRAPHURA_ADMIN_EMAIL });

        if (existing) {
            console.log("⚠️ Graphura Admin already exists. Skipping.");
            return; // ✅ just return
        }

        await GraphuraAdmin.create({
            email: GRAPHURA_ADMIN_EMAIL,
            password: GRAPHURA_ADMIN_PASSWORD,
            graphuraKey: GRAPHURA_ADMIN_KEY,
        });

        console.log("🌱 Graphura Admin seeded successfully.");

    } catch (error) {
        console.error("❌ Seeder failed:", error.message);
    }
};