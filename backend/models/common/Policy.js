import mongoose from "mongoose";

const policySchema = new mongoose.Schema(
  {
    policyName: {
      type: String,
      required: true,
      trim: true,
    },
    pdfFile: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Draft"],
      default: "Active",
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    publicId: {
      type: String,
    },
    resourceType: {
      type: String,
    },
    format: {
      type: String,
    },
    bytes: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

policySchema.index({ organizationId: 1, status: 1 });

const Policy = mongoose.model("Policy", policySchema);
export default Policy;
