import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema(
    {
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
            required: true,
            unique: true,
            index: true,
        },
        // Default Rules (Section 1.16)
        rules: {
            attendance: {
                type: Number,
                default: 75,
                min: 0,
                max: 100,
            },
            lateFee: {
                type: Number,
                default: 500,
                min: 0,
            },
            passPercentage: {
                type: Number,
                default: 40,
                min: 0,
                max: 100,
            },
            maxAbsentsAllowed: {
                type: Number,
                default: 30,
            },
            minWorkingDays: {
                type: Number,
                default: 220,
            },
        },
        // Module Activation
        modules: {
            transport: { type: Boolean, default: true },
            hostel: { type: Boolean, default: true },
            library: { type: Boolean, default: true },
            onlineExams: { type: Boolean, default: true },
            cafeteria: { type: Boolean, default: false },
            sports: { type: Boolean, default: true },
            transportTracking: { type: Boolean, default: false },
        },
        // Global Notifications
        notifications: {
            complianceAlerts: { type: Boolean, default: true },
            policyUpdates: { type: Boolean, default: true },
            systemMaintenance: { type: Boolean, default: true },
            backupReports: { type: Boolean, default: true },
        },
        // Branch Settings
        branchSettings: {
            allowBranchAdminToModifyModules: { type: Boolean, default: false },
            allowBranchAdminToModifyRules: { type: Boolean, default: false },
        },
        lastUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        lastUpdatedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

const SystemSettings = mongoose.models.SystemSettings || mongoose.model('SystemSettings', systemSettingsSchema);
export default SystemSettings;