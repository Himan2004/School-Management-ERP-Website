import mongoose from 'mongoose';

const installmentSlotSchema = new mongoose.Schema(
    {
        installmentNo: {
            type: Number,
            required: true,
        },

        label: {
            type: String,
            trim: true,
        },

        amountDue: {
            type: Number,
            required: true,
            min: 0,
        },

        dueDate: {
            type: Date,
            required: true,
        },

        amountPaid: {
            type: Number,
            default: 0,
            min: 0,
        },

        status: {
            type: String,
            enum: ['upcoming', 'due', 'paid', 'partially_paid', 'overdue'],
            default: 'upcoming',
        },

        lateFeeCharged: {
            type: Number,
            default: 0,
        },

        paidOn: {
            type: Date,
        },

        paymentRefs: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'FeePayment',
            },
        ],
    },
    { _id: true }
);

const feeInstallmentSchema = new mongoose.Schema(
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

        feeStructureId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FeeStructure',
            required: true,
        },

        feeWaiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FeeWaiver',
            default: null,
        },

        academicYear: {
            type: String,
            required: true,
        },

        planType: {
            type: String,
            enum: ['one_time', 'monthly', 'quarterly', 'custom'],
            required: true,
        },

        grossAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        waiverAmount: {
            type: Number,
            default: 0,
            min: 0,
        },

        netAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        totalPaid: {
            type: Number,
            default: 0,
            min: 0,
        },

        totalDue: {
            type: Number,
            default: 0,
            min: 0,
        },

        advanceBalance: {
            type: Number,
            default: 0,
            min: 0,
        },

        installments: {
            type: [installmentSlotSchema],
            validate: {
                validator: (v) => v.length > 0,
                message: 'At least one installment slot is required',
            },
        },

        status: {
            type: String,
            enum: ['active', 'completed', 'defaulted', 'waived_off'],
            default: 'active',
            index: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

feeInstallmentSchema.pre('save', function (next) {
    this.totalDue = Math.max(0, this.netAmount - this.totalPaid);
    if (this.totalPaid >= this.netAmount) {
        this.status = 'completed';
    }
    next();
});

feeInstallmentSchema.index(
    { studentId: 1, academicYear: 1 },
    { unique: true }
);

const FeeInstallment = mongoose.model('FeeInstallment', feeInstallmentSchema);
export default FeeInstallment;