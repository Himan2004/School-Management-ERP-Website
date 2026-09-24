import mongoose from "mongoose";

const studentActivitySchema = new mongoose.Schema({
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true }, 
    
    name: { type: String, required: true }, 
    
    category: { 
        type: String, 
        enum: ['Academic', 'Sports', 'Art', 'Cultural', 'General'], 
        required: true 
    },
    
    activityDate: { type: Date, required: true },
    
    status: { 
        type: String, 
        enum: ['Winner', 'Runner Up', 'Participated', 'Upcoming'], 
        required: true 
    },
    
    description: { type: String, required: true },
    
    achievementText: { type: String, default: "" }, 
    
    certificateIcon: { 
        type: String, 
        enum: ['trophy', 'medal', 'star', 'none'], 
        default: 'none' 
    },
    certificateUrl: { type: String, default: "" }, 
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

studentActivitySchema.index({ student: 1, activityDate: -1 });

export default mongoose.model('StudentActivity', studentActivitySchema);