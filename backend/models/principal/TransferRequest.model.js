import mongoose from 'mongoose';

const transferRequestSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    requestedBy: {
        type: String,
        enum: ['Parent', 'Office'],
        default: 'Parent'
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    requestDate: {
        type: Date,
        default: Date.now
    },
    remarks: {
        type: String
    },
    studentStatusSnapshot: {
        type: String
    },
    requestStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    }
}, { timestamps: true });

const TransferRequest = mongoose.model('TransferRequest', transferRequestSchema);

export default TransferRequest;
