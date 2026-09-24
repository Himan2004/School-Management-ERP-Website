import 'dotenv/config';
import mongoose from 'mongoose';
import Attendance from '../models/academic/attendance.model.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');
  const docs = await Attendance.find().limit(2).lean();
  console.log(JSON.stringify(docs, null, 2));
  process.exit(0);
}
run().catch(console.error);
