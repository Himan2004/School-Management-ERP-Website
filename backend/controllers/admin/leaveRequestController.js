import StaffLeave from "../../models/HRM/Staffleave.model.js";
import StudentLeave from "../../models/academic/StudentLeave.model.js";
import User from "../../models/users/user.model.js";
import StaffAttendance from "../../models/HRM/Staffattendance.model.js";
import Attendance from "../../models/academic/attendance.model.js";
import mongoose from "mongoose";
import StudentModel from "../../models/users/student.model.js";
import ClassModel from "../../models/organization/organizationClass.js";
import SectionModel from "../../models/school/Section.model.js";

/**
 * @desc    Get all staff leave requests with filters
 * @route   GET /api/admin/leave/staff
 */
export const getStaffLeaves = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { status, staffId, fromDate, toDate, page = 1, limit = 10 } = req.query;

        const query = { school: schoolId };
        if (status) query.status = status;
        if (staffId) query.staffId = staffId;
        if (fromDate && toDate) {
            query.fromDate = { $gte: new Date(fromDate), $lte: new Date(toDate) };
        }

        const leaves = await StaffLeave.find(query)
            .populate("staffId", "name email role")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await StaffLeave.countDocuments(query);

        res.status(200).json({
            success: true,
            count: leaves.length,
            total,
            pages: Math.ceil(total / limit),
            data: leaves
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get single staff leave details
 * @route   GET /api/admin/leave/staff/:id
 */
export const getStaffLeaveById = async (req, res) => {
    try {
        const leave = await StaffLeave.findById(req.params.id)
            .populate("staffId", "name email role")
            .populate("approvedBy", "name role");

        if (!leave) return res.status(404).json({ success: false, message: "Leave request not found" });

        res.status(200).json({ success: true, data: leave });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Approve or reject staff leave
 * @route   PUT /api/admin/leave/staff/:id/status
 */
export const updateStaffLeaveStatus = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { status, rejectionReason } = req.body;
        const leave = await StaffLeave.findById(req.params.id);
        if (!leave) throw new Error("Leave request not found");

        if (leave.status !== "pending") throw new Error(`Leave already ${leave.status}`);

        leave.status = status;
        leave.rejectionReason = rejectionReason;
        leave.approvedBy = req.user._id;
        leave.approvedAt = new Date();
        await leave.save({ session });

        // If approved, update staff profile status to 'on_leave' if leave is current
        if (status === "approved") {
            const today = new Date().setHours(0,0,0,0);
            if (new Date(leave.fromDate).setHours(0,0,0,0) <= today && new Date(leave.toDate).setHours(0,0,0,0) >= today) {
                await User.findByIdAndUpdate(leave.staffId, { status: "on_leave" }, { session });
            }
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ success: true, message: `Leave ${status} successfully`, data: leave });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Cancel an approved leave
 * @route   PUT /api/admin/leave/staff/:id/cancel
 */
export const cancelStaffLeave = async (req, res) => {
    try {
        const leave = await StaffLeave.findById(req.params.id);
        if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });

        if (leave.status !== "approved") return res.status(400).json({ success: false, message: "Only approved leaves can be cancelled" });

        leave.status = "cancelled";
        await leave.save();

        // Revert user status if needed
        const today = new Date().setHours(0,0,0,0);
        if (new Date(leave.fromDate).setHours(0,0,0,0) <= today && new Date(leave.toDate).setHours(0,0,0,0) >= today) {
            await User.findByIdAndUpdate(leave.staffId, { status: "active" });
        }

        res.status(200).json({ success: true, message: "Leave cancelled", data: leave });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get staff leave balance and history
 * @route   GET /api/admin/leave/staff/balance/:staffId
 */
export const getStaffLeaveSummary = async (req, res) => {
    try {
        const { staffId } = req.params;
        const history = await StaffLeave.find({ staffId }).sort({ createdAt: -1 });
        
        const stats = await StaffLeave.aggregate([
            { $match: { staffId: new mongoose.Types.ObjectId(staffId), status: "approved" } },
            { $group: { _id: "$leaveType", totalDays: { $sum: "$totalDays" } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                history,
                usedBalance: stats
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get all student leave requests
 * @route   GET /api/admin/leave/student
 */
export const getStudentLeaves = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { status, classId, section, startDate, endDate, academicYear } = req.query;

        const query = { school: schoolId };
        if (status) query.status = status;
        if (classId && classId !== "All Classes") query.class = classId;
        if (section && section !== "All Sections") query.section = section;

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0,0,0,0);
            const end = new Date(endDate);
            end.setHours(23,59,59,999);
            query.$or = [
                { fromDate: { $gte: start, $lte: end } },
                { toDate: { $gte: start, $lte: end } },
                { fromDate: { $lte: start }, toDate: { $gte: end } }
            ];
        }

        const leaves = await StudentLeave.find(query)
            .populate("student", "name email")
            .populate("class", "name")
            .sort({ createdAt: -1 })
            .lean();

        // Lookup Student Profiles to get rollNo, admissionNo, class, and section
        const studentUserIds = leaves.map(l => l.student?._id || l.student);
        const profileQuery = { user: { $in: studentUserIds } };
        if (academicYear && academicYear !== 'all') {
            profileQuery.academicYear = academicYear;
        }

        const studentProfiles = await StudentModel.find(profileQuery)
            .select("user rollNo admissionNo class section")
            .populate("class", "name")
            .populate("section", "name")
            .lean();

        const profileMap = {};
        studentProfiles.forEach(p => {
            if (p.user) {
                profileMap[p.user.toString()] = p;
            }
        });

        const enrichedLeaves = [];
        leaves.forEach(l => {
            const userIdStr = l.student?._id ? l.student._id.toString() : l.student?.toString();
            const profile = profileMap[userIdStr];

            if (academicYear && academicYear !== 'all' && !profile) {
                return;
            }

            // Enrich student object with rollNo, admissionNo, and current admission record's class and section
            const studentData = l.student && typeof l.student === 'object' ? { ...l.student } : { _id: l.student };
            studentData.rollNo = profile?.rollNo || '-';
            studentData.rollNumber = profile?.rollNo || '-'; // for compatibility
            studentData.admissionNo = profile?.admissionNo || '-';
            studentData.className = profile?.class?.name || '-';
            studentData.sectionName = profile?.section?.name || '-';

            enrichedLeaves.push({
                ...l,
                student: studentData
            });
        });

        res.status(200).json({ success: true, count: enrichedLeaves.length, data: enrichedLeaves });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Approve/Reject student leave
 * @route   PUT /api/admin/leave/student/:id/status
 */
export const updateStudentLeaveStatus = async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        const leave = await StudentLeave.findById(req.params.id);
        if (!leave) return res.status(404).json({ success: false, message: "Leave request not found" });

        leave.status = status;
        leave.rejectionReason = rejectionReason;
        leave.approvedBy = req.user._id;
        leave.approvedAt = new Date();
        await leave.save();

        res.status(200).json({ success: true, message: `Student leave ${status}`, data: leave });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get leave dashboard stats
 * @route   GET /api/admin/leave/stats
 */
export const getLeaveStats = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;

        const staffStats = await StaffLeave.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const studentStats = await StudentLeave.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            success: true,
            data: { staffStats, studentStats }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Bulk approve/reject leaves
 * @route   POST /api/admin/leave/bulk-action
 */
export const bulkLeaveAction = async (req, res) => {
    try {
        const { ids, type, status } = req.body; // type: 'staff' or 'student'
        const Model = type === 'staff' ? StaffLeave : StudentLeave;

        const result = await Model.updateMany(
            { _id: { $in: ids }, status: 'pending' },
            { 
                status, 
                approvedBy: req.user._id, 
                approvedAt: new Date() 
            }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} requests processed successfully`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Export leave data
 * @route   GET /api/admin/leave/export
 */
export const exportLeaveData = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { type } = req.query; // 'staff' or 'student'

        let data;
        if (type === 'staff') {
            data = await StaffLeave.find({ school: schoolId }).populate("staffId", "name role");
        } else {
            data = await StudentLeave.find({ school: schoolId }).populate("student", "name rollNumber");
        }

        // For now returning JSON, frontend can handle CSV generation
        // Or we could use a library like json2csv
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
