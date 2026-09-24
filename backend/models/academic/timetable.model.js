import mongoose from "mongoose";

const periodSlotSchema = new mongoose.Schema(
  {
    periodNumber: { type: Number, required: true },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isBreak: { type: Boolean, default: false },
    breakLabel: { type: String, trim: true },
    room: { type: String, trim: true },
    lectureType: { type: String, trim: true, default: "Normal" },
  },
  { _id: true }
);

const dayScheduleSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      required: true,
    },
    isWorkingDay: { type: Boolean, default: true },
    periods: { type: [periodSlotSchema], default: [] },
  },
  { _id: false }
);

const timetableSchema = new mongoose.Schema(
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
      ref: "Classes",
      required: true,
    },
    section: {
      type: String,
      trim: true,
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
    effectiveTo: {
      type: Date,
      default: null,
    },
    schedule: {
      type: [dayScheduleSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one day schedule is required",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

timetableSchema.index(
  { school: 1, class: 1, section: 1, academicYear: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

const Timetable = mongoose.model("Timetable", timetableSchema);
export default Timetable;