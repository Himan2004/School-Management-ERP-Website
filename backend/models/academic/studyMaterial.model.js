import mongoose from 'mongoose';

const studyMaterialSchema = new mongoose.Schema(
    {
        // --- Relational Links ---
        school: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'School',
            required: true,
            index: true
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Usually points to a Teacher or Admin
            required: true
        },
        applicableClasses: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Classes',
                required: true,
                index: true
            }
        ],

        // --- Core Information ---
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true,
            required: true
        },
        subjectName: {
            type: String,
            required: true,
            trim: true,
            // e.g., "Mathematics", "Science", "English"
        },

        // --- Categorization (For UI Filters) ---
        fileType: {
            type: String,
            enum: ['PDF', 'Video', 'Interactive', 'Audio', 'Image', 'Archive', 'Code', 'Document'],
            required: true
        },
        format: {
            type: String,
            trim: true,
            // e.g., "Course", "Notes", "Workbook", "Analysis", "Video Tutorial"
        },
        difficultyLevel: {
            type: String,
            enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'],
            default: 'All Levels'
        },
        tags: [
            {
                type: String,
                trim: true
            }
        ],

        // --- File Details ---
        fileUrl: {
            type: String,
            required: true, // S3, AWS, or local path
        },
        previewUrl: {
            type: String, // E.g., YouTube link or compressed PDF preview
            default: null
        },
        thumbnailUrl: {
            type: String, // Cover image for the UI grid
            default: null
        },
        fileSize: {
            type: String, // e.g., '4.2 MB'
            default: 'Unknown'
        },
        
        // Conditional fields based on fileType
        pages: {
            type: Number, // Relevant for PDFs/Documents
            default: null
        },
        duration: {
            type: String, // Relevant for Videos/Audio (e.g., '2h 45min')
            default: null
        },

        // --- Analytics & Engagement ---
        views: {
            type: Number,
            default: 0,
            min: 0
        },
        downloadCount: {
            type: Number,
            default: 0,
            min: 0
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalRatings: {
            type: Number, // Keeps track of how many people rated it so you can calculate averages
            default: 0
        },

        // --- Publishing Status ---
        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'published',
            index: true
        }
    },
    {
        timestamps: true // Automatically handles `createdAt` (Upload Date) and `updatedAt`
    }
);

// --- Indexes for High Performance ---

// 1. Compound index to quickly find published materials for a specific school
studyMaterialSchema.index({ school: 1, status: 1 });

// 2. Text index for the Search Bar (Searches title, subject, and tags instantly)
studyMaterialSchema.index({ 
    title: 'text', 
    subjectName: 'text', 
    tags: 'text' 
});

const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);
export default StudyMaterial;