import express from "express";
import {
    createExpense,
    getAllExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense,
    getAllFeePayments,
    createPayroll,
    getAllPayrolls,
    getPayrollById,
    updatePayroll,
    deletePayroll,
    createSalarySlip,
    getAllSalarySlips,
    getSalarySlipById,
    updateSalarySlip,
    deleteSalarySlip,
    getFinanceAnalytics,
    getFeeHeads,
    createFeeHead,
    getOrganizationClasses
} from "../../controllers/superAdmin/financeController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";
import { getStudentsByOrganization } from "../../controllers/superAdmin/feeWaiverController.js";


const router = express.Router();

// All routes are protected and restricted to superadmin
router.use(protect, authorize("superadmin"));
router.get("/students", protect, authorize("superadmin"), getStudentsByOrganization);

// Analytics
router.get("/analytics", getFinanceAnalytics);

// Dynamic dropdown data for fee structure modal
router.get("/fee-heads", getFeeHeads);
router.post("/fee-heads", createFeeHead);
router.get("/organization/:organizationId/classes", getOrganizationClasses);

// Expenses
router.route("/expenses")
    .get(getAllExpenses)
    .post(createExpense);
router.route("/expenses/:id")
    .get(getExpenseById)
    .put(updateExpense)
    .delete(deleteExpense);

// Fee Payments (Read-Only for oversight)
router.route("/fee-payments")
    .get(getAllFeePayments);

// Payrolls
router.route("/payrolls")
    .get(getAllPayrolls)
    .post(createPayroll);
router.route("/payrolls/:id")
    .get(getPayrollById)
    .put(updatePayroll)
    .delete(deletePayroll);

// Salary Slips
router.route("/salary-slips")
    .get(getAllSalarySlips)
    .post(createSalarySlip);
router.route("/salary-slips/:id")
    .get(getSalarySlipById)
    .put(updateSalarySlip)
    .delete(deleteSalarySlip);

export default router;
