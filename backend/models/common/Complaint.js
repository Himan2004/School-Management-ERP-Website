import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        attachments: [
            {
                name: { type: String, trim: true },
                url: { type: String, trim: true },
            },
        ],
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: true }
);

const historySchema = new mongoose.Schema(
    {
        action: { type: String, required: true },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        timestamp: { type: Date, default: Date.now },
        remarks: { type: String, trim: true }
    },
    { _id: false }
);

const complaintSchema = new mongoose.Schema(
    {
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
            index: true,
        },
        complaintId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            enum: [
                "academic",
                "homework",
                "attendance",
                "behaviour",
                "examination",
                "marks",
                "discipline",
                "technical",
                "other"
            ],
            default: "other",
            index: true,
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "critical"],
            default: "medium",
            index: true,
        },
        status: {
            type: String,
            enum: ["open", "in_progress", "pending", "escalated", "resolved", "closed"],
            default: "open",
            index: true,
        },
        raisedByType: {
            type: String,
            enum: ["student", "parent", "teacher", "admin"],
            default: "teacher",
        },
        raisedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        parent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        subjectTeacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        classId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
            default: null,
        },
        sectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Section",
            default: null,
        },
        assignedTeacherId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        assignedTeacherType: {
            type: String, // "ClassTeacher" | "SubjectTeacher"
            default: "",
        },
        assignedSubject: {
            type: String,
            default: "",
        },
        assignedClass: {
            type: String,
            default: "",
        },
        assignedSection: {
            type: String,
            default: "",
        },
        department: {
            type: String,
            default: "",
            trim: true,
        },
        attachments: [
            {
                name: { type: String, trim: true },
                url: { type: String, trim: true },
                uploadedAt: { type: Date, default: Date.now },
            },
        ],
        conversation: {
            type: [conversationSchema],
            default: [],
        },
        history: {
            type: [historySchema],
            default: [],
        },
        escalated: {
            type: Boolean,
            default: false,
        },
        escalatedAt: {
            type: Date,
            default: null,
        },
        escalatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        escalationReason: {
            type: String,
            default: "",
            trim: true,
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        resolvedAt: {
            type: Date,
            default: null,
        },
        closedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

complaintSchema.index({ school: 1, status: 1, priority: 1 });
complaintSchema.index({ raisedBy: 1, status: 1 });

const Complaint = mongoose.model("Complaint", complaintSchema);
export default Complaint;
