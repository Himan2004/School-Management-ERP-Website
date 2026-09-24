import mongoose from "mongoose";

const examSummarySchema = new mongoose.Schema(
  {
    examStructure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamStructure",
      required: true,
    },
    marksheet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Marksheet",
      required: true,
    },
    examName: { type: String, trim: true },
    totalMarksObtained: { type: Number, default: 0 },
    totalMaxMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    weightagePercentage: { type: Number, default: 100 },
    weightedScore: { type: Number, default: 0 },
    isPass: { type: Boolean, default: false },
  },
  { _id: false }
);

const reportCardSchema = new mongoose.Schema(
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
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    rollNumber: {
      type: String,
      trim: true,
    },
    term: {
      type: String,
      enum: ["term1", "term2", "annual"],
      required: true,
    },
    examSummaries: {
      type: [examSummarySchema],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one exam summary is required",
      },
    },
    finalPercentage: { type: Number, default: 0 },
    finalCgpa: { type: Number, default: 0 },
    finalGrade: { type: String, trim: true },
    classRank: { type: Number, default: null },
    sectionRank: { type: Number, default: null },
    totalStudentsInClass: { type: Number, default: null },
    attendancePercentage: { type: Number, default: 0 },
    totalWorkingDays: { type: Number, default: 0 },
    totalPresentDays: { type: Number, default: 0 },
    isPass: { type: Boolean, default: false },
    teacherRemarks: { type: String, trim: true },
    principalRemarks: { type: String, trim: true },
    status: {
      type: String,
      enum: ["draft", "approved", "published"],
      default: "draft",
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    reportCardUrl: { type: String, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

reportCardSchema.pre("save", function (next) {
  if (this.examSummaries.length > 0) {
    let totalWeighted = 0;
    let totalWeight = 0;

    this.examSummaries.forEach((e) => {
      e.weightedScore = parseFloat(((e.percentage * e.weightagePercentage) / 100).toFixed(2));
      totalWeighted += e.weightedScore;
      totalWeight += e.weightagePercentage;
    });

    this.finalPercentage = totalWeight > 0
      ? parseFloat((totalWeighted / totalWeight * 100).toFixed(2))
      : 0;

    this.isPass = this.examSummaries.every((e) => e.isPass);
  }
  next();
});

reportCardSchema.index(
  { student: 1, academicYear: 1, term: 1 },
  { unique: true }
);
reportCardSchema.index({ school: 1, class: 1, term: 1, status: 1 });

const ReportCard = mongoose.model("ReportCard", reportCardSchema);
export default ReportCard;
