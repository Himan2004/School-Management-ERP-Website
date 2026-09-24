import mongoose from "mongoose";

const schoolAcademicConfigurationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },

    academicYear: {
      type: String,
      required: true,
      trim: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
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
        ref: "Subject",
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
      },
    ],

    examPatterns: [
      {
        name: { type: String, trim: true },
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
            subjectRef: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Subject",
              required: true,
            },
            maxMarks: { type: Number },
            weightage: { type: Number },
          },
        ],
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

    isCurrent: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Archived"],
      default: "Active",
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Ensure a school only has one configuration per academic year
schoolAcademicConfigurationSchema.index({ schoolId: 1, academicYear: 1 }, { unique: true });

const SchoolAcademicConfiguration = mongoose.model(
  "SchoolAcademicConfiguration",
  schoolAcademicConfigurationSchema
);

export default SchoolAcademicConfiguration;
