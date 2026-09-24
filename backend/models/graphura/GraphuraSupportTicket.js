import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    sender: {
        type: String,
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GraphuraAdmin",
        required: true
    },
    role: {
        type: String,
        enum: ["admin", "support"],
        default: "admin"
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    isStaff: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const graphuraSupportTicketSchema = new mongoose.Schema({
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GraphuraAdmin",
        required: true,
        index: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ["school-management", "user-management", "subscriptions", "technical", "other"]
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "medium"
    },
    status: {
        type: String,
        enum: ["open", "in-progress", "resolved", "closed"],
        default: "open",
        index: true
    },
    message: { // Initial message
        type: String,
        required: true
    },
    messages: [messageSchema],
    lastUpdatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Update lastUpdatedAt on every message addition
graphuraSupportTicketSchema.pre('save', function(next) {
    if (this.isModified('messages')) {
        this.lastUpdatedAt = Date.now();
    }
    next();
});

const GraphuraSupportTicket = mongoose.model("GraphuraSupportTicket", graphuraSupportTicketSchema);

export default GraphuraSupportTicket;
