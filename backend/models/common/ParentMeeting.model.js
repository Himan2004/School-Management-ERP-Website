import mongoose from "mongoose";

// Sub-schema for individual 15-minute slots
const slotSchema = new mongoose.Schema({
    time: { type: String, required: true }, // e.g., "9:00 AM"
    isBooked: { type: Boolean, default: false },
    bookedByParent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: true });

// Sub-schema for tracking Will Attend / Cannot Attend & Past Attendance
const rsvpSchema = new mongoose.Schema({
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    response: { type: String, enum: ['yes', 'no'], required: true }, // Will Attend / Cannot Attend
    hasAttended: { type: Boolean, default: false }, // Used later by teachers to mark present
    remarks: { type: String, default: "-" } // Used for past meetings
}, { _id: false });

const parentMeetingSchema = new mongoose.Schema({
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true,
        index: true
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    },
    
    // UI: "PTM", "Orientation", "Staff"
    type: {
        type: String,
        enum: ["PTM", "Orientation", "General"],
        default: "PTM"
    },
    
    title: { type: String, required: true, trim: true },
    
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // e.g., "9:00 AM"
    endTime: { type: String, required: true },   // e.g., "11:00 AM"
    
    venue: { type: String, required: true, trim: true },
    
    // The teacher/host conducting the meeting
    hostTeacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    
    // Used to map UI "Teacher Name"
    hostNameLabel: { type: String, required: true }, 

    // Target Audience
    targetClass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Classes"
    },

    // Arrays powering the UI interactions
    availableSlots: {
        type: [slotSchema],
        default: []
    },

    responses: {
        type: [rsvpSchema],
        default: []
    },

    status: {
        type: String,
        enum: ["scheduled", "completed", "cancelled"],
        default: "scheduled"
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }

}, { timestamps: true });

// Optimize for fetching upcoming/past meetings quickly
parentMeetingSchema.index({ school: 1, date: 1, status: 1 });

const ParentMeeting = mongoose.model("ParentMeeting", parentMeetingSchema);
export default ParentMeeting;