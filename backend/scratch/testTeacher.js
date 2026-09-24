import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Teacher from '../models/users/teacher.model.js';
import User from '../models/users/user.model.js';
import SubjectAssignment from '../models/principal/SubjectAssignment.model.js';
import Section from '../models/school/Section.model.js';
import Class from '../models/organization/organizationClass.js';
import Student from '../models/users/student.model.js';
import StudentAttendance from '../models/academic/attendance.model.js';
import ParentMeeting from '../models/common/ParentMeeting.model.js';
import Task from '../models/modules/Task.js';

dotenv.config({ path: './.env' });

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(async () => {
    console.log('DB Connected');
    try {
        const user = await User.findOne({ name: /Subject teacher 3/i });
        const teacherUserId = user._id;
        const schoolId = user.school;

        console.log('Fetching teacher...', teacherUserId, schoolId);
        const teacher = await Teacher.findOne({ user: teacherUserId, school: schoolId }).populate('assignedClasses subjects');
        if (!teacher) {
            console.log('Teacher not found');
            process.exit();
        }

        console.log('Fetching assignments...');
        const assignments = await SubjectAssignment.find({ teacherUser: teacherUserId, school: schoolId }).populate('class');
        
        let totalStudents = 0;
        let attendancePercentage = 0;
        let lowAttendanceCount = 0;
        let targetClassIds = [];
        let targetSectionStrings = [];

        if (assignments && assignments.length > 0) {
            targetClassIds = [...new Set(assignments.map(a => a.class?._id).filter(Boolean))];
            targetSectionStrings = [...new Set(assignments.map(a => a.section).filter(Boolean))];

            let targetSectionIds = [];
            if (targetSectionStrings.length > 0) {
                const sections = await Section.find({ school: schoolId, name: { $in: targetSectionStrings }});
                targetSectionIds = sections.map(s => s._id);
            }

            if (targetClassIds.length > 0 && targetSectionIds.length > 0) {
                totalStudents = await Student.countDocuments({ 
                    class: { $in: targetClassIds }, 
                    section: { $in: targetSectionIds },
                    school: schoolId, 
                    status: 'Active' 
                });
            }

            console.log('Total students:', totalStudents);
        }

        const upcomingPTM = await ParentMeeting.findOne({
            school: schoolId,
            teacher: teacher._id,
            meetingDate: { $gte: new Date() },
            status: 'scheduled'
        }).sort({ meetingDate: 1 });
        
        console.log('PTM:', upcomingPTM);

        const pendingTasks = await Task.countDocuments({
            school: schoolId,
            assignedTo: teacher._id.toString(),
            status: { $in: ['pending', 'in-progress'] }
        });

        console.log('Pending tasks:', pendingTasks);

        console.log('All stats succeeded');
    } catch (e) {
        console.error('Error occurred:', e);
    }
    process.exit();
}).catch(console.error);
