import mongoose from 'mongoose';

const studentLeaveSchema = new mongoose.Schema(
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
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        class: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Class',
            required: true,
        },
        section: {
            type: String,
            required: true,
        },
        leaveType: {
            type: String,
            enum: ['sick', 'casual', 'emergency', 'other'],
            required: true,
        },
        fromDate: {
            type: Date,
            required: true,
        },
        toDate: {
            type: Date,
            required: true,
        },
        totalDays: {
            type: Number,
            required: true,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        supportingDocument: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'cancelled'],
            default: 'pending',
            index: true,
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
        rejectionReason: {
            type: String,
            trim: true,
        },
        appliedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Usually parent or student themselves
            required: true,
        }
    },
    {
        timestamps: true,
    }
);

studentLeaveSchema.index({ student: 1, status: 1 });
studentLeaveSchema.index({ school: 1, fromDate: 1, status: 1 });

const StudentLeave = mongoose.model('StudentLeave', studentLeaveSchema);
export default StudentLeave;
