import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const graphuraAdminSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: true,
            select: false, // never returned in queries by default
        },

        graphuraKey: {
            type: String,
            required: true,
            select: false, // secret key from .env, stored as hash
        },

        fullName: {
            type: String,
            default: "Graphura Super Admin",
        },

        avatarUrl: {
            type: String,
            default: null,
        },

        role: {
            type: String,
            enum: ["graphura_admin"],
            default: "graphura_admin",
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        lastLoginAt: {
            type: Date,
            default: null,
        },

        loginAttempts: {
            type: Number,
            default: 0,
        },

        lockedUntil: {
            type: Date,
            default: null,
        },

        passwordChangedAt: {
            type: Date,
            default: null,
        },
        // Add these two fields inside your graphuraAdminSchema (around line 43, before recentActions):
        
        resetPasswordOtp: {
            type: String,
            select: false, // Keep it hidden by default for security
        },

        resetPasswordOtpExpire: {
            type: Date,
            select: false,
        },

        // ── Active Sessions ───────────────────────────────────────

        recentActions: [
            {
                action: { type: String },
                targetId: { type: String },
                description: { type: String },
                performedAt: { type: Date, default: Date.now }
            },
        ],
    },
    { timestamps: true }
);

// ── Pre-save hooks ─────────────────────────────────────────────────────────────

graphuraAdminSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 12);
        this.passwordChangedAt = new Date();
    }

    if (this.isModified("graphuraKey")) {
        this.graphuraKey = await bcrypt.hash(this.graphuraKey, 12);
    }

    next();
});

// ── Instance methods ───────────────────────────────────────────────────────────

graphuraAdminSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

graphuraAdminSchema.methods.compareAdminKey = async function (candidateKey) {
    return bcrypt.compare(candidateKey, this.graphuraKey);
};

graphuraAdminSchema.methods.isLocked = function () {
    return this.lockedUntil && this.lockedUntil > new Date();
};

graphuraAdminSchema.methods.incrementLoginAttempts = async function () {
    const MAX_ATTEMPTS = 5;
    const LOCK_DURATION_MS = 30 * 60 * 1000;

    this.loginAttempts += 1;

    if (this.loginAttempts >= MAX_ATTEMPTS) {
        this.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }

    return this.save();
};

graphuraAdminSchema.methods.resetLoginAttempts = async function () {
    this.loginAttempts = 0;
    this.lockedUntil = null;
    this.lastLoginAt = new Date();
    return this.save();
};

// ── Model ──────────────────────────────────────────────────────────────────────

const GraphuraAdmin = mongoose.model("GraphuraAdmin", graphuraAdminSchema);

export default GraphuraAdmin;