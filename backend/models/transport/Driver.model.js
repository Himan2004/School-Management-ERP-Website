import mongoose from "mongoose";

const driverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    staffProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StaffProfile",
      default: null,
    },

    // Identity
    driverId: { type: String, trim: true, index: true },
    photo: { type: String, default: null },

    // Personal
    phone: { type: String, trim: true },
    alternatePhone: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ["Male", "Female", "Other"] },
    bloodGroup: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true },

    // Professional
    licenseNo: { type: String, trim: true },
    licenseExpiry: { type: Date },
    experience: { type: String, trim: true },
    joiningDate: { type: Date },
    driverType: {
      type: String,
      enum: ["Permanent", "Contract", "Part-time"],
      default: "Permanent",
    },
    rating: { type: Number, default: 0, min: 0, max: 5 },

    // Vehicle & Route
    assignedBus: { type: String, trim: true },
    busNumber: { type: String, trim: true },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusRoute",
      default: null,
    },
    shift: {
      type: String,
      enum: ["Morning", "Evening", "Both"],
      default: "Both",
    },

    // Health & Safety
    height: { type: String, trim: true },
    weight: { type: String, trim: true },
    vision: { type: String, trim: true },
    medicalConditions: { type: String, default: "None" },
    emergencyContact: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      phone: { type: String, trim: true },
    },

    // Skills & Bio
    bio: { type: String, trim: true },
    achievements: { type: [String], default: [] },
    languages: { type: [String], default: [] },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended"],
      default: "Active",
    },
  },
  { timestamps: true },
);
const Driver = mongoose.models.Driver || mongoose.model("Driver", driverSchema);
export default Driver;
