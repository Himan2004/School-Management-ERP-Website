import mongoose from "mongoose";

const graphuraFaqSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
        trim: true
    },
    answer: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            'getting-started',
            'school-management',
            'user-management',
            'subscriptions',
            'security',
            'technical',
            'other'
        ]
    },
    helpfulCount: {
        type: Number,
        default: 0
    },
    notHelpfulCount: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const GraphuraFAQ = mongoose.model("GraphuraFAQ", graphuraFaqSchema);

export default GraphuraFAQ;
