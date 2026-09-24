import mongoose from "mongoose";

const accountantSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true
    },

    staffId: {
        type: String,
        trim: true,
        index: true
    },

    department: {
        type: String,
        trim: true,
        default: "Finance"
    },

    designation: {
        type: String,
        trim: true,
        default: "Accountant"
    },

    // ── Personal ──
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
        type: String       // URL / path after upload
    },

    // ── Professional ──
    qualification: {
        type: String,
    },

    experience: {
        type: Number,
        min: 0             // years
    },

    joiningDate: {
        type: Date
    },

    salary: {
        type: Number,
        min: 0             // monthly, in ₹
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

const AccountantProfile = mongoose.model("Accountant", accountantSchema);
export default AccountantProfile;