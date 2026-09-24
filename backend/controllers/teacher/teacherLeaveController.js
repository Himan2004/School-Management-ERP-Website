import StudentLeave from "../../models/academic/StudentLeave.model.js";
import Student from "../../models/users/student.model.js";

// @desc    Get all leave requests with stats and search/filter
export const getLeaveRequests = async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = { school: req.user.school };

        // 1. Dynamic Search & Filter
        if (status && status !== 'all') query.status = status;
        
        const requests = await StudentLeave.find(query)
            .populate('student', 'name')
            .populate('class', 'name')
            .sort({ createdAt: -1 })
            .lean(); // .lean() makes processing faster

        // Fetch Student profiles to get the Guardian (Parent) names dynamically
        const studentUserIds = requests.map(r => r.student?._id);
        const studentProfiles = await Student.find({ user: { $in: studentUserIds } })
            .populate('parent', 'fatherName motherName')
            .lean();

        // Create a quick lookup map for guardians
        const studentMap = new Map(studentProfiles.map(s => [s.user.toString(), s]));

        // 2. Dynamic Dashboard Stats
        const stats = await StudentLeave.aggregate([
            { $match: { school: req.user.school } },
            { $group: {
                _id: "$status",
                count: { $sum: 1 },
                totalDays: { $sum: "$totalDays" }
            }}
        ]);

        // 3. Transform to Frontend UI Format
        const formattedRequests = requests.map(req => {
            // Retrieve dynamic guardian name
            const profile = studentMap.get(req.student?._id?.toString());
            const guardianName = profile?.parent?.fatherName || profile?.parent?.motherName || "Parent/Guardian";

            return {
                rawId: req._id,
                id: `SL-${req._id.toString().slice(-6).toUpperCase()}`,
                studentName: req.student?.name || "Unknown",
                className: req.class?.name || "N/A",
                rollNo: profile?.rollNo || "-",
                leaveType: req.leaveType.charAt(0).toUpperCase() + req.leaveType.slice(1) + " Leave",
                range: `${new Date(req.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(req.toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
                days: req.totalDays,
                reason: req.reason,
                status: req.status.charAt(0).toUpperCase() + req.status.slice(1),
                appliedOn: new Date(req.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                guardian: guardianName // Fully Dynamic Now!
            };
        });

        // Apply Search Filter on formatted data
        const finalRequests = search ? formattedRequests.filter(r => 
            r.studentName.toLowerCase().includes(search.toLowerCase()) || 
            r.id.toLowerCase().includes(search.toLowerCase())
        ) : formattedRequests;

        res.status(200).json({ success: true, data: finalRequests, stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Approve/Reject leave
export const updateLeaveStatus = async (req, res) => {
    try {
        const { status, rejectionReason } = req.body; // 'approved' or 'rejected'
        const updateObj = { status, approvedBy: req.user._id, approvedAt: new Date() };
        if (status === 'rejected' && rejectionReason) {
            updateObj.rejectionReason = rejectionReason;
        }
        const leave = await StudentLeave.findByIdAndUpdate(
            req.params.id, 
            updateObj,
            { new: true }
        );
        res.status(200).json({ success: true, data: leave });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Export report
export const exportLeaveReport = async (req, res) => {
    try {
        const leaves = await StudentLeave.find({ school: req.user.school })
            .populate('student', 'name')
            .populate('class', 'name')
            .lean();
        res.status(200).json({ success: true, data: leaves });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};