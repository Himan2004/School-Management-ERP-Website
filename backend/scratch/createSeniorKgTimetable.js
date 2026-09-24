import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config();

import Timetable from '../models/academic/timetable.model.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const schoolId = '69fe09eedec901fd9887d235';
    const orgId = '69fe003e86110688cfd614de';
    const classId = '6a46351b8392991472be01e9'; // Senior KG
    const academicYear = '2026-2027';
    const createdBy = '69fec5215207ac44e912e90f';

    // Subject IDs
    const mathsId = '6a326b3be9772d6a67ce1c26';
    const scienceId = '6a416a90b83ab1e9c7e6a8f7';
    const englishId = '6a43bde7119a0a2a37b19f5b';
    const hindiId = '6a44074d0c97e1d7f9c99c43';
    const generalId = '6a4b4c64a791c3a493c56e46';

    // Teacher IDs
    const teacher1 = '6a4819c89bb6b7c5cc0de313'; // Subject Teacher-1
    const teacher2 = '6a481a909bb6b7c5cc0de87f'; // Subject-teacher 2
    const teacher3 = '6a481d00d48643be1c1d19d9'; // Subject-teacher 3

    // Deactivate other timetables for this class/academicYear
    await Timetable.updateMany(
      { school: schoolId, class: classId, academicYear, isActive: true },
      { $set: { isActive: false } }
    );

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const schedule = days.map(day => {
      // On Saturday, let's make it a short day (half day, no lunch break, 3 periods)
      const isSaturday = day === 'saturday';
      const periods = [
        {
          periodNumber: 1,
          startTime: '09:00',
          endTime: '10:00',
          subject: mathsId,
          teacher: teacher1,
          isBreak: false,
          breakLabel: '',
          room: 'Room A-101',
          lectureType: 'Theory'
        },
        {
          periodNumber: 2,
          startTime: '10:00',
          endTime: '11:00',
          subject: scienceId,
          teacher: teacher2,
          isBreak: false,
          breakLabel: '',
          room: 'Room A-101',
          lectureType: 'Theory'
        },
        {
          periodNumber: 3,
          startTime: '11:00',
          endTime: '12:00',
          subject: englishId,
          teacher: teacher3,
          isBreak: false,
          breakLabel: '',
          room: 'Room A-101',
          lectureType: 'Theory'
        }
      ];

      if (!isSaturday) {
        periods.push(
          {
            periodNumber: 4,
            startTime: '12:00',
            endTime: '13:00',
            subject: null,
            teacher: null,
            isBreak: true,
            breakLabel: 'Lunch',
            room: '',
            lectureType: 'Normal'
          },
          {
            periodNumber: 5,
            startTime: '13:00',
            endTime: '14:00',
            subject: hindiId,
            teacher: teacher1,
            isBreak: false,
            breakLabel: '',
            room: 'Room A-101',
            lectureType: 'Theory'
          },
          {
            periodNumber: 6,
            startTime: '14:00',
            endTime: '15:00',
            subject: generalId,
            teacher: teacher2,
            isBreak: false,
            breakLabel: '',
            room: 'Room A-101',
            lectureType: 'Theory'
          }
        );
      }

      return {
        day,
        isWorkingDay: true,
        periods
      };
    });

    const newTimetable = await Timetable.create({
      organization: orgId,
      school: schoolId,
      academicYear,
      class: classId,
      section: 'A',
      effectiveFrom: new Date(),
      schedule,
      isActive: true,
      isPublished: true,
      createdBy
    });

    console.log('Successfully created active weekly timetable for Senior KG (section A):');
    console.log(`Timetable ID: ${newTimetable._id}`);
    process.exit(0);
  } catch (err) {
    console.error('Error creating timetable:', err);
    process.exit(1);
  }
};

run();
