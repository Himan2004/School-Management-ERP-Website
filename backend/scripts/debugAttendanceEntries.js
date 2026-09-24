import mongoose from 'mongoose';
import Attendance from '../models/academic/attendance.model.js';
import Student from '../models/users/student.model.js';
import User from '../models/users/user.model.js';
import config from '../config/database.js';

async function debugAttendance() {
  try {
    await config();
    
    console.log('\n=== DEBUGGING ATTENDANCE ENTRIES ===\n');
    
    // Get first attendance record
    const attendance = await Attendance.findOne().limit(1);
    if (!attendance) {
      console.log('No attendance records found');
      process.exit(0);
    }
    
    console.log('Sample attendance record:');
    console.log('  Date:', attendance.date);
    console.log('  School:', attendance.school);
    console.log('  Class:', attendance.class);
    console.log('  Entries count:', attendance.entries.length);
    
    if (attendance.entries.length > 0) {
      const entry = attendance.entries[0];
      console.log('\nFirst entry:');
      console.log('  Student ID:', entry.student);
      console.log('  Status:', entry.status);
      console.log('  Remarks:', entry.remarks);
    }
    
    // Get all unique student IDs from all attendance entries
    const allAttendance = await Attendance.find().select('entries');
    const studentIds = new Set();
    allAttendance.forEach(att => {
      att.entries.forEach(entry => {
        studentIds.add(entry.student.toString());
      });
    });
    
    console.log('\nUnique student IDs in attendance records:', studentIds.size);
    console.log('Student IDs:', Array.from(studentIds).slice(0, 5));
    
    // Get first 3 actual students
    const students = await Student.find().populate('user').limit(3);
    console.log('\nActual students:');
    students.forEach(s => {
      console.log(`  Student: ${s.name}, User ID: ${s.user._id}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

debugAttendance();
