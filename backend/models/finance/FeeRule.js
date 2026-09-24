import mongoose from "mongoose";

const feeRuleSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Penalty", "Waiver", "Discount"],
      required: true,
    },
    calcType: {
      type: String,
      enum: ["Fixed", "Percentage"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    gracePeriod: {
      type: Number,
      default: 0,
      min: 0,
    },
    scope: {
      type: String,
      enum: ["Global", "Selected Branches"],
      required: true,
    },
    selectedBranches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
      },
    ],
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const FeeRule = mongoose.model("FeeRule", feeRuleSchema);
export default FeeRule;
