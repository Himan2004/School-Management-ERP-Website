import Razorpay from "razorpay";
import crypto from "crypto";
import Teacher from "../../models/users/teacher.model.js";
import SalarySlip from "../../models/finance/Salaryslip.model.js";
import FeePayment from "../../models/finance/FeePayment.model.js";
import FeeInstallment from "../../models/finance/FeeInstallment.model.js";

// Initialize Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * @desc    Create a Razorpay Order for Fee Payment
 */
export const createFeeOrder = async (req, res) => {
    try {
        const { amount, studentId, installmentId } = req.body;

        const options = {
            amount: amount * 100, // amount in paise
            currency: "INR",
            receipt: `rcpt_fee_${Date.now()}`,
            notes: {
                studentId,
                installmentId
            }
        };

        const order = await razorpay.orders.create(options);

        res.status(201).json({
            success: true,
            order
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Verify Razorpay Payment Signature
 */
export const verifyFeePayment = async (req, res) => {
    try {
        const { 
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature,
            studentId,
            installmentId,
            amount // amount in INR
        } = req.body;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

        // Logic to record the payment and update installments
        // In a real scenario, this should also be handled by webhooks for reliability
        const payment = await FeePayment.create({
            organization: req.user.organization,
            school: req.user.school,
            studentId,
            feeInstallmentId: installmentId,
            installmentSlotId: installmentId, // Placeholder
            academicYear: "2023-24", // Placeholder
            amountPaid: amount,
            paymentMode: "online_portal",
            paymentStatus: "success",
            paymentGateway: "razorpay",
            gatewayOrderId: razorpay_order_id,
            gatewayPaymentId: razorpay_payment_id,
            gatewaySignature: razorpay_signature
        });

        // Update the installment record
        await FeeInstallment.findOneAndUpdate(
            { _id: installmentId },
            { $inc: { totalPaid: amount, totalDue: -amount } }
        );

        res.status(200).json({
            success: true,
            message: "Payment verified and recorded",
            data: payment
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Initiate Salary Payout (RazorpayX)
 */
export const initiateSalaryPayout = async (req, res) => {
    try {
        const { slipId } = req.params;
        const salarySlip = await SalarySlip.findById(slipId).populate("staffId");

        if (!salarySlip) {
            return res.status(404).json({ success: false, message: "Salary slip not found" });
        }

        if (salarySlip.paymentStatus === "paid") {
            return res.status(400).json({ success: false, message: "Salary already paid" });
        }

        const teacher = await Teacher.findOne({ user: salarySlip.staffId });
        if (!teacher || !teacher.bankDetails?.accountNumber) {
            return res.status(400).json({ success: false, message: "Teacher bank details missing" });
        }

        // Step 1: Create Contact if not exists
        if (!teacher.razorpayContactId) {
            // Mocking contact creation (In production, use axios to call RazorpayX API)
            // const contact = await razorpay.contacts.create({...});
            teacher.razorpayContactId = `cont_${Math.random().toString(36).substr(2, 9)}`;
            await teacher.save();
        }

        // Step 2: Create Fund Account if not exists
        if (!teacher.razorpayFundAccountId) {
            // Mocking fund account creation
            teacher.razorpayFundAccountId = `fa_${Math.random().toString(36).substr(2, 9)}`;
            await teacher.save();
        }

        // Step 3: Create Payout
        // Note: Standard razorpay SDK doesn't support Payouts directly as well as other APIs.
        // We typically use a raw axios call to https://api.razorpay.com/v1/payouts
        // Here we mock the result for the testing requirement.
        
        const payoutId = `pout_${Math.random().toString(36).substr(2, 9)}`;

        salarySlip.paymentStatus = "paid";
        salarySlip.paymentMode = "razorpay";
        salarySlip.razorpayPayoutId = payoutId;
        salarySlip.razorpayStatus = "processed"; // Webhook will update this in reality
        salarySlip.paymentDate = new Date();
        salarySlip.paymentReference = payoutId;
        
        await salarySlip.save();

        res.status(200).json({
            success: true,
            message: "Salary payout initiated successfully",
            payoutId
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
