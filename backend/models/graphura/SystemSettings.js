import mongoose from 'mongoose';

const SystemSettingsSchema = new mongoose.Schema({
    general: {
        siteName: { type: String, default: 'Graphura School Management' },
        siteEmail: { type: String, default: 'support@graphura.com' },
        sitePhone: { type: String, default: '+91 1234567890' },
        siteAddress: { type: String, default: '123 Tech Park, Bangalore, India - 560001' },
        timezone: { type: String, default: 'Asia/Kolkata' },
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        timeFormat: { type: String, default: '12h' },
        language: { type: String, default: 'en' },
        currency: { type: String, default: 'INR' },
        taxRate: { type: Number, default: 18 },
        logo: { type: String, default: 'https://via.placeholder.com/150x50?text=Graphura' },
        favicon: { type: String, default: 'https://via.placeholder.com/32x32?text=G' },
        footerText: { type: String, default: '© 2024 Graphura. All rights reserved.' },
        socialLinks: {
            facebook: { type: String, default: 'https://facebook.com/graphura' },
            twitter: { type: String, default: 'https://twitter.com/graphura' },
            linkedin: { type: String, default: 'https://linkedin.com/company/graphura' },
            instagram: { type: String, default: 'https://instagram.com/graphura' }
        }
    },
    school: {
        allowSchoolRegistration: { type: Boolean, default: true },
        requireDocumentVerification: { type: Boolean, default: true },
        maxStudentsPerSchool: { type: Number, default: 5000 },
        maxTeachersPerSchool: { type: Number, default: 500 },
        maxStaffPerSchool: { type: Number, default: 1000 },
        defaultSubscriptionPlan: { type: String, default: 'Basic' },
        trialPeriodDays: { type: Number, default: 30 },
        enableStudentPortal: { type: Boolean, default: true },
        enableParentPortal: { type: Boolean, default: true },
        enableTeacherPortal: { type: Boolean, default: true },
        autoApproveSchools: { type: Boolean, default: false },
        schoolDomainPrefix: { type: String, default: 'school.graphura.com' },
        schoolExpiryDays: { type: Number, default: 365 }
    },
    security: {
        twoFactorAuth: { type: Boolean, default: true },
        sessionTimeout: { type: Number, default: 60 },
        passwordExpiryDays: { type: Number, default: 90 },
        maxLoginAttempts: { type: Number, default: 5 },
        ipWhitelist: { type: [String], default: ['192.168.1.1', '10.0.0.1'] },
        maintenanceMode: { type: Boolean, default: false },
        sslEnabled: { type: Boolean, default: true },
        backupEnabled: { type: Boolean, default: true },
        backupFrequency: { type: String, default: 'daily' },
        backupTime: { type: String, default: '02:00' },
        retentionDays: { type: Number, default: 30 },
        apiKey: { type: String, default: 'grph_sk_live_4f3a2b1c9d8e7f6g5h4j3k2l1' },
        webhookUrl: { type: String, default: 'https://api.graphura.com/webhook' }
    },
    notifications: {
        emailNotifications: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false },
        pushNotifications: { type: Boolean, default: true },
        adminAlerts: { type: Boolean, default: true },
        schoolAlerts: { type: Boolean, default: true },
        userAlerts: { type: Boolean, default: true },
        paymentAlerts: { type: Boolean, default: true },
        systemAlerts: { type: Boolean, default: true },
        emailTemplates: {
            welcome: { type: Boolean, default: true },
            paymentSuccess: { type: Boolean, default: true },
            paymentFailed: { type: Boolean, default: true },
            subscriptionExpiry: { type: Boolean, default: true },
            schoolApproval: { type: Boolean, default: true },
            passwordReset: { type: Boolean, default: true }
        },
        smsProvider: { type: String, default: 'Twilio' },
        emailProvider: { type: String, default: 'SendGrid' },
        notificationEmail: { type: String, default: 'alerts@graphura.com' },
        notificationPhone: { type: String, default: '+91 1234567890' }
    },
    appearance: {
        theme: { type: String, default: 'light' },
        primaryColor: { type: String, default: '#4F46E5' },
        secondaryColor: { type: String, default: '#10B981' },
        accentColor: { type: String, default: '#F59E0B' },
        fontFamily: { type: String, default: 'Inter' },
        borderRadius: { type: String, default: '0.5rem' },
        layout: { type: String, default: 'modern' },
        sidebarCollapsed: { type: Boolean, default: false },
        animationsEnabled: { type: Boolean, default: true },
        customCSS: { type: String, default: '' },
        customJS: { type: String, default: '' }
    },
    integrations: {
        googleAnalytics: { type: String, default: 'UA-XXXXXXXXX-X' },
        facebookPixel: { type: String, default: '123456789' },
        recaptchaEnabled: { type: Boolean, default: true },
        recaptchaSiteKey: { type: String, default: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' },
        smtpEnabled: { type: Boolean, default: true },
        smtpHost: { type: String, default: 'smtp.gmail.com' },
        smtpPort: { type: Number, default: 587 },
        smtpUser: { type: String, default: 'noreply@graphura.com' },
        smtpSecure: { type: Boolean, default: true },
        paymentGateway: { type: String, default: 'Razorpay' },
        paymentKey: { type: String, default: 'rzp_test_123456789' },
        paymentSecret: { type: String, default: '********************' }
    },
    logs: {
        logRetention: { type: Number, default: 90 },
        errorLogging: { type: Boolean, default: true },
        auditLogging: { type: Boolean, default: true },
        userActivityLogging: { type: Boolean, default: true },
        logLevel: { type: String, default: 'info' },
        logDestination: { type: String, default: 'database' }
    }
}, { timestamps: true });

const SystemSettings = mongoose.model('SystemSettings', SystemSettingsSchema);
export default SystemSettings;
