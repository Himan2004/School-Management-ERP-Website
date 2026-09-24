import 'dotenv/config';
import mongoose from 'mongoose';
import Student from '../models/users/student.model.js';
import Parent from '../models/users/parent.model.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');
  
  const student = await Student.findOne();
  console.log('Sample Student:', { _id: student._id, parent: student.parent, user: student.user });

  const parentDocs = await Parent.find({ _id: student.parent });
  console.log('Parent Docs for this student parent ID:', parentDocs.map(p => ({ _id: p._id, user: p.user })));

  const parentByUser = await Parent.findOne({ user: parentDocs[0]?.user });
  console.log('Parent fetched by User ID:', parentByUser ? { _id: parentByUser._id, user: parentByUser.user } : null);

  process.exit(0);
}
run().catch(console.error);
