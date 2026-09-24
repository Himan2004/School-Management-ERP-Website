import mongoose from "mongoose";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { 
    getSupportTickets, 
    createSupportTicket, 
    addTicketMessage 
} from "../controllers/student/studentSupportTicketController.js";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// User schema definition for query
const userSchema = new mongoose.Schema({
    loginId: String
}, { strict: false });

let User;
try {
    User = mongoose.model('User');
} catch (e) {
    User = mongoose.model('User', userSchema);
}

async function verifySupportTickets() {
    console.log("==========================================");
    console.log("   SUPPORT TICKETS BACKEND VERIFICATION   ");
    console.log("==========================================");
    
    console.log("Connecting to Database...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected.\n");

    const loginId = "STUDENT.EE.EE.785";
    const studentUser = await User.findOne({ loginId });

    if (!studentUser) {
        console.log("❌ FAILED: Student user STUDENT.EE.EE.785 not found in DB.");
        await mongoose.disconnect();
        return;
    }

    console.log(`Found student user: ${studentUser.loginId} (${studentUser._id})`);

    // 1. Create ticket
    console.log("\n[1/3] Testing createSupportTicket...");
    const createReq = {
        user: studentUser,
        body: {
            subject: "Verification Test Ticket",
            category: "Technical",
            priority: "medium",
            description: "Testing support tickets system functionality."
        }
    };
    const createRes = mockRes();
    await createSupportTicket(createReq, createRes);

    if (createRes.statusCode !== 201 && createRes.statusCode !== 200) {
        console.log(`❌ FAILED to create ticket. Status code: ${createRes.statusCode || 500}. Message: ${createRes.data?.message}`);
        await mongoose.disconnect();
        return;
    }

    const createdTicket = createRes.data?.data;
    console.log("✅ Success. Created Ticket Details:", JSON.stringify(createdTicket, null, 2));

    // 2. Add reply message
    console.log("\n[2/3] Testing addTicketMessage...");
    const replyReq = {
        user: studentUser,
        params: {
            ticketId: createdTicket.id
        },
        body: {
            message: "This is a verification reply message."
        }
    };
    const replyRes = mockRes();
    await addTicketMessage(replyReq, replyRes);

    if (replyRes.statusCode !== 200) {
        console.log(`❌ FAILED to add reply. Status code: ${replyRes.statusCode}. Message: ${replyRes.data?.message}`);
        await mongoose.disconnect();
        return;
    }

    const updatedTicket = replyRes.data?.data;
    console.log("✅ Success. Updated Ticket Messages:", JSON.stringify(updatedTicket.messages, null, 2));

    // 3. Get support tickets
    console.log("\n[3/3] Testing getSupportTickets...");
    const getReq = {
        user: studentUser
    };
    const getRes = mockRes();
    await getSupportTickets(getReq, getRes);

    if (getRes.statusCode !== 200) {
        console.log(`❌ FAILED to get tickets. Status code: ${getRes.statusCode}. Message: ${getRes.data?.message}`);
        await mongoose.disconnect();
        return;
    }

    const ticketsList = getRes.data?.data;
    console.log(`✅ Success. Retrieved ${ticketsList.length} tickets.`);
    console.log("Sample ticket from list:", JSON.stringify(ticketsList[0], null, 2));

    // Clean up created test ticket to keep DB clean
    console.log("\nCleaning up test ticket...");
    const Ticket = mongoose.model('Ticket');
    await Ticket.deleteOne({ _id: createdTicket.id });
    console.log("Cleanup complete.");

    console.log("\n==========================================");
    console.log("          VERIFICATION COMPLETE           ");
    console.log("==========================================");

    await mongoose.disconnect();
}

verifySupportTickets().catch(console.error);
