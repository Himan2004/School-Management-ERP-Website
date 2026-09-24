import SystemSettings from '../models/graphura/SystemSettings.js';

export const checkIpWhitelist = async (req, res, next) => {
    try {
        const settings = await SystemSettings.findOne();
        
        // If IP whitelist is populated and non-empty
        if (settings && settings.security && settings.security.ipWhitelist && settings.security.ipWhitelist.length > 0) {
            
            // Extract the client's IP. Usually stored in req.ip or x-forwarded-for if behind proxies
            let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            
            // Handle localhost IPv6 mapped IPs
            if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
                clientIp = '127.0.0.1';
            }
            
            // Clean up if x-forwarded-for sends comma-separated IPs
            if (clientIp.includes(',')) {
                clientIp = clientIp.split(',')[0].trim();
            }

            const whitelist = settings.security.ipWhitelist;
            
            // Include 127.0.0.1 implicitly in development or if specified
            if (!whitelist.includes(clientIp) && clientIp !== '127.0.0.1') {
                return res.status(403).json({
                    success: false,
                    message: "Access Denied. Your IP address is not whitelisted by the Super Admin."
                });
            }
        }
        next();
    } catch (error) {
        console.error("IP Whitelist check error:", error);
        next();
    }
};
