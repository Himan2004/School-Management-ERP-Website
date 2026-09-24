import mongoose from 'mongoose';

const admissionCancellationSchema = new mongoose.Schema({
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
    reason: {
        type: String,
        required: true,
        enum: ['TC', 'Fees', 'Conduct', 'Personal', 'Graduation', 'Other']
    },
    remarks: {
        type: String
    },
    clearanceChecklist: {
        library: { type: Boolean, default: false },
        fees: { type: Boolean, default: false },
        inventory: { type: Boolean, default: false }
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cancellationDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Ensure a student can only have one cancellation record
admissionCancellationSchema.index({ student: 1 }, { unique: true });

const AdmissionCancellation = mongoose.model('AdmissionCancellation', admissionCancellationSchema);

export default AdmissionCancellation;
