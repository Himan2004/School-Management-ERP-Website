import mongoose from 'mongoose';

const waiverPolicySchema = new mongoose.Schema(
    {
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
        },

        category: {
            type: String,
            enum: [
                'sibling_discount',
                'merit_scholarship',
                'staff_child',
                'financial_hardship',
                'sports_quota',
                'custom',
            ],
            required: true,
        },

        discountType: {
            type: String,
            enum: ['percentage', 'fixed_amount'],
            required: true,
        },

        maxDiscountValue: {
            type: Number,
            required: true,
            min: 0,
        },

        applicableFeeHeads: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'FeeHead',
            },
        ],

        applicableClasses: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Classes',
            },
        ],

        canInitiate: {
            type: String,
            enum: ['branch_admin', 'principal', 'accountant'],
            default: 'branch_admin',
        },

        approvalRequiredFrom: {
            type: String,
            enum: ['hq_admin', 'principal', 'branch_admin'],
            required: true,
            default: 'hq_admin',
        },

        isStackable: {
            type: Boolean,
            default: false,
        },

        requiresDocument: {
            type: Boolean,
            default: false,
        },

        academicYear: {
            type: String,
            default: null,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SuperAdmin',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

waiverPolicySchema.index({ organizationId: 1, name: 1 }, { unique: true });

const WaiverPolicy = mongoose.model('WaiverPolicy', waiverPolicySchema);
export default WaiverPolicy;