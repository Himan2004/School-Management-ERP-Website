import mongoose from 'mongoose';

const graphuraNotificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'warning', 'success', 'error'],
        default: 'info'
    },
    category: {
        type: String,
        enum: ['school', 'subscription', 'system', 'user', 'report', 'payment', 'other'],
        default: 'system'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    read: {
        type: Boolean,
        default: false
    },
    actionUrl: {
        type: String,
        default: null
    },
    sender: {
        type: String,
        default: 'System'
    }
}, { timestamps: true });

// Optional indexes for efficient fetching by read-status
graphuraNotificationSchema.index({ read: 1, createdAt: -1 });

export default mongoose.model('GraphuraNotification', graphuraNotificationSchema);
