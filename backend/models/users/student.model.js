import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    rollNo: {
      type: String,
      required: false,
      default: null,
    },
    enrollmentNo: {
      type: String,
      unique: true,
      sparse: true,
    },
    admissionNo: {
      type: String,
    },

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },

    dateOfBirth: Date,

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    photo: String,
    bloodGroup: String,

    phone: String,
    alternatePhone: String,
    address: String,
    bio: String,

    notificationSettings: {
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      homeworkReminders: { type: Boolean, default: true },
      examReminders: { type: Boolean, default: true },
      attendanceAlerts: { type: Boolean, default: true },
      resultUpdates: { type: Boolean, default: true },
      eventUpdates: { type: Boolean, default: true },
      parentMeetingReminders: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: false },
      promotionalEmails: { type: Boolean, default: false },
    },

    privacySettings: {
      profileVisibility: { type: String, default: "public" },
      showEmail: { type: Boolean, default: true },
      showPhone: { type: Boolean, default: true },
      showAttendance: { type: Boolean, default: true },
      showResults: { type: Boolean, default: true },
      allowMessages: { type: Boolean, default: true },
      allowFriendRequests: { type: Boolean, default: true },
      dataSharing: { type: Boolean, default: false },
    },

    appearanceSettings: {
      theme: { type: String, default: "light" },
      fontSize: { type: String, default: "medium" },
      compactView: { type: Boolean, default: false },
      animations: { type: Boolean, default: true },
      darkMode: { type: Boolean, default: false },
      sidebarCollapsed: { type: Boolean, default: false },
    },

    securitySettings: {
      twoFactorAuth: { type: Boolean, default: false },
      loginAlerts: { type: Boolean, default: true },
      deviceManagement: { type: Boolean, default: true },
      sessionTimeout: { type: String, default: "30" },
    },

    languageSettings: {
      language: { type: String, default: "english" },
      dateFormat: { type: String, default: "DD/MM/YYYY" },
      timeFormat: { type: String, default: "12h" },
      timezone: { type: String, default: "Asia/Kolkata" },
    },

    downloadSettings: {
      downloadQuality: { type: String, default: "high" },
      autoDownload: { type: Boolean, default: false },
      downloadLocation: { type: String, default: "/downloads" },
    },

    // Parent linkage
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parent",
      required: true,
    },

    // Admission
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    admissionFeeStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },

    // Documents uploaded by admin
    documents: {
      birthCertificate: String,
      studentAadhaar: String,
      parentAadhaar: String,
      previousYearMarksheet: String,
      transferCertificate: String,
    },

    // Student status
    status: {
      type: String,
      enum: ["active", "inactive", "transferred", "dropped", "dropout", "passout", "tc_issued"],
      default: "active",
    },

    lastPromotedDate: {
      type: Date,
      default: null,
    },
    promotedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    promotionHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StudentPromotionHistory",
      },
    ],

    // Bus / transport
    transport: {
      enrolled: { type: Boolean, default: false },
      routeId: { type: mongoose.Schema.Types.ObjectId, ref: "BusRoute" },
    },

    // Health (from Student profile section in doc)
    health: {
      notes: String, // nurse updates
      checkupHistory: [
        {
          date: Date,
          remark: String,
        },
      ],
    },

    // Previous school info (for transfer cases)
    previousSchool: {
      name: String,
      tcNumber: String,
      tcDate: Date,
    },

    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
  },
  { timestamps: true },
);

// Compound unique: one roll number per class per academic year per school (ignoring null and empty values)
studentSchema.index(
  { rollNo: 1, class: 1, academicYear: 1, school: 1 },
  { 
    unique: true,
    partialFilterExpression: { 
      rollNo: { $type: "string", $ne: "" } 
    }
  },
);

studentSchema.pre("save", function (next) {
  if (this.admissionNo && !this.enrollmentNo) {
    this.enrollmentNo = this.admissionNo;
  } else if (this.enrollmentNo && !this.admissionNo) {
    this.admissionNo = this.enrollmentNo;
  }
  next();
});

const Student = mongoose.model("Student", studentSchema);

// Drop old index programmatically to allow mongoose to recreate it with the partialFilterExpression
mongoose.connection.on("open", async () => {
  try {
    const adminDb = mongoose.connection.db;
    const collections = await adminDb.listCollections({ name: "students" }).toArray();
    if (collections.length > 0) {
      const studentCollection = adminDb.collection("students");
      const indexes = await studentCollection.indexes();
      const hasOldIndex = indexes.some(idx => idx.name === "rollNo_1_class_1_academicYear_1_school_1");
      if (hasOldIndex) {
        await studentCollection.dropIndex("rollNo_1_class_1_academicYear_1_school_1");
      }
    }
  } catch (err) {
    console.error("Error checking/dropping old student rollNo index:", err.message);
  }
});

export default Student;
