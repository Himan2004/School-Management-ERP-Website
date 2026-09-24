import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/users/user.model.js';
import StudentLeave from '../models/academic/StudentLeave.model.js';
import StaffMeeting from '../models/HRM/StaffMeeting.model.js';
import Class from '../models/organization/organizationClass.js';
import Section from '../models/school/Section.model.js';
import Student from '../models/users/student.model.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to Database.');

  const leaveCount = await StudentLeave.countDocuments();
  console.log(`StudentLeave count: ${leaveCount}`);
  if (leaveCount > 0) {
    const leaves = await StudentLeave.find().limit(3).populate('student', 'name').populate('class', 'name').lean();
    console.log('Sample Leaves:', JSON.stringify(leaves, null, 2));
  }

  const meetingCount = await StaffMeeting.countDocuments();
  console.log(`StaffMeeting (PTM) count: ${meetingCount}`);
  if (meetingCount > 0) {
    const meetings = await StaffMeeting.find().limit(3).lean();
    console.log('Sample Meetings:', JSON.stringify(meetings, null, 2));
  }

  const classCount = await Class.countDocuments();
  console.log(`Class count: ${classCount}`);
  const classes = await Class.find().limit(5).lean();
  console.log('Sample Classes:', JSON.stringify(classes.map(c => ({ _id: c._id, name: c.name })), null, 2));

  const sectionCount = await Section.countDocuments();
  console.log(`Section count: ${sectionCount}`);
  const sections = await Section.find().limit(5).lean();
  console.log('Sample Sections:', JSON.stringify(sections.map(s => ({ _id: s._id, name: s.name, className: s.className, classId: s.classId })), null, 2));

  const studentCount = await Student.countDocuments();
  console.log(`Student count: ${studentCount}`);
  if (studentCount > 0) {
    const students = await Student.find().limit(3).populate('user', 'name').lean();
    console.log('Sample Students:', JSON.stringify(students.map(s => ({ _id: s._id, user: s.user, class: s.class, section: s.section, rollNo: s.rollNo })), null, 2));
  }

  process.exit(0);
}

run().catch(console.error);
