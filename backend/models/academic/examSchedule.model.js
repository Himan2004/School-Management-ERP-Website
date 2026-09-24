import mongoose from "mongoose";

const examSlotSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organizationSubjects",
      required: true,
    },
    examDate: { type: Date, required: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    venue: { type: String, trim: true },
    invigilator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    maxMarks: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, required: true, min: 1 },
  },
  { _id: true },
);

const examScheduleSchema = new mongoose.Schema(
  {
    name: { type: String },
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
    examStructure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamStructure",
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true,
    },
    section: {
      type: String,
      trim: true,
    },
    slots: {
      type: [examSlotSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one exam slot is required",
      },
    },
    status: {
      type: String,
      enum: ["draft", "published", "ongoing", "completed", "cancelled"],
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date, default: null },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    admitCardGenerated: { type: Boolean, default: false },
    admitCardGeneratedAt: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

examScheduleSchema.index(
  { school: 1, examStructure: 1, class: 1, section: 1, academicYear: 1 },
  { unique: true },
);
examScheduleSchema.index({ school: 1, status: 1 });

const ExamSchedule = mongoose.model("ExamSchedule", examScheduleSchema);
export default ExamSchedule;
