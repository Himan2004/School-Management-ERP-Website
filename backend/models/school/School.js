import mongoose from "mongoose";

const schoolSchema = new mongoose.Schema(
  {
    // ─── Organization Link ─────────────────────────────────────
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    // ─── Core School Info ──────────────────────────────────────
    schoolName: { type: String, required: true, trim: true },
    yearOfEstablishment: { type: String },
    board: { type: String },
    schoolRanking: { type: String },
    country: { type: String },
    state: { type: String },
    city: { type: String },
    pinCode: { type: String },
    address: { type: String, required: true },
    officialPhone: { type: String, required: true },
    officialEmail: { type: String, required: true, lowercase: true },
    website: { type: String },

    // ─── Academic & Capacity Info ──────────────────────────────
    enrollmentCapacity: { type: String }, // Used to be totalStudents
    gradesOffered: { type: String },
    mediumOfInstruction: { type: String },
    schoolType: { type: String }, // Co-ed / Boys / Girls

    // ─── Principal & Staff ─────────────────────────────────────
    principalName: { type: String, required: true },
    principalEmail: { type: String, required: true, lowercase: true },
    principalPhone: { type: String },
    totalTeachingStaff: { type: String },
    totalNonTeachingStaff: { type: String },
    totalStaff: { type: String },

    // ─── System Identifiers & Status ───────────────────────────
    branchId: { type: String, unique: true, sparse: true },
    loginId: { type: String, default: null }, // Principal/School Login ID
    isActive: { type: Boolean, default: true },
    maxStaffLimit: { type: Number, default: 0 },
    maxStudentLimit: { type: Number, default: 0 },

    // ─── Analytics & Settings ──────────────────────────────────
    previousStats: {
      students: { type: Number, default: 0 },
      teachers: { type: Number, default: 0 },
      staff: { type: Number, default: 0 },
      subjects: { type: Number, default: 0 },
      updatedAt: { type: Date },
    },

    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

export default mongoose.model("School", schoolSchema);
