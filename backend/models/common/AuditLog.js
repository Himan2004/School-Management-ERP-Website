import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
    {
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        action: {
            type: String,
            required: true,
        },
        module: {
            type: String,
            required: true,
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
        },
        ipAddress: String,
        userAgent: String,
        timestamp: {
            type: Date,
            default: Date.now,
        }
    },
    {
        timestamps: false,
    }
);

auditLogSchema.index({ school: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
