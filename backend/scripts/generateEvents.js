import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Student from '../models/users/student.model.js';
import User from '../models/users/user.model.js';
import Event from '../models/common/Event.js';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(green('✔ Connected to MongoDB'));

    const student = await Student.findOne({}).populate('user');
    if (!student) {
      console.log(red('✖ No student found. Cannot seed data.'));
      process.exit(1);
    }
    let orgId = student.user?.organization;
    if (!orgId) {
        const anyUserWithOrg = await User.findOne({ organization: { $ne: null } });
        orgId = anyUserWithOrg ? anyUserWithOrg.organization : new mongoose.Types.ObjectId();
    }

    await Event.deleteMany({ school: student.school });
    console.log('🧹 Cleared old Events');

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 10);

    const eventsData = [
      {
        organization: orgId,
        school: student.school,
        title: 'Annual Sports Day 2024',
        description: 'Join us for a day of exciting sports competitions, races, and athletic events.',
        category: 'Sports',
        eventDate: tomorrow,
        startTime: '09:00 AM',
        endTime: '05:00 PM',
        venue: 'School Sports Ground',
        participants: 'All Students',
        priority: 'High',
        status: 'Scheduled',
        origin: 'Local',
        scopeLabel: 'Entire School',
        createdBy: 'Sports Department',
        photos: []
      },
      {
        organization: orgId,
        school: student.school,
        title: 'Science Exhibition 2024',
        description: 'Showcase your innovative science projects and models.',
        category: 'Academic',
        eventDate: nextWeek,
        startTime: '10:00 AM',
        endTime: '04:00 PM',
        venue: 'Science Block, Hall A',
        participants: 'All Students',
        priority: 'Normal',
        status: 'Scheduled',
        origin: 'Local',
        scopeLabel: 'Entire School',
        createdBy: 'Science Club',
        photos: []
      },
      {
        organization: orgId,
        school: student.school,
        title: 'Past Event - Guest Lecture',
        description: 'Guest lecture on Artificial Intelligence.',
        category: 'Academic',
        eventDate: pastDate,
        startTime: '11:00 AM',
        endTime: '01:00 PM',
        venue: 'Main Auditorium',
        participants: 'High School Students',
        priority: 'Normal',
        status: 'Completed',
        origin: 'HQ',
        scopeLabel: 'All Branches',
        createdBy: 'School Management',
        photos: []
      }
    ];

    await Event.insertMany(eventsData);
    console.log(green('✚ Created Events'));

    console.log(green('\n🎉 Event Seeding Complete!'));
    process.exit(0);

  } catch (error) {
    console.error(red('Error during seeding:'), error);
    process.exit(1);
  }
}

seed();
