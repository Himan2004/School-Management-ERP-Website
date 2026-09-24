import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema({
    // Who applied
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    from: { type: Date, required: true },
    to: { type: Date, required: true },
    reason: { type: String, required: true },

    leaveType: {
        type: String,
        enum: ["sick", "casual", "emergency", "other"],
        default: "other"
    },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },

    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    remarks: String,

    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    }

}, { timestamps: true });

export default mongoose.model("Leave", leaveSchema);