import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import Organization from './models/organization/Organization.js';
import SuperAdmin from './models/superAdmin/SuperAdmin.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    const orgs = await Organization.find().lean();
    console.log(`Found ${orgs.length} organizations:`);
    for (const org of orgs) {
      console.log(`- Name: "${org.organizationName}", ID: "${org.organizationId}", status: "${org.status}"`);
    }

    // Let's reset the password of one organization to 'password123' so we can login.
    // We will use the organization with Name "Delhui scholl" or "LAUREL VALLEY HIGH SCHOOL" or "Testing Public School".
    // Let's use "Testing Public School" or "LAUREL VALLEY HIGH SCHOOL" if we want.
    // Or we can find an organization and update its password.
    if (orgs.length > 0) {
      const targetOrg = orgs.find(o => o.status === 'active') || orgs[0];
      console.log(`Updating password for organization "${targetOrg.organizationName}" (${targetOrg.organizationId}) to "password123"...`);
      const orgDoc = await Organization.findById(targetOrg._id);
      orgDoc.password = 'password123';
      await orgDoc.save();
      console.log('Password updated successfully!');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
