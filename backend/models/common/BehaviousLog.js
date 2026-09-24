import mongoose from "mongoose";

const behaviourSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    remark: String,
    action: String,

    severity: {
        type: String,
        enum: ["low", "medium", "high"],
        default: "low"
    },

    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    }

}, { timestamps: true });

export default mongoose.model("BehaviourLog", behaviourSchema);