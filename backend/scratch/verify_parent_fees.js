import "dotenv/config";
import mongoose from "mongoose";
import path from "path";

const dbUrl = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/GraphuraSchool";
await mongoose.connect(dbUrl);
console.log("Connected to MongoDB.");

import Parent from "../models/users/parent.model.js";
import Student from "../models/users/student.model.js";
import FeePayment from "../models/finance/Feepayment.model.js";
import { getFeeStatus, getInstalments, getFeeOffers, getPaymentReceipt } from "../controllers/parent/feeController.js";

import User from "../models/users/user.model.js";

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

try {
    const parentUser = await User.findOne({ loginId: "PAR-SXPRS2554" });
    if (!parentUser) {
        console.error("Parent user PAR-SXPRS2554 not found!");
        process.exit(1);
    }
    const parent = await Parent.findOne({ user: parentUser._id }).populate("students");
    if (!parent) {
        console.error("No parent profile found for user!");
        process.exit(1);
    }
    const student = parent.students[0];
    if (!student) {
        console.error("No student linked to parent!");
        process.exit(1);
    }

    console.log(`Testing Parent User: ${parent.user}`);
    console.log(`Linked Student Profile ID: ${student._id}`);

    // Mock Req
    const req = {
        user: { _id: parent.user },
        query: {
            school_id: student.school.toString(),
            student_id: student._id.toString()
        }
    };

    console.log("\n--- Testing getFeeStatus ---");
    const resStatus = mockRes();
    await getFeeStatus(req, resStatus);
    console.log("Status Data:", JSON.stringify(resStatus.data, null, 2));

    console.log("\n--- Testing getInstalments ---");
    const resInst = mockRes();
    await getInstalments(req, resInst);
    console.log("Instalments Data:", JSON.stringify(resInst.data, null, 2));

    console.log("\n--- Testing getFeeOffers ---");
    const resOffers = mockRes();
    await getFeeOffers(req, resOffers);
    console.log("Offers Data:", JSON.stringify(resOffers.data, null, 2));

    const payment = await FeePayment.findOne({ studentId: student.user });
    if (payment) {
        console.log(`\n--- Testing getPaymentReceipt for Payment ID: ${payment._id} ---`);
        const reqReceipt = {
            user: { _id: parent.user },
            params: { paymentId: payment._id.toString() }
        };
        const resReceipt = mockRes();
        await getPaymentReceipt(reqReceipt, resReceipt);
        console.log("Receipt Data:", JSON.stringify(resReceipt.data, null, 2));
    } else {
        console.log("\nNo payments found in DB to test receipt details.");
    }

} catch (err) {
    console.error("Error during verification:", err);
} finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed.");
}
