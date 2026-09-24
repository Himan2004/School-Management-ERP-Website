import mongoose from "mongoose";
import 'dotenv/config';
import { getFinanceDashboardStats } from "../controllers/admin/adminFinanceController.js";
import { getTeacherFinanceSummary } from "../controllers/teacher/teacherController.js";
import { createFeeOrder } from "../controllers/finance/razorpayController.js";

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

    // 1. Test Admin Stats
    console.log("\n--- Testing Admin Finance Stats ---");
    const adminReq = { 
        user: { 
            role: 'admin', 
            school: '67a72661845bb02047d9539d' // Using a valid-looking ID from your DB context if possible, or just checking logic
        } 
    };
    const adminRes = mockRes();
    try {
        await getFinanceDashboardStats(adminReq, adminRes);
        console.log("Admin Stats Response:", JSON.stringify(adminRes.data, null, 2));
    } catch (e) {
        console.error("Admin Stats failed (as expected if ID is wrong, but check logic):", e.message);
    }

    // 2. Test Teacher Summary
    console.log("\n--- Testing Teacher Finance Summary ---");
    const teacherReq = { 
        user: { 
            _id: new mongoose.Types.ObjectId(), 
            role: 'teacher' 
        } 
    };
    const teacherRes = mockRes();
    await getTeacherFinanceSummary(teacherReq, teacherRes);
    console.log("Teacher Summary Response:", JSON.stringify(teacherRes.data, null, 2));

    // 3. Test Razorpay Order Creation
    console.log("\n--- Testing Razorpay Order Logic ---");
    const razorpayReq = { 
        body: { amount: 500, studentId: '123', installmentId: 'abc' } 
    };
    const razorpayRes = mockRes();
    await createFeeOrder(razorpayReq, razorpayRes);
    console.log("Razorpay Order Response Status:", razorpayRes.statusCode);
    if (razorpayRes.data?.success) {
        console.log("Razorpay Order Created successfully.");
    } else {
        console.log("Razorpay Order Failed (expected if keys are placeholders):", razorpayRes.data?.message);
    }

    await mongoose.disconnect();
    console.log("\nTests Finished.");
}

runTests().catch(console.error);
