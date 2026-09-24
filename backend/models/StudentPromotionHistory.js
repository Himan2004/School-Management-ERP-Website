import mongoose from "mongoose";

const studentPromotionHistorySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    oldClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    oldSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    newClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },
    newSection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      default: null,
    },
    oldAcademicYear: {
      type: String,
      required: true,
    },
    newAcademicYear: {
      type: String,
      default: null,
    },
    oldRoll: {
      type: String,
      default: "",
    },
    newRoll: {
      type: String,
      default: "",
    },
    actionType: {
      type: String,
      enum: ["promote", "passout", "dropout"],
      required: true,
    },
    promotedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

studentPromotionHistorySchema.index({ school: 1, createdAt: -1 });

const StudentPromotionHistory = mongoose.models.StudentPromotionHistory || mongoose.model("StudentPromotionHistory", studentPromotionHistorySchema);
export default StudentPromotionHistory;
