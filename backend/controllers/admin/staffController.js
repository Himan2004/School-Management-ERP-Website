import User from "../../models/users/user.model.js";
import Teacher from "../../models/users/teacher.model.js";
import AccountantProfile from "../../models/users/accountant.model.js";
import StaffProfile from "../../models/users/staffProfile.model.js";
import StaffLeave from "../../models/HRM/Staffleave.model.js";
import StaffAttendance from "../../models/HRM/Staffattendance.model.js";
import Promotion from "../../models/HRM/Promotion.model.js";
import StaffTransfer from "../../models/HRM/StaffTransfer.model.js";
import School from "../../models/school/School.js";
import { generateStaffCredentials, generateTeacherCredentials, generateAccountantCredentials } from "../../utils/generateCredentials.js";
import { sendTeacherCredentialsEmail, sendAccountantCredentialsEmail, sendStaffCredentialsEmail } from "../../services/emailService.js";
import mongoose from "mongoose";

// Helper to get profile model by role
const getProfileModel = (role) => {
    switch (role) {
        case "teacher": return Teacher;
        case "accountant": return AccountantProfile;
        default: return StaffProfile;
    }
};

/**
 * @desc    Create a new staff member
 * @route   POST /api/admin/staff
 * @access  Private (Admin)
 */
