import mongoose from 'mongoose';
import Expense from '../../models/finance/Expense.model.js';
import Period from '../../models/modules/Period.js'; 

/**
 * GET /api/accountant/expenses
 * Get all expenses with filters
 */
export const getAccountantExpenses = async (req, res) => {
    try {
        const { school_id, category, startDate, endDate, page = 1, limit = 50 } = req.query;

        if (!school_id) {
            return res.status(400).json({ success: false, message: 'school_id is required' });
        }

        const query = { school: new mongoose.Types.ObjectId(school_id) };

        if (category && category !== 'All') {
            query.category = category;
        }

        if (startDate && endDate) {
            query.expenseDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const expenses = await Expense.find(query)
            .sort({ expenseDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Expense.countDocuments(query);

        // Calculate total expenses
        const totalExpenses = await Expense.aggregate([
            { $match: query },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Get category-wise totals
        const categoryTotals = await Expense.aggregate([
            { $match: query },
            { $group: { _id: '$category', total: { $sum: '$amount' } } }
        ]);

        return res.status(200).json({
            success: true,
            data: {
                expenses,
                summary: {
                    totalExpenses: totalExpenses[0]?.total || 0,
                    categoryTotals
                },
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error in getAccountantExpenses:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/accountant/expenses
 * Create new expense
 */
export const createAccountantExpense = async (req, res) => {
    try {
        const { school_id } = req.query;
        const {
            title,
            category,
            amount,
            expenseDate,
            isRecurring,
            recurrenceFrequency,
            vendorName,
            vendorContact,
            invoiceNumber,
            paymentMode,
            paymentStatus,
            gstApplicable,
            gstAmount,
            remarks
        } = req.body;

        if (!school_id || !title || !category || !amount || !expenseDate) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        if (!mongoose.Types.ObjectId.isValid(school_id)) {
            return res.status(400).json({ success: false, message: 'Invalid school_id' });
        }

        const school = await mongoose.model('School').findById(school_id);
        if (!school) {
            return res.status(404).json({ success: false, message: 'Associated school not found' });
        }

        const validCategories = [
            'electricity', 'water', 'transport', 'lab', 'events', 'maintenance', 
            'salaries', 'rent', 'stationery', 'cleaning', 'security', 'it_infrastructure', 'miscellaneous'
        ];
        if (!validCategories.includes(category.toLowerCase())) {
            return res.status(400).json({ 
                success: false, 
                message: `Category '${category}' is not valid. Choose from: ${validCategories.join(', ')}` 
            });
        }

        const parsedDate = new Date(expenseDate);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid expenseDate provided' });
        }

        const expense = new Expense({
            organization: school.organization,
            school: school._id,
            title,
            category: category.toLowerCase(),
            amount,
            expenseDate: parsedDate,
            isRecurring: isRecurring || false,
            recurrenceFrequency: recurrenceFrequency || null,
            vendorName: vendorName || null,
            vendorContact: vendorContact || null,
            invoiceNumber: invoiceNumber || null,
            paymentMode: paymentMode || 'bank_transfer',
            paymentStatus: paymentStatus || 'paid',
            gstApplicable: gstApplicable || false,
            gstAmount: gstAmount || 0,
            remarks: remarks || null,
            recordedBy: req.user?._id
        });

        await expense.save();

        return res.status(201).json({
            success: true,
            message: 'Expense recorded successfully',
            data: expense
        });

    } catch (error) {
        console.error('Error in createAccountantExpense:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/accountant/expenses/:id
 * Update expense
 */
export const updateAccountantExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const expense = await Expense.findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: new Date() },
            { new: true }
        );

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Expense updated successfully',
            data: expense
        });

    } catch (error) {
        console.error('Error in updateAccountantExpense:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/accountant/expenses/:id
 * Delete expense
 */
export const deleteAccountantExpense = async (req, res) => {
    try {
        const { id } = req.params;

        const expense = await Expense.findByIdAndDelete(id);

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Expense deleted successfully'
        });

    } catch (error) {
        console.error('Error in deleteAccountantExpense:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/accountant/expenses/vendors
 * Get all vendors
 */
export const getAccountantVendors = async (req, res) => {
    try {
        const { school_id } = req.query;

        const vendors = await Expense.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(school_id), vendorName: { $ne: null } } },
            { $group: { 
                _id: '$vendorName',
                category: { $first: '$category' },
                contact: { $first: '$vendorContact' }
            }},
            { $project: { name: '$_id', category: 1, contact: 1, _id: 0 } }
        ]);

        return res.status(200).json({
            success: true,
            data: vendors
        });

    } catch (error) {
        console.error('Error in getAccountantVendors:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/accountant/expenses/recurring
 * Get recurring expenses
 */
export const getAccountantRecurringExpenses = async (req, res) => {
    try {
        const { school_id } = req.query;

        const recurringExpenses = await Expense.find({
            school: new mongoose.Types.ObjectId(school_id),
            isRecurring: true
        }).lean();

        return res.status(200).json({
            success: true,
            data: recurringExpenses
        });

    } catch (error) {
        console.error('Error in getAccountantRecurringExpenses:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/accountant/expenses/upload-invoice
 * Upload invoice for expense
 */
export const uploadAccountantInvoice = async (req, res) => {
    try {
        const { expenseId, invoiceUrl } = req.body;

        const expense = await Expense.findByIdAndUpdate(
            expenseId,
            { invoiceUrl },
            { new: true }
        );

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Invoice uploaded successfully',
            data: expense
        });

    } catch (error) {
        console.error('Error in uploadAccountantInvoice:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};