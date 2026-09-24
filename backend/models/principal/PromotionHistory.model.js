import mongoose from 'mongoose';

const promotionHistorySchema = new mongoose.Schema(
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
        fromAcademicYear: {
            type: String,
            required: true,
        },
        toAcademicYear: {
            type: String,
            required: true,
        },
        dateRun: {
            type: Date,
            default: Date.now,
        },
        runBy: {
            type: String,
            required: true,
        },
        runById: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        totalStudents: {
            type: Number,
            default: 0,
        },
        promoted: {
            type: Number,
            default: 0,
        },
        heldBack: {
            type: Number,
            default: 0,
        },
        passOut: {
            type: Number,
            default: 0,
        },
        compartment: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ['Completed', 'Partial', 'Failed'],
            default: 'Completed',
        },
        details: [
            {
                studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                name: String,
                fromClass: String,
                toClass: String,
                status: String,
                overrideReason: String,
            },
        ],
    },
    {
        timestamps: true,
    }
);

promotionHistorySchema.index({ school: 1, fromAcademicYear: 1 });

const PromotionHistory = mongoose.models.PromotionHistory || mongoose.model('PromotionHistory', promotionHistorySchema);
export default PromotionHistory;