import mongoose from 'mongoose';

const allowanceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        isTaxable: {
            type: Boolean,
            default: true,
        },
    },
    { _id: false }
);

const deductionConfigSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },

        deductionType: {
            type: String,
            enum: ['percentage', 'fixed'],
            required: true,
        },

        value: {
            type: Number,
            required: true,
            min: 0,
        },

        appliesOn: {
            type: String,
            enum: ['basic', 'gross'],
            default: 'basic',
        },

        isEmployerContribution: {
            type: Boolean,
            default: false,
        },
    },
    { _id: false }
);

const payrollSchema = new mongoose.Schema(
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

        basicSalary: {
            type: Number,
            required: true,
            min: 0,
        },

        allowances: {
            type: [allowanceSchema],
            default: [],
        },

        grossSalary: {
            type: Number,
            default: 0,
        },

        deductions: {
            type: [deductionConfigSchema],
            default: [],
        },

        netSalary: {
            type: Number,
            default: 0,
        },

        paymentMode: {
            type: String,
            enum: ['bank_transfer', 'cash', 'cheque'],
            default: 'bank_transfer',
        },

        bankAccountNumber: {
            type: String,
            trim: true,
        },

        bankIfsc: {
            type: String,
            trim: true,
        },

        bankName: {
            type: String,
            trim: true,
        },

        effectiveFrom: {
            type: Date,
            required: true,
        },

        effectiveTo: {
            type: Date,
            default: null,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        overtimeRatePerHour: {
            type: Number,
            default: 0,
        },

        annualBonusEligible: {
            type: Boolean,
            default: false,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        lastRevisedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        revisionReason: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

payrollSchema.pre('save', function (next) {
    const totalAllowances = this.allowances.reduce((s, a) => s + a.amount, 0);
    this.grossSalary = this.basicSalary + totalAllowances;

    const totalDeductions = this.deductions
        .filter((d) => !d.isEmployerContribution)
        .reduce((s, d) => {
            if (d.deductionType === 'percentage') {
                const base = d.appliesOn === 'basic' ? this.basicSalary : this.grossSalary;
                return s + (base * d.value) / 100;
            }
            return s + d.value;
        }, 0);

    this.netSalary = Math.max(0, this.grossSalary - totalDeductions);
    next();
});

payrollSchema.index(
    { staffId: 1, isActive: 1 },
    {
        unique: true,
        partialFilterExpression: { isActive: true },
    }
);

const Payroll = mongoose.model('Payroll', payrollSchema);
export default Payroll;