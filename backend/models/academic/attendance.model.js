import mongoose from "mongoose";

const studentAttendanceEntrySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent", "late", "half_day", "on_leave"],
      required: true,
    },
    remarks: { type: String, trim: true },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
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
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },
    attendanceType: {
      type: String,
      enum: ["class", "subject"],
      default: "class",
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    markedByRole: {
      type: String,
      enum: ["teacher", "admin", "principal"],
      required: true,
    },
    entries: {
      type: [studentAttendanceEntrySchema],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one student entry is required",
      },
    },
    totalPresent: { type: Number, default: 0 },
    totalAbsent: { type: Number, default: 0 },
    totalLate: { type: Number, default: 0 },
    isEdited: { type: Boolean, default: false },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    editedAt: { type: Date, default: null },
    editReason: { type: String, trim: true },
  },
  { timestamps: true }
);

attendanceSchema.pre("save", function (next) {
  this.totalPresent = this.entries.filter((e) => e.status === "present").length;
  this.totalAbsent = this.entries.filter((e) => e.status === "absent").length;
  this.totalLate = this.entries.filter((e) => e.status === "late").length;
  next();
});

attendanceSchema.index(
  { school: 1, class: 1, section: 1, subject: 1, date: 1, attendanceType: 1 },
  { unique: true }
);
attendanceSchema.index({ school: 1, date: 1 });

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;