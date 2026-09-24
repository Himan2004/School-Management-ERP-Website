import mongoose from 'mongoose';

const promotionRuleSchema = new mongoose.Schema(
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
        minAttendance: {
            type: Number,
            default: 75,
            min: 0,
            max: 100,
        },
        strictAttendance: {
            type: Boolean,
            default: false,
        },
        minPassingMarks: {
            type: Number,
            default: 33,
            min: 0,
            max: 100,
        },
        minSubjectsToPass: {
            type: Number,
            default: 5,
            min: 1,
        },
        allowGraceMarks: {
            type: Boolean,
            default: false,
        },
        graceMarksLimit: {
            type: Number,
            default: 5,
            min: 0,
        },
        compartmentAllowed: {
            type: Boolean,
            default: true,
        },
        maxCompartmentSubjects: {
            type: Number,
            default: 1,
            min: 1,
        },
        failIfAbsentInExam: {
            type: Boolean,
            default: false,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

promotionRuleSchema.index({ school: 1, academicYearId: 1 }, { unique: true });

const PromotionRule = mongoose.models.PromotionRule || mongoose.model('PromotionRule', promotionRuleSchema);
export default PromotionRule;