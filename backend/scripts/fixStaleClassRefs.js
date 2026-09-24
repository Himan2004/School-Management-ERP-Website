/**
 * fixStaleClassRefs.js
 * --------------------
 * Finds students whose class field points to a stale (deleted) ObjectId,
 * then reassigns them to the correct existing class for their school/org.
 *
 * Usage:
 *   node scripts/fixStaleClassRefs.js           -- dry run
 *   node scripts/fixStaleClassRefs.js --fix      -- apply changes
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Student from '../models/users/student.model.js';
import Class   from '../models/organization/organizationClass.js';
import School  from '../models/school/School.js';

const DRY_RUN = !process.argv.includes('--fix');

const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const bold   = (s) => `\x1b[1m${s}\x1b[0m`;

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(green('✔  Connected to MongoDB'));
    console.log(DRY_RUN
      ? yellow('⚠  DRY RUN — pass --fix to apply changes')
      : bold('🔧  FIX MODE — writing to DB'));
    console.log('─'.repeat(70));

    // ── 1. Get all students with their raw class field ─────────────────────
    const allStudents = await Student.find({}).lean();
    const allClassIds = await Class.find({}).distinct('_id');
    const classIdSet  = new Set(allClassIds.map(id => id.toString()));

    console.log(`Total students : ${allStudents.length}`);
    console.log(`Valid class IDs: ${allClassIds.length}\n`);

    let fixed = 0, skipped = 0;

    for (const student of allStudents) {
      const rawClassId = student.class?.toString();

      // Skip students who already have a valid class
      if (rawClassId && classIdSet.has(rawClassId)) {
        console.log(green(`✔  Student ${student._id} — class OK (${rawClassId})`));
        continue;
      }

      // This student has a stale or null class reference
      const issue = rawClassId
        ? `stale reference: ${rawClassId} (not in Class collection)`
        : 'class is null';

      console.log(red(`✘  Student ${student._id} — ${issue}`));

      // ── 2. Find the correct class for this student's school + org ─────────
      const school = await School.findById(student.school).select('organization').lean();
      if (!school) {
        console.log(red(`   ✘  School not found (${student.school}) — skipping`));
        skipped++;
        continue;
      }

      // Find classes for this org, match by numericLevel if possible
      const orgClasses = await Class.find({ organization: school.organization, isActive: true })
        .sort({ numericLevel: 1 })
        .lean();

      if (!orgClasses.length) {
        console.log(red(`   ✘  No active classes for org ${school.organization} — skipping`));
        skipped++;
        continue;
      }

      // Prefer Class 8 for the demo school (the one that has timetable/attendance data)
      // Otherwise pick the first available class
      let bestClass = orgClasses.find(c => c.name.toLowerCase().includes('class 8'))
        || orgClasses[0];

      console.log(yellow(`   → Will assign to: "${bestClass.name}" (${bestClass._id})`));

      if (!DRY_RUN) {
        await Student.findByIdAndUpdate(student._id, {
          $set: { class: bestClass._id }
        });
        console.log(green(`   ✔  Updated!`));
      }

      fixed++;
    }

    console.log('\n' + '─'.repeat(70));
    console.log(bold('Done.'));
    console.log(DRY_RUN
      ? yellow(`  ${fixed} student(s) would be fixed, ${skipped} skipped`)
      : green(`  ${fixed} student(s) fixed, ${skipped} skipped`));

    if (DRY_RUN) {
      console.log('\n  Run with --fix to apply:');
      console.log('  node scripts/fixStaleClassRefs.js --fix');
    }

    process.exit(0);
  } catch (err) {
    console.error(red('Failed:'), err.message);
    process.exit(1);
  }
};

run();
