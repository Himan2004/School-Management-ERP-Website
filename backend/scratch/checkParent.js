import 'dotenv/config';
import mongoose from 'mongoose';
import Student from '../models/users/student.model.js';
import User from '../models/users/user.model.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');
  
  const student = await Student.findOne();
  console.log('Student:', { _id: student._id, parent: student.parent, user: student.user });

  const parentUser = await User.findById(student.parent);
  console.log('Parent User:', parentUser ? { _id: parentUser._id, role: parentUser.role } : null);

  process.exit(0);
}
run().catch(console.error);
