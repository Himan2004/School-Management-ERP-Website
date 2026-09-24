import School from '../../../models/school/School.js';
import User from '../../../models/users/user.model.js';
import StaffAttendance from '../../../models/HRM/Staffattendance.model.js';
import StaffTransfer from '../../../models/HRM/StaffTransfer.model.js';
import Resignation from '../../../models/HRM/Resignation.model.js';
import mongoose from 'mongoose';

/**
 * GET /api/superadmin/reports/staff/branch-overview
 */
export const getBranchWiseStaffOverview = async (req, res) => {
  try {
    const orgId = req.user?.organization?._id || req.user?.organization || req.user?._id;
    if (!orgId) {
      return res.status(401).json({ success: false, message: "Organization ID missing" });
    }

    const schools = await School.find({ organization: orgId }).lean();
    const schoolIds = schools.map(s => s._id);

    const staffAgg = await User.aggregate([
      {
        $match: {
          school: { $in: schoolIds },
          role: { $nin: ['student', 'parent'] }
        }
      },
      {
        $group: {
          _id: '$school',
          totalStaff: { $sum: 1 },
          teachingStaff: { $sum: { $cond: [{ $eq: ['$role', 'teacher'] }, 1, 0] } },
          adminStaff: { $sum: { $cond: [{ $in: ['$role', ['admin', 'principal', 'accountant']] }, 1, 0] } },
          supportStaff: { $sum: { $cond: [{ $eq: ['$role', 'support_staff'] }, 1, 0] } },
        }
      }
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const attendanceAgg = await StaffAttendance.aggregate([
      {
        $match: {
          school: { $in: schoolIds },
          date: { $gte: today, $lt: tomorrow },
          status: 'present'
        }
      },
      {
        $group: {
          _id: '$school',
          presentCount: { $sum: 1 }
        }
      }
    ]);

    const data = schools.map(school => {
      const stats = staffAgg.find(s => s._id && s._id.toString() === school._id.toString()) || {
        totalStaff: 0,
        teachingStaff: 0,
        adminStaff: 0,
        supportStaff: 0
      };
      const att = attendanceAgg.find(a => a._id && a._id.toString() === school._id.toString()) || { presentCount: 0 };
      const attendanceRate = stats.totalStaff > 0 ? Math.round((att.presentCount / stats.totalStaff) * 100) : 0;

      return {
        branch: school.schoolName,
        totalStaff: stats.totalStaff,
        teachingStaff: stats.teachingStaff,
        adminStaff: stats.adminStaff,
        supportStaff: stats.supportStaff,
        presentToday: att.presentCount,
        attendanceRate
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/reports/staff/department-wise
 */
export const getDepartmentWiseStaff = async (req, res) => {
  try {
    const orgId = req.user?.organization?._id || req.user?.organization || req.user?._id;
    if (!orgId) {
      return res.status(401).json({ success: false, message: "Organization ID missing" });
    }

    const schools = await School.find({ organization: orgId }).lean();
    const schoolIds = schools.map(s => s._id);

    const deptAgg = await User.aggregate([
      {
        $match: {
          school: { $in: schoolIds },
          role: { $nin: ['student', 'parent'] }
        }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const data = deptAgg.map(item => ({
      department: item._id ? item._id.charAt(0).toUpperCase() + item._id.slice(1) : 'General',
      count: item.count
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/reports/staff/transfers-exits
 */
export const getStaffTransfersAndExits = async (req, res) => {
  try {
    const orgId = req.user?.organization?._id || req.user?.organization || req.user?._id;
    if (!orgId) {
      return res.status(401).json({ success: false, message: "Organization ID missing" });
    }

    const schools = await School.find({ organization: orgId }).lean();
    const schoolIds = schools.map(s => s._id);

    const totalTransfers = await StaffTransfer.countDocuments({ school: { $in: schoolIds } });
    const totalResignations = await Resignation.countDocuments({ school: { $in: schoolIds } });

    // Recent transfers
    const transfers = await StaffTransfer.find({ school: { $in: schoolIds } })
      .populate('staffId', 'name role')
      .populate('school', 'schoolName')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Recent exits
    const exits = await Resignation.find({ school: { $in: schoolIds } })
      .populate('staffId', 'name role')
      .populate('school', 'schoolName')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        totalTransfers,
        totalResignations,
        recentTransfers: transfers.map(t => ({
          name: t.staffId?.name || 'Unknown',
          role: t.staffId?.role || 'Unknown',
          branch: t.school?.schoolName || 'Unknown',
          status: t.status
        })),
        recentExits: exits.map(e => ({
          name: e.staffId?.name || 'Unknown',
          role: e.staffId?.role || 'Unknown',
          branch: e.school?.schoolName || 'Unknown',
          status: e.status
        }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/reports/staff/attendance-trend
 */
export const getStaffAttendanceTrend = async (req, res) => {
  try {
    const orgId = req.user?.organization?._id || req.user?.organization || req.user?._id;
    if (!orgId) {
      return res.status(401).json({ success: false, message: "Organization ID missing" });
    }

    const schools = await School.find({ organization: orgId }).lean();
    const schoolIds = schools.map(s => s._id);

    // Total staff count
    const totalStaff = await User.countDocuments({
      school: { $in: schoolIds },
      role: { $nin: ['student', 'parent'] }
    });

    const trend = [];
    // Calculate daily attendance rates for the last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const presentCount = await StaffAttendance.countDocuments({
        school: { $in: schoolIds },
        date: { $gte: date, $lt: nextDate },
        status: 'present'
      });

      const attendanceRate = totalStaff > 0 ? Math.round((presentCount / totalStaff) * 100) : 0;

      trend.push({
        date: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        present: presentCount,
        attendanceRate
      });
    }

    res.status(200).json({ success: true, data: trend });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
