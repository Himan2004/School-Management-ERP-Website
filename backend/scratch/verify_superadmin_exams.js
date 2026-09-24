import mongoose from "mongoose";
import 'dotenv/config';
import { 
    getExamDashboardStats, 
    getGlobalPerformanceAnalytics 
} from "../controllers/superAdmin/examController.js";

// Mock res.json and res.status
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function runTests() {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");

    // Using a Super Admin / Organization ID from the DB
    const organizationId = '67a72661845bb02047d9539c'; // Dummy/Existing ID

    const req = {
        user: { id: organizationId }
    };

    // 1. Test Stats
    console.log("\n--- Testing Super Admin Exam Stats ---");
    const resStats = mockRes();
    await getExamDashboardStats(req, resStats);
    console.log("Stats Response:", JSON.stringify(resStats.data, null, 2));

    // 2. Test Analytics
    console.log("\n--- Testing Super Admin Performance Analytics ---");
    const resAnalytics = mockRes();
    await getGlobalPerformanceAnalytics(req, resAnalytics);
    console.log("Analytics Response Count:", resAnalytics.data?.data?.length || 0);
    console.log("Top School Data:", JSON.stringify(resAnalytics.data?.data?.[0] || {}, null, 2));

    await mongoose.disconnect();
    console.log("\nTests Finished.");
}

runTests().catch(console.error);
