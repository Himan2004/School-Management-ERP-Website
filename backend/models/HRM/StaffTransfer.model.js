import mongoose from 'mongoose';

const staffTransferSchema = new mongoose.Schema(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
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
        fromSchool: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            required: true,
        },
        toSchool: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            required: true,
        },
        transferType: {
            type: String,
            enum: ['permanent', 'temporary'],
            default: 'permanent',
        },
        effectiveDate: {
            type: Date,
            required: true,
        },
        returnDate: {
            type: Date,
            default: null,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'completed', 'reverted'],
            default: 'pending',
            index: true,
        },
        initiatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        approvedAt: {
            type: Date,
            default: null,
        },
        approvalRemarks: {
            type: String,
            trim: true,
        },
        handoverNotes: {
            type: String,
            trim: true,
        },
        handoverCompletedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

staffTransferSchema.index({ staffId: 1, status: 1, effectiveDate: -1 });
staffTransferSchema.index({ organization: 1, status: 1 });

const StaffTransfer = mongoose.model('StaffTransfer', staffTransferSchema);
export default StaffTransfer;