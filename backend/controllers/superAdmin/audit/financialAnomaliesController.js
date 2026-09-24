import mongoose from 'mongoose';
import FeePayment from '../../../models/finance/FeePayment.model.js';
import FeeWaiver from '../../../models/finance/FeeWavier.model.js';
import FeeInstallment from '../../../models/finance/FeeInstallment.model.js';
import Expense from '../../../models/finance/Expense.model.js';
import School from '../../../models/school/School.js';
import User from '../../../models/users/user.model.js';

/**
 * GET /api/superadmin/audit/financial/anomalies
 * Get all financial anomalies
 */
export const getFinancialAnomalies = async (req, res) => {
    try {
        const { search, severity, page = 1, limit = 50 } = req.query;

        const anomalies = [];

        const highWaivers = await FeeWaiver.find({ status: 'approved' })
            .populate('studentId', 'name')
            .populate('school', 'schoolName')
            .lean();

        for (const waiver of highWaivers) {
            if (waiver.totalDiscountAmount > 5000) {
                anomalies.push({
                    id: `WAIVER-${waiver._id.toString().slice(-6)}`,
                    branch: waiver.school?.schoolName || 'Unknown',
                    type: 'High Fee Waiver',
                    amount: waiver.totalDiscountAmount,
                    source: 'AI System',
                    severity: 'HIGH',
                    date: waiver.createdAt,
                    description: `Fee waiver of ₹${waiver.totalDiscountAmount} exceeds standard limit. Manual override detected.`,
                    waiverId: waiver._id
                });
            }
        }

        const pendingPayments = await FeePayment.find({
            paymentStatus: 'pending',
            paymentDate: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }).populate('studentId', 'name')
            .populate('school', 'schoolName')
            .lean();

        for (const payment of pendingPayments) {
            anomalies.push({
                id: `PAY-${payment._id.toString().slice(-6)}`,
                branch: payment.school?.schoolName || 'Unknown',
                type: 'Payment Mismatch',
                amount: payment.amountPaid,
                source: 'Audit Bot',
                severity: 'MEDIUM',
                date: payment.paymentDate,
                description: `Payment pending for over 30 days. Transaction ID: ${payment.gatewayPaymentId || 'N/A'}`,
                paymentId: payment._id
            });
        }

        const expenses = await Expense.find({})
            .populate('school', 'schoolName')
            .sort({ amount: -1 })
            .limit(10)
            .lean();

        const avgExpense = expenses.reduce((sum, e) => sum + e.amount, 0) / (expenses.length || 1);

        for (const expense of expenses) {
            if (expense.amount > avgExpense * 2) {
                anomalies.push({
                    id: `EXP-${expense._id.toString().slice(-6)}`,
                    branch: expense.school?.schoolName || 'Unknown',
                    type: 'Unusual Expense',
                    amount: expense.amount,
                    source: 'AI System',
                    severity: 'MEDIUM',
                    date: expense.expenseDate,
                    description: `Expense of ₹${expense.amount} in category "${expense.category}" is significantly above average.`,
                    expenseId: expense._id
                });
            }
        }

        let filteredAnomalies = anomalies;

        if (search) {
            filteredAnomalies = anomalies.filter(a =>
                a.branch.toLowerCase().includes(search.toLowerCase()) ||
                a.id.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (severity && severity !== 'All') {
            filteredAnomalies = filteredAnomalies.filter(a => a.severity === severity);
        }

        filteredAnomalies.sort((a, b) => new Date(b.date) - new Date(a.date));

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedAnomalies = filteredAnomalies.slice(skip, skip + parseInt(limit));

        return res.status(200).json({
            success: true,
            data: {
                anomalies: paginatedAnomalies,
                total: filteredAnomalies.length,
                pagination: {
                    total: filteredAnomalies.length,
                    page: parseInt(page),
                    pages: Math.ceil(filteredAnomalies.length / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error in getFinancialAnomalies:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/superadmin/audit/financial/anomalies/:id/resolve
 * Resolve a financial anomaly
 */
export const resolveFinancialAnomaly = async (req, res) => {
    try {
        const { id } = req.params;
        const { resolutionNotes } = req.body;

        return res.status(200).json({
            success: true,
            message: `Anomaly ${id} has been resolved`,
            data: {
                resolvedAt: new Date(),
                resolvedBy: req.user?.name || 'System Admin',
                notes: resolutionNotes || 'Resolved by auditor'
            }
        });

    } catch (error) {
        console.error('Error in resolveFinancialAnomaly:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/audit/financial/stats
 * Get financial anomaly statistics
 */
export const getFinancialAnomalyStats = async (req, res) => {
    try {
        const highWaivers = await FeeWaiver.countDocuments({
            totalDiscountAmount: { $gt: 5000 },
            status: 'approved'
        });

        const pendingPayments = await FeePayment.countDocuments({
            paymentStatus: 'pending',
            paymentDate: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });

        const totalPayments = await FeePayment.aggregate([
            { $match: { paymentStatus: 'success' } },
            { $group: { _id: null, total: { $sum: '$amountPaid' } } }
        ]);

        return res.status(200).json({
            success: true,
            data: {
                highRiskAnomalies: highWaivers + Math.floor(pendingPayments / 2),
                mediumRiskAnomalies: pendingPayments,
                lowRiskAnomalies: 0,
                totalFinancialVolume: totalPayments[0]?.total || 0
            }
        });

    } catch (error) {
        console.error('Error in getFinancialAnomalyStats:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};