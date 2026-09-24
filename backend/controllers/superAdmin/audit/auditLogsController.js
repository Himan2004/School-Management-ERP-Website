import mongoose from 'mongoose';
import School from '../../../models/school/School.js';
import User from '../../../models/users/user.model.js';
import Period from '../../../models/modules/Period.js';
import FeeInstallment from '../../../models/finance/FeeInstallment.model.js';
import AuditLog from '../../../models/common/AuditLog.js';

/**
 * GET /api/superadmin/audit/branches
 * Get all user login audit logs
 */
export const getAuditBranches = async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;

        // Fetch logs with action 'login'
        const query = { action: 'login', 'details.role': { $in: ['teacher', 'principal'] } };

        if (req.role === 'superadmin' && req.user) {
            const organizationSchools = await School.find({ organization: req.user._id }).select('_id').lean();
            const schoolIds = organizationSchools.map(s => s._id);
            query.school = { $in: schoolIds };
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const logs = await AuditLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('school', 'schoolName branchId')
            .populate('user', 'name role')
            .lean();

        let auditData = logs.map(log => ({
            id: log._id.toString().slice(-6).toUpperCase(),
            schoolName: log.school?.schoolName || 'Unknown School',
            userName: log.user?.name || 'Unknown User',
            role: log.user?.role || 'Unknown',
            timestamp: log.timestamp,
        }));

        if (search) {
            const lowerSearch = search.toLowerCase();
            auditData = auditData.filter(item => 
                item.schoolName.toLowerCase().includes(lowerSearch) || 
                item.userName.toLowerCase().includes(lowerSearch) ||
                item.role.toLowerCase().includes(lowerSearch)
            );
        }

        const total = await AuditLog.countDocuments(query);

        return res.status(200).json({
            success: true,
            data: {
                branches: auditData,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error in getAuditBranches:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/audit/branches/:id
 * Get detailed audit information for a specific branch
 */
export const getBranchAuditDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const school = await School.findById(id).lean();

        if (!school) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        if (req.role === 'superadmin' && req.user && String(school.organization) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to this branch' });
        }

        const principal = await User.findOne({
            school: school._id,
            role: 'principal'
        }).select('name email phone');

        const periods = await Period.find({
            schoolId: school._id,
            status: 'active'
        }).select('gradeLevel section periodName maxCapacity currentStrength');

        let totalStudents = 0;
        let totalCapacity = 0;

        for (const period of periods) {
            const studentCount = await User.countDocuments({
                school: school._id,
                periodId: period._id,
                role: 'student'
            });
            totalStudents += studentCount;
            totalCapacity += period.maxCapacity || 40;
        }

        const teachers = await User.countDocuments({ school: school._id, role: 'teacher' });
        const admin = await User.countDocuments({ school: school._id, role: 'admin' });
        const support = await User.countDocuments({ school: school._id, role: 'support_staff' });
        const accountants = await User.countDocuments({ school: school._id, role: 'accountant' });

        let enrollmentDisplay = `${totalStudents} Enrollment`;
        if (totalStudents >= 1000) enrollmentDisplay = `${(totalStudents / 1000).toFixed(1)}k Enrollment`;

        const daysAgo = Math.floor((new Date() - new Date(school.createdAt || new Date())) / (1000 * 60 * 60 * 24));
        let timeline = `${daysAgo}d ago`;
        if (daysAgo > 30) timeline = `${Math.floor(daysAgo / 30)}mo ago`;

        const feeInstallments = await FeeInstallment.aggregate([
            { $match: { school: school._id } },
            { $group: { _id: null, totalPaid: { $sum: '$totalPaid' }, totalDue: { $sum: '$totalDue' } } }
        ]);

        const collectionRatio = feeInstallments[0]?.totalPaid / (feeInstallments[0]?.totalPaid + feeInstallments[0]?.totalDue) || 0;
        const rating = (4 + collectionRatio).toFixed(1);

        return res.status(200).json({
            success: true,
            data: {
                id: school._id.toString().slice(-6).toUpperCase(),
                schoolId: school._id.toString(),
                branch: school.schoolName || 'Unnamed Branch',
                principal: school.principalName || principal?.name || 'Not Assigned',
                enrollment: enrollmentDisplay,
                timeline,
                status: school.isActive ? 'ACTIVE' : 'INACTIVE',
                location: school.address || 'Unknown',
                board: school.board || 'CBSE',
                teachers: teachers.toString(),
                rating: `${rating}/5`,
                totalStudents,
                totalStaff: (teachers + admin + support + accountants),
                staffBreakdown: {
                    teachers,
                    admin,
                    support,
                    accountants
                },
                principalDetails: {
                    name: principal?.name,
                    email: principal?.email,
                    phone: principal?.phone
                },
                capacity: {
                    total: totalCapacity,
                    filled: totalStudents,
                    available: Math.max(0, totalCapacity - totalStudents)
                }
            }
        });

    } catch (error) {
        console.error('Error in getBranchAuditDetails:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/superadmin/audit/branches/:id
 * Deactivate/Archive a branch
 */
export const deactivateBranch = async (req, res) => {
    try {
        const { id } = req.params;

        const school = await School.findById(id);

        if (!school) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        if (req.role === 'superadmin' && req.user && String(school.organization) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to this branch' });
        }

        school.isActive = false;
        await school.save();

        return res.status(200).json({
            success: true,
            message: `Branch ${school.schoolName || school._id} has been deactivated`
        });

    } catch (error) {
        console.error('Error in deactivateBranch:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/audit/branches/stats
 * Get audit statistics
 */
export const getAuditStats = async (req, res) => {
    try {
        let schoolQuery = {};
        if (req.role === 'superadmin' && req.user) {
            schoolQuery.organization = req.user._id;
        }

        const totalBranches = await School.countDocuments(schoolQuery);
        const activeBranches = await School.countDocuments({ ...schoolQuery, status: 'active' });
        const inactiveBranches = await School.countDocuments({ ...schoolQuery, status: 'inactive' });

        const organizationSchools = await School.find(schoolQuery).select('_id').lean();
        const schoolIds = organizationSchools.map(s => s._id);

        const totalStudents = await User.countDocuments({ role: 'student', school: { $in: schoolIds } });
        const totalStaff = await User.countDocuments({
            role: { $in: ['teacher', 'admin', 'accountant', 'support_staff', 'principal'] },
            school: { $in: schoolIds }
        });

        return res.status(200).json({
            success: true,
            data: {
                totalBranches,
                activeBranches,
                inactiveBranches,
                totalStudents,
                totalStaff
            }
        });

    } catch (error) {
        console.error('Error in getAuditStats:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};