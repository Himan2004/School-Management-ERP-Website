import mongoose from "mongoose";

const responseSchema = new mongoose.Schema(
  {
    user: {
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
  { _id: true },
);

const escalationLogSchema = new mongoose.Schema(
  {
    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    escalatedByRole: {
      type: String,
      enum: [
        "student",
        "parent",
        "teacher",
        "admin",
        "accountant",
        "principal",
        "hq_admin",
        "super_admin",
      ],
      required: true,
    },
    escalatedToRole: {
      type: String,
      enum: [
        "teacher",
        "admin",
        "accountant",
        "principal",
        "hq_admin",
        "super_admin",
        "graphura_admin",
      ],
      required: true,
    },
    escalationLevel: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    escalatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const historySchema = new mongoose.Schema(
  {
    status: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedAt: { type: Date, default: Date.now },
    comment: { type: String },
  },
  { _id: false },
);

const ticketSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    admissionId: {
      type: String,
      default: "",
    },
    class: {
      type: String,
      default: "",
    },
    section: {
      type: String,
      default: "",
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    receiverType: {
      type: String,
      default: "",
    },
    subject: {
      type: String,
      default: "",
    },
    history: {
      type: [historySchema],
      default: [],
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
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
      // 🌟 UPDATED ENUM: Added all categories from Teacher and Admin frontend forms
      enum: [
        "academic",
        "fee",
        "discipline",
        "disciplinary",
        "transport",
        "general",
        "complaint",
        "query",
        "id_card",
        "infrastructure",
        "payroll",
        "technical",
        "billing",
        "feature_request",
      ],
      required: true,
      index: true,
    },
    ticketType: {
      type: String,
      default: "standard",
    },
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    raisedByRole: {
      type: String,
      enum: [
        "student",
        "parent",
        "teacher",
        "admin",
        "accountant",
        "principal",
        "hq_admin",
        "super_admin",
      ],
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedToRole: {
      type: String,
      // 🌟 UPDATED ENUM: Added graphura_admin to support Super Admin escalations
      enum: [
        "teacher",
        "admin",
        "accountant",
        "principal",
        "hq_admin",
        "super_admin",
        "graphura_admin",
      ],
    },
    relatedStudent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "escalated", "resolved", "closed"],
      default: "open",
      index: true,
    },
    escalationLevel: {
      type: Number,
      default: 0,
      min: 0,
      max: 4,
    },
    escalationLog: {
      type: [escalationLogSchema],
      default: [],
    },
    responses: {
      type: [responseSchema],
      default: [],
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
    resolutionNote: {
      type: String,
      trim: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    attachments: [
      {
        name: { type: String, trim: true },
        url: { type: String, trim: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

ticketSchema.index({ school: 1, status: 1, priority: 1 });
ticketSchema.index({ raisedBy: 1, status: 1 });
ticketSchema.index({ organization: 1, escalationLevel: 1, status: 1 });

const Ticket = mongoose.model("Ticket", ticketSchema);
export default Ticket;