export const createStaff = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { name, email, phone, role, department, designation, ...profileData } = req.body;
        const schoolId = req.user.school._id || req.user.school;

        const school = await School.findById(schoolId);
        if (!school) throw new Error("School not found");

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: "Email already in use" });

        // Generate credentials based on role
        let credentials;
        if (role === "teacher") {
            credentials = await generateTeacherCredentials(school.schoolName);
        } else if (role === "accountant") {
            credentials = await generateAccountantCredentials(name);
        } else {
            credentials = await generateStaffCredentials(name, role);
        }

        const { loginId, plainPassword } = credentials;

        // Create User
        const user = await User.create([{
            name,
            email,
            loginId,
            password: plainPassword,
            role,
            school: schoolId,
            status: "active"
        }], { session });

        // Create Profile
        const ProfileModel = getProfileModel(role);
        const profile = await ProfileModel.create([{
            user: user[0]._id,
            school: schoolId,
            phone,
            department,
            designation,
            staffId: loginId,
            ...profileData
        }], { session });

        // Link profile to user
        user[0].profileId = profile[0]._id;
        user[0].profileModel = role === "teacher" ? "Teacher" : (role === "accountant" ? "Accountant" : "StaffProfile");
        await user[0].save({ session });

        // Send Email (Async)
        // Note: For now we'll use existing services, might need expansion
        if (role === "teacher") {
            sendTeacherCredentialsEmail(user[0], loginId, plainPassword, school.schoolName).catch(console.error);
        } else if (role === "accountant") {
            sendAccountantCredentialsEmail({ name, email }, loginId, plainPassword, school.schoolName).catch(console.error);
        } else {
            sendStaffCredentialsEmail({ name, email }, loginId, plainPassword, school.schoolName, role).catch(console.error);
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "Staff member created successfully",
            data: { user: user[0], profile: profile[0], credentials: { loginId, plainPassword } }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get all staff with filters
 * @route   GET /api/admin/staff
 * @access  Private (Admin)
 */
export const getAllStaff = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { department, designation, status, role, search } = req.query;

        const query = { school: schoolId, role: { $in: ["teacher", "accountant", "support_staff"] } };
        if (role) query.role = role;
        if (status) query.status = status;
        if (search) query.name = { $regex: search, $options: "i" };

        const users = await User.find(query).populate("profileId");

        // Dynamically populate assignedClasses and subjects only for Teacher profiles to avoid strictPopulate schema errors
        const teacherProfiles = users
            .filter(u => u.role === "teacher" && u.profileId && u.profileModel === "Teacher")
            .map(u => u.profileId);

        if (teacherProfiles.length > 0) {
            await Teacher.populate(teacherProfiles, [
                { path: "assignedClasses", select: "name description" },
                { path: "subjects", select: "subjectName subjectCode name" }
            ]);
        }

        // Further filter by profile fields if needed
        let filteredStaff = users;
        if (department || designation) {
            filteredStaff = users.filter(u => {
                const p = u.profileId;
                if (!p) return false;
                const deptMatch = department ? p.department === department : true;
                const desigMatch = designation ? p.designation === designation : true;
                return deptMatch && desigMatch;
            });
        }

        res.status(200).json({
            success: true,
            count: filteredStaff.length,
            data: filteredStaff
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get staff by ID
 * @route   GET /api/admin/staff/:id
 * @access  Private (Admin)
 */
export const getStaffById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate("profileId");
        if (!user) return res.status(404).json({ success: false, message: "Staff not found" });

        res.status(200).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update staff profile
 * @route   PUT /api/admin/staff/:id
 * @access  Private (Admin)
 */
export const updateStaffProfile = async (req, res) => {
    try {
        const { name, email, ...profileUpdates } = req.body;
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: "Staff not found" });

        if (name) user.name = name;
        if (email) user.email = email;
        await user.save();

        const ProfileModel = getProfileModel(user.role);
        const updatedProfile = await ProfileModel.findOneAndUpdate(
            { user: user._id },
            profileUpdates,
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: "Staff profile updated",
            data: { user, profile: updatedProfile }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update staff status
 * @route   PATCH /api/admin/staff/:id/status
 * @access  Private (Admin)
 */
export const updateStaffStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findByIdAndUpdate(req.params.id, { status: (status === 'active' ? 'active' : 'inactive') }, { new: true });
        if (!user) return res.status(404).json({ success: false, message: "Staff not found" });

        const ProfileModel = getProfileModel(user.role);
        await ProfileModel.findOneAndUpdate({ user: user._id }, { status });

        res.status(200).json({
            success: true,
            message: `Staff status updated to ${status}`,
            data: user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Delete/Archive staff (Soft Delete)
 * @route   DELETE /api/admin/staff/:id
 * @access  Private (Admin)
 */
export const deleteStaff = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { status: "inactive" }, { new: true });
        if (!user) return res.status(404).json({ success: false, message: "Staff not found" });

        const ProfileModel = getProfileModel(user.role);
        await ProfileModel.findOneAndUpdate({ user: user._id }, { status: "inactive" });

        res.status(200).json({
            success: true,
            message: "Staff member archived successfully"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Bulk staff import
 * @route   POST /api/admin/staff/bulk-import
 * @access  Private (Admin)
 */
export const bulkImportStaff = async (req, res) => {
    try {
        const { staffData } = req.body;
        const schoolId = req.user.school._id || req.user.school;
        const school = await School.findById(schoolId);

        const results = { success: 0, failed: 0, errors: [] };

        for (const item of staffData) {
            try {
                // Simplified creation for bulk (can reuse createStaff logic)
                const { name, email, role, department, designation } = item;
                
                const credentials = await generateStaffCredentials(name, role);
                const { loginId, plainPassword } = credentials;

                const user = await User.create({
                    name, email, loginId, password: plainPassword, role, school: schoolId
                });

                const ProfileModel = getProfileModel(role);
                const profile = await ProfileModel.create({
                    user: user._id,
                    school: schoolId,
                    department,
                    designation,
                    staffId: loginId,
                    phone: item.phone || "0000000000"
                });

                user.profileId = profile._id;
                user.profileModel = role === "teacher" ? "Teacher" : (role === "accountant" ? "Accountant" : "StaffProfile");
                await user.save();

                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push({ email: item.email, error: err.message });
            }
        }

        res.status(200).json({
            success: true,
            message: `Bulk import completed: ${results.success} success, ${results.failed} failed`,
            data: results
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get staff statistics
 * @route   GET /api/admin/staff/stats
 * @access  Private (Admin)
 */
export const getStaffStats = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;

        const stats = await User.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId), role: { $in: ["teacher", "accountant", "support_staff"] } } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const roleStats = await User.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId), role: { $in: ["teacher", "accountant", "support_staff"] } } },
            { $group: { _id: "$role", count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            success: true,
            data: { statusStats: stats, roleStats }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Mark staff attendance
 * @route   POST /api/admin/staff/attendance
 * @access  Private (Admin)
 */
export const markStaffAttendance = async (req, res) => {
    try {
        const { staffId, date, clockIn, clockOut, status, remarks } = req.body;
        const schoolId = req.user.school._id || req.user.school;

        const staffMember = await User.findById(staffId);
        if (!staffMember) return res.status(404).json({ success: false, message: "Staff not found" });

        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        const updateData = {
            organization: staffMember.school.organization || req.user.school.organization,
            school: schoolId,
            staffId,
            staffRole: staffMember.role,
            date: attendanceDate,
            status,
            remarks,
            markedBy: req.user._id
        };

        if (clockIn !== undefined) updateData.clockIn = clockIn;
        if (clockOut !== undefined) updateData.clockOut = clockOut;

        const attendance = await StaffAttendance.findOneAndUpdate(
            { staffId, date: attendanceDate },
            updateData,
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            message: "Attendance marked successfully",
            data: attendance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get staff attendance report
 * @route   GET /api/admin/staff/attendance/report
 * @access  Private (Admin)
 */
export const getStaffAttendanceReport = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { staffId, month, year } = req.query;

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const query = { 
            school: schoolId,
            date: { $gte: startDate, $lte: endDate }
        };
        if (staffId) query.staffId = staffId;

        const attendance = await StaffAttendance.find(query).populate("staffId", "name role");

        res.status(200).json({
            success: true,
            data: attendance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Request leave (Staff)
 * @route   POST /api/admin/staff/leave/request
 * @access  Private (Staff/Admin)
 */
export const requestLeave = async (req, res) => {
    try {
        const { leaveType, fromDate, toDate, reason, totalDays, supportingDocument } = req.body;
        const staffId = req.user._id;
        const schoolId = req.user.school._id || req.user.school;

        const leaveRequest = await StaffLeave.create({
            organization: req.user.school.organization,
            school: schoolId,
            staffId,
            staffRole: req.user.role,
            leaveType,
            fromDate,
            toDate,
            totalDays,
            reason,
            supportingDocument,
            approvalLevel: "branch_admin", // Default for admin approval
            status: "pending"
        });

        res.status(201).json({
            success: true,
            message: "Leave request submitted",
            data: leaveRequest
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Process leave request (Approve/Reject)
 * @route   PATCH /api/admin/staff/leave/:id/process
 * @access  Private (Admin)
 */
export const processLeaveRequest = async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;
        const leave = await StaffLeave.findById(req.params.id);
        if (!leave) return res.status(404).json({ success: false, message: "Leave request not found" });

        leave.status = status;
        leave.rejectionReason = rejectionReason;
        leave.approvedBy = req.user._id;
        leave.approvedAt = new Date();

        await leave.save();

        // If approved, update attendance for those days
        if (status === "approved") {
            const startDate = new Date(leave.fromDate);
            startDate.setHours(0,0,0,0);
            const endDate = new Date(leave.toDate);
            endDate.setHours(0,0,0,0);
            
            const days = [];
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                days.push(new Date(d));
            }

            for (const d of days) {
                await StaffAttendance.findOneAndUpdate(
                    {
                        staffId: leave.staffId,
                        school: leave.school,
                        date: d
                    },
                    {
                        $set: {
                            organization: leave.organization,
                            staffRole: leave.staffRole,
                            status: "on_leave",
                            leaveRef: leave._id,
                            remarks: `Approved Leave: ${leave.leaveType}`,
                            markedBy: req.user._id
                        }
                    },
                    { upsert: true, new: true }
                );
            }
        }

        res.status(200).json({
            success: true,
            message: `Leave request ${status}`,
            data: leave
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get pending leave requests
 * @route   GET /api/admin/staff/leaves/pending
 * @access  Private (Admin)
 */
export const getPendingLeaves = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const pending = await StaffLeave.find({ school: schoolId, status: "pending" })
            .populate("staffId", "name role");

        res.status(200).json({
            success: true,
            data: pending
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get leave balance
 * @route   GET /api/admin/staff/leaves/balance/:staffId
 * @access  Private (Admin)
 */
export const getLeaveBalance = async (req, res) => {
    try {
        const { staffId } = req.params;
        const leaves = await StaffLeave.find({ staffId, status: "approved" });
        
        // This would typically involve a config for total allowed leaves
        // For now, returning used leaves
        const summary = leaves.reduce((acc, curr) => {
            acc[curr.leaveType] = (acc[curr.leaveType] || 0) + curr.totalDays;
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: { usedLeaves: summary }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Create transfer request
 * @route   POST /api/admin/staff/transfer
 * @access  Private (Admin)
 */
export const requestTransfer = async (req, res) => {
    try {
        const { staffId, targetSchoolId, targetDepartment, reason, effectiveDate } = req.body;
        const staffMember = await User.findById(staffId).populate("profileId");
        if (!staffMember) return res.status(404).json({ success: false, message: "Staff not found" });

        const transfer = await StaffTransfer.create({
            organization: req.user.school.organization,
            fromSchool: req.user.school._id || req.user.school,
            toSchool: targetSchoolId,
            staffId,
            staffRole: staffMember.role,
            fromDepartment: staffMember.profileId?.department,
            toDepartment: targetDepartment,
            reason,
            effectiveDate,
            status: "pending",
            initiatedBy: req.user._id,
            initiatedByRole: req.role
        });

        res.status(201).json({
            success: true,
            message: "Transfer request initiated",
            data: transfer
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Approve/Reject transfer
 * @route   PATCH /api/admin/staff/transfer/:id/process
 * @access  Private (Admin)
 */
export const processTransfer = async (req, res) => {
    try {
        const { status, remarks } = req.body;
        const transfer = await StaffTransfer.findById(req.params.id);
        if (!transfer) return res.status(404).json({ success: false, message: "Transfer request not found" });

        transfer.status = status;
        transfer.approvalRemarks = remarks;
        transfer.approvedBy = req.user._id;
        transfer.approvedAt = new Date();

        await transfer.save();

        if (status === "approved") {
            // Update User school
            await User.findByIdAndUpdate(transfer.staffId, { school: transfer.toSchool });
            // Update Profile school and department
            const ProfileModel = getProfileModel(transfer.staffRole);
            await ProfileModel.findOneAndUpdate({ user: transfer.staffId }, { 
                school: transfer.toSchool,
                department: transfer.toDepartment 
            });
        }

        res.status(200).json({
            success: true,
            message: `Transfer request ${status}`,
            data: transfer
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Promote staff member
 * @route   POST /api/admin/staff/promote
 * @access  Private (Admin)
 */
export const promoteStaff = async (req, res) => {
    try {
        const { staffId, actionType, newRole, newDesignation, revisedSalary, effectiveDate, reason } = req.body;
        const staffMember = await User.findById(staffId).populate("profileId");
        if (!staffMember) return res.status(404).json({ success: false, message: "Staff not found" });
        if (staffMember.status !== "active") {
            return res.status(400).json({ success: false, message: "Only active staff members can be promoted or demoted." });
        }

        const promotion = await Promotion.create({
            organization: req.user.school.organization,
            school: req.user.school._id || req.user.school,
            staffId,
            actionType,
            previousRole: staffMember.role,
            newRole: newRole || staffMember.role,
            previousDesignation: staffMember.profileId?.designation,
            newDesignation,
            previousSalary: staffMember.profileId?.salary,
            revisedSalary,
            effectiveDate,
            reason,
            status: "approved", // Admins can auto-approve
            initiatedBy: req.user._id,
            initiatedByRole: req.user.role || "admin",
            approvedBy: req.user._id,
            approvedAt: new Date()
        });

        // Apply changes to Profile
        const ProfileModel = getProfileModel(staffMember.role);
        await ProfileModel.findOneAndUpdate({ user: staffId }, {
            designation: newDesignation,
            salary: revisedSalary,
            promotionStatus: actionType === 'promotion' ? 'Promoted' : 'Demoted',
            lastPromotionDate: effectiveDate
        });

        // Update User role if changed
        if (newRole && newRole !== staffMember.role) {
            staffMember.role = newRole;
            await staffMember.save();
        }

        res.status(200).json({
            success: true,
            message: `Staff member ${actionType}d successfully`,
            data: promotion
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get staff management history
 * @route   GET /api/admin/staff/history/:staffId
 * @access  Private (Admin)
 */
export const getStaffHistory = async (req, res) => {
    try {
        const { staffId } = req.params;
        const promotions = await Promotion.find({ staffId }).sort({ effectiveDate: -1 });
        const transfers = await StaffTransfer.find({ staffId }).sort({ effectiveDate: -1 });

        res.status(200).json({
            success: true,
            data: { promotions, transfers }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get all promotions for the school
 * @route   GET /api/admin/staff/promotions/all
 * @access  Private (Admin)
 */
export const getAllPromotions = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const promotions = await Promotion.find({ school: schoolId })
            .populate("staffId", "name role loginId email")
            .sort({ effectiveDate: -1 });

        const schoolDoc = await School.findById(schoolId).select("createdAt");
        const schoolCreatedYear = schoolDoc?.createdAt ? new Date(schoolDoc.createdAt).getFullYear() : 2026;

        res.status(200).json({
            success: true,
            schoolCreatedYear,
            data: promotions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
