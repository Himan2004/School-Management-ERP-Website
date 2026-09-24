import express from 'express';
import {
    getAccountantPayrollStaff,
    processAccountantPayroll,
    updateAccountantSalarySlip,
    getAccountantSalarySlips,
    generateAccountantBankTransferReport
} from '../../controllers/accountant/accountantPayrollController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('accountant', 'admin'));

router.get('/payroll/staff', getAccountantPayrollStaff);
router.post('/payroll/process', processAccountantPayroll);
router.put('/payroll/salary-slip/:id', updateAccountantSalarySlip);
router.get('/payroll/salary-slips', getAccountantSalarySlips);
router.post('/payroll/bank-transfer-report', generateAccountantBankTransferReport);

export default router;