import mongoose from 'mongoose';

const classMappingSchema = new mongoose.Schema(
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
        currentClass: {
            type: String,
            required: true,
            trim: true,
        },
        promotesTo: {
            type: String,
            required: true,
            trim: true,
        },
        sectionMapping: {
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

classMappingSchema.index({ school: 1, currentClass: 1 }, { unique: true });

const ClassMapping = mongoose.models.ClassMapping || mongoose.model('ClassMapping', classMappingSchema);
export default ClassMapping;