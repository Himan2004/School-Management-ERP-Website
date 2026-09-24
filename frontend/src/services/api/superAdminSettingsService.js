import api from "../api"; // Assuming the file you provided is named api.js

/**
 * Superadmin System Settings Service
 */
const superAdminSettingsService = {
    /**
     * Fetch global system settings
     * GET /api/superadmin/settings
     */
    getSettings: async () => {
        const response = await api.get("/superadmin/settings");
        return response.data;
    },

    /**
     * Update global system settings (rules, modules, notifications, etc.)
     * PUT /api/superadmin/settings
     */
    updateSettings: async (settingsData) => {
        // settingsData: { rules, modules, notifications, branchSettings }
        const response = await api.put("/superadmin/settings", settingsData);
        return response.data;
    },

    /**
     * Toggle a specific module (transport, hostel, etc.)
     * PUT /api/superadmin/settings/modules/:moduleName/toggle
     */
    toggleModule: async (moduleName, isActive) => {
        const response = await api.put(`/superadmin/settings/modules/${moduleName}/toggle`, {
            isActive,
        });
        return response.data;
    },

    /**
     * Update specific default rules
     * PUT /api/superadmin/settings/rules
     */
    updateDefaultRules: async (rulesData) => {
        // rulesData: { attendance, lateFee, passPercentage, maxAbsentsAllowed, minWorkingDays }
        const response = await api.put("/superadmin/settings/rules", rulesData);
        return response.data;
    },

    /**
     * Get settings change audit log
     * GET /api/superadmin/settings/audit-log
     */
    getAuditLog: async () => {
        const response = await api.get("/superadmin/settings/audit-log");
        return response.data;
    },
};

export default superAdminSettingsService;