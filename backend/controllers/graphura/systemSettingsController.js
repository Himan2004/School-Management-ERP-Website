import SystemSettings from '../../models/graphura/SystemSettings.js';

// @desc    Get system settings
// @route   GET /api/graphura/settings
// @access  Private (Graphura Admin)
export const getSystemSettings = async (req, res) => {
    try {
        let settings = await SystemSettings.findOne();
        
        // Create default settings if none exist
        if (!settings) {
            settings = await SystemSettings.create({});
        }

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error("Error fetching system settings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch system settings",
            error: error.message
        });
    }
};

// @desc    Update system settings
// @route   PATCH /api/graphura/settings
// @access  Private (Graphura Admin)
export const updateSystemSettings = async (req, res) => {
    try {
        const updateData = req.body;
        
        // Remove restricted immutable fields if necessary (like _id, __v)
        delete updateData._id;
        delete updateData.__v;

        let settings = await SystemSettings.findOne();

        if (!settings) {
            settings = await SystemSettings.create(updateData);
        } else {
            // Update the document using deep merge or findByIdAndUpdate to ensure nested objects are updated correctly
            settings = await SystemSettings.findByIdAndUpdate(
                settings._id,
                { $set: updateData },
                { new: true, runValidators: true }
            );
        }

        res.status(200).json({
            success: true,
            message: "System settings updated successfully",
            data: settings
        });
    } catch (error) {
        console.error("Error updating system settings:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update system settings",
            error: error.message
        });
    }
};
