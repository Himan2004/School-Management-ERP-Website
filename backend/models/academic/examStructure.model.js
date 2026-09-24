import mongoose from "mongoose";

const subjectMarkingSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    theoryMaxMarks: { type: Number, default: 0, min: 0 },
    practicalMaxMarks: { type: Number, default: 0, min: 0 },
    internalMaxMarks: { type: Number, default: 0, min: 0 },
    totalMaxMarks: { type: Number, default: 0, min: 0 },
    passingMarks: { type: Number, required: true, min: 0 },
    isOptional: { type: Boolean, default: false },
  },
  { _id: false }
);

const examStructureSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    examName: {
      type: String,
      required: true,
      trim: true,
    },
    examType: {
      type: String,
      enum: ["Unit Test", "Mid Term", "Final Term", "Pre Board", "Board", "Class Test","Term Exam","Term"],
      required: true,
    },
    term: {
      type: String,
      enum: ["term1", "term2", "annual", null],
      default: null,
    },
    applicableClasses: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Classes" },
    ],
    subjectMarkings: {
      type: [subjectMarkingSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one subject marking is required",
      },
    },
    gradingConfigRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicConfig",
      required: true,
    },
    weightagePercentage: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    allowGraceMarks: {
      type: Boolean,
      default: false,
    },
    graceMarksLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

examStructureSchema.index(
  { organization: 1, school: 1, academicYear: 1, examName: 1 },
  { unique: true }
);

const ExamStructure = mongoose.model("ExamStructure", examStructureSchema);
export default ExamStructure;
