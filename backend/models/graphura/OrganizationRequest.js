import mongoose from "mongoose";

const organizationRequestSchema = new mongoose.Schema(
  {
    // Basic Organization Details
    organizationName: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    organizationType: {
      type: String,
      enum: ["Single School", "Multi-Branch"],
      required: [true, "Organization type is required"],
    },
    numberOfBranches: {
      type: String,
      enum: ["1", "2-5", "5-10", "10+"],
      required: [true, "Number of branches is required"],
    },
    yearEstablished: {
      type: String,
      trim: true,
    },

    // Head Office (HQ) Details
    address: {
      type: String,
      required: [true, "HQ address is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    country: {
      type: String,
      default: "India",
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      trim: true,
    },
    officialEmail: {
      type: String,
      required: [true, "Official email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    contactNumber: {
      type: String,
      required: [true, "Contact number is required"],
      trim: true,
    },

    organizationLogo: {
      type: String,
      required: null,
    },

    // Super Admin Details (Internal for approval)
    adminName: {
      type: String,
      required: [true, "Admin name is required"],
      trim: true,
    },
    adminEmail: {
      type: String,
      required: [true, "Admin email is required"],
      trim: true,
      lowercase: true,
    },
    adminPhone: {
      type: String,
      required: [true, "Admin phone number is required"],
    },

    // Govt Identifiers
    registrationNumber: {
      type: String,
      required: [true, "Registration number is required"],
      trim: true,
    },
    panNumber: {
      type: String,
      required: [true, "PAN number is required"],
      trim: true,
    },
    gstNumber: {
      type: String,
      default: null,
      trim: true,
    },

    // Documents
    registrationCertificate: {
      type: String,
      required: [true, "Organization registration certificate is required"],
    },
    adminIdProof: {
      type: String,
      required: [true, "Admin ID proof is required"],
    },
    addressProof: {
      type: String,
      required: [true, "Address proof is required"],
    },
    affiliationCertificate: {
      type: String,
      required: [true, "Affiliation certificate is required"],
    },

    // ─── Subscription & Payment Details ───────────────────────────────
    subscriptionPlan: {
      type: String,
      enum: ["Premium", "Standard", "Basic"],
      default: "Standard",
    },
    paymentDetails: {
      orderId: { type: String, default: null },
      paymentId: { type: String, default: null },
      signature: { type: String, default: null },
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
      },
    },

    // Status and Workflow
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "deactivated"],
      default: "pending",
    },
    generatedPassword: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster lookups
organizationRequestSchema.index({ officialEmail: 1, status: 1 });

export default mongoose.model("OrganizationRequest", organizationRequestSchema);
