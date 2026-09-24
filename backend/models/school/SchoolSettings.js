import mongoose from 'mongoose';

const schoolSettingsSchema = new mongoose.Schema(
    {
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            unique: true,
            index: true,
        },
        general: {
            academicYear: { type: String, default: '2024-2025' },
            sessionStartMonth: { type: Number, default: 4 }, // April
            sessionEndMonth: { type: Number, default: 3 }, // March
            currency: { type: String, default: 'INR' },
            timezone: { type: String, default: 'Asia/Kolkata' }
        },
        notifications: {
            emailEnabled: { type: Boolean, default: true },
            smsEnabled: { type: Boolean, default: false },
            whatsappEnabled: { type: Boolean, default: false },
            config: {
                senderEmail: String,
                smsApiKey: String,
                whatsappProvider: String
            }
        },
        security: {
            sessionTimeout: { type: Number, default: 60 }, // minutes
            passwordExpiryDays: { type: Number, default: 90 },
            maxLoginAttempts: { type: Number, default: 5 },
            ipWhitelist: [String],
            twoFactorAuth: { type: Boolean, default: false }
        },
        maintenance: {
            isEnabled: { type: Boolean, default: false },
            message: { type: String, default: 'System is under maintenance. Please check back later.' },
            startTime: Date,
            endTime: Date
        },
        backups: {
            autoBackup: { type: Boolean, default: true },
            frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
            lastBackup: Date,
            status: { type: String, enum: ['success', 'failed', 'pending'], default: 'pending' }
        }
    },
    {
        timestamps: true,
    }
);

const SchoolSettings = mongoose.model('SchoolSettings', schoolSettingsSchema);
export default SchoolSettings;
