import express from 'express';
import {
    getFeeStatus,
    getInstalments,
    getPaymentHistory,
    getFeeOffers,
    createRazorpayOrder,
    verifyRazorpayPayment,
    getPaymentReceipt,
    checkPaymentStatus
} from '../../controllers/parent/feeController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All parent routes require authentication
router.use(protect);
router.use(authorize('parent', 'admin'));

// Fee Status & Information
router.get('/fees/status', getFeeStatus);
router.get('/fees/instalments', getInstalments);
router.get('/fees/payment-history', getPaymentHistory);
router.get('/fees/offers', getFeeOffers);

// Razorpay Payment Routes
router.post('/fees/create-order', createRazorpayOrder);
router.post('/fees/verify-payment', verifyRazorpayPayment);
router.get('/fees/payment-status/:orderId', checkPaymentStatus);

// Receipt
router.get('/fees/receipt/:paymentId', getPaymentReceipt);

export default router;