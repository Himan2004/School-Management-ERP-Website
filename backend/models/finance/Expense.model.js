import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
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

        title: {
            type: String,
            required: true,
            trim: true,
        },

        category: {
            type: String,
            enum: [
                'electricity',
                'water',
                'transport',
                'lab',
                'events',
                'maintenance',
                'salaries',
                'rent',
                'stationery',
                'cleaning',
                'security',
                'it_infrastructure',
                'miscellaneous',
            ],
            required: true,
            index: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        expenseDate: {
            type: Date,
            required: true,
            index: true,
        },

        isRecurring: {
            type: Boolean,
            default: false,
        },

        recurrenceFrequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annual', null],
            default: null,
        },

        vendorName: {
            type: String,
            trim: true,
        },

        vendorContact: {
            type: String,
            trim: true,
        },

        invoiceNumber: {
            type: String,
            trim: true,
        },

        invoiceUrl: {
            type: String,
            trim: true,
        },

        paymentMode: {
            type: String,
            enum: ['cash', 'bank_transfer', 'cheque', 'upi', 'card'],
            required: true,
        },

        paymentStatus: {
            type: String,
            enum: ['paid', 'pending', 'partial'],
            default: 'paid',
        },

        gstApplicable: {
            type: Boolean,
            default: false,
        },

        gstAmount: {
            type: Number,
            default: 0,
        },

        requiresApproval: {
            type: Boolean,
            default: false,
        },

        approvalStatus: {
            type: String,
            enum: ['not_required', 'pending', 'approved', 'rejected'],
            default: 'not_required',
        },

        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
        },

        approvedAt: {
            type: Date,
        },

        remarks: {
            type: String,
            trim: true,
        },

        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

expenseSchema.index({ branchId: 1, expenseDate: -1 });
expenseSchema.index({ branchId: 1, category: 1, expenseDate: -1 });
expenseSchema.index({ organizationId: 1, expenseDate: -1 });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;