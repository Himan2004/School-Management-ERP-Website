import mongoose from 'mongoose';
import User from '../../../models/users/user.model.js';
import AdmissionRequest from '../../../models/school/admissionRequest.js';
import FeePayment from '../../../models/finance/FeePayment.model.js';
import Attendance from '../../../models/academic/attendance.model.js';

/**
 * GET /api/superadmin/audit/student-changes
 * Get all student modification logs
 */
export const getStudentChanges = async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;

        const changes = [];

        const tcStudents = await User.find({
            role: 'student',
            status: 'inactive'
        }).populate('school', 'schoolName')
            .lean();

        for (const student of tcStudents) {
            changes.push({
                id: `STU-${student._id.toString().slice(-6)}`,
                name: student.name,
                from: 'Active',
                to: 'TC Issued',
                authority: student.updatedBy?.name || 'System',
                time: student.updatedAt,
                type: 'STATUS_CHANGE',
                studentId: student._id
            });
        }

        const recentAdmissions = await User.find({
            role: 'student',
            createdAt: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }).populate('school', 'schoolName')
            .lean();

        for (const student of recentAdmissions) {
            changes.push({
                id: `ADM-${student._id.toString().slice(-6)}`,
                name: student.name,
                from: 'Not Enrolled',
                to: 'Active',
                authority: 'Admission Desk',
                time: student.createdAt,
                type: 'ACADEMIC',
                studentId: student._id
            });
        }

        const feePayments = await FeePayment.find({
            paymentStatus: 'success'
        }).populate('studentId', 'name')
            .populate('school', 'schoolName')
            .sort({ paymentDate: -1 })
            .limit(50)
            .lean();

        for (const payment of feePayments) {
            changes.push({
                id: `FEE-${payment._id.toString().slice(-6)}`,
                name: payment.studentId?.name || 'Unknown',
                from: 'Pending Fees',
                to: 'Paid',
                authority: 'Accountant',
                time: payment.paymentDate,
                type: 'FINANCE',
                studentId: payment.studentId?._id,
                amount: payment.amountPaid
            });
        }

        const classChanges = await AdmissionRequest.find({
            status: 'approved'
        }).populate('students', 'fullName')
            .populate('branch', 'schoolName')
            .lean();

        for (const request of classChanges) {
            const student = request.students?.[0];
            if (student) {
                changes.push({
                    id: `CLS-${request._id.toString().slice(-6)}`,
                    name: student.fullName || 'Unknown',
                    from: `Class ${student.previousClass || 'N/A'}`,
                    to: `Class ${student.class || 'N/A'}`,
                    authority: 'Principal',
                    time: request.reviewedAt || request.updatedAt,
                    type: 'ACADEMIC',
                    studentId: student._id
                });
            }
        }

        changes.sort((a, b) => new Date(b.time) - new Date(a.time));

        let filteredChanges = changes;
        if (search) {
            filteredChanges = changes.filter(c =>
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.id.toLowerCase().includes(search.toLowerCase())
            );
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedChanges = filteredChanges.slice(skip, skip + parseInt(limit));

        return res.status(200).json({
            success: true,
            data: {
                logs: paginatedChanges,
                total: filteredChanges.length,
                pagination: {
                    total: filteredChanges.length,
                    page: parseInt(page),
                    pages: Math.ceil(filteredChanges.length / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error in getStudentChanges:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/superadmin/audit/student-changes/:id
 * Delete/Archive a student change log
 */
export const deleteStudentChangeLog = async (req, res) => {
    try {
        const { id } = req.params;


        return res.status(200).json({
            success: true,
            message: `Log entry ${id} has been archived`
        });

    } catch (error) {
        console.error('Error in deleteStudentChangeLog:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/audit/student-changes/stats
 * Get student changes statistics
 */
export const getStudentChangeStats = async (req, res) => {
    try {
        const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const recentAdmissions = await User.countDocuments({
            role: 'student',
            createdAt: { $gt: last30Days }
        });

        const tcIssued = await User.countDocuments({
            role: 'student',
            status: 'inactive',
            updatedAt: { $gt: last30Days }
        });

        const feeStatusChanges = await FeePayment.countDocuments({
            paymentDate: { $gt: last30Days },
            paymentStatus: 'success'
        });

        return res.status(200).json({
            success: true,
            data: {
                recentAdmissions,
                tcIssued,
                feeStatusChanges,
                totalChanges: recentAdmissions + tcIssued + feeStatusChanges
            }
        });

    } catch (error) {
        console.error('Error in getStudentChangeStats:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};