import mongoose from 'mongoose';

const holidaySchema = new mongoose.Schema(
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
        academicYearId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'AcademicYear',
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        date: {
            type: Date,
            required: true,
        },
        type: {
            type: String,
            enum: ['National', 'Religious', 'School', 'Summer Break', 'Winter Break'],
            default: 'National',
        },
        description: {
            type: String,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

holidaySchema.index({ school: 1, academicYearId: 1 });
holidaySchema.index({ date: 1 });

const Holiday = mongoose.models.Holiday || mongoose.model('Holiday', holidaySchema);
export default Holiday;