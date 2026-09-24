import mongoose from 'mongoose';

const feeHeadSchema = new mongoose.Schema(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            // e.g. "Tuition Fee", "Lab Fee", "Transport Fee"
        },

        description: {
            type: String,
            trim: true,
        },

        applicableClasses: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Classes',
            },
        ],

        // Can branch admin override the amount for this head?
        branchOverrideAllowed: {
            type: Boolean,
            default: false,
        },

        // Can this fee be paid in installments?
        isInstallmentable: {
            type: Boolean,
            default: true,
        },

        // Is this a recurring fee (monthly/quarterly) or one-time?
        feeType: {
            type: String,
            enum: ['one_time', 'monthly', 'quarterly', 'annual'],
            default: 'annual',
        },

        // Is this head optional (e.g. Transport — not all students take bus)
        isOptional: {
            type: Boolean,
            default: false,
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

// Unique fee head name per organization
feeHeadSchema.index({ organization: 1, name: 1 }, { unique: true });

const FeeHead = mongoose.model('FeeHead', feeHeadSchema);
export default FeeHead