import mongoose from 'mongoose';
import 'dotenv/config';
import User from './models/users/user.model.js';
import School from './models/school/School.js';
import Class from './models/organization/organizationClass.js';
import StudentProfile from './models/users/student.model.js';

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const loginId = 'PRL-FSX7493';
        const user = await User.findOne({ loginId }).populate('school');
        if (!user) {
            console.log("User not found!");
            process.exit(1);
        }
        console.log(`User: ${user.name}, School ID: ${user.school?._id}, Org ID: ${user.school?.organization}`);
        
        const orgId = user.school?.organization;
        
        const classes = await Class.find({ organization: orgId });
        console.log(`Classes for organization: ${classes.length}`);
        classes.forEach(c => {
            console.log(`- Class Name: ${c.name}, ID: ${c._id}, isActive: ${c.isActive}`);
        });

        const students = await StudentProfile.find({ school: user.school?._id })
            .populate('class')
            .populate('section')
            .limit(5);
        console.log(`Students count: ${students.length}`);
        students.forEach(s => {
            console.log(`- Student: ${s.user}, Class: ${s.class?.name}, Section: ${s.section?.name}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error.message);
    }
}

inspect();
