import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const organizationSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    organizationId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    organizationType: {
      type: String,
      enum: ["Single School", "Multi-Branch"],
      required: true,
    },
    quotas: {
      maxSchools: { type: Number, default: 1 },
      maxStudents: { type: Number, default: 500 },
      maxTeachingStaff: { type: Number, default: 50 },
      maxNonTeachingStaff: { type: Number, default: 20 },
      maxStaff: { type: Number, default: 70 },
    },
    organizationAcademic: {
      organizationBoard: { type: String, required: true },
      organizationSections: { type: Number, required: true },
    },
    yearEstablished: { type: String, trim: true },
    organizationLogo: { type: String, default: null },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      country: { type: String, default: "India" },
      pincode: String,
    },
    officialEmail: { type: String, required: true },
    contactNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["active", "suspended", "deactivated"],
      default: "active",
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganizationRequest",
      default: null,
    },
    branchCreationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    passwordChangedAt: { type: Date },

    billing: {
      status: {
        type: String,
        enum: ["active", "past_due", "deactivated", "expired" ],
        default: "deactivated",
      },
      cycle: {
        type: String,
        enum: ["Monthly", "Yearly", "Custom"],
      },
      customAmount: { type: Number, default: 0 },
      outstandingBalance: { type: Number, default: 0 }, // ✅ NEW: Tracks remaining dues
      expiryDate: {
        type: Date,
      },
      gracePeriodDays: { type: Number, default: 7 },
      deactivationThresholdDays: { type: Number, default: 30 },
      lastPaymentDate: { type: Date },
      lastInvoiceId: { type: String },
    },

    superAdminProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperAdmin",
      required: true,
    },
  },
  { timestamps: true },
);

// ─── Pre-Save Password Hashing ───
organizationSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
    next();
  } catch (error) {
    next(error);
  }
});

// ─── Methods ───
organizationSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

organizationSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Automated Lifecycle Evaluator
organizationSchema.methods.updateBillingLifecycle = async function () {
  const now = new Date();
  const expiry = new Date(this.billing.expiryDate);

  // Calculate threshold dates
  const graceEnd = new Date(expiry);
  graceEnd.setDate(graceEnd.getDate() + this.billing.gracePeriodDays);

  const deactivationEnd = new Date(expiry);
  deactivationEnd.setDate(
    deactivationEnd.getDate() + this.billing.deactivationThresholdDays,
  );

  let newBillingStatus = "active";
  let newSystemStatus = this.status;

  // Lifecycle Logic
  if (now <= expiry) {
    newBillingStatus = "active";
  } else if (now > expiry && now <= graceEnd) {
    newBillingStatus = "past_due";
  } else if (now > graceEnd && now <= deactivationEnd) {
    newBillingStatus = "deactivated";
    newSystemStatus = "deactivated"; // Auto-lock the system
  } else if (now > deactivationEnd) {
    newBillingStatus = "expired";
    newSystemStatus = "deactivated"; // Keep locked
  }

  // Only run database save if the status actually shifted
  if (
    this.billing.status !== newBillingStatus ||
    this.status !== newSystemStatus
  ) {
    this.billing.status = newBillingStatus;
    this.status = newSystemStatus;
    await this.save();
  }
};

organizationSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

organizationSchema.index({ organizationId: 1 });
organizationSchema.index({ officialEmail: 1 });
organizationSchema.index({ "billing.status": 1 });

export default mongoose.model("Organization", organizationSchema);
