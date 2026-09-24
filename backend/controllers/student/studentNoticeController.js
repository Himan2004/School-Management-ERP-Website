import Notice from "../../models/common/Notice.js";
import Student from "../../models/users/student.model.js";

// @desc    Get official notices for students
// @route   GET /api/student/notices
export const getStudentNotices = async (req, res) => {
    try {
        // 1. Get the student's specific school ID
        const profile = await Student.findOne({ user: req.user._id }).select("school");
        const schoolId = profile?.school;

        if (!schoolId) {
            return res.status(404).json({ success: false, message: "School profile not found" });
        }

        // 2. Fetch published notices for this school/branch
        const records = await Notice.find({
            $or: [{ school: schoolId }, { branch: schoolId }],
            status: { $regex: /^(published|active)$/i }
        })
        .populate("createdBy", "name role")
        .sort({ createdAt: -1 })
        .lean();

        // 3. Filter for "Student" or "Everyone" in JavaScript safely
        const validNotices = records.filter(item => {
            const aud = item.audience || item.targetAudience || item.target || [];
            const audStr = (Array.isArray(aud) ? aud.join(',') : String(aud)).toLowerCase();
            
            return audStr.includes('student') || 
                   audStr.includes('everyone') || 
                   audStr.includes('all') || 
                   audStr === '' || 
                   audStr === 'undefined';
        });

        // Map data to match the frontend expected structure
        const formattedNotices = validNotices.map(item => ({
            ...item,
            id: item._id,
            date: item.createdAt || item.updatedAt || new Date(),
            publishedBy: item.createdBy?.name || "School Administration",
            attachmentUrl: item.attachments && item.attachments.length > 0 ? item.attachments[0].url : null,
        }));

        res.status(200).json({ success: true, data: formattedNotices });
    } catch (err) {
        console.error("Error fetching student notices:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};