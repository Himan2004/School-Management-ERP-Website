import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema(
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
        actionType: {
            type: String,
            enum: ['promotion', 'demotion'],
            required: true,
        },
        previousRole: {
            type: String,
            enum: ['teacher', 'admin', 'accountant', 'principal', 'support_staff'],
            required: true,
        },
        newRole: {
            type: String,
            enum: ['teacher', 'admin', 'accountant', 'principal', 'support_staff'],
            required: true,
        },
        previousDesignation: {
            type: String,
            trim: true,
        },
        newDesignation: {
            type: String,
            trim: true,
        },
        previousSalary: {
            type: Number,
            min: 0,
        },
        revisedSalary: {
            type: Number,
            min: 0,
        },
        effectiveDate: {
            type: Date,
            required: true,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        performanceRating: {
            type: Number,
            min: 1,
            max: 5,
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            index: true,
        },
        initiatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        initiatedByRole: {
            type: String,
            enum: ['principal', 'hq_admin', 'branch_admin', 'admin'],
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
        payrollUpdated: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

promotionSchema.index({ staffId: 1, effectiveDate: -1 });
promotionSchema.index({ school: 1, actionType: 1, status: 1 });

const Promotion = mongoose.model('Promotion', promotionSchema);
export default Promotion;