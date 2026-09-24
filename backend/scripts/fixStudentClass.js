/**
 * fixStudentClass.js
 * ------------------
 * Diagnoses students with class: null and assigns them to an
 * existing class in the same organization.
 *
 * Usage:
 *   node scripts/fixStudentClass.js               -- dry run (shows what will change)
 *   node scripts/fixStudentClass.js --fix          -- actually updates the DB
 *   node scripts/fixStudentClass.js --fix --studentId <id>  -- fix only one student
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

// ── Models ──────────────────────────────────────────────────────────────────
import Student  from '../models/users/student.model.js';
import Class    from '../models/organization/organizationClass.js';
import School   from '../models/school/School.js';
import User     from '../models/users/user.model.js';

// ── CLI flags ────────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const DRY_RUN    = !args.includes('--fix');
const targetId   = args.includes('--studentId')
  ? args[args.indexOf('--studentId') + 1]
  : null;

// ── Helpers ──────────────────────────────────────────────────────────────────
const bold  = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red   = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow= (s) => `\x1b[33m${s}\x1b[0m`;

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(green('✔  Connected to MongoDB'));
    console.log(DRY_RUN ? yellow('⚠  DRY RUN — no changes will be saved (pass --fix to apply)') : bold('🔧  FIX MODE — changes WILL be saved'));
    console.log('─'.repeat(60));

    // ── 1. Find broken students ────────────────────────────────────────────
    const query = targetId
      ? { _id: targetId }
      : { class: { $in: [null, undefined] } };

    const brokenStudents = await Student.find(query)
      .populate('user',   'name email loginId')
      .populate('school', 'schoolName')
      .lean();

    if (!brokenStudents.length) {
      console.log(green('✔  No students with null class found. Nothing to fix!'));
      process.exit(0);
    }

    console.log(red(`✘  Found ${brokenStudents.length} student(s) with class: null\n`));

    let fixed = 0;
    let skipped = 0;

    for (const student of brokenStudents) {
      const userName   = student.user?.name   || 'Unknown';
      const userEmail  = student.user?.email  || '—';
      const schoolName = student.school?.schoolName || student.school || 'Unknown School';
      const schoolId   = student.school?._id  || student.school;

      console.log(bold(`Student: ${userName} (${userEmail})`));
      console.log(`  Student._id : ${student._id}`);
      console.log(`  School      : ${schoolName} (${schoolId})`);
      console.log(`  academicYear: ${student.academicYear}`);
      console.log(`  Current class: ${red('null')}`);

      // ── 2. Find a class in the same organization ─────────────────────────
      const school = await School.findById(schoolId).select('organization').lean();
      if (!school) {
        console.log(red('  ✘  Could not resolve school — skipping\n'));
        skipped++;
        continue;
      }

      const orgId = school.organization;

      // Try to find any active class for this org
      const availableClasses = await Class.find({ organization: orgId, isActive: true })
        .sort({ numericLevel: 1 })
        .lean();

      if (!availableClasses.length) {
        console.log(red(`  ✘  No active classes found for organization ${orgId} — skipping\n`));
        skipped++;
        continue;
      }

      // Pick the first available class (lowest level) as a safe default
      const assignClass = availableClasses[0];
      console.log(`  Available classes: ${availableClasses.map(c => c.name).join(', ')}`);
      console.log(yellow(`  → Will assign to: "${assignClass.name}" (${assignClass._id})`));

      if (!DRY_RUN) {
        await Student.findByIdAndUpdate(student._id, {
          $set: { class: assignClass._id }
        });
        console.log(green(`  ✔  Updated student class to "${assignClass.name}"`));
        fixed++;
      } else {
        console.log(yellow(`  (dry run) Would update student class to "${assignClass.name}"`));
        fixed++;
      }
      console.log('');
    }

    // ── 3. Summary ────────────────────────────────────────────────────────
    console.log('─'.repeat(60));
    console.log(bold('Summary'));
    if (DRY_RUN) {
      console.log(yellow(`  ${fixed} student(s) would be updated`));
      console.log(yellow(`  ${skipped} student(s) skipped (no class found for their org)`));
      console.log('\nRun with --fix to apply changes:');
      console.log('  node scripts/fixStudentClass.js --fix');
    } else {
      console.log(green(`  ${fixed} student(s) updated ✔`));
      console.log(yellow(`  ${skipped} student(s) skipped`));
    }

    process.exit(0);
  } catch (err) {
    console.error(red('Script failed:'), err.message);
    process.exit(1);
  }
};

run();
