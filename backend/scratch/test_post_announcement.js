import mongoose from 'mongoose';
import 'dotenv/config';
import School from '../models/school/School.js';
import Section from '../models/school/Section.model.js';
import Class from '../models/organization/organizationClass.js';
import User from '../models/users/user.model.js';
import Student from '../models/users/student.model.js';
import Teacher from '../models/users/teacher.model.js';
import Notice from '../models/common/Notice.js';
import Parent from '../models/users/parent.model.js';
import SubjectAssignment from '../models/principal/SubjectAssignment.model.js';
import Announcement from '../models/academic/Announcement.model.js';
import { createAnnouncement } from '../controllers/teacher/teacherAnnouncementController.js';

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const loginId = 'SXP5655';
        const user = await User.findOne({ loginId }).populate('school');
        if (!user) {
            console.log("User SXP5655 not found!");
            process.exit(1);
        }

        const req = {
            user: user,
            body: {
                title: "Test Announcement Title",
                description: "Test Announcement Description",
                targetAudience: "All Classes",
                type: "General",
                priority: "medium",
                status: "Active",
                sendNotification: true
            }
        };

        const res = {
            statusCode: 200,
            status: function(code) {
                this.statusCode = code;
                return this;
            },
            json: function(payload) {
                console.log(`HTTP ${this.statusCode}:`, JSON.stringify(payload, null, 2));
            }
        };

        await createAnnouncement(req, res);
        await mongoose.disconnect();
    } catch (error) {
        console.error("Test execution crash:", error);
    }
}

runTest();
