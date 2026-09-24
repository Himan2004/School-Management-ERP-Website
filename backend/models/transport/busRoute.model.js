import mongoose from "mongoose";

const stopSchema = new mongoose.Schema({
    stopName: { type: String, required: true, trim: true },
    morningPickupTime: { type: String, required: true }, // e.g., "07:30 AM"
    eveningDropTime: { type: String, required: true },   // e.g., "03:15 PM"
});

const busRouteSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "School",
        required: true,
        index: true
    },
    routeName: { 
        type: String, 
        required: true, 
        trim: true 
    }, // e.g., "Route 1 - Sector 15 to School"
    
    // Link to Driver
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
        default: null
    },
    
    vehicleNumber: { type: String, trim: true, required: true },
    
    // The stops on this route
    stops: [stopSchema],
    
    // Dynamic alerts for the UI
    alerts: [{
        type: { type: String, enum: ['info', 'warning', 'danger'], default: 'info' },
        message: { type: String, required: true },
        date: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true }
    }],
    
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    }
}, { timestamps: true });

const BusRoute = mongoose.model("BusRoute", busRouteSchema);
export default BusRoute;