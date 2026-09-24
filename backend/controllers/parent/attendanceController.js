import mongoose from "mongoose";
import Parent from "../../models/users/parent.model.js";
import Student from "../../models/users/student.model.js";
import Attendance from "../../models/academic/attendance.model.js";
import StudentLeave from "../../models/academic/StudentLeave.model.js";

const round2 = (value) => Number((value || 0).toFixed(2));

const resolveContext = async (req, res) => {
    const { student_id } = req.query;
    const parent = await Parent.findOne({ user: req.user?._id });

    if (!parent || !parent.students?.length) {
        res.status(403).json({ success: false, data: null, message: "No students associated with this parent" });
        return null;
    }

    let resolvedStudentId = student_id || parent.students[0];
    if (student_id) {
        const isChild = parent.students.some((id) => id.toString() === student_id.toString());
        if (!isChild) {
            resolvedStudentId = parent.students[0];
        }
    }

    const studentProfile = await Student.findById(resolvedStudentId);
    if (!studentProfile) {
        res.status(200).json({ success: true, data: {}, message: "Student not found" });
        return null;
    }

    const studentSchoolId = studentProfile.school;
    if (!studentSchoolId) {
        res.status(400).json({ success: false, data: null, message: "Student has no school assigned" });
        return null;
    }

    return {
        studentProfile,
        schoolObjectId: new mongoose.Types.ObjectId(studentSchoolId),
    };
};

export const getAttendanceSummary = async (req, res) => {
    try {
        const context = await resolveContext(req, res);
        if (!context) return;

        const { studentProfile, schoolObjectId } = context;
        const attendanceDocs = await Attendance.find({
            school: schoolObjectId,
            "entries.student": studentProfile.user,
        }).select("entries");

        let totalDays = 0;
        let presentDays = 0;
        let absentDays = 0;
        let lateDays = 0;
        let leaveDays = 0;

        attendanceDocs.forEach((doc) => {
            const entry = (doc.entries || []).find(
                (item) => item.student?.toString() === studentProfile.user.toString()
            );

            if (!entry) return;
            totalDays += 1;
            if (entry.status === "present") presentDays += 1;
            if (entry.status === "absent") absentDays += 1;
            if (entry.status === "late") lateDays += 1;
            if (entry.status === "on_leave") leaveDays += 1;
        });

        const percentage = totalDays > 0 ? round2((presentDays / totalDays) * 100) : 0;

        return res.status(200).json({
            success: true,
            data: {
                totalDays,
                presentDays,
                absentDays,
                lateDays,
                leaveDays,
                percentage,
                isLowAttendance: percentage < 75,
            },
            message: "Attendance summary fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getAttendanceCalendar = async (req, res) => {
    try {
        const context = await resolveContext(req, res);
        if (!context) return;

        const { studentProfile, schoolObjectId } = context;
        const now = new Date();
        const queryMonth = Number.parseInt(req.query.month, 10);
        const queryYear = Number.parseInt(req.query.year, 10);
        const month = Number.isInteger(queryMonth) && queryMonth >= 1 && queryMonth <= 12
            ? queryMonth
            : now.getMonth() + 1;
        const year = Number.isInteger(queryYear) && queryYear > 1900 ? queryYear : now.getFullYear();

        const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);

        const attendanceDocs = await Attendance.find({
            school: schoolObjectId,
            date: { $gte: startDate, $lte: endDate },
            "entries.student": studentProfile.user,
        }).select("date entries");

        const calendarMap = {};
        attendanceDocs.forEach((doc) => {
            const entry = (doc.entries || []).find(
                (item) => item.student?.toString() === studentProfile.user.toString()
            );
            if (!entry) return;

            const dateKey = new Date(doc.date).toISOString().slice(0, 10);
            calendarMap[dateKey] = entry.status;
        });

        return res.status(200).json({
            success: true,
            data: calendarMap,
            message: "Attendance calendar fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getLeaveRequests = async (req, res) => {
    try {
        const context = await resolveContext(req, res);
        if (!context) return;

        const { studentProfile, schoolObjectId } = context;
        const leaveDocs = await StudentLeave.find({
            school: schoolObjectId,
            student: studentProfile.user,
        })
            .populate("approvedBy", "name")
            .sort({ createdAt: -1 })
            .limit(20);

        const data = leaveDocs.map((leave) => {
            const startDate = leave.fromDate;
            const endDate = leave.toDate;
            const calculatedDays = startDate && endDate
                ? Math.floor((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
                : 0;

            return {
                id: leave._id,
                type: leave.leaveType ? leave.leaveType.charAt(0).toUpperCase() + leave.leaveType.slice(1) : "N/A",
                startDate: startDate ? new Date(startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
                endDate: endDate ? new Date(endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
                days: leave.totalDays || calculatedDays,
                status: leave.status ? leave.status.charAt(0).toUpperCase() + leave.status.slice(1) : "Pending",
                reason: leave.reason || "",
                appliedDate: leave.createdAt ? new Date(leave.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
                approvedBy: leave.approvedBy?.name || "—",
                approvalDate: leave.approvedAt ? new Date(leave.approvedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
                remarks: leave.rejectionReason || "—"
            };
        });

        return res.status(200).json({
            success: true,
            data,
            message: "Leave requests fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getAttendanceList = async (req, res) => {
    try {
        const context = await resolveContext(req, res);
        if (!context) return;

        const { studentProfile, schoolObjectId } = context;
        const attendanceDocs = await Attendance.find({
            school: schoolObjectId,
            "entries.student": studentProfile.user,
        }).sort({ date: -1 }).limit(100);

        const list = attendanceDocs.map((doc) => {
            const entry = (doc.entries || []).find(
                (item) => item.student?.toString() === studentProfile.user.toString()
            );

            const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const docDate = new Date(doc.date);
            const dayName = daysOfWeek[docDate.getDay()];

            let statusDisplay = "Present";
            if (entry?.status === "absent") statusDisplay = "Absent";
            if (entry?.status === "late") statusDisplay = "Late";
            if (entry?.status === "half_day") statusDisplay = "Half Day";
            if (entry?.status === "on_leave") statusDisplay = "On Leave";

            return {
                id: doc._id,
                date: docDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
                day: dayName,
                checkIn: entry?.status === "absent" ? "—" : "09:00 AM",
                checkOut: entry?.status === "absent" ? "—" : "03:30 PM",
                status: statusDisplay,
                type: doc.attendanceType === "subject" ? "Subject Wise" : "Daily Attendance",
                remarks: entry?.remarks || "—",
            };
        });

        return res.status(200).json({
            success: true,
            data: list,
            message: "Attendance list fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};
