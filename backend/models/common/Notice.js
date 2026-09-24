import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    school: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['academic', 'finance', 'events', 'holiday', 'general', 'emergency','exam','urgent'],
      default: 'general',
    },
    targetAudience: {
      type: [String],
      default: ['all'],
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled', 'archived'],
      default: 'published',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    scheduledPublishAt: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Emergency'],
      default: 'Medium',
    },
    expiryDate: {
      type: Date,
    },
    targetClass: {
      type: String,
      default: 'All Classes',
    },
    targetSection: {
      type: String,
      default: 'All Sections',
    },
    targetUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    attachments: [
      {
        name: { type: String, default: "" },
        url: { type: String, default: "" },
        type: { type: String, default: "" },
      },
    ],
    viewedBy: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      viewedAt: { type: Date, default: Date.now }
    }],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

noticeSchema.index({ school: 1, category: 1 });
noticeSchema.index({ school: 1, status: 1 });
noticeSchema.index({ school: 1, isPinned: -1 });

export default mongoose.model('Notice', noticeSchema);
