import mongoose from 'mongoose';

const transferCertificateSchema = new mongoose.Schema({
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
    tcNumber: {
        type: String,
        unique: true,
        required: true
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    transferDate: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    destinationSchool: {
        type: String
    },
    lastAttendedDate: {
        type: Date,
        required: true
    },
    conduct: {
        type: String,
        enum: ['Excellent', 'Good', 'Satisfactory', 'Poor'],
        default: 'Good'
    },
    characterCertificate: {
        type: Boolean,
        default: false
    },
    issuedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    leavingDate: {
        type: Date
    },
    transferReason: {
        type: String
    },
    remarks: {
        type: String
    },
    transferredTo: {
        type: String
    },
    requestStatus: {
        type: String
    },
    studentStatusSnapshot: {
        type: String
    },
    generatedPDF: {
        type: String
    }
}, { timestamps: true });

// Ensure a student can only have one TC record
transferCertificateSchema.index({ student: 1 }, { unique: true });

const TransferCertificate = mongoose.model('TransferCertificate', transferCertificateSchema);

export default TransferCertificate;
