import Timetable from "../../models/academic/timetable.model.js";
import Student from "../../models/users/student.model.js";

// @desc    Get student's weekly timetable
// @route   GET /api/student/timetable
export const getStudentTimetable = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Get the student's complete profile
        const student = await Student.findOne({ user: userId });
        if (!student) {
            return res.status(404).json({ success: false, message: "Student profile not found" });
        }

        // 🌟 100% DYNAMIC: Pulling the exact academic year from the student's profile!
        const currentAcademicYear = student.academicYear; 

        // 2. Fetch the active timetable for their class and dynamic academic year
        const timetable = await Timetable.findOne({
            class: student.class,
            academicYear: currentAcademicYear,
            isActive: true
        }).populate({
            path: 'schedule.periods.subject',
            select: 'name subjectName credits' 
        }).populate({
            path: 'schedule.periods.teacher',
            select: 'name email'
        });

        if (!timetable || !timetable.schedule || timetable.schedule.length === 0) {
            return res.status(200).json({ 
                success: true, 
                data: { subjects: [], schedule: [], days: [], timeSlots: [] },
                message: "No active timetable found." 
            });
        }

        // 3. Transform the database model into the exact JSON your React UI expects
        const colorPalette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec489a', '#14b8a6'];
        const subjectMap = new Map();
        const formattedSchedule = [];
        const timeSlotsSet = new Set();
        const daysSet = new Set();

        timetable.schedule.forEach(dayData => {
            if (!dayData.isWorkingDay) return;

            // Format "monday" to "Monday"
            const dayName = dayData.day.charAt(0).toUpperCase() + dayData.day.slice(1);
            daysSet.add(dayName);

            dayData.periods.forEach(period => {
                if (period.isBreak) return; // Skip lunch breaks for this specific UI

                const timeStr = `${period.startTime}-${period.endTime}`;
                timeSlotsSet.add(timeStr);

                const sub = period.subject;
                const teacher = period.teacher;
                if (!sub) return; 

                const subId = sub._id.toString();

                // Build the unique subjects array for the Subject View & Filter
                if (!subjectMap.has(subId)) {
                    subjectMap.set(subId, {
                        id: subId,
                        name: sub.name || sub.subjectName || "Unknown Subject",
                        teacher: teacher ? teacher.name : "TBA",
                        teacherEmail: teacher ? teacher.email : "TBA",
                        // 🌟 DYNAMIC ROOM: Looks for a room field, defaults to TBA if your schema doesn't have it yet
                        room: period.room || "TBA", 
                        color: colorPalette[subjectMap.size % colorPalette.length], 
                        credits: sub.credits || 4,
                        duration: calculateDuration(period.startTime, period.endTime)
                    });
                }

                const subjectInfo = subjectMap.get(subId);

                // Build the actual schedule array for the Day & Week View
                formattedSchedule.push({
                    id: period._id.toString(),
                    day: dayName,
                    time: timeStr,
                    subjectId: subId,
                    subject: subjectInfo.name,
                    teacher: subjectInfo.teacher,
                    room: subjectInfo.room,
                    color: subjectInfo.color,
                    // Note: Topics and Notes are intentionally empty because timetables are weekly templates, not daily lesson plans.
                    topic: "", 
                    notes: ""  
                });
            });
        });

        // 4. Send the perfect payload
        res.status(200).json({
            success: true,
            data: {
                subjects: Array.from(subjectMap.values()),
                schedule: formattedSchedule,
                days: Array.from(daysSet),
                timeSlots: Array.from(timeSlotsSet).sort() 
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const calculateDuration = (start, end) => {
    try {
        const [startHr, startMin] = start.split(':').map(Number);
        const [endHr, endMin] = end.split(':').map(Number);
        let diff = (endHr * 60 + endMin) - (startHr * 60 + startMin);
        if (diff < 0) diff += 12 * 60; 
        return `${diff} min`;
    } catch {
        return "60 min";
    }
};