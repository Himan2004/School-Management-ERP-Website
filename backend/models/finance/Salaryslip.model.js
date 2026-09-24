import mongoose from 'mongoose';

const slipAllowanceSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        isTaxable: { type: Boolean, default: true },
    },
    { _id: false }
);

const slipDeductionSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        isEmployerContribution: { type: Boolean, default: false },
    },
    { _id: false }
);

const salarySlipSchema = new mongoose.Schema(
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

        payrollId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Payroll',
            required: true,
        },

        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },

        year: {
            type: Number,
            required: true,
        },

        totalWorkingDays: {
            type: Number,
            required: true,
        },

        daysPresent: {
            type: Number,
            required: true,
        },

        daysAbsent: {
            type: Number,
            default: 0,
        },

        daysOnLeave: {
            type: Number,
            default: 0,
        },

        overtimeHours: {
            type: Number,
            default: 0,
        },

        basicSalary: {
            type: Number,
            required: true,
        },

        payableBasic: {
            type: Number,
            required: true,
        },

        allowances: {
            type: [slipAllowanceSchema],
            default: [],
        },

        overtimeAmount: {
            type: Number,
            default: 0,
        },

        bonusAmount: {
            type: Number,
            default: 0,
        },

        grossEarnings: {
            type: Number,
            default: 0,
        },

        deductions: {
            type: [slipDeductionSchema],
            default: [],
        },

        absentDeduction: {
            type: Number,
            default: 0,
        },

        advanceRecovery: {
            type: Number,
            default: 0,
        },

        totalDeductions: {
            type: Number,
            default: 0,
        },

        netSalary: {
            type: Number,
            required: true,
        },

        paymentStatus: {
            type: String,
            enum: ['draft', 'approved', 'paid', 'held'],
            default: 'draft',
            index: true,
        },

        paymentMode: {
            type: String,
            enum: ['bank_transfer', 'cash', 'cheque', 'razorpay'],
        },

        paymentDate: {
            type: Date,
        },

        paymentReference: {
            type: String,
            trim: true,
        },

        razorpayPayoutId: {
            type: String,
            trim: true,
        },

        razorpayStatus: {
            type: String,
            enum: ['pending', 'queued', 'processed', 'reversed', 'rejected', 'cancelled', 'failed'],
        },

        slipUrl: {
            type: String,
            trim: true,
        },

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        approvedAt: {
            type: Date,
        },

        generatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
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

salarySlipSchema.pre('save', function (next) {
    const totalAllowances = this.allowances.reduce((s, a) => s + a.amount, 0);
    this.grossEarnings =
        this.basicSalary + totalAllowances + this.overtimeAmount + this.bonusAmount;

    const statutoryDeductions = this.deductions
        .filter((d) => !d.isEmployerContribution)
        .reduce((s, d) => s + d.amount, 0);

    this.totalDeductions =
        statutoryDeductions + this.advanceRecovery + this.absentDeduction;

    this.netSalary = Math.max(0, this.grossEarnings - this.totalDeductions);
    next();
});

salarySlipSchema.index(
    { staffId: 1, month: 1, year: 1 },
    { unique: true }
);

salarySlipSchema.index({ branchId: 1, month: 1, year: 1 });
salarySlipSchema.index({ organizationId: 1, month: 1, year: 1, paymentStatus: 1 });


const SalarySlip = mongoose.models.SalarySlip || mongoose.model('SalarySlip', salarySlipSchema);
export default SalarySlip;