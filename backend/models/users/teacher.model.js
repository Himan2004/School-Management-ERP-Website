import mongoose from "mongoose";

const teacherSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    phone: {
        type: String,
        required: true
    },

    staffId: {
        type: String,
        trim: true,
        index: true
    },

    department: {
        type: String,
        trim: true
    },

    designation: {
        type: String,
        trim: true
    },

    photo: String,

    gender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        default: "Male"
    },

    dateOfBirth: Date,

    qualification: String,

    experience: {
        type: Number,
        default: 0
    },

    joiningDate: Date,

    salary: {
        type: Number,
        default: 0
    },

    assignedClasses: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class"
        }
    ],

    subjects: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject"
        }
    ],

    address: {
        street: String,
        city: String,
        state: String,
        pincode: String
    },

    emergencyContact: String,
    alternativePhone: String,
    bloodGroup: String,
    maritalStatus: String,
    nationality: String,
    emergencyContactName: String,
    emergencyContactRelation: String,
    emergencyContactPhone: String,


    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    },

    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    },

    bankDetails: {
        accountNumber: { type: String, trim: true },
        ifsc: { type: String, trim: true },
        bankName: { type: String, trim: true },
        accountHolderName: { type: String, trim: true }
    },

    razorpayContactId: {
        type: String,
        trim: true
    },

    razorpayFundAccountId: {
        type: String,
        trim: true
    },

    section: {
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

teacherSchema.index({ staffId: 1, school: 1 }, { unique: true });

const Teacher = mongoose.models.Teacher || mongoose.model('Teacher', teacherSchema);
export default Teacher;
