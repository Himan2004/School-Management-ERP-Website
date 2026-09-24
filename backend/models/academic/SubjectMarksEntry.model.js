import mongoose from 'mongoose';

const studentMarkSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    rollNo: { type: String },
    marks: { type: String, default: '' },
    grade: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'pass', 'fail'], default: 'pending' }
}, { _id: false });

const subjectMarksEntrySchema = new mongoose.Schema({
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    class: { type: String, required: true },
    section: { type: String, required: true },
    subject: { type: String, required: true },
    examType: { type: String, required: true },
    examDate: { type: Date, required: true },
    totalMarks: { type: Number, required: true },
    passingMarks: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'pending', 'submitted', 'verified', 'published'], default: 'draft' },
    marksData: {
        type: Map,
        of: studentMarkSchema,
        default: {}
    },
    studentsCount: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    passCount: { type: Number, default: 0 }
}, { timestamps: true });

subjectMarksEntrySchema.index({ school: 1, createdBy: 1 });

const SubjectMarksEntry = mongoose.model('SubjectMarksEntry', subjectMarksEntrySchema);
export default SubjectMarksEntry;
