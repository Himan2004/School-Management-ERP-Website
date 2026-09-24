import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Organization from '../models/organization/Organization.js';
import School from '../models/school/School.js';
import Class from '../models/organization/organizationClass.js';
import User from '../models/users/user.model.js';
import Attendance from '../models/academic/attendance.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const orgIdentifier = process.argv[2];

if (!orgIdentifier) {
  console.error('Usage: node scripts/seedAttendanceDemo.js <organizationId|organizationObjectId>');
  process.exit(1);
}

const dateOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const getRecentWeekdays = (count = 7) => {
  const days = [];
  const cursor = new Date();
  while (days.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) days.push(dateOnly(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse();
};

const makeEntries = (students, presentRatio = 0.82) => {
  return students.map((s, idx) => {
    const rnd = (idx * 37) % 100;
    let status = 'present';
    if (rnd > presentRatio * 100) status = rnd % 2 === 0 ? 'absent' : 'late';
    return { student: s._id, status };
  });
};

const summarize = (entries) => ({
  totalPresent: entries.filter((e) => e.status === 'present').length,
  totalAbsent: entries.filter((e) => e.status === 'absent').length,
  totalLate: entries.filter((e) => e.status === 'late').length,
});

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const orgQuery = mongoose.Types.ObjectId.isValid(orgIdentifier)
      ? { $or: [{ organizationId: orgIdentifier }, { _id: orgIdentifier }] }
      : { organizationId: orgIdentifier };

    const organization = await Organization.findOne(orgQuery).select('_id organizationId organizationName');

    if (!organization) {
      throw new Error(`Organization not found for identifier: ${orgIdentifier}`);
    }

    const schools = await School.find({ organization: organization._id }).select('_id schoolName');
    if (!schools.length) {
      throw new Error(`No schools found for organization ${organization.organizationId}`);
    }

    let orgClass = await Class.findOne({ organization: organization._id }).select('_id name');
    if (!orgClass) {
      orgClass = await Class.create({
        organization: organization._id,
        name: 'Class 6',
        numericLevel: 6,
        description: 'Auto-created demo class for attendance seeding',
        isActive: true,
      });
      console.log('Created demo class: Class 6');
    }

    const dates = getRecentWeekdays(7);
    let upserts = 0;

    for (const [index, school] of schools.entries()) {
      const marker = await User.findOne({
        school: school._id,
        role: { $in: ['teacher', 'admin', 'principal'] },
        status: 'active',
      }).select('_id role');

      const students = await User.find({
        school: school._id,
        role: 'student',
        status: 'active',
      }).limit(30).select('_id');

      if (!marker || students.length === 0) {
        console.log(`Skipping ${school.schoolName}: missing marker user or students`);
        continue;
      }

      const ratio = 0.72 + ((index % 5) * 0.06); // varied attendance per school
      const entries = makeEntries(students, Math.min(ratio, 0.95));
      const totals = summarize(entries);

      for (const date of dates) {
        await Attendance.findOneAndUpdate(
          {
            school: school._id,
            class: orgClass._id,
            section: 'A',
            subject: null,
            date,
            attendanceType: 'class',
          },
          {
            organization: organization._id,
            school: school._id,
            academicYear: `${date.getFullYear()}-${date.getFullYear() + 1}`,
            class: orgClass._id,
            section: 'A',
            subject: null,
            date,
            markedBy: marker._id,
            markedByRole: marker.role,
            entries,
            totalPresent: totals.totalPresent,
            totalAbsent: totals.totalAbsent,
            totalLate: totals.totalLate,
            isEdited: false,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        upserts += 1;
      }
      console.log(`Seeded ${school.schoolName}`);
    }

    console.log(`Done. Upserted attendance docs: ${upserts}`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
};

run();
