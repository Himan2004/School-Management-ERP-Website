import mongoose from 'mongoose';
import SystemSettings from '../../models/superAdmin/SystemSettings.model.js';

/**
 * GET /api/superadmin/settings
 * Get global system settings
 */
export const getSystemSettings = async (req, res) => {
    try {
        let settings = await SystemSettings.findOne({ organization: req.user?.organizationId });

        if (!settings) {
            settings = new SystemSettings({
                organization: req.user?.organizationId,
            });
            await settings.save();
        }

        return res.status(200).json({
            success: true,
            data: {
                rules: settings.rules,
                modules: settings.modules,
                notifications: settings.notifications,
                branchSettings: settings.branchSettings,
                lastUpdatedAt: settings.lastUpdatedAt,
                lastUpdatedBy: settings.lastUpdatedBy,
            },
        });

    } catch (error) {
        console.error('Error in getSystemSettings:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/superadmin/settings
 * Update global system settings
 */
export const updateSystemSettings = async (req, res) => {
    try {
        const { rules, modules, notifications, branchSettings } = req.body;

        let settings = await SystemSettings.findOne({ organization: req.user?.organizationId });

        if (!settings) {
            settings = new SystemSettings({
                organization: req.user?.organizationId,
            });
        }
        if (rules) {
            settings.rules = {
                ...settings.rules,
                ...rules,
            };
        }

        if (modules) {
            settings.modules = {
                ...settings.modules,
                ...modules,
            };
        }
        if (notifications) {
            settings.notifications = {
                ...settings.notifications,
                ...notifications,
            };
        }

        if (branchSettings) {
            settings.branchSettings = {
                ...settings.branchSettings,
                ...branchSettings,
            };
        }

        settings.lastUpdatedBy = req.user?._id;
        settings.lastUpdatedAt = new Date();

        await settings.save();

        return res.status(200).json({
            success: true,
            message: 'Settings updated successfully',
            data: {
                rules: settings.rules,
                modules: settings.modules,
                notifications: settings.notifications,
                branchSettings: settings.branchSettings,
                lastUpdatedAt: settings.lastUpdatedAt,
            },
        });

    } catch (error) {
        console.error('Error in updateSystemSettings:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/superadmin/settings/modules/:moduleName
 * Toggle a specific module
 */
export const toggleModule = async (req, res) => {
    try {
        const { moduleName } = req.params;
        const { isActive } = req.body;

        const validModules = ['transport', 'hostel', 'library', 'onlineExams', 'cafeteria', 'sports', 'transportTracking'];
        
        if (!validModules.includes(moduleName)) {
            return res.status(400).json({ success: false, message: 'Invalid module name' });
        }

        let settings = await SystemSettings.findOne({ organization: req.user?.organizationId });

        if (!settings) {
            settings = new SystemSettings({
                organization: req.user?.organizationId,
            });
        }

        settings.modules[moduleName] = isActive;
        settings.lastUpdatedBy = req.user?._id;
        settings.lastUpdatedAt = new Date();

        await settings.save();

        return res.status(200).json({
            success: true,
            message: `${moduleName} module ${isActive ? 'activated' : 'deactivated'}`,
            data: {
                module: moduleName,
                isActive: settings.modules[moduleName],
            },
        });

    } catch (error) {
        console.error('Error in toggleModule:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/superadmin/settings/rules
 * Update default rules
 */
export const updateDefaultRules = async (req, res) => {
    try {
        const { attendance, lateFee, passPercentage, maxAbsentsAllowed, minWorkingDays } = req.body;

        let settings = await SystemSettings.findOne({ organization: req.user?.organizationId });

        if (!settings) {
            settings = new SystemSettings({
                organization: req.user?.organizationId,
            });
        }

        if (attendance !== undefined) settings.rules.attendance = attendance;
        if (lateFee !== undefined) settings.rules.lateFee = lateFee;
        if (passPercentage !== undefined) settings.rules.passPercentage = passPercentage;
        if (maxAbsentsAllowed !== undefined) settings.rules.maxAbsentsAllowed = maxAbsentsAllowed;
        if (minWorkingDays !== undefined) settings.rules.minWorkingDays = minWorkingDays;

        settings.lastUpdatedBy = req.user?._id;
        settings.lastUpdatedAt = new Date();

        await settings.save();

        return res.status(200).json({
            success: true,
            message: 'Default rules updated successfully',
            data: settings.rules,
        });

    } catch (error) {
        console.error('Error in updateDefaultRules:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/settings/audit-log
 * Get settings change audit log
 */
export const getSettingsAuditLog = async (req, res) => {
    try {
        const settings = await SystemSettings.findOne({ organization: req.user?.organizationId })
            .populate('lastUpdatedBy', 'name email')
            .lean();

        if (!settings) {
            return res.status(200).json({
                success: true,
                data: [],
            });
        }

        const auditLog = [
            {
                action: 'Settings Updated',
                timestamp: settings.lastUpdatedAt,
                updatedBy: settings.lastUpdatedBy?.name || 'System',
                details: 'Global system settings were modified',
            },
            {
                action: 'Settings Created',
                timestamp: settings.createdAt,
                updatedBy: 'System',
                details: 'Initial system settings were created',
            },
        ];

        return res.status(200).json({
            success: true,
            data: auditLog,
        });

    } catch (error) {
        console.error('Error in getSettingsAuditLog:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};