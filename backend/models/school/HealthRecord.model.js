import mongoose from "mongoose";

const medicationSchema = new mongoose.Schema({
    name: { type: String, trim: true },
    dosage: { type: String, trim: true },
    frequency: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    prescribedBy: { type: String, trim: true }
}, { _id: true });

const visitSchema = new mongoose.Schema({
    date: { type: Date, default: Date.now },
    reason: { type: String, trim: true },
    symptoms: { type: String, trim: true },
    treatment: { type: String, trim: true },
    temperature: { type: String, trim: true },
    bloodPressure: { type: String, trim: true },
    weight: { type: String, trim: true },
    height: { type: String, trim: true },
    nurseNote: { type: String, trim: true },
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date, default: null },
    sentHome: { type: Boolean, default: false },
    parentNotified: { type: Boolean, default: false }
}, { _id: true, timestamps: true });

const healthRecordSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    },

    // Basic Health Info
    bloodGroup: { type: String, trim: true },
    height: { type: String, trim: true },
    weight: { type: String, trim: true },
    bmi: { type: String, trim: true },

    // Medical History
    allergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    disabilities: { type: [String], default: [] },
    vaccinations: { type: [String], default: [] },

    // Emergency
    emergencyContact: {
        name: { type: String, trim: true },
        relation: { type: String, trim: true },
        phone: { type: String, trim: true }
    },

    // Doctor
    familyDoctor: {
        name: { type: String, trim: true },
        phone: { type: String, trim: true },
        hospital: { type: String, trim: true }
    },

    // Current medications
    medications: { type: [medicationSchema], default: [] },

    // Nurse visit history
    visits: { type: [visitSchema], default: [] },

    // Insurance
    insuranceProvider: { type: String, trim: true },
    insurancePolicyNo: { type: String, trim: true },

    notes: { type: String, trim: true }

}, { timestamps: true });

const HealthRecord = mongoose.models.HealthRecord || mongoose.model("HealthRecord", healthRecordSchema);
export default HealthRecord;
