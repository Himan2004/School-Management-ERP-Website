import mongoose from "mongoose";

const ptmSchema = new mongoose.Schema({
    title: String,

    date: { type: Date, required: true },

    class: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class"
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },

    description: String,

    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    }

}, { timestamps: true });

export default mongoose.model("PTM", ptmSchema);