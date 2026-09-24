import mongoose from "mongoose";

const academicConfigSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    academicYear: {
      label: { type: String, trim: true },
      startDate: { type: Date },
      endDate: { type: Date },
      isActive: { type: Boolean, default: true },
    },

    classes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
      },
    ],

    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "organizationSubjects",
      },
    ],

    holidays: [
      {
        title: { type: String, trim: true },
        date: { type: Date },
        type: {
          type: String,
          enum: ["holiday", "event", "ptm", "vacation", "exam", "other"],
          default: "holiday",
        },
        isGlobal: { type: Boolean, default: true },
        applicableBranches: [
          { type: mongoose.Schema.Types.ObjectId, ref: "Branch" },
        ],
      },
    ],

    examPattern: [
      {
        name: { type: String, trim: true },
        // Tie the pattern exclusively to a Class
        classRef: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Class",
          required: true,
        },
        totalMarks: { type: Number },
        passingMarks: { type: Number },
        weightage: { type: Number },
        components: [
          {
            // Reference the Subject dynamically
            subjectRef: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "organizationSubjects",
              required: true,
            },
            maxMarks: { type: Number },
            weightage: { type: Number },
          },
        ],
        resultApprovalRequired: { type: Boolean, default: true },
      },
    ],

    gradingSystem: {
      type: {
        type: String,
        enum: ["percentage", "cgpa", "custom"],
        default: "percentage",
      },
      passingMarks: { type: Number, default: 33 },
      slabs: [
        {
          grade: { type: String },
          min: { type: Number },
          max: { type: Number },
          gradePoint: { type: Number },
          remarks: { type: String },
        },
      ],
    },

    //pdfs
    syllabusTemplates: [
      {
        type: String,
        required: true,
      },
    ],

    rules: {
      attendance: {
        minPercentage: { type: Number, default: 75 },
        lateMarkGracePeriodMinutes: { type: Number, default: 15 },
        halfDayThresholdHours: { type: Number, default: 4 },
        autoAbsentAfterMinutes: { type: Number, default: 60 },
        lowAttendanceAlertPercent: { type: Number, default: 80 }, // alert before hitting min
        enabled: {
          minPercentage: { type: Boolean, default: true },
          lateMarkGracePeriodMinutes: { type: Boolean, default: true },
          halfDayThresholdHours: { type: Boolean, default: true },
          autoAbsentAfterMinutes: { type: Boolean, default: true },
          lowAttendanceAlertPercent: { type: Boolean, default: true },
        },
      },
      exam: {
        passingCriteria: { type: String, trim: true }, // "33% in each subject"
        allowGraceMarks: { type: Boolean, default: false },
        graceMarksLimit: { type: Number, default: 0 },
        reExamAllowed: { type: Boolean, default: false },
      },
      fee: {
        lateFineType: {
          type: String,
          enum: ["flat", "percentage"],
          default: "flat",
        },
        lateFineValue: { type: Number, default: 0 },
        graceDaysBeforeLateFee: { type: Number, default: 5 },
        dueDateReminderDays: [{ type: Number }], // [7, 3, 1]
      },
      discipline: {
        maxWarningsBeforeSuspension: { type: Number, default: 3 },
        autoEscalateToHQ: { type: Boolean, default: false },
      },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

academicConfigSchema.index({ organization: 1 }, { unique: true });

const AcademicConfig = mongoose.model("AcademicConfig", academicConfigSchema);

export default AcademicConfig;
