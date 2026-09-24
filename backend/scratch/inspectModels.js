import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });
import mongoose from "mongoose";
import connectDB from "../config/database.js";

import Teacher from "../models/users/teacher.model.js";
import User from "../models/users/user.model.js";
import SubjectAssignment from "../models/principal/SubjectAssignment.model.js";
import Student from "../models/users/student.model.js";
import Section from "../models/school/Section.model.js";
import Class from "../models/organization/organizationClass.js";

async function inspectModels() {
  await connectDB();
  
  console.log("Connected to DB.");
  const users = await User.find({ email: { $regex: /subjectteacher3/i } });
  
  if(users.length === 0) console.log("NO subjectteacher3 found");
  
  for (let u of users) {
      console.log(`- ${u?.email} (Role: ${u?.role}, ID: ${u?._id})`);
      
      const teacher = await Teacher.findOne({ user: u._id });
      console.log(`  Teacher profile:`, teacher ? "EXISTS" : "MISSING");
      
      const assignments = await SubjectAssignment.find({ teacherUser: u?._id }).populate('class subject');
      console.log(`  Assignments: ${assignments.length}`);
      
      for (let a of assignments) {
          console.log(`    - Class: ${a.class?.name || 'UNDEF'} (${a.class?._id || a.class}), Section: ${a.section}, Subject: ${a.subject?.subjectName || 'UNDEF'} (${a.subject?._id || a.subject})`);
      }
  }


  process.exit(0);
}

inspectModels();
