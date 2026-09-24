import PTMFeedback from "../../models/common/PTMFeedback.js";
import Parent from "../../models/users/parent.model.js";
import Student from "../../models/users/student.model.js";
import Message from "../../models/communication/Message.model.js";
import Notification from "../../models/common/Notification.js";
import User from "../../models/users/user.model.js";

// Helper to get school context safely
const getSchoolContext = async (req) => {
    try {
        if (req.user?.school) {
            return req.user.school._id || req.user.school;
        }
        const user = await User.findById(req.user?.id).populate("school");
        if (user && user.school) {
            return user.school._id || user.school;
        }
        return null;
    } catch (error) {
        console.error('Error in getSchoolContext:', error);
        return null;
    }
};

// @desc    Get all PTM feedback entries with query filtering
// @route   GET /api/principal/ptm-feedback
// @access  Private (Principal)
export const getPTMFeedbacks = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: "School context not found" });
        }

        const { academicYear, ptmEvent, category, rating, status, search } = req.query;

        const query = { school: schoolId };

        if (academicYear) {
            query.academicYear = academicYear;
        }
        if (ptmEvent && ptmEvent !== "All PTMs") {
            query.ptmEvent = ptmEvent;
        }
        if (category && category !== "All Categories") {
            query.category = category;
        }
        if (status && status !== "All Statuses") {
            query.status = status;
        }
        if (rating && rating !== "All Ratings") {
            if (rating === "5 Stars") query.rating = 5;
            else if (rating === "4 Stars") query.rating = 4;
            else if (rating === "3 Stars") query.rating = 3;
            else if (rating === "2 Stars & Below") query.rating = { $lte: 2 };
        }

        // Fetch and populate parent, student, and class references
        const feedbackList = await PTMFeedback.find(query)
            .populate({
                path: "parent",
                populate: { path: "user", select: "name email" }
            })
            .populate({
                path: "student",
                populate: { path: "user", select: "name" }
            })
            .populate("class", "name")
            .sort({ createdAt: -1 });

        // Map feedback entries to UI-friendly objects
        let formattedList = feedbackList.map(item => {
            const pName = item.parent?.user?.name || item.parent?.fatherName || "Parent";
            const sName = item.student?.user?.name || "Student";
            const cName = item.class?.name || "Class";
            return {
                id: item._id,
                parentName: pName,
                studentName: sName,
                className: cName,
                ptmEvent: item.ptmEvent,
                date: item.createdAt.toISOString().split("T")[0],
                category: item.category,
                rating: item.rating,
                comments: item.comments,
                status: item.status,
                principalNotes: item.principalNotes || "",
                contactPhone: item.parent?.primaryContact || "",
                email: item.parent?.user?.email || item.parent?.profileExtras?.fatherEmail || ""
            };
        });

        // Search term matching on populated parent, student, and class names
        if (search) {
            const s = search.toLowerCase();
            formattedList = formattedList.filter(item => 
                item.parentName.toLowerCase().includes(s) ||
                item.studentName.toLowerCase().includes(s) ||
                item.className.toLowerCase().includes(s)
            );
        }

        const ptmEvents = await PTMFeedback.distinct("ptmEvent", { school: schoolId });

        return res.status(200).json({
            success: true,
            data: formattedList,
            ptmEvents
        });

    } catch (error) {
        console.error("Error in getPTMFeedbacks:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update follow-up status and principal notes of a feedback ticket
// @route   PUT /api/principal/ptm-feedback/:id
// @access  Private (Principal)
export const updatePTMFeedbackStatus = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: "School context not found" });
        }

        const { id } = req.params;
        const { status, principalNotes } = req.body;

        const feedback = await PTMFeedback.findOneAndUpdate(
            { _id: id, school: schoolId },
            { status, principalNotes },
            { new: true }
        );

        if (!feedback) {
            return res.status(404).json({ success: false, message: "Feedback ticket not found" });
        }

        return res.status(200).json({
            success: true,
            data: feedback,
            message: "Feedback ticket updated successfully"
        });
    } catch (error) {
        console.error("Error in updatePTMFeedbackStatus:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Send direct message and notification to parent from resolution dashboard
// @route   POST /api/principal/ptm-feedback/:id/message
// @access  Private (Principal)
export const sendParentMessage = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        if (!schoolId) {
            return res.status(400).json({ success: false, message: "School context not found" });
        }

        const { id } = req.params;
        const { message } = req.body;

        if (!message || message.trim() === "") {
            return res.status(400).json({ success: false, message: "Message content cannot be empty" });
        }

        const feedback = await PTMFeedback.findOne({ _id: id, school: schoolId })
            .populate({
                path: "parent",
                select: "user"
            });

        if (!feedback) {
            return res.status(404).json({ success: false, message: "Feedback ticket not found" });
        }

        const parentUser = feedback.parent?.user;
        if (!parentUser) {
            return res.status(400).json({ success: false, message: "Parent user profile not found for this feedback" });
        }

        // Create message entry
        await Message.create({
            school: schoolId,
            sender: req.user._id,
            receiver: parentUser,
            text: message,
            status: "sent"
        });

        // Send alert notification
        await Notification.create({
            user: parentUser,
            title: "New message from Principal",
            message: message,
            type: "message",
            read: false,
            school: schoolId,
            senderName: req.user.name || "Principal",
            senderRole: "principal",
            source: "PTM Feedback Follow-up"
        });

        // Automatically update the ticket status if it's currently pending
        if (feedback.status === "Pending Review") {
            feedback.status = "Contacted Parent";
            await feedback.save();
        }

        return res.status(200).json({
            success: true,
            message: "Message sent to parent successfully"
        });

    } catch (error) {
        console.error("Error in sendParentMessage:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
