import AcademicConfig from "../../models/organization/AcademicConfig.js";

/**
 * @desc    Get academic configuration for the school
 * @route   GET /api/admin/academic-config
 * @access  Private (Admin)
 */
export const getAcademicConfig = async (req, res) => {
    try {
        const organizationId = req.user.school.organization;
        
        // Config is usually org-wide but can have school overrides if implemented
        const config = await AcademicConfig.findOne({ organization: organizationId })
            .populate("classes", "name")
            .populate("subjects", "subjectName");

        if (!config) return res.status(404).json({ success: false, message: "Academic configuration not found" });

        res.status(200).json({
            success: true,
            data: config
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update academic configuration
 * @route   PUT /api/admin/academic-config
 * @access  Private (Admin)
 */
export const updateAcademicConfig = async (req, res) => {
    try {
        const organizationId = req.user.school.organization;
        
        const config = await AcademicConfig.findOneAndUpdate(
            { organization: organizationId },
            { 
                ...req.body,
                updatedBy: req.user._id
            },
            { new: true, upsert: true }
        );

        res.status(200).json({
            success: true,
            message: "Academic configuration updated successfully",
            data: config
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Add holiday/event to academic calendar
 * @route   POST /api/admin/academic-config/calendar
 * @access  Private (Admin)
 */
export const addCalendarEvent = async (req, res) => {
    try {
        const organizationId = req.user.school.organization;
        const { title, date, type, isGlobal, applicableBranches } = req.body;

        const config = await AcademicConfig.findOne({ organization: organizationId });
        if (!config) return res.status(404).json({ success: false, message: "Config not found" });

        config.holidays.push({ title, date, type, isGlobal, applicableBranches });
        await config.save();

        res.status(200).json({
            success: true,
            message: "Calendar event added successfully",
            data: config.holidays[config.holidays.length - 1]
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
