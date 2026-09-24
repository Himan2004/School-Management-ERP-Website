import mongoose from "mongoose";

const schoolEventSchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    
    title: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    location: { type: String, required: true },
    
    category: { 
        type: String, 
        enum: ['Sports', 'Academic', 'Cultural', 'Trip', 'Holiday', 'General'],
        required: true 
    },
    
    targetRoles: {
        type: [String],
        enum: ['all', 'teachers', 'students', 'parents', 'accountant'],
        default: ['all']
    },
    targetClasses: {
        type: [String], 
        default: []     
    },
    audienceLabel: { 
        type: String, 
        required: true
    },

    description: { type: String, default: "" },
    image: { type: String, default: "" }, 
    
    attendees: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        response: { type: String, enum: ['yes', 'no'] }
    }],
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

schoolEventSchema.index({ school: 1, eventDate: 1 });

export default mongoose.model('SchoolEvent', schoolEventSchema);