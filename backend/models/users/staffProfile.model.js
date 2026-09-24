import mongoose from "mongoose";

const staffProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    },

    staffId: {
        type: String,
        trim: true,
        index: true
    },

    department: {
        type: String,
        trim: true,
        required: true
    },

    designation: {
        type: String,
        trim: true,
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        default: "Male"
    },

    dateOfBirth: Date,

    address: String,

    photo: String,

    qualification: String,

    experience: {
        type: Number,
        default: 0
    },

    joiningDate: {
        type: Date,
        default: Date.now
    },

    salary: {
        type: Number,
        default: 0
    },

    bankDetails: {
        accountNumber: { type: String, trim: true },
        ifsc: { type: String, trim: true },
        bankName: { type: String, trim: true },
        accountHolderName: { type: String, trim: true }
    },

    status: {
        type: String,
        enum: ["active", "inactive", "on_leave", "suspended"],
        default: "active"
    },

    grade: {
        type: String,
        default: 'Grade 1'
    },
    performanceRating: {
        type: Number,
        default: 4.5
    },
    attendance: {
        type: String,
        default: '95'
    },
    discipline: {
        type: String,
        default: 'Good'
    },
    achievements: {
        type: String,
        default: ''
    },
    training: {
        type: String,
        default: ''
    },
    managerRemarks: {
        type: String,
        default: ''
    },
    recommendation: {
        type: String,
        default: ''
    },
    promotionStatus: {
        type: String,
        enum: ['Eligible', 'Pending Review', 'Promoted', 'Demoted', 'Not Eligible'],
        default: 'Eligible'
    },
    lastPromotionDate: {
        type: Date,
        default: null
    }

}, { timestamps: true });

const StaffProfile = mongoose.model("StaffProfile", staffProfileSchema);
export default StaffProfile;
