import SystemSettings from '../models/graphura/SystemSettings.js';

export const checkMaintenanceMode = async (req, res, next) => {
    // Exclude Graphura admin UI routes and login routes so the platform owner doesn't lock themselves out
    if (
        req.originalUrl.startsWith('/api/graphura') ||
        req.originalUrl.startsWith('/api/auth/graphura') ||
        req.originalUrl === '/'
    ) {
        return next();
    }

    try {
        const settings = await SystemSettings.findOne();
        if (settings && settings.security && settings.security.maintenanceMode) {
            return res.status(503).json({
                success: false,
                message: "System is currently undergoing maintenance. Please try again later.",
                isMaintenanceMode: true
            });
        }
        next();
    } catch (error) {
        // Fallback: if database fetch fails, assume no maintenance mode to avoid total lockout
        console.error("Maintenance check error:", error);
        next();
    }
};
