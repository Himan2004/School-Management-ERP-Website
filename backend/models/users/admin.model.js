import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    gender: {
        type: String,
        enum: ["Male", "Female", "Other"]
    },

    dob: {
        type: Date
    },

    address: {
        type: String
    },

    photo: {
        type: String
    },

    phoneNumber: {
        type: String
    },

    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true
    }

}, { timestamps: true });

const AdminProfile = mongoose.model("Admin", adminSchema);
export default AdminProfile;
