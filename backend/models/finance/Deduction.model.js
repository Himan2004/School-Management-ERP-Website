import mongoose from 'mongoose';

const recoveryScheduleSchema = new mongoose.Schema(
    {
        month: { type: Number, required: true, min: 1, max: 12 },
        year: { type: Number, required: true },
        amount: { type: Number, required: true, min: 0 },
        status: {
            type: String,
            enum: ['pending', 'recovered', 'skipped'],
            default: 'pending',
        },
        salarySlipId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SalarySlip',
            default: null,
        },
    },
    { _id: true }
);

const deductionSchema = new mongoose.Schema(
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
            ref: 'user',
            required: true,
            index: true,
        },

        deductionType: {
            type: String,
            enum: [
                'advance_salary',
                'loan',
                'penalty',
                'equipment_damage',
                'tax_arrear',
                'miscellaneous',
            ],
            required: true,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
        },

        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },

        amountRecovered: {
            type: Number,
            default: 0,
            min: 0,
        },

        amountRemaining: {
            type: Number,
            default: 0,
            min: 0,
        },

        recoveryType: {
            type: String,
            enum: ['one_time', 'installment'],
            required: true,
        },

        totalInstallments: {
            type: Number,
            default: 1,
        },

        installmentsCompleted: {
            type: Number,
            default: 0,
        },

        recoverySchedule: {
            type: [recoveryScheduleSchema],
            default: [],
        },

        status: {
            type: String,
            enum: ['active', 'fully_recovered', 'waived', 'on_hold'],
            default: 'active',
            index: true,
        },

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
        },

        approvedAt: {
            type: Date,
        },

        recoveryStartMonth: {
            type: Number,
            min: 1,
            max: 12,
        },

        recoveryStartYear: {
            type: Number,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },

        remarks: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

deductionSchema.pre('save', function (next) {
    this.amountRemaining = Math.max(0, this.totalAmount - this.amountRecovered);
    if (this.amountRemaining === 0 && this.amountRecovered > 0) {
        this.status = 'fully_recovered';
    }
    next();
});

deductionSchema.index({ staffId: 1, status: 1 });

const Deduction = mongoose.model('Deduction', deductionSchema);
export default Deduction;