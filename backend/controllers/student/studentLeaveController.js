import StudentLeave from "../../models/academic/StudentLeave.model.js";
import Student from "../../models/users/student.model.js";

const getStudentProfile = async (userId) => Student.findOne({ user: userId });

const getSchoolAndOrganization = (user) => {
    const schoolId = user?.school?._id || user?.school;
    const organizationId = user?.school?.organization || null;
    return { schoolId, organizationId };
};

export const getLeaveHistory = async (req, res) => {
    try {
        const studentUserId = req.user._id;
        const studentProfile = await getStudentProfile(studentUserId);

        if (!studentProfile) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const leaves = await StudentLeave.find({ student: studentUserId })
            .populate("approvedBy", "name")
            .sort({ createdAt: -1 });

        const pendingLeaves = leaves.filter((leave) => leave.status === "pending").length;
        const approvedLeaves = leaves.filter((leave) => leave.status === "approved").length;
        const rejectedLeaves = leaves.filter((leave) => leave.status === "rejected").length;

        return res.status(200).json({
            success: true,
            data: {
                leaves: leaves.map((leave) => ({
                    id: leave._id,
                    leaveType: leave.leaveType,
                    fromDate: leave.fromDate,
                    toDate: leave.toDate,
                    totalDays: leave.totalDays,
                    reason: leave.reason,
                    status: leave.status,
                    supportingDocument: leave.supportingDocument || null,
                    rejectionReason: leave.rejectionReason || "",
                    approvedBy: leave.approvedBy || null,
                    approvedAt: leave.approvedAt,
                    createdAt: leave.createdAt,
                })),
                totalLeaves: leaves.length,
                pendingLeaves,
                approvedLeaves,
                rejectedLeaves,
            },
            message: "Leave history fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const submitLeaveApplication = async (req, res) => {
    try {
        const studentUserId = req.user._id;
        const studentProfile = await getStudentProfile(studentUserId);

        if (!studentProfile) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const fromDateVal = req.body.fromDate || req.body.startDate;
        const toDateVal = req.body.toDate || req.body.endDate;
        const { leaveType, reason } = req.body;
        
        if (!leaveType || !fromDateVal || !toDateVal || !reason) {
            return res.status(400).json({ success: false, data: null, message: "leaveType, fromDate/startDate, toDate/endDate and reason are required" });
        }

        const startDate = new Date(fromDateVal);
        const endDate = new Date(toDateVal);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            return res.status(400).json({ success: false, data: null, message: "Invalid fromDate or toDate" });
        }

        if (startDate > endDate) {
            return res.status(400).json({ success: false, data: null, message: "fromDate cannot be after toDate" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        if (startDate < today) {
            return res.status(400).json({ success: false, data: null, message: "Cannot apply leave for past dates" });
        }

        const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        const duplicateLeave = await StudentLeave.findOne({
            student: studentUserId,
            status: { $in: ["pending", "approved"] },
            $or: [
                { fromDate: { $lte: endDate }, toDate: { $gte: startDate } },
            ],
        });

        if (duplicateLeave) {
            return res.status(400).json({
                success: false,
                data: null,
                message: "You already have a leave application for this period",
            });
        }

        const { schoolId, organizationId } = getSchoolAndOrganization(req.user);
        if (!schoolId || !organizationId) {
            return res.status(400).json({ success: false, data: null, message: "School/organization details not found" });
        }

        if (!studentProfile.class || !studentProfile.section) {
            return res.status(400).json({ success: false, data: null, message: "Student class/section not found" });
        }

        let normalizedLeaveType = leaveType.toLowerCase();
        if (normalizedLeaveType.includes("sick")) normalizedLeaveType = "sick";
        else if (normalizedLeaveType.includes("casual")) normalizedLeaveType = "casual";
        else if (normalizedLeaveType.includes("emergency")) normalizedLeaveType = "emergency";
        else normalizedLeaveType = "other";

        const leave = await StudentLeave.create({
            organization: organizationId,
            school: schoolId,
            student: studentUserId,
            class: studentProfile.class,
            section: studentProfile.section ? studentProfile.section.toString() : "",
            leaveType: normalizedLeaveType,
            fromDate: startDate,
            toDate: endDate,
            totalDays,
            reason,
            supportingDocument: req.file?.path || null,
            appliedBy: studentUserId,
            status: "pending",
        });

        return res.status(201).json({
            success: true,
            data: { leave },
            message: "Leave application submitted successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const cancelLeave = async (req, res) => {
    try {
        const leave = await StudentLeave.findOne({
            _id: req.params.id,
            student: req.user._id,
        });

        if (!leave) {
            return res.status(404).json({ success: false, data: null, message: "Leave not found" });
        }

        if (leave.status === "approved" || leave.status === "rejected") {
            return res.status(400).json({
                success: false,
                data: null,
                message: "Cannot cancel an already approved/rejected leave",
            });
        }

        if (leave.status === "cancelled") {
            return res.status(400).json({ success: false, data: null, message: "Leave already cancelled" });
        }

        leave.status = "cancelled";
        await leave.save();

        return res.status(200).json({
            success: true,
            data: { leave },
            message: "Leave application cancelled successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getLeaveStats = async (req, res) => {
    try {
        const studentUserId = req.user._id;
        const studentProfile = await getStudentProfile(studentUserId);

        if (!studentProfile) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const baseFilter = { student: studentUserId };
        const startOfYear = new Date(new Date().getFullYear(), 0, 1);
        const endOfYear = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

        const [
            totalLeaves,
            pendingLeaves,
            approvedLeaves,
            rejectedLeaves,
            cancelledLeaves,
            sickLeaves,
            casualLeaves,
            emergencyLeaves,
            otherLeaves,
            approvedDaysResult,
            currentYearLeaves,
        ] = await Promise.all([
            StudentLeave.countDocuments(baseFilter),
            StudentLeave.countDocuments({ ...baseFilter, status: "pending" }),
            StudentLeave.countDocuments({ ...baseFilter, status: "approved" }),
            StudentLeave.countDocuments({ ...baseFilter, status: "rejected" }),
            StudentLeave.countDocuments({ ...baseFilter, status: "cancelled" }),
            StudentLeave.countDocuments({ ...baseFilter, leaveType: "sick" }),
            StudentLeave.countDocuments({ ...baseFilter, leaveType: "casual" }),
            StudentLeave.countDocuments({ ...baseFilter, leaveType: "emergency" }),
            StudentLeave.countDocuments({ ...baseFilter, leaveType: "other" }),
            StudentLeave.aggregate([
                { $match: { ...baseFilter, status: "approved" } },
                { $group: { _id: null, totalApprovedDays: { $sum: "$totalDays" } } },
            ]),
            StudentLeave.countDocuments({
                ...baseFilter,
                createdAt: { $gte: startOfYear, $lte: endOfYear },
            }),
        ]);

        const totalApprovedDays = approvedDaysResult[0]?.totalApprovedDays || 0;

        return res.status(200).json({
            success: true,
            data: {
                totalLeaves,
                pendingLeaves,
                approvedLeaves,
                rejectedLeaves,
                cancelledLeaves,
                sickLeaves,
                casualLeaves,
                emergencyLeaves,
                otherLeaves,
                totalApprovedDays,
                currentYearLeaves,
            },
            message: "Leave stats fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getLeaveById = async (req, res) => {
    try {
        const leave = await StudentLeave.findOne({
            _id: req.params.id,
            student: req.user._id,
        }).populate("approvedBy", "name role");

        if (!leave) {
            return res.status(404).json({ success: false, data: null, message: "Leave not found" });
        }

        return res.status(200).json({
            success: true,
            data: { leave },
            message: "Leave fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};
