import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, // Ensures one user can only have one settings document
        index: true
    },
    emailNotifications: { type: Boolean, default: true },
    assignmentAlerts: { type: Boolean, default: true },
    messageAlerts: { type: Boolean, default: true },
    attendanceAlerts: { type: Boolean, default: false },
    twoFactorAuth: { type: Boolean, default: false },
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' }
}, { timestamps: true });

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;