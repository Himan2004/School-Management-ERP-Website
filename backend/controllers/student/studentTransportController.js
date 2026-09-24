import mongoose from 'mongoose';
import Student from '../../models/users/student.model.js';
import BusRoute from '../../models/transport/busRoute.model.js'; 
import Driver from '../../models/transport/Driver.model.js'; // Ensure this is imported so Mongoose can populate it

/**
 * @desc    Get bus timing and route details for the logged-in student
 * @route   GET /api/student/transport/bus-timing
 * @access  Private (Student)
 */
export const getStudentBusTiming = async (req, res) => {
    try {
        const studentId = req.user._id;

        // 1. Fetch Student to get their assigned routeId
        const student = await Student.findOne({ user: studentId });
        
        if (!student || !student.transport?.enrolled || !student.transport?.routeId) {
            return res.status(200).json({ 
                success: true, 
                message: 'No transport assigned',
                data: null 
            });
        }

        // 2. Fetch the Route and populate the connected Driver
        const route = await BusRoute.findById(student.transport.routeId)
            // Populate the driver, and then populate the driver's 'user' ref to get their name
            .populate({
                path: 'driverId',
                populate: { path: 'user', select: 'name' }
            })
            .lean();

        if (!route) {
            return res.status(404).json({ success: false, message: 'Assigned route details not found' });
        }

        const driver = route.driverId; // Now fully populated!

        // 3. Format Stops for the React Timeline
        const formattedStops = (route.stops || []).map((stop, index) => ({
            name: stop.stopName,
            time: stop.morningPickupTime, 
            order: index + 1
        }));

        // 4. Construct payload for the React frontend
        const responseData = {
            morning: formattedStops.length > 0 ? formattedStops[0].time : 'TBA',
            evening: route.stops?.length > 0 ? route.stops[route.stops.length - 1].eveningDropTime : 'TBA',
            
            busNumber: route.vehicleNumber || 'Unassigned',
            driverName: driver?.user?.name || 'Unassigned',
            driverContact: driver?.phone || driver?.alternatePhone || 'N/A',
            routeName: route.routeName,
            
            stops: formattedStops,
            
            alerts: (route.alerts || []).filter(a => a.isActive).map((alert, idx) => ({
                id: alert._id || idx,
                type: alert.type || 'info',
                message: alert.message,
                date: new Date(alert.date || route.updatedAt).toLocaleDateString('en-IN')
            })),
            
            lastUpdated: route.updatedAt
        };

        res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Error in getStudentBusTiming:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};