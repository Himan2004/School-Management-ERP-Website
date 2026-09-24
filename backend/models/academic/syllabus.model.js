import mongoose from "mongoose";

const syllabusSchema = new mongoose.Schema(
    {
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "School",
            required: true,
        },
        class: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
            required: true,
        },
        academicYear: {
            type: String,
            required: true,
        },
        subject: {
            type: String,
            required: true,
        },
        term: {
            type: String,
            required: true,
            default: "Term 1",
        },
        description: {
            type: String,
            default: "",
        },
        fileUrl: {
            type: String,
            required: true,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

// Prevent redefining the model if it already exists
const Syllabus = mongoose.models.Syllabus || mongoose.model("Syllabus", syllabusSchema);

export default Syllabus;
