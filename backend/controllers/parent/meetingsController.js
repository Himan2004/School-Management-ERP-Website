import StaffMeeting from "../../models/HRM/StaffMeeting.model.js"; // 🔥 Reading from the REAL database now!
import Student from "../../models/users/student.model.js"; 
import Parent from "../../models/users/parent.model.js";

// @desc    Get all meetings, responses, and booked slots for a parent
// @route   GET /api/parent/meetings?student_id=...
export const getMeetings = async (req, res) => {
    try {
        const parentId = req.user._id;
        let schoolId = req.user.school_id || req.user.school?._id || req.user.school;

        const parent = await Parent.findOne({ user: req.user._id }).populate({
            path: "students",
            populate: [
                {
                    path: "class",
                    select: "name"
                },
                {
                    path: "section",
                    select: "name"
                }
            ]
        });
        if (!parent || !parent.students?.length) {
            return res.status(200).json({ success: true, data: [] });
        }

        const { student_id } = req.query;
        if (student_id) {
            const student = parent.students.find(s => s._id.toString() === student_id.toString());
            if (student && student.school) {
                schoolId = student.school;
            }
        }

        // Fetch from the StaffMeeting collection where the Principal is actually saving them!
        const meetings = await StaffMeeting.find({ school: schoolId }).populate("createdBy", "name").lean();

        const formattedMeetings = [];

        meetings.forEach(meeting => {
            // Visibility checks
            // 1. If it's not a PTM (general type), skip
            if (meeting.meetingType !== 'general') return;

            // 2. Class and Section specific visibility
            const targetCls = meeting.className;
            const targetSec = meeting.sectionName;

            if (targetCls && targetCls !== "All Classes") {
                const hasEligibleChild = parent.students.some(student => {
                    const studentClassName = student.class?.name;
                    if (!studentClassName || studentClassName.toLowerCase() !== targetCls.toLowerCase()) {
                        return false;
                    }
                    if (targetSec && targetSec !== "All Sections") {
                        const studentSectionName = student.section?.name;
                        return studentSectionName && studentSectionName.toLowerCase() === targetSec.toLowerCase();
                    }
                    return true;
                });
                if (!hasEligibleChild) return; // Hide if parent has no child matching target class/section
            } else {
                // Fallback to legacy targetRoles check
                const roles = (meeting.targetRoles || []).map(r => r.toLowerCase());
                const isParentInvited = roles.includes("parents") || roles.includes("all");
                if (!isParentInvited) return;
            }

            // Find if this parent RSVP'd in the attendees array
            const userResponse = meeting.attendees?.find(a => a.staffId?.toString() === parentId.toString());

            let finalStatus = "Pending Response";
            if (meeting.status === 'cancelled') {
                finalStatus = "Cancelled";
            } else if (meeting.status === 'completed') {
                finalStatus = "Completed";
            } else if (userResponse) {
                if (userResponse.attendanceStatus === "confirmed") {
                    finalStatus = "Accepted";
                } else if (userResponse.attendanceStatus === "declined") {
                    finalStatus = "Declined";
                }
            }

            // Generate slots
            const slots = [];
            const startTimeStr = meeting.startTime || (meeting.scheduledAt ? new Date(meeting.scheduledAt).toTimeString().slice(0, 5) : "09:00");
            const duration = meeting.durationMinutes || 60;
            const [sh, sm] = startTimeStr.split(":").map(Number);
            
            let currentMinutes = sh * 60 + sm;
            const endMinutes = currentMinutes + duration;
            
            while (currentMinutes < endMinutes) {
                const hour = Math.floor(currentMinutes / 60);
                const min = currentMinutes % 60;
                
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour % 12 === 0 ? 12 : hour % 12;
                const displayMin = min < 10 ? '0' + min : min;
                slots.push(`${displayHour}:${displayMin} ${ampm}`);
                
                currentMinutes += 15;
            }

            // Filter out booked slots
            const bookedSlots = (meeting.attendees || [])
                .filter(a => a.attendanceStatus === 'confirmed' && a.staffId?.toString() !== parentId.toString())
                .map(a => a.selectedSlot);
            
            const availableSlots = slots.filter(s => !bookedSlots.includes(s));

            // Extract times
            const scheduled = new Date(meeting.scheduledAt);
            const startHourMin = scheduled.toTimeString().slice(0, 5);
            const end = new Date(scheduled.getTime() + (meeting.durationMinutes || 60) * 60000);
            const endHourMin = end.toTimeString().slice(0, 5);

            formattedMeetings.push({
                id: meeting._id,
                teacherName: meeting.createdBy?.name || "School Administration",
                subject: "PTM",
                title: meeting.title,
                meetingDate: meeting.scheduledAt,
                time: `${startHourMin} - ${endHourMin}`,
                mode: meeting.isOnline ? "Online" : "Offline",
                status: finalStatus,
                description: meeting.agenda || "",
                location: meeting.venue || "School Campus",
                meetingLink: meeting.meetingLink || "",
                selectedSlot: userResponse?.selectedSlot || "",
                notes: userResponse?.notes || "",
                declineReason: userResponse?.declineReason || "",
                instructions: [
                    "Please arrive 10 minutes prior to your scheduled slot.",
                    "Review your child's academic progress report before the meeting.",
                    "Only parents or legal guardians are requested to attend."
                ],
                availableSlots
            });
        });

        res.status(200).json({
            success: true,
            data: formattedMeetings
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Submit RSVP (Will Attend / Cannot Attend)
// @route   PATCH /api/parent/meetings/:id/respond
export const respondToMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const { response, selectedSlot, notes, declineReason } = req.body; 
        const parentId = req.user._id;

        // Update the StaffMeeting directly
        const meeting = await StaffMeeting.findById(id);
        if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found" });

        if (!meeting.attendees) meeting.attendees = [];

        // Remove old response, add new one (hijacking the staffId field to hold the parentId)
        meeting.attendees = meeting.attendees.filter(a => a.staffId?.toString() !== parentId.toString());
        meeting.attendees.push({ 
            staffId: parentId, 
            hasAcknowledged: response === 'yes',
            attendanceStatus: response === 'yes' ? 'confirmed' : 'declined',
            selectedSlot: response === 'yes' ? selectedSlot : '',
            notes: response === 'yes' ? notes : '',
            declineReason: response === 'no' ? declineReason : ''
        });

        meeting.markModified('attendees');
        await meeting.save();

        res.status(200).json({ success: true, message: "Response recorded successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Book a specific time slot (Placeholder for StaffMeeting compatibility)
// @route   POST /api/parent/meetings/:id/book-slot
export const bookSlot = async (req, res) => {
    res.status(400).json({ success: false, message: "Slot booking is not supported for this meeting type yet." });
};