import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    driverId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    licenseExpiry: {
        type: Date,
        required: true
    },
    experience: {
        type: String,
        required: true
    },
    joiningDate: {
        type: Date,
        default: Date.now
    },
    rating: {
        type: Number,
        default: 5.0,
        min: 0,
        max: 5
    },
    bloodGroup: String,
    address: String,
    emergencyContact: {
        name: String,
        relation: String,
        phone: String
    },
    bio: String,
    achievements: [String],
    languages: [String],
    healthStatus: {
        vision: String,
        medicalConditions: String,
        lastCheckup: Date
    },
    status: {
        type: String,
        enum: ['active', 'on_leave', 'inactive'],
        default: 'active'
    }
}, { timestamps: true });

const Driver = mongoose.models.Driver || mongoose.model('Driver', driverSchema);
export default Driver;
