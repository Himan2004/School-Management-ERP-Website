import Event from "../../models/common/Event.js";
import Notification from "../../models/common/Notification.js";
import User from "../../models/users/user.model.js";
import mongoose from "mongoose";

/**
 * Helper to notify all local school users about a new event
 */
const createNotificationsForEvent = async (event, senderName) => {
    try {
        let query = { school: event.school };
        const users = await User.find(query).select('_id');
        
        const notifications = users.map(u => ({
            user: u._id,
            title: `Event: ${event.title}`,
            message: `New event scheduled on ${new Date(event.startDate).toLocaleDateString()}`,
            type: 'event',
            read: false,
            school: event.school,
            senderName: senderName || 'Admin',
            senderRole: 'Admin',
            source: 'Admin'
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications, { ordered: false });
        }
    } catch (error) {
        console.error("Error creating notifications for event:", error);
    }
};

/**
 * @desc    Get upcoming events for dashboard
 * @route   GET /api/admin/events/upcoming
 * @access  Private (Admin)
 */
export const getUpcomingEvents = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const events = await Event.find({
            $or: [
                { school: schoolId },
                { school: null, origin: "HQ" } // System-wide events
            ],
            startDate: { $gte: today }
        })
        .sort({ startDate: 1 })
        .limit(10);

        res.status(200).json({
            success: true,
            data: events
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Create new event
 * @route   POST /api/admin/events
 * @access  Private (Admin)
 */
export const createEvent = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        
        let organizationId = req.user.school?.organization;
        if (!organizationId) {
            const School = mongoose.model("School");
            const school = await School.findById(schoolId);
            organizationId = school?.organization;
        }

        if (!organizationId) {
            return res.status(400).json({ success: false, message: "Organization ID is required" });
        }

        const { title, startDate } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }
        if (!startDate) {
            return res.status(400).json({ success: false, message: "Start Date is required" });
        }

        const newEvent = await Event.create({
            ...req.body,
            school: schoolId,
            organization: organizationId,
            origin: "Local",
            createdBy: req.user.name || "Admin"
        });

        // Create notifications asynchronously
        createNotificationsForEvent(newEvent, req.user.name);

        res.status(201).json({
            success: true,
            data: newEvent
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map(val => val.message).join(', ');
            return res.status(400).json({ success: false, message });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update existing event
 * @route   PUT /api/admin/events/:id
 * @access  Private (Admin)
 */
export const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.school?._id || req.user.school;

        const { title, startDate } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: "Title is required" });
        }
        if (!startDate) {
            return res.status(400).json({ success: false, message: "Start Date is required" });
        }

        const event = await Event.findOne({ _id: id, school: schoolId });
        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        // Update fields
        Object.assign(event, req.body);
        await event.save();

        res.status(200).json({
            success: true,
            data: event
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const message = Object.values(error.errors).map(val => val.message).join(', ');
            return res.status(400).json({ success: false, message });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};
