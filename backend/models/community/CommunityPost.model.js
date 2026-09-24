import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    nameLabel: { type: String, required: true }, // e.g., "Amit Verma"
    text: { type: String, required: true, trim: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Array of user IDs who liked this comment
}, { timestamps: true });

const communityPostSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    schoolNameLabel: { type: String, required: true }, // "Delhi Public School"
    authorRoleLabel: { type: String, required: true }, // "Admin"

    // THE POST TYPE
    type: {
        type: String,
        enum: ['photo', 'announcement', 'poll', 'event', 'achievement'],
        required: true,
        index: true
    },

    // 1. PHOTO POST DATA
    caption: { type: String, default: null },
    photos: [{
        src: { type: String },
        alt: { type: String }
    }],

    // 2. ANNOUNCEMENT DATA
    title: { type: String, default: null },
    content: { type: String, default: null },
    attachmentUrl: { type: String, default: null },
    attachmentName: { type: String, default: null },

    // 3. POLL DATA
    question: { type: String, default: null },
    pollOptions: [{
        text: { type: String },
        votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Stores IDs of users who voted for this
    }],
    pollEndsAt: { type: Date, default: null },

    // 4. EVENT DATA (Synced for Community Display)
    eventName: { type: String, default: null },
    eventDate: { type: Date, default: null },
    venue: { type: String, default: null },
    targetAudience: { type: String, default: null },
    eventRsvps: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        response: { type: String, enum: ['yes', 'no'] }
    }],

    // 5. ACHIEVEMENT DATA
    studentName: { type: String, default: null },
    achievementText: { type: String, default: null },
    competitionName: { type: String, default: null },

    // SOCIAL FEATURES (Shared across all post types)
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of user IDs
    comments: [commentSchema],

    isActive: { type: Boolean, default: true }
}, { timestamps: true });

communityPostSchema.index({ school: 1, createdAt: -1 });

export default mongoose.model('CommunityPost', communityPostSchema);