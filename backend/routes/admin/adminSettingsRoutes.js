import express from "express";
import {
    getGeneralSettings,
    updateGeneralSettings,
    getAcademicSettings,
    updateAcademicSettings,
    getNotificationSettings,
    updateNotificationSettings,
    getSecuritySettings,
    updateSecuritySettings,
    toggleMaintenanceMode,
    getEmailTemplates,
    saveEmailTemplate,
    getAuditLogs,
    getBackupStatus,
    triggerManualBackup
} from "../../controllers/admin/adminSettingsController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

// General Settings
router.get("/general", getGeneralSettings);
router.put("/general", updateGeneralSettings);

// Academic Settings
router.get("/academic", getAcademicSettings);
router.put("/academic", updateAcademicSettings);

// Notification Settings
router.get("/notifications", getNotificationSettings);
router.put("/notifications", updateNotificationSettings);

// Security Settings
router.get("/security", getSecuritySettings);
router.put("/security", updateSecuritySettings);

// Maintenance
router.post("/maintenance", toggleMaintenanceMode);

// Email Templates
router.get("/email-templates", getEmailTemplates);
router.post("/email-templates", saveEmailTemplate);

// System Management
router.get("/system/logs", getAuditLogs);
router.get("/system/backup", getBackupStatus);
router.post("/system/backup/trigger", triggerManualBackup);

export default router;
