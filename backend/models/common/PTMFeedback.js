import mongoose from "mongoose";

const ptmFeedbackSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    },
    ptm: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PTM"
    },
    ptmEvent: {
        type: String,
        required: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Parent",
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },
    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        required: true
    },
    category: {
        type: String,
        enum: ["Academics", "Teachers", "Infrastructure", "Behavior", "Activities"],
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comments: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending Review", "Contacted Parent", "Resolved"],
        default: "Pending Review"
    },
    principalNotes: {
        type: String,
        default: ""
    },
    academicYear: {
        type: String,
        required: true
    }
}, { timestamps: true });

ptmFeedbackSchema.index({ school: 1, academicYear: 1, status: 1 });

const PTMFeedback = mongoose.model("PTMFeedback", ptmFeedbackSchema);
export default PTMFeedback;
