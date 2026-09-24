import mongoose from 'mongoose';

// ── Question Sub-Schema ──────────────────────────────────────────────────────
const questionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['mcq', 'true_false', 'fill_blank', 'matching', 'descriptive', 'numeric', 'paragraph', 'assertion_reason', 'case_study', 'image_based', 'audio_based', 'video_based'],
        required: true,
        default: 'mcq',
    },
    question: { type: String, required: true, trim: true },
    options: [{ type: String, trim: true }],          // for MCQ
    correctAnswer: { type: String, trim: true },      // index string or text
    marks: { type: Number, required: true, default: 1, min: 0 },
    difficulty: {
        type: String,
        enum: ['very_easy', 'easy', 'medium', 'hard', 'very_hard', 'expert'],
        default: 'medium',
    },
    explanation: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
}, { _id: true });

// ── Main OnlineTest Schema ───────────────────────────────────────────────────
const onlineTestSchema = new mongoose.Schema({
    // Scoping
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },

    // Core Info
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    examType: {
        type: String,
        enum: ['unit_test', 'quarterly', 'half_yearly', 'annual', 'pre_board', 'board_practice', 'weekly_test', 'monthly_test', 'surprise_test', 'revision_test'],
        required: true,
    },

    // Assignment
    subject: { type: String, required: true, trim: true },    // subject name string
    class: { type: String, required: true, trim: true },      // class name string e.g. "10"
    section: { type: String, required: true, trim: true },    // "A","B" etc.

    // Timing
    duration: { type: Number, required: true, min: 1, default: 60 },  // in minutes
    startDate: { type: String },    // "YYYY-MM-DD"
    startTime: { type: String },    // "HH:MM"
    endDate: { type: String },
    endTime: { type: String },

    // Marks
    totalMarks: { type: Number, required: true, default: 100, min: 1 },
    passingMarks: { type: Number, required: true, default: 40, min: 0 },

    // Settings
    status: {
        type: String,
        enum: ['draft', 'published', 'scheduled', 'completed', 'cancelled'],
        default: 'draft',
        index: true,
    },
    instructions: { type: String, trim: true },
    randomizeQuestions: { type: Boolean, default: false },
    showResults: { type: Boolean, default: true },
    allowReview: { type: Boolean, default: true },
    allowRetake: { type: Boolean, default: false },
    maxAttempts: { type: Number, default: 1, min: 1 },

    // Questions
    questions: [questionSchema],

    // Analytics (auto-updated on submission)
    attempts: { type: Number, default: 0 },
    totalScoreSum: { type: Number, default: 0 },    // sum of all student scores for avg calculation
    passingCount: { type: Number, default: 0 },

}, { timestamps: true });

// ── Virtual: averageScore ────────────────────────────────────────────────────
onlineTestSchema.virtual('averageScore').get(function () {
    if (this.attempts === 0) return 0;
    return Math.round(this.totalScoreSum / this.attempts);
});

onlineTestSchema.set('toJSON', { virtuals: true });
onlineTestSchema.set('toObject', { virtuals: true });

// ── Indexes ──────────────────────────────────────────────────────────────────
onlineTestSchema.index({ school: 1, createdBy: 1, status: 1 });
onlineTestSchema.index({ school: 1, class: 1, subject: 1 });

const OnlineTest = mongoose.model('OnlineTest', onlineTestSchema);
export default OnlineTest;
