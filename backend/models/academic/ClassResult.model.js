import mongoose from 'mongoose';

const subjectMarkSchema = new mongoose.Schema({
    subject: { type: String, required: true },
    marks: { type: Number, required: true },
    total: { type: Number, required: true },
    grade: { type: String, required: true }
}, { _id: false });

const studentMarksheetSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    rollNo: { type: String },
    class: { type: String },
    section: { type: String },
    subjectMarks: [subjectMarkSchema],
    totalMarks: { type: Number, required: true },
    totalObtained: { type: Number, required: true },
    percentage: { type: Number, required: true },
    grade: { type: String, required: true },
    rank: { type: Number, required: true }
}, { _id: false });

const classResultSchema = new mongoose.Schema({
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    class: { type: String, required: true },
    section: { type: String, required: true },
    examType: { type: String, required: true },
    term: { type: String, required: true },
    academicYear: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'generated', 'published'], default: 'generated' },
    generatedAt: { type: Date, default: Date.now },
    publishedAt: { type: Date },
    studentsCount: { type: Number, default: 0 },
    passCount: { type: Number, default: 0 },
    averagePercentage: { type: Number, default: 0 },
    studentMarksheets: [studentMarksheetSchema]
}, { timestamps: true });

classResultSchema.index({ school: 1, class: 1, section: 1, examType: 1 }, { unique: true });

const ClassResult = mongoose.model('ClassResult', classResultSchema);
export default ClassResult;
