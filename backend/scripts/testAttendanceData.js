import mongoose from 'mongoose';
import Attendance from '../models/academic/attendance.model.js';
import Student from '../models/users/student.model.js';
import User from '../models/users/user.model.js';
import config from '../config/database.js';

async function testAttendanceData() {
  try {
    await config();
    
    console.log('\n=== TESTING ATTENDANCE DATA ===\n');
    
    // Get a student
    const student = await Student.findOne().populate('user');
    console.log('Student found:', student?.user?.name || 'Not found');
    console.log('Student ID:', student?._id);
    console.log('Student user ID:', student?.user?._id);
    console.log('Class ID:', student?.class);
    console.log('School ID:', student?.school);
    console.log('Academic Year:', student?.academicYear);
    
    // Count attendance records
    const totalAttendance = await Attendance.countDocuments();
    console.log('\nTotal attendance records in DB:', totalAttendance);
    
    // Find attendance for this student
    if (student) {
      const studentAttendance = await Attendance.find({
        'entries.student': student.user._id
      });
      
      console.log(`\nAttendance records for student (by student ID):`, studentAttendance.length);
      
      if (studentAttendance.length > 0) {
        const first = studentAttendance[0];
        console.log('\nSample record details:');
        console.log('  - Date:', first.date);
        console.log('  - School:', first.school);
        console.log('  - Class:', first.class);
        console.log('  - Organization:', first.organization);
        console.log('  - Academic Year:', first.academicYear);
        console.log('  - MarkedBy:', first.markedBy);
        console.log('  - Entries count:', first.entries.length);
        if (first.entries.length > 0) {
          console.log('  - First entry student:', first.entries[0].student);
          console.log('  - First entry status:', first.entries[0].status);
        }
      }
      
      // Try the query from the controller
      if (student.school && student.academicYear) {
        const controllerQuery = await Attendance.find({
          school: student.school,
          academicYear: student.academicYear,
          class: student.class,
          'entries.student': student.user._id
        });
        
        console.log('\nController query results:', controllerQuery.length);
        if (controllerQuery.length > 0) {
          console.log('✅ Controller query works!');
        }
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testAttendanceData();
