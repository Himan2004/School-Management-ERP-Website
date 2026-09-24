import Driver from '../../models/transport/Driver.js';
import TransportAssignment from '../../models/transport/TransportAssignment.js';
import Parent from '../../models/users/parent.model.js';
import User from '../../models/users/user.model.js';

/**
 * GET /api/parent/transport/driver
 * Fetches driver and vehicle details for the student associated with the logged-in parent.
 */
export const getDriverDetails = async (req, res) => {
    console.log("🚀 getDriverDetails hit for user:", req.user.id);
    try {
        const parentUserId = req.user.id;

        // 1. Find the parent profile
        const parent = await Parent.findOne({ user: parentUserId });
        if (!parent || !parent.students || parent.students.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No students associated with this parent profile."
            });
        }

        // 2. Find the transport assignment for the first student (defaulting to the first child)
        // If the parent has multiple children, we could allow them to switch, but for now we'll take the first one.
        const studentId = parent.students[0];

        const assignment = await TransportAssignment.findOne({ 
            student: studentId,
            status: 'active'
        })
        .populate({
            path: 'driver',
            populate: { path: 'user', select: 'name email phone' }
        })
        .populate('vehicle')
        .populate('route');

        if (!assignment) {
            return res.status(200).json({
                success: true,
                message: "No transport assigned for this student.",
                data: null
            });
        }

        const { driver, vehicle, route } = assignment;

        // 3. Format response for the frontend (matching ParentDriver.jsx state)
        const formattedData = {
            // Personal Information
            name: driver.user.name,
            email: driver.user.email,
            phone: driver.user.phone || driver.emergencyContact?.phone,
            alternatePhone: driver.emergencyContact?.phone,
            dateOfBirth: driver.healthStatus?.lastCheckup, // Using checkup date as proxy if DOB is missing
            gender: 'Male', // Default or fetch from user
            bloodGroup: driver.bloodGroup,
            address: driver.address,
            
            // Professional Information
            driverId: driver.driverId,
            licenseNo: driver.licenseNumber,
            licenseExpiry: driver.licenseExpiry,
            experience: driver.experience,
            joiningDate: driver.joiningDate,
            driverType: 'Permanent',
            rating: driver.rating.toString(),
            
            // Vehicle Information
            assignedBus: `${vehicle.type} No. ${vehicle.plateNumber} (${vehicle.model})`,
            route: `${route.routeName} - ${route.stops[0]?.name} to ${route.stops[route.stops.length-1]?.name}`,
            shift: 'Morning/Evening',
            
            // Health & Emergency
            vision: driver.healthStatus?.vision || 'Normal',
            medicalConditions: driver.healthStatus?.medicalConditions || 'None',
            emergencyName: driver.emergencyContact?.name,
            emergencyRelation: driver.emergencyContact?.relation,
            emergencyPhone: driver.emergencyContact?.phone,
            
            // Bio & Skills
            bio: driver.bio,
            achievements: driver.achievements,
            languages: driver.languages
        };

        return res.status(200).json({
            success: true,
            data: formattedData
        });

    } catch (error) {
        console.error("Error in getDriverDetails:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching driver details."
        });
    }
};
