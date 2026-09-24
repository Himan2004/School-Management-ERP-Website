import User from "../../models/users/user.model.js";
import Teacher from "../../models/users/teacher.model.js";
import StaffProfile from "../../models/users/staffProfile.model.js";
import StaffAttendance from "../../models/HRM/Staffattendance.model.js";
import mongoose from "mongoose";

/**
 * @desc    Get staff performance dashboard data (school-scoped)
 * @route   GET /api/admin/reports/staff-performance?academicYear=2025-2026&department=All&staffType=All%20Staff
 * @access  Private – Admin only
 */
export const getStaffPerformanceDashboard = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const { academicYear, department, staffType } = req.query;

        const schoolOId = new mongoose.Types.ObjectId(schoolId);

        // 1. Fetch Staff (Teachers and Support Staff)
        let staffFilter = { school: schoolOId, role: { $in: ["teacher", "admin", "accountant", "principal"] } };
        
        if (staffType && staffType !== "All Staff") {
            if (staffType === "Teaching Staff") staffFilter.role = "teacher";
            if (staffType === "Non-Teaching Staff") staffFilter.role = { $in: ["admin", "accountant"] };
        }

        const staffUsers = await User.find(staffFilter).select("name role status email phone createdAt").lean();
        const teachers = await Teacher.find({ school: schoolOId }).select("user department designation experience assignedClasses subjects joiningDate").lean();
        const supportProfiles = await StaffProfile.find({ school: schoolOId }).select("user department designation experience joiningDate").lean();

        // 2. Fetch Attendance
        // Optional: filter attendance by academicYear if needed, but we'll fetch last 30 days for availability or whole year for trend
        let startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        if (academicYear) {
            const [startYr] = academicYear.split("-").map(Number);
            if (startYr) {
                startDate = new Date(startYr, 3, 1); // April 1st of academic year
            }
        }
        
        const attendanceRecords = await StaffAttendance.find({
            school: schoolOId,
            date: { $gte: startDate }
        }).lean();

        // Helpers to map profiles
        const teacherMap = new Map(teachers.map(t => [t.user.toString(), t]));
        const supportMap = new Map(supportProfiles.map(s => [s.user.toString(), s]));

        // Process each staff member
        let totalActive = 0;
        let totalScore = 0;
        let totalAttendancePct = 0;
        let validPerformanceCount = 0;
        
        const availabilityData = [];
        const attendanceData = [];
        const performanceData = [];

        // For Charts
        const performanceDistribution = { "5 Stars": 0, "4 Stars": 0, "3 Stars": 0, "2 Stars": 0, "1 Star": 0 };
        
        const monthLabels = ["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];
        const attendanceByMonth = { "Apr": {p:0, t:0}, "May": {p:0, t:0}, "Jun": {p:0, t:0}, "Jul": {p:0, t:0}, "Aug": {p:0, t:0}, "Sep": {p:0, t:0}, "Oct": {p:0, t:0}, "Nov": {p:0, t:0}, "Dec": {p:0, t:0}, "Jan": {p:0, t:0}, "Feb": {p:0, t:0}, "Mar": {p:0, t:0} };

        // Process Attendance Trend
        attendanceRecords.forEach(record => {
            if (!record.date) return;
            const d = new Date(record.date);
            const m = d.toLocaleString('en-US', { month: 'short' });
            if (attendanceByMonth[m]) {
                attendanceByMonth[m].t += 1;
                if (record.status === "present" || record.status === "late") {
                    attendanceByMonth[m].p += 1;
                } else if (record.status === "half_day") {
                    attendanceByMonth[m].p += 0.5;
                }
            }
        });

        staffUsers.forEach((user, index) => {
            const profile = teacherMap.get(user._id.toString()) || supportMap.get(user._id.toString()) || {};
            const dept = profile.department || (user.role === "teacher" ? "Academic" : "Administration");
            
            // Department Filter
            if (department && department !== "All" && department !== "All Departments") {
                if (dept.toLowerCase() !== department.toLowerCase()) return;
            }

            if (user.status === "active") totalActive++;

            // Calculate Staff specific attendance
            const staffAtt = attendanceRecords.filter(r => r.staffId?.toString() === user._id.toString());
            const totalDays = staffAtt.length;
            const presentDays = staffAtt.filter(r => ["present", "late"].includes(r.status)).length;
            const halfDays = staffAtt.filter(r => r.status === "half_day").length;
            const attPct = totalDays > 0 ? ((presentDays + halfDays * 0.5) / totalDays) * 100 : 85; // default 85 if no records
            
            totalAttendancePct += attPct;

                const exp = profile.experience || 0;
            const baseRating = attPct >= 95 ? 4.5 : attPct >= 90 ? 4.0 : attPct >= 80 ? 3.5 : attPct >= 70 ? 3.0 : 2.5;
            const expBonus = Math.min(0.5, exp * 0.05);
            const rawRating = baseRating + expBonus;
            const rating = Number(Math.min(5.0, Math.max(1.0, rawRating)).toFixed(1));
            
            totalScore += rating;
            validPerformanceCount++;

            // Chart Aggregation
            if (rating >= 4.5) performanceDistribution["5 Stars"]++;
            else if (rating >= 3.5) performanceDistribution["4 Stars"]++;
            else if (rating >= 2.5) performanceDistribution["3 Stars"]++;
            else if (rating >= 1.5) performanceDistribution["2 Stars"]++;
            else performanceDistribution["1 Star"]++;

            const todayObj = new Date().toLocaleDateString("en-IN");
            const todayAtt = staffAtt.find(r => new Date(r.date).toLocaleDateString("en-IN") === todayObj);
            
            // Availability Data
            let availability = "Available";
            if (todayAtt) {
                if (todayAtt.status === "absent") availability = "On Leave";
                else if (todayAtt.status === "half_day") availability = "Half Day";
            }
            availabilityData.push({
                name: user.name,
                department: dept,
                availability: availability,
                status: user.status === "active" ? "Active" : "Inactive",
                designation: profile.designation || "Staff",
                contact: user.phone || "—",
                date: todayObj,
                remarks: availability === "On Leave" ? "Leave approved" : "Available for duty"
            });

            // Attendance Data (recent)
            const recentAtt = staffAtt.length > 0 ? staffAtt[staffAtt.length - 1] : null;
            attendanceData.push({
                name: user.name,
                department: dept,
                attendance: recentAtt ? (recentAtt.status === "present" ? "Present" : recentAtt.status === "absent" ? "Absent" : "Half Day") : "Present",
                attendanceType: recentAtt ? (recentAtt.status === "half_day" ? "Half Day" : "Full Day") : "Full Day",
                status: "Approved",
                designation: profile.designation || "Staff",
                date: recentAtt ? new Date(recentAtt.date).toLocaleDateString("en-IN") : todayObj,
                workingHours: recentAtt?.status === "half_day" ? "4 hrs" : "8 hrs",
                remarks: "Regular attendance marked"
            });

            // Performance Data
            performanceData.push({
                name: user.name,
                department: dept,
                rating: rating,
                attendancePct: Math.round(attPct),
                classesAssigned: profile.assignedClasses?.length || 0,
                designation: profile.designation || "Staff",
                experience: `${exp} Years`,
                subject: profile.subjects?.length > 0 ? "Multiple Subjects" : "General",
                joinDate: profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString("en-IN") : "—",
                remarks: rating > 4 ? "Excellent performance" : rating > 3 ? "Good performance" : "Needs improvement"
            });
        });

        // KPI
        const totalStaffCount = staffUsers.length;
        const avgPerformance = validPerformanceCount > 0 ? (totalScore / validPerformanceCount).toFixed(1) : 0;
        const avgAttendance = validPerformanceCount > 0 ? Math.round(totalAttendancePct / validPerformanceCount) : 0;

        const kpiData = {
            totalStaff: totalStaffCount,
            activeStaff: totalActive,
            avgPerformance: avgPerformance,
            attendancePct: avgAttendance
        };

        // Format charts
        const performanceChartData = Object.keys(performanceDistribution).map(k => ({
            rating: k,
            count: performanceDistribution[k]
        }));

        const attendanceChartData = monthLabels.map(m => {
            const data = attendanceByMonth[m];
            const pct = data.t > 0 ? Math.round((data.p / data.t) * 100) : 0;
            return {
                month: m,
                attendance: pct
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                kpiData,
                performanceChartData,
                attendanceChartData,
                availabilityData,
                attendanceData,
                performanceData
            }
        });

    } catch (error) {
        console.error("Error in getStaffPerformanceDashboard:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
