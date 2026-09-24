import mongoose from "mongoose";

const policyAuditLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    user: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["create", "update", "delete", "resolve"],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

policyAuditLogSchema.index({ organizationId: 1, createdAt: -1 });

const PolicyAuditLog = mongoose.model("PolicyAuditLog", policyAuditLogSchema);
export default PolicyAuditLog;
