import express from "express";
// import { getFinanceDashboardStats } from "../../controllers/admin/adminFinanceController.js";
import { 
    createFeeOrder, 
    verifyFeePayment, 
    initiateSalaryPayout 
} from "../../controllers/finance/razorpayController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import { getFinanceDashboardStats, getFeeRecords } from "../../controllers/admin/adminFinanceController.js";

const router = express.Router();

// All routes are protected and restricted to school admin
router.use(protect, authorize("admin"));

/**
 * @route   GET /api/admin/finance/dashboard-stats
 * @desc    Get finance dashboard statistics
 * @access  Private (Admin)
 */
router.get("/dashboard-stats", getFinanceDashboardStats);

/**
 * Payment & Payout Routes
 */
router.post("/razorpay/create-order", createFeeOrder);
router.post("/razorpay/verify-payment", verifyFeePayment);
router.post("/razorpay/payout/salary/:slipId", initiateSalaryPayout);

router.get("/fee-records", getFeeRecords);

export default router;
