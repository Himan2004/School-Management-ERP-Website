import mongoose from 'mongoose';

const resignationSchema = new mongoose.Schema(
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
        staffId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        staffRole: {
            type: String,
            enum: ['teacher', 'admin', 'accountant', 'principal', 'support_staff'],
            required: true,
        },
        resignationDate: {
            type: Date,
            required: true,
        },
        lastWorkingDate: {
            type: Date,
            required: true,
        },
        noticePeriodDays: {
            type: Number,
            required: true,
            min: 0,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        additionalNote: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
            default: 'pending',
            index: true,
        },
        approvalLevel: {
            type: String,
            enum: ['principal', 'hq_admin'],
            required: true,
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
        reviewRemarks: {
            type: String,
            trim: true,
        },
        isNoticePeriodWaived: {
            type: Boolean,
            default: false,
        },
        noticePeriodWaivedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        exitInterviewDone: {
            type: Boolean,
            default: false,
        },
        exitInterviewNotes: {
            type: String,
            trim: true,
        },
        clearanceStatus: {
            type: String,
            enum: ['pending', 'cleared', 'not_required'],
            default: 'pending',
        },
        clearanceGivenBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

resignationSchema.index({ staffId: 1, status: 1 });
resignationSchema.index({ school: 1, status: 1, resignationDate: -1 });

const Resignation = mongoose.model('Resignation', resignationSchema);
export default Resignation;