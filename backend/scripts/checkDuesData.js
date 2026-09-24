import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import FeeInstallment from '../models/finance/FeeInstallment.model.js';
import Organization from '../models/organization/Organization.js';
import School from '../models/school/School.js';
import Student from '../models/users/student.model.js';
import User from '../models/users/user.model.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const totalInstallments = await FeeInstallment.countDocuments();
    const totalOrgs = await Organization.countDocuments();
    const totalSchools = await School.countDocuments();
    const totalStudents = await Student.countDocuments();

    console.log('--- Database Count Summary ---');
    console.log('Total Organizations:', totalOrgs);
    console.log('Total Schools:', totalSchools);
    console.log('Total Students:', totalStudents);
    console.log('Total FeeInstallment documents:', totalInstallments);

    const orgs = await Organization.find().select('_id organizationName').lean();
    console.log('\nOrganizations present:');
    for (const org of orgs) {
      const installmentsCount = await FeeInstallment.countDocuments({ organization: org._id });
      const schoolsCount = await School.countDocuments({ organization: org._id });
      console.log(`- "${org.organizationName}" (${org._id}): ${schoolsCount} schools, ${installmentsCount} fee installments`);
    }

    if (totalInstallments > 0) {
      console.log('\nSample FeeInstallment:');
      const sample = await FeeInstallment.findOne()
        .populate('studentId', 'name')
        .populate('organization', 'organizationName')
        .populate('school', 'schoolName')
        .lean();
      console.log(JSON.stringify(sample, null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
