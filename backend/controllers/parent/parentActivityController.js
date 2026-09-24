import StudentActivity from "../../models/academic/studentActivity.model.js";

// @desc    Get student activity timeline, stats, and certificates
// @route   GET /api/parent/activities?student_id=...
export const getStudentActivities = async (req, res) => {
    try {
        const { student_id } = req.query;
        const schoolId = req.user.school?._id || req.user.school;

        if (!student_id) {
            return res.status(400).json({ success: false, message: "student_id query parameter is required" });
        }

        // Fetch all activities for this specific child
        const activities = await StudentActivity.find({
            school: schoolId,
            student: student_id
        }).sort({ activityDate: -1 }).lean();

        let totalParticipated = 0;
        let awardsWon = 0;
        let upcoming = 0;
        const timeline = [];
        const certificates = [];

        activities.forEach(act => {
            // 1. Calculate Stats Summary
            if (act.status === 'Winner' || act.status === 'Runner Up') {
                awardsWon++;
                totalParticipated++;
            } else if (act.status === 'Participated') {
                totalParticipated++;
            } else if (act.status === 'Upcoming') {
                upcoming++;
            }

            // Common formatted date
            const formattedDate = new Date(act.activityDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            // 2. Build Timeline Array
            timeline.push({
                id: act._id,
                name: act.name,
                category: act.category,
                date: formattedDate,
                status: act.status,
                description: act.description,
                achievementText: act.achievementText
            });

            // 3. Build Certificates Array (Only if an icon is assigned)
            if (act.certificateIcon && act.certificateIcon !== 'none') {
                certificates.push({
                    id: act._id,
                    title: act.status === 'Winner' ? "First Place Champion" : "Achievement Award",
                    eventName: act.name,
                    date: formattedDate,
                    icon: act.certificateIcon,
                    url: act.certificateUrl
                });
            }
        });

        // Send the Mega-Object structured exactly like the React dummy data
        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalParticipated,
                    awardsWon,
                    upcoming
                },
                timeline,
                certificates
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};