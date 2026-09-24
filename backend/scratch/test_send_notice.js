import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import User from '../models/users/user.model.js';
import Notice from '../models/common/Notice.js';
import School from '../models/school/School.js';

async function testSendNotice() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        // Find a principal user
        const principal = await User.findOne({ role: 'principal' }).populate('school');
        if (!principal) {
            console.log("No principal user found");
            process.exit(1);
        }
        console.log("Principal:", principal.name, "ID:", principal._id);
        console.log("School:", principal.school?._id, "Name:", principal.school?.name);
        console.log("School.organization:", principal.school?.organization);
        
        // Check if organization exists on the school
        if (principal.school) {
            const school = await School.findById(principal.school._id).lean();
            console.log("Full School object keys:", Object.keys(school));
            console.log("School.organization:", school.organization);
            console.log("School.organizationId:", school.organizationId);
        }

        // Now try to create a notice exactly like the controller does
        const schoolId = principal.school?._id;
        const organizationId = principal.school?.organization || principal.organization;
        
        console.log("\n--- Creating Notice ---");
        console.log("schoolId:", schoolId);
        console.log("organizationId:", organizationId);
        console.log("createdBy:", principal._id);

        try {
            const notice = await Notice.create({
                title: "Test Notice",
                content: "Test content",
                category: "general",
                targetAudience: ["student"],
                targetUsers: [],
                targetClass: "All Classes",
                school: schoolId,
                organization: organizationId,
                createdBy: principal._id,
                status: "published"
            });
            console.log("\nSUCCESS! Notice created:", notice._id);
            
            // Clean up
            await Notice.findByIdAndDelete(notice._id);
            console.log("Test notice cleaned up.");
        } catch (createError) {
            console.error("\nFAILED to create notice!");
            console.error("Error name:", createError.name);
            console.error("Error message:", createError.message);
            if (createError.errors) {
                Object.keys(createError.errors).forEach(field => {
                    console.error(`  Field '${field}':`, createError.errors[field].message);
                });
            }
        }

    } catch (err) {
        console.error("Script error:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

testSendNotice();
