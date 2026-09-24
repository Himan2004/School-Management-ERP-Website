import mongoose from 'mongoose';

const teacherProfileSchema = new mongoose.Schema({
    // The strict 1-to-1 link back to the main Teacher document
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true,
        unique: true
    },
    
    teachingFocus: [{
        type: String,
        trim: true
    }],
    currentPriorities: [{
        type: String,
        trim: true
    }],
    coursesManaged: [{
        type: String,
        trim: true
    }],
    recognitionTimeline: [{
        year: { type: String, trim: true },
        title: { type: String, trim: true },
        description: { type: String, trim: true }
    }]
}, { 
    timestamps: true 
});

const TeacherProfile = mongoose.model('TeacherProfile', teacherProfileSchema);

export default TeacherProfile;