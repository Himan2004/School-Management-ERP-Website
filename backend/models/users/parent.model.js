import mongoose from "mongoose";

const parentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },

    students: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student"
        }
    ],

    fatherName: String,
    motherName: String,

    primaryContact: {
        type: String,
        required: true
    },
    alternateContact: String,
    address: {
        street: String,
        city: String,
        state: String,
        pincode: String
    },

    aadharCard: String,
    photo: String,

    relation: {
        type: String,
        enum: ["father", "mother", "guardian"],
        default: "father"
    },

    gender: {
        type: String,
        enum: ["male", "female", "other"]
    },

    notifications: {
        sms: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },

        attendance: { type: Boolean, default: true },
        results: { type: Boolean, default: true },
        fees: { type: Boolean, default: true },
        weakSubjectAlert: { type: Boolean, default: true },
        lowAttendanceAlert: { type: Boolean, default: true },
        busTracking: { type: Boolean, default: true },
        events: { type: Boolean, default: true },
        onlineClass: { type: Boolean, default: true }
    },

    readNotifications: { type: [String], default: [] },
    clearedNotifications: { type: [String], default: [] },

    profileExtras: {
        fatherOccupation: String,
        fatherEmail: String,
        motherOccupation: String,
        motherEmail: String,
        guardianName: String,
        guardianRelation: String,
        guardianPhone: String,
        emergencyAddress: String,
        vision: String,
        dental: String,
        achievements: { type: [String], default: [] },
        interests: { type: [String], default: [] },
        languages: { type: [String], default: [] }
    },

    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true
    }

}, { timestamps: true });

const Parent = mongoose.model("Parent", parentSchema);
export default Parent;
