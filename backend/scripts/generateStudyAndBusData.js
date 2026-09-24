/**
 * generateStudyAndBusData.js
 * -------------------
 * Seeds the database with Study Materials and Bus Route data
 * for our test student.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Student from '../models/users/student.model.js';
import User from '../models/users/user.model.js';
import StudyMaterial from '../models/academic/studyMaterial.model.js';
import BusRoute from '../models/transport/busRoute.model.js';
import Driver from '../models/transport/driver.model.js';

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(green('✔ Connected to MongoDB'));

    // 1. Find the test student
    const student = await Student.findOne({}).populate('user');
    if (!student) {
      console.log(red('✖ No student found. Cannot seed data.'));
      process.exit(1);
    }
    console.log(`👤 Found Test Student: ${student.user?.name} (Class ID: ${student.class})`);

    // 2. Find or create an admin/teacher user to act as uploader
    let uploader = await User.findOne({ role: { $in: ['teacher', 'admin', 'super_admin'] } });
    if (!uploader) {
      console.log(yellow('⚠ No suitable user found. Creating a dummy teacher.'));
      uploader = await User.create({
          name: 'Dummy Teacher',
          email: 'teacher@test.com',
          password: 'password123',
          role: 'teacher',
          organization: student.user.organization || null,
          school: student.school
      });
    }
    console.log(`👤 Using uploader: ${uploader.name} (${uploader.role})`);

    // --- SEED STUDY MATERIALS ---
    await StudyMaterial.deleteMany({ school: student.school, applicableClasses: student.class });
    console.log('🧹 Cleared old StudyMaterials');

    const materialsData = [
      {
        school: student.school,
        uploadedBy: uploader._id,
        applicableClasses: [student.class],
        title: 'Mathematics - Algebra Complete Guide',
        subjectName: 'Mathematics',
        fileType: 'PDF',
        format: 'Document',
        size: '4.2 MB',
        pages: 128,
        downloadCount: 1245,
        views: 3450,
        rating: 4.8,
        description: 'Comprehensive guide covering all algebra topics including linear equations, quadratic equations.',
        difficultyLevel: 'Intermediate',
        tags: ['Algebra', 'Equations'],
        fileUrl: 'https://example.com/math-algebra.pdf',
        thumbnailUrl: 'https://via.placeholder.com/400x250?text=Algebra',
        status: 'published'
      },
      {
        school: student.school,
        uploadedBy: uploader._id,
        applicableClasses: [student.class],
        title: 'Physics - Motion & Force',
        subjectName: 'Science',
        fileType: 'Video',
        format: 'Video Tutorial',
        size: '156 MB',
        duration: '2h 45min',
        downloadCount: 892,
        views: 4560,
        rating: 4.9,
        description: 'Detailed video explanation of motion, speed, velocity, acceleration.',
        difficultyLevel: 'Beginner',
        tags: ['Physics', 'Motion', 'Force'],
        fileUrl: 'https://example.com/physics-video.mp4',
        thumbnailUrl: 'https://via.placeholder.com/400x250?text=Physics',
        status: 'published'
      },
      {
        school: student.school,
        uploadedBy: uploader._id,
        applicableClasses: [student.class],
        title: 'English Grammar Masterclass',
        subjectName: 'English',
        fileType: 'PDF',
        format: 'Document',
        size: '5.6 MB',
        pages: 245,
        downloadCount: 2156,
        views: 6780,
        rating: 4.9,
        description: 'Complete English grammar guide covering tenses, parts of speech.',
        difficultyLevel: 'All Levels',
        tags: ['Grammar', 'Writing'],
        fileUrl: 'https://example.com/english-grammar.pdf',
        thumbnailUrl: 'https://via.placeholder.com/400x250?text=English',
        status: 'published'
      }
    ];

    await StudyMaterial.insertMany(materialsData);
    console.log(green('✚ Created Study Materials'));

    // --- SEED BUS ROUTE & DRIVER ---
    // Create Driver
    let driverUser = await User.findOne({ email: 'driver@test.com' });
    if (!driverUser) {
        driverUser = await User.create({
            name: 'Rajesh Kumar',
            loginId: 'DRIVER001',
            email: 'driver@test.com',
            password: 'password123', // Dummy password
            role: 'support_staff',
            organization: student.user.organization || uploader.organization,
            school: student.school
        });
    }

    let driver = await Driver.findOne({ user: driverUser._id });
    if (!driver) {
        driver = await Driver.create({
            user: driverUser._id,
            school: student.school,
            phone: '+91 98765 43210',
            status: 'Active'
        });
    }

    // Create Bus Route
    await BusRoute.deleteMany({ school: student.school });
    console.log('🧹 Cleared old BusRoutes');

    const route = await BusRoute.create({
        school: student.school,
        routeName: 'Route 1 - Sector 15 to School',
        driverId: driver._id,
        vehicleNumber: 'SCH-101',
        status: 'Active',
        stops: [
            { stopName: 'Sector 15', morningPickupTime: '07:30 AM', eveningDropTime: '03:00 PM' },
            { stopName: 'Sector 14', morningPickupTime: '07:45 AM', eveningDropTime: '02:45 PM' },
            { stopName: 'Sector 12', morningPickupTime: '08:00 AM', eveningDropTime: '02:30 PM' },
            { stopName: 'School', morningPickupTime: '08:15 AM', eveningDropTime: '02:15 PM' }
        ],
        alerts: [
            { type: 'info', message: 'Bus timing changes from April 1st', isActive: true }
        ]
    });
    console.log(green('✚ Created Bus Route: ' + route.routeName));

    // Update Student to be enrolled in this route
    await Student.findByIdAndUpdate(student._id, {
        transport: {
            enrolled: true,
            routeId: route._id
        }
    });
    console.log(green('✚ Assigned route to student'));

    console.log(green('\n🎉 Seeding Complete!'));
    process.exit(0);

  } catch (error) {
    console.error(red('Error during seeding:'), error);
    process.exit(1);
  }
}

seed();
