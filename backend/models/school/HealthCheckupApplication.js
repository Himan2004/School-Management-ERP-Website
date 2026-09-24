import mongoose from "mongoose";

const healthCheckupApplicationSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    },
    reason: { type: String, required: true },
    preferredDate: { type: Date, required: true },
    preferredTime: { type: String, required: true },
    symptoms: { type: [String], default: [] },
    additionalNotes: { type: String },
    emergencyContact: { type: String },
    emergencyPhone: { type: String },
    previousIssues: { type: String },
    allergies: { type: String },
    status: {
        type: String,
        enum: ["Pending", "Approved", "Scheduled", "Completed", "Cancelled"],
        default: "Pending"
    },
    appliedDate: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.models.HealthCheckupApplication || mongoose.model("HealthCheckupApplication", healthCheckupApplicationSchema);
