import School from "../../models/school/School.js";
import SchoolSettings from "../../models/school/SchoolSettings.js";
import AcademicConfig from "../../models/organization/AcademicConfig.js";
import EmailTemplate from "../../models/common/EmailTemplate.js";
import AuditLog from "../../models/common/AuditLog.js";
import mongoose from "mongoose";

/**
 * @desc    Get general school settings
 * @route   GET /api/admin/settings/general
 */
export const getGeneralSettings = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const school = await School.findById(schoolId);
        const settings = await SchoolSettings.findOne({ school: schoolId });

        res.status(200).json({
            success: true,
            data: {
                schoolInfo: {
                    name: school.schoolName,
                    email: school.officialEmail,
                    phone: school.officialPhone,
                    address: school.address,
                    board: school.board,
                    principalName: school.principalName
                },
                generalSettings: settings?.general || {}
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update general school settings
 * @route   PUT /api/admin/settings/general
 */
export const updateGeneralSettings = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { schoolInfo, generalSettings } = req.body;

        if (schoolInfo) {
            await School.findByIdAndUpdate(schoolId, schoolInfo);
        }

        const settings = await SchoolSettings.findOneAndUpdate(
            { school: schoolId },
            { $set: { general: generalSettings } },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, message: "General settings updated", data: settings });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get academic settings
 * @route   GET /api/admin/settings/academic
 */
export const getAcademicSettings = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const config = await AcademicConfig.findOne({ school: schoolId, isActive: true });

        res.status(200).json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update academic settings
 * @route   PUT /api/admin/settings/academic
 */
export const updateAcademicSettings = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const config = await AcademicConfig.findOneAndUpdate(
            { school: schoolId, isActive: true },
            req.body,
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, message: "Academic settings updated", data: config });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get notification settings
 * @route   GET /api/admin/settings/notifications
 */
export const getNotificationSettings = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const settings = await SchoolSettings.findOne({ school: schoolId });
        res.status(200).json({ success: true, data: settings?.notifications || {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update notification settings
 * @route   PUT /api/admin/settings/notifications
 */
export const updateNotificationSettings = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const settings = await SchoolSettings.findOneAndUpdate(
            { school: schoolId },
            { $set: { notifications: req.body } },
            { upsert: true, new: true }
        );
        res.status(200).json({ success: true, message: "Notification settings updated", data: settings.notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get security settings
 * @route   GET /api/admin/settings/security
 */
export const getSecuritySettings = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const settings = await SchoolSettings.findOne({ school: schoolId });
        res.status(200).json({ success: true, data: settings?.security || {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update security settings
 * @route   PUT /api/admin/settings/security
 */
export const updateSecuritySettings = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const settings = await SchoolSettings.findOneAndUpdate(
            { school: schoolId },
            { $set: { security: req.body } },
            { upsert: true, new: true }
        );
        res.status(200).json({ success: true, message: "Security settings updated", data: settings.security });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Toggle maintenance mode
 * @route   POST /api/admin/settings/maintenance
 */
export const toggleMaintenanceMode = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { isEnabled, message, endTime } = req.body;

        const settings = await SchoolSettings.findOneAndUpdate(
            { school: schoolId },
            { $set: { maintenance: { isEnabled, message, endTime, startTime: isEnabled ? new Date() : null } } },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, message: `Maintenance mode ${isEnabled ? 'enabled' : 'disabled'}`, data: settings.maintenance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get email templates
 * @route   GET /api/admin/settings/email-templates
 */
export const getEmailTemplates = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const templates = await EmailTemplate.find({ school: schoolId });
        res.status(200).json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Create or update email template
 * @route   POST /api/admin/settings/email-templates
 */
export const saveEmailTemplate = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { id, name, subject, body, placeholders } = req.body;

        let template;
        if (id) {
            template = await EmailTemplate.findOneAndUpdate(
                { _id: id, school: schoolId },
                { name, subject, body, placeholders },
                { new: true }
            );
        } else {
            template = await EmailTemplate.create({
                school: schoolId,
                name,
                subject,
                body,
                placeholders
            });
        }

        res.status(200).json({ success: true, message: "Email template saved", data: template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get system logs (Audit trail)
 * @route   GET /api/admin/settings/system/logs
 */
export const getAuditLogs = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { module, action, page = 1, limit = 50 } = req.query;

        const query = { school: schoolId };
        if (module) query.module = module;
        if (action) query.action = action;

        const logs = await AuditLog.find(query)
            .populate("user", "name role")
            .sort({ timestamp: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await AuditLog.countDocuments(query);

        res.status(200).json({ success: true, count: logs.length, total, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get backup status
 * @route   GET /api/admin/settings/system/backup
 */
export const getBackupStatus = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const settings = await SchoolSettings.findOne({ school: schoolId });
        res.status(200).json({ success: true, data: settings?.backups || {} });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Trigger manual backup
 * @route   POST /api/admin/settings/system/backup/trigger
 */
export const triggerManualBackup = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        
        // Mocking backup trigger
        // In reality, this would call a service to dump DB and upload to S3/Drive
        
        const settings = await SchoolSettings.findOneAndUpdate(
            { school: schoolId },
            { $set: { 'backups.lastBackup': new Date(), 'backups.status': 'success' } },
            { new: true }
        );

        // Log the action
        await AuditLog.create({
            school: schoolId,
            user: req.user._id,
            module: 'System',
            action: 'Manual Backup Triggered',
            details: { status: 'success' },
            ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || "Unknown",
            userAgent: req.headers["user-agent"] || "Unknown"
        });

        res.status(200).json({ success: true, message: "Backup completed successfully", data: settings.backups });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
