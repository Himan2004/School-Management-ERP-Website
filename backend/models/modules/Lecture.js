import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema(
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
      required: true,
      trim: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: String,
      required: true,
      trim: true,
    },
    lectureTitle: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["Theory", "Practical", "Tutorial", "Lab", "Seminar", "Normal", "Extra", "Revision"],
      default: "Theory",
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled", "Rescheduled"],
      default: "Scheduled",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

lectureSchema.index({ school: 1, date: 1 });
lectureSchema.index({ school: 1, teacher: 1, date: 1 });
lectureSchema.index({ school: 1, room: 1, date: 1 });
lectureSchema.index({ school: 1, class: 1, section: 1, date: 1 });

export default mongoose.models.Lecture || mongoose.model("Lecture", lectureSchema);
