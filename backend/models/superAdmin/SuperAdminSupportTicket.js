import mongoose from "mongoose";

const superAdminSupportTicketSchema = new mongoose.Schema({
    // The superadmin who raised the ticket
    superAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SuperAdmin",
        required: true,
        index: true
    },
    // The organization this superadmin belongs to
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
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
        enum: ["technical", "billing", "school-management", "feature-request", "other"],
        default: "other"
    },
    priority: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        default: "medium"
    },
    status: {
        type: String,
        enum: ["open", "in-progress", "resolved", "closed"],
        default: "open",
        index: true
    },
    // The initial message from the superadmin
    description: {
        type: String,
        required: true,
        trim: true
    },
    // Conversation thread
    messages: [
        {
            sender: { type: String, required: true },   // name
            senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
            role: { type: String, enum: ["superadmin", "graphura_support"], default: "superadmin" },
            message: { type: String, required: true, trim: true },
            timestamp: { type: Date, default: Date.now }
        }
    ],
    resolvedAt: { type: Date },
    lastActivityAt: { type: Date, default: Date.now }
}, { timestamps: true });

superAdminSupportTicketSchema.pre("save", function (next) {
    if (this.isModified("messages")) {
        this.lastActivityAt = Date.now();
    }
    if (this.status === "resolved" && !this.resolvedAt) {
        this.resolvedAt = Date.now();
    }
    next();
});

const SuperAdminSupportTicket = mongoose.model("SuperAdminSupportTicket", superAdminSupportTicketSchema);
export default SuperAdminSupportTicket;
