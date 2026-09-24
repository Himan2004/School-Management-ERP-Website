import express from 'express';
import {
    getDueReports,
    sendFeeReminder,
    sendBulkReminder,
    getFeeCollections,
    collectFeePayment,
    getPaymentReceipt,
    getStudentPaymentHistory,
    getTransactions,
    getFeeStructures,
    createFeeStructure,
    updateFeeStructure,
    deleteFeeStructure,
    getStudentFeeStatement
} from '../../controllers/principal/feeController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication and principal role
router.use(protect);
router.use(authorize('principal', 'admin'));

// Due Reports Routes
router.get('/fees/due', getDueReports);
router.post('/fees/send-reminder', sendFeeReminder);
router.post('/fees/send-bulk-reminder', sendBulkReminder);

// Fee Collection Routes
router.get('/fees/collection', getFeeCollections);
router.post('/fees/collect', collectFeePayment);
router.get('/fees/receipt/:paymentId', getPaymentReceipt);
router.get('/fees/payment-history/:studentId', getStudentPaymentHistory);
router.get('/fees/statement/:studentId', getStudentFeeStatement);

// Transactions Routes
router.get('/fees/transactions', getTransactions);

// Fee Structure Routes
router.get('/fees/structure', getFeeStructures);
router.post('/fees/structure', createFeeStructure);
router.put('/fees/structure/:id', updateFeeStructure);
router.delete('/fees/structure/:id', deleteFeeStructure);

export default router;