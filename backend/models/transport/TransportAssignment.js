import mongoose from 'mongoose';

const transportAssignmentSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student', // Or User depending on implementation
        required: true,
        index: true
    },
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    route: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
        required: true
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    pickupStop: String,
    dropStop: String,
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { timestamps: true });

// Ensure a student is assigned to only one transport at a time
transportAssignmentSchema.index({ student: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

const TransportAssignment = mongoose.models.TransportAssignment || mongoose.model('TransportAssignment', transportAssignmentSchema);
export default TransportAssignment;
