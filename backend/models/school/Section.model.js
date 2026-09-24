import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema(
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
            trim: true,
        },
        classId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Class',
        },
        className: {
            type: String,
            trim: true,
        },
        capacity: {
            type: Number,
            default: 40,
        },
        currentStrength: {
            type: Number,
            default: 0,
        },
        homeroomTeacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    { timestamps: true }
);

const Section = mongoose.models.Section || mongoose.model('Section', sectionSchema);
export default Section;