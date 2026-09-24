import mongoose from "mongoose";

const feeLineSchema = new mongoose.Schema(
  {
    feeHeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeHead",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    dueDate: {
      type: Date,
    },

    overrideReason: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const feeStructureSchema = new mongoose.Schema(
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

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    feeLines: {
      type: [feeLineSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: "At least one fee line is required",
      },
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    // Toggleable status — visible in the list, greyed out, can be
    // switched back on. Does NOT remove the document from queries.
    isActive: {
      type: Boolean,
      default: true,
    },

    // Permanent removal flag — set by the Delete button. Once true,
    // this document is excluded from every read in the controller
    // (list, lookup-for-new-students, duplicate checks). This is what
    // makes "Delete" actually behave like a delete instead of mirroring
    // the Active/Inactive toggle.
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },

    lateFee: {
      type: Number,
      default: 0,
    },

    gst: {
      type: Boolean,
      default: false,
    },

    gstPercent: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
    },

    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
    },
  },
  {
    timestamps: true,
  },
);

feeStructureSchema.pre("save", function (next) {
  this.totalAmount = this.feeLines.reduce((sum, line) => sum + line.amount, 0);
  next();
});

// Only one ACTIVE, non-deleted structure per class+year.
feeStructureSchema.index(
  { organization: 1, classId: 1, academicYear: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true, isDeleted: false },
  }
);

const FeeStructure = mongoose.model("FeeStructure", feeStructureSchema);
export default FeeStructure;
