import mongoose from 'mongoose';

const graphuraResourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['PDF', 'DOC', 'ZIP', 'IMAGE', 'OTHER']
    },
    size: {
        type: String,
        required: true
    },
    downloadsCount: {
        type: Number,
        default: 0
    },
    fileUrl: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const GraphuraResource = mongoose.model('GraphuraResource', graphuraResourceSchema);
export default GraphuraResource;
