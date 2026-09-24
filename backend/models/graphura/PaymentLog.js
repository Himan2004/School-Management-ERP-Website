import mongoose from "mongoose";

const paymentLogSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    amountPaid: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      default: "Online Transfer", // E.g., Cash, Cheque, Online
    },
    remark: {
      type: String,
      default: "", // To store sales team descriptions
    },
    billingCycle: {
      type: String,
      required: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      default: "successful",
    },
  },
  { timestamps: true },
);

export default mongoose.model("PaymentLog", paymentLogSchema);