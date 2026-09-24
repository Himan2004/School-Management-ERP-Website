import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    plateNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    model: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: ['Bus', 'Van', 'Mini-Bus'],
        default: 'Bus'
    },
    capacity: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'maintenance', 'inactive'],
        default: 'active'
    },
    fuelType: {
        type: String,
        enum: ['Diesel', 'CNG', 'Petrol', 'Electric'],
        default: 'Diesel'
    },
    manufacturingYear: Number,
    insuranceExpiry: Date,
    fitnessExpiry: Date
}, { timestamps: true });

const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);
export default Vehicle;
