import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import FeeInstallment from '../models/finance/FeeInstallment.model.js';
import FeeStructure from '../models/finance/FeeStructure.model.js';
import FeeHead from '../models/finance/FeeHead.model.js';
import Organization from '../models/organization/Organization.js';
import School from '../models/school/School.js';
import Student from '../models/users/student.model.js';
import Class from '../models/organization/organizationClass.js';
import User from '../models/users/user.model.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    console.log('\n--- Count Summary ---');
    console.log('Total Organizations:', await Organization.countDocuments());
    console.log('Total Schools:', await School.countDocuments());
    console.log('Total Students:', await Student.countDocuments());
    console.log('Total Classes:', await Class.countDocuments());
    console.log('Total FeeHeads:', await FeeHead.countDocuments());
    console.log('Total FeeStructures:', await FeeStructure.countDocuments());
    console.log('Total FeeInstallments:', await FeeInstallment.countDocuments());

    const orgs = await Organization.find().select('_id organizationName').lean();
    for (const org of orgs) {
      console.log(`\n========================================`);
      console.log(`Organization: ${org.organizationName} (${org._id})`);
      
      const schools = await School.find({ organization: org._id }).select('_id name schoolName').lean();
      console.log(`Schools (${schools.length}):`);
      for (const sch of schools) {
        console.log(`  - ${sch.schoolName || sch.name} (${sch._id})`);
      }

      const classes = await Class.find({ organization: org._id }).select('_id name className').lean();
      console.log(`Classes (${classes.length}):`);
      for (const cls of classes) {
        console.log(`  - ${cls.className || cls.name} (${cls._id})`);
      }

      const students = await Student.find({ school: { $in: schools.map(s => s._id) } }).populate('user', 'name email').lean();
      console.log(`Students (${students.length}):`);
      for (const std of students.slice(0, 5)) {
        console.log(`  - Student Name: ${std.user?.name || std.name} (${std._id}) User: (${std.user?._id})`);
      }

      const heads = await FeeHead.find({ organization: org._id }).select('_id name description').lean();
      console.log(`FeeHeads (${heads.length}):`);
      for (const hd of heads) {
        console.log(`  - ${hd.name} (${hd._id})`);
      }

      const structures = await FeeStructure.find({ organization: org._id }).populate('classId', 'className name').lean();
      console.log(`FeeStructures (${structures.length}):`);
      for (const str of structures) {
        console.log(`  - Class: ${str.classId?.className || str.classId?.name || 'Unknown'} (${str._id}), Total: ${str.totalAmount}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
