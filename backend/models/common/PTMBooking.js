import mongoose from "mongoose";

const ptmBookingSchema = new mongoose.Schema({
    ptm: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PTM",
        required: true
    },

    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true
    },

    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Parent",
        required: true
    },

    slot: {
        type: String,
        required: true
    },

    attended: {
        type: Boolean,
        default: false
    },

    remarks: String,

    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    }

}, { timestamps: true });

export default mongoose.model("PTMBooking", ptmBookingSchema);