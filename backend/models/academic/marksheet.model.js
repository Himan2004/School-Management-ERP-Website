import mongoose from "mongoose";

const subjectMarkEntrySchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    theoryMarks: { type: Number, default: null, min: 0 },
    practicalMarks: { type: Number, default: null, min: 0 },
    internalMarks: { type: Number, default: null, min: 0 },
    totalMarks: { type: Number, default: 0, min: 0 },
    maxMarks: { type: Number, required: true, min: 0 },
    passingMarks: { type: Number, required: true, min: 0 },
    graceMarksApplied: { type: Number, default: 0, min: 0 },
    isAbsent: { type: Boolean, default: false },
    isPass: { type: Boolean, default: false },
    grade: { type: String, trim: true },
    gradePoint: { type: Number, default: 0 },
    remarks: { type: String, trim: true },
  },
  { _id: false }
);

const marksheetSchema = new mongoose.Schema(
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
    examSchedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamSchedule",
      required: true,
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
    subjectMarks: {
      type: [subjectMarkEntrySchema],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one subject mark entry is required",
      },
    },
    totalMarksObtained: { type: Number, default: 0 },
    totalMaxMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    cgpa: { type: Number, default: 0 },
    overallGrade: { type: String, trim: true },
    classRank: { type: Number, default: null },
    sectionRank: { type: Number, default: null },
    isPass: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["draft", "submitted", "verified", "published"],
      default: "draft",
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    submittedAt: { type: Date, default: null },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verifiedAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

marksheetSchema.pre("save", function (next) {
  let totalObtained = 0;
  let totalMax = 0;
  let totalGradePoints = 0;
  let allPass = true;

  this.subjectMarks.forEach((s) => {
    s.totalMarks = (s.theoryMarks || 0) + (s.practicalMarks || 0) + (s.internalMarks || 0) + s.graceMarksApplied;
    s.isPass = !s.isAbsent && s.totalMarks >= s.passingMarks;
    if (!s.isPass) allPass = false;
    totalObtained += s.totalMarks;
    totalMax += s.maxMarks;
    totalGradePoints += s.gradePoint || 0;
  });

  this.totalMarksObtained = totalObtained;
  this.totalMaxMarks = totalMax;
  this.percentage = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
  this.cgpa = this.subjectMarks.length > 0
    ? parseFloat((totalGradePoints / this.subjectMarks.length).toFixed(2))
    : 0;
  this.isPass = allPass;
  next();
});

marksheetSchema.index(
  { student: 1, examSchedule: 1 },
  { unique: true }
);
marksheetSchema.index({ school: 1, class: 1, examStructure: 1, status: 1 });

const Marksheet = mongoose.model("Marksheet", marksheetSchema);
export default Marksheet;
