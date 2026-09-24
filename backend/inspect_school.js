import mongoose from 'mongoose';
import 'dotenv/config';
import connectDB from './config/database.js';

const StudentProfileSchema = new mongoose.Schema({}, { strict: false });
const ClassSchema = new mongoose.Schema({}, { strict: false });
const ExamStructureSchema = new mongoose.Schema({}, { strict: false });
const ExamScheduleSchema = new mongoose.Schema({}, { strict: false });
const SubjectSchema = new mongoose.Schema({}, { strict: false });

const StudentProfile = mongoose.model('StudentProfile', StudentProfileSchema);
const Class = mongoose.model('Class', ClassSchema);
const ExamStructure = mongoose.model('ExamStructure', ExamStructureSchema);
const ExamSchedule = mongoose.model('ExamSchedule', ExamScheduleSchema);
const Subject = mongoose.model('Subject', SubjectSchema);

async function run() {
    await connectDB();
    console.log('MongoDB Connected!');

    const schoolId = new mongoose.Types.ObjectId('69fe09eedec901fd9887d235');

    // 1. Find classes
    const classes = await Class.find({ isActive: true }).lean();
    console.log(`Classes count: ${classes.length}`);
    
    // 2. Find students
    const students = await StudentProfile.find({ school: schoolId }).lean();
    console.log(`Students count in school: ${students.length}`);
    if (students.length > 0) {
        console.log('Sample student class:', students[0].class);
    }

    // 3. Find exam structures / schedules
    const structures = await ExamStructure.find({ school: schoolId }).lean();
    console.log(`Exam structures count: ${structures.length}`);

    const schedules = await ExamSchedule.find({ school: schoolId }).lean();
    console.log(`Exam schedules count: ${schedules.length}`);

    // 4. Find subjects
    const subjects = await Subject.find({}).limit(5).lean();
    console.log(`Subjects count (total): ${subjects.length}`);

    process.exit(0);
}

run().catch(console.error);
