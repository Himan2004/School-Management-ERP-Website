import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
    },
    routeName: {
        type: String,
        required: true,
        trim: true
    },
    stops: [{
        name: { type: String, required: true },
        arrivalTime: String,
        order: Number
    }],
    totalDistance: String,
    startTime: String,
    endTime: String,
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { timestamps: true });

const Route = mongoose.models.Route || mongoose.model('Route', routeSchema);
export default Route;
