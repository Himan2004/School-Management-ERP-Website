import mongoose from 'mongoose';

const teacherEventSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher', // Links to your exact Teacher model
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['class', 'exam', 'assignment', 'meeting'],
        required: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    startTime: {
        type: String, 
        required: true // Format: "09:00"
    },
    endTime: {
        type: String // Format: "10:30"
    },
    location: {
        type: String,
        trim: true,
        default: 'TBA'
    },
    audience: {
        type: String,
        trim: true
    },
    color: {
        type: String,
        enum: ['blue', 'violet', 'rose', 'emerald', 'amber'],
        default: 'blue'
    }
}, { timestamps: true });

const TeacherEvent = mongoose.model('TeacherEvent', teacherEventSchema);
export default TeacherEvent;