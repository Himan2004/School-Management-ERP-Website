import mongoose from "mongoose";

const promotionHistorySchema = new mongoose.Schema({
  runBy: {
    type: String,
    required: true
  },
  school: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "School",
    required: true,
    index: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true
  },
  fromAcademicYear: {
    type: String,
    required: true
  },
  toAcademicYear: {
    type: String,
    required: true
  },
  promotedTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  previousDesignation: {
    type: String,
    required: true
  },
  newDesignation: {
    type: String,
    required: true
  },
  actionType: {
    type: String,
    enum: ["promotion", "demotion"],
    required: true
  },
  effectiveDate: {
    type: Date,
    required: true
  },
  remarks: {
    type: String,
    required: true
  }
}, { timestamps: true });

promotionHistorySchema.index({ school: 1, createdAt: -1 });

// Registering as TeacherPromotionHistory to prevent naming conflicts with the student PromotionHistory model
const PromotionHistory = mongoose.models.TeacherPromotionHistory || mongoose.model("TeacherPromotionHistory", promotionHistorySchema);
export default PromotionHistory;
