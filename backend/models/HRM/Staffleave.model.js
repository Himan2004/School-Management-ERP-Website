import mongoose from 'mongoose';

const staffLeaveSchema = new mongoose.Schema(
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
        leaveType: {
            type: String,
            enum: ['casual', 'sick', 'earned', 'maternity', 'paternity', 'unpaid', 'half_day', 'full_day'],
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
            min: 0.5,
        },
        isHalfDay: {
            type: Boolean,
            default: false,
        },
        halfDaySession: {
            type: String,
            enum: ['morning', 'afternoon', null],
            default: null,
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
        approvalLevel: {
            type: String,
            enum: ['principal', 'hq_admin', 'branch_admin'],
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
        rejectionReason: {
            type: String,
            trim: true,
        },
        appliedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

staffLeaveSchema.index({ staffId: 1, status: 1 });
staffLeaveSchema.index({ school: 1, fromDate: 1, status: 1 });

const StaffLeave = mongoose.model('StaffLeave', staffLeaveSchema);
export default StaffLeave;