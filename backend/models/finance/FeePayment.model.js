import mongoose from 'mongoose';

const feePaymentSchema = new mongoose.Schema(
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

        feeInstallmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'FeeInstallment',
            required: true,
        },

        installmentSlotId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },

        academicYear: {
            type: String,
            required: true,
            index: true,
        },

        amountPaid: {
            type: Number,
            required: true,
            min: 1,
        },

        lateFeePaid: {
            type: Number,
            default: 0,
            min: 0,
        },

        advanceAdjusted: {
            type: Number,
            default: 0,
            min: 0,
        },

        totalCollected: {
            type: Number,
            default: 0,
        },

        paymentMode: {
            type: String,
            enum: [
                'cash',
                'upi',
                'net_banking',
                'card',
                'cheque',
                'demand_draft',
                'online_portal',
            ],
            required: true,
        },

        paymentStatus: {
            type: String,
            enum: ['success', 'pending', 'failed', 'refunded'],
            default: 'success',
            index: true,
        },

        paymentGateway: {
            type: String,
            enum: ['razorpay', 'paytm', 'stripe', 'ccavenue', 'none'],
            default: 'none',
        },

        gatewayOrderId: {
            type: String,
            trim: true,
        },

        gatewayPaymentId: {
            type: String,
            trim: true,
        },

        gatewaySignature: {
            type: String,
            trim: true,
        },

        chequeNumber: {
            type: String,
            trim: true,
        },

        bankName: {
            type: String,
            trim: true,
        },

        ddNumber: {
            type: String,
            trim: true,
        },

        receiptNumber: {
            type: String,
            unique: true,
            sparse: true,
        },

        receiptUrl: {
            type: String,
            trim: true,
        },

        receiptGeneratedAt: {
            type: Date,
        },

        gstApplicable: {
            type: Boolean,
            default: false,
        },

        gstPercentage: {
            type: Number,
            default: 0,
        },

        gstAmount: {
            type: Number,
            default: 0,
        },

        collectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
        },

        paymentDate: {
            type: Date,
            default: Date.now,
            index: true,
        },

        remarks: {
            type: String,
            trim: true,
        },

        isRefunded: {
            type: Boolean,
            default: false,
        },

        refundAmount: {
            type: Number,
            default: 0,
        },

        refundReason: {
            type: String,
            trim: true,
        },

        refundedAt: {
            type: Date,
        },

        refundedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
        },
    },
    {
        timestamps: true,
    }
);

feePaymentSchema.pre('save', function (next) {
    this.totalCollected = this.amountPaid + this.lateFeePaid;
    next();
});

feePaymentSchema.index({ branchId: 1, paymentDate: -1 });
feePaymentSchema.index({ studentId: 1, paymentStatus: 1 });
feePaymentSchema.index({ organizationId: 1, academicYear: 1, paymentStatus: 1 });


const FeePayment = mongoose.models.FeePayment || mongoose.model('FeePayment', feePaymentSchema);
export default FeePayment;