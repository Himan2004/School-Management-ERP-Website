import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
    homework: { type: mongoose.Schema.Types.ObjectId, ref: 'Homework', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    fileUrl: { type: String, required: true }, // The S3/Cloudinary link to the PDF/DOC
    fileName: { type: String },
    
    status: { 
        type: String, 
        enum: ['submitted', 'graded', 'late'], 
        default: 'submitted' 
    },
    
    submittedAt: { type: Date, default: Date.now },
    
    // For when the teacher grades it
    grade: { type: String, default: null },
    teacherFeedback: { type: String, default: null },
    gradedAt: { type: Date, default: null }

}, { timestamps: true });

// A student can only submit a specific homework once
submissionSchema.index({ homework: 1, student: 1 }, { unique: true });

export default mongoose.model("HomeworkSubmission", submissionSchema);