import express from 'express';
import {
    getAccountantExpenses,
    createAccountantExpense,
    updateAccountantExpense,
    deleteAccountantExpense,
    getAccountantVendors,
    getAccountantRecurringExpenses,
    uploadAccountantInvoice
} from '../../controllers/accountant/accountantExpensesController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('accountant', 'admin'));

router.get('/expenses', getAccountantExpenses);
router.post('/expenses', createAccountantExpense);
router.put('/expenses/:id', updateAccountantExpense);
router.delete('/expenses/:id', deleteAccountantExpense);
router.get('/expenses/vendors', getAccountantVendors);
router.get('/expenses/recurring', getAccountantRecurringExpenses);
router.post('/expenses/upload-invoice', uploadAccountantInvoice);

export default router;