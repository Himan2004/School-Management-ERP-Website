import mongoose from "mongoose";

const principalSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    phone: {
        type: String
    },

    qualification: {
        type: String
    },

    experience: {
        type: String
    },

    joiningDate: {
        type: Date,
        default: Date.now
    },

    photo: {
        type: String
    },

    address: {
        type: String
    },

    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true
    }

}, { timestamps: true });

const Principal = mongoose.model("Principal", principalSchema);
export default Principal