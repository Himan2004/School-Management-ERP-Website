import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    
    targetAudience: { type: String, required: true }, // Stores "All Classes", "Grade 10-A", etc.
    targetClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    section: { type: String },
    type: { type: String, default: 'General' },
    expiryDate: { type: Date },
    status: { type: String, default: 'Active' },
    studentsReached: { type: Number, default: 0 },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    
    attachments: [{ 
        name: String, 
        url: String 
    }],
    
    isPinned: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorNameLabel: { type: String, required: true }, // E.g., "Mr. Sharma" or "Math Department"
    
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

announcementSchema.index({ school: 1, createdAt: -1 });

export default mongoose.model("Announcement", announcementSchema);