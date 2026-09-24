import crypto from "crypto";
import FeePayment from "../../models/finance/FeePayment.model.js";
import FeeInstallment from "../../models/finance/FeeInstallment.model.js";
import SalarySlip from "../../models/finance/Salaryslip.model.js";

/**
 * @desc    Handle Razorpay Webhooks
 */
export const handleRazorpayWebhook = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers["x-razorpay-signature"];

        const body = JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(body)
            .digest("hex");

        if (signature !== expectedSignature) {
            return res.status(400).json({ success: false, message: "Invalid webhook signature" });
        }

        const event = req.body.event;
        const payload = req.body.payload;

        console.log(`Razorpay Webhook Received: ${event}`);

        switch (event) {
            case "payment.captured":
                await handlePaymentCaptured(payload.payment.entity);
                break;
            case "payout.processed":
                await handlePayoutProcessed(payload.payout.entity);
                break;
            case "payout.failed":
            case "payout.reversed":
                await handlePayoutFailed(payload.payout.entity);
                break;
            default:
                console.log(`Unhandled event: ${event}`);
        }

        res.status(200).json({ success: true, message: "Webhook processed" });
    } catch (error) {
        console.error("Webhook Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update fee records on successful payment capture
 */
async function handlePaymentCaptured(entity) {
    const { order_id, id, notes } = entity;
    const { installmentId } = notes;

    const payment = await FeePayment.findOne({ gatewayOrderId: order_id });
    if (payment && payment.paymentStatus !== "success") {
        payment.paymentStatus = "success";
        payment.gatewayPaymentId = id;
        await payment.save();

        // Ensure installment is updated if not already done by controller
        const amount = entity.amount / 100;
        await FeeInstallment.findOneAndUpdate(
            { _id: installmentId },
            { $inc: { totalPaid: amount, totalDue: -amount } }
        );
    }
}

/**
 * Update salary slip on successful payout
 */
async function handlePayoutProcessed(entity) {
    const { id, reference_id } = entity;
    
    // In our implementation, we used payoutId as the reference or part of the flow
    const salarySlip = await SalarySlip.findOne({ razorpayPayoutId: id });
    if (salarySlip) {
        salarySlip.razorpayStatus = "processed";
        salarySlip.paymentStatus = "paid";
        await salarySlip.save();
    }
}

/**
 * Handle payout failure
 */
async function handlePayoutFailed(entity) {
    const { id, status } = entity;
    const salarySlip = await SalarySlip.findOne({ razorpayPayoutId: id });
    if (salarySlip) {
        salarySlip.razorpayStatus = status;
        salarySlip.paymentStatus = "approved"; // Revert to approved so it can be retried
        await salarySlip.save();
    }
}
