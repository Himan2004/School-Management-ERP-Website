import mongoose from 'mongoose';

const academicYearSchema = new mongoose.Schema(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true,
        },
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ['Active', 'Upcoming', 'Locked', 'Archived'],
            default: 'Upcoming',
            index: true,
        },
        workingDays: {
            type: Number,
            default: 0,
        },
        workingDaysConfig: {
            Monday: { type: Boolean, default: true },
            Tuesday: { type: Boolean, default: true },
            Wednesday: { type: Boolean, default: true },
            Thursday: { type: Boolean, default: true },
            Friday: { type: Boolean, default: true },
            Saturday: { type: Boolean, default: false },
            Sunday: { type: Boolean, default: false },
        },
        description: {
            type: String,
            trim: true,
        },
        totalStudents: {
            type: Number,
            default: 0,
        },
        totalExams: {
            type: Number,
            default: 0,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

academicYearSchema.index({ school: 1, status: 1 });
academicYearSchema.index({ school: 1, name: 1 }, { unique: true });

const AcademicYear = mongoose.models.AcademicYear || mongoose.model('AcademicYear', academicYearSchema);
export default AcademicYear;