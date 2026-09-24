import mongoose from 'mongoose';

const appliedHeadSchema = new mongoose.Schema(
    {
        feeHeadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FeeHead',
            required: true,
        },

        originalAmount: {
            type: Number,
            required: true,
        },

        discountValue: {
            type: Number,
            required: true,
        },

        finalAmount: {
            type: Number,
            required: true,
        },
    },
    { _id: false }
);

const feeWaiverSchema = new mongoose.Schema(
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

        studentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true,
        },

        waiverPolicyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'WaiverPolicy',
            required: true,
        },

        feeStructureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FeeStructure',
            required: true,
        },

        academicYear: {
            type: String,
            required: true,
        },

        appliedHeads: {
            type: [appliedHeadSchema],
            validate: {
                validator: (v) => v.length > 0,
                message: 'At least one fee head must be specified in waiver',
            },
        },

        totalOriginalAmount: {
            type: Number,
            default: 0,
        },

        totalDiscountAmount: {
            type: Number,
            default: 0,
        },

        totalFinalAmount: {
            type: Number,
            default: 0,
        },

        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'revoked'],
            default: 'pending',
            index: true,
        },

        initiatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },

        initiatedByRole: {
            type: String,
            enum: ['branch_admin', 'principal', 'accountant', 'hq_admin'],
            required: true,
        },

        initiationReason: {
            type: String,
            trim: true,
            required: true,
        },

        documents: [
            {
                name: { type: String },
                url: { type: String },
                uploadedAt: { type: Date, default: Date.now },
            },
        ],

        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
        },

        reviewedByRole: {
            type: String,
            enum: ['hq_admin', 'principal', 'branch_admin'],
        },

        reviewedAt: {
            type: Date,
        },

        reviewRemarks: {
            type: String,
            trim: true,
        },

        revokedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
        },

        revokedAt: {
            type: Date,
        },

        revokeReason: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

feeWaiverSchema.pre('save', function (next) {
    this.totalOriginalAmount = this.appliedHeads.reduce(
        (sum, h) => sum + h.originalAmount,
        0
    );
    this.totalDiscountAmount = this.appliedHeads.reduce(
        (sum, h) => sum + h.discountValue,
        0
    );
    this.totalFinalAmount = this.appliedHeads.reduce(
        (sum, h) => sum + h.finalAmount,
        0
    );
    next();
});

feeWaiverSchema.index(
    { studentId: 1, waiverPolicyId: 1, academicYear: 1 },
    { unique: true }
);

const FeeWaiver = mongoose.model('FeeWaiver', feeWaiverSchema);
export default FeeWaiver;