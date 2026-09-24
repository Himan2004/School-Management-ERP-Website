import {
    createOrganizationRequest,
    createSubscriptionOrder,
    loginSuperAdmin,
    logoutSuperAdmin,
    getMe,
    updatePassword,
    forgotPassword,
    verifyOTPAndResetPassword,
    resendOTP,
    sendSignupOTP,
    verifySignupOTP
} from "../../controllers/auth/superAuth.js";
import {
    registerValidation,
    loginValidation,
    passwordUpdateValidation,
    forgotPasswordValidation,
    verifyOTPAndResetValidation,
    resendOTPValidation
} from "../../validators/superValidator.js";
import { authorize, protect } from "../../middleware/authMiddleware.js";
import { validate } from "../../middleware/validateMiddleware.js";
import express from "express";

import upload from "../../middleware/upload.js";

const router = express.Router();

router.post('/create-request',
    upload.fields([
        { name: 'organizationLogo', maxCount: 1 },
        { name: 'registrationCertificate', maxCount: 1 },
        { name: 'adminIdProof', maxCount: 1 },
        { name: 'addressProof', maxCount: 1 },
        { name: 'affiliationCertificate', maxCount: 1 }
    ]),
    registerValidation,
    validate,
    createOrganizationRequest
);
router.post('/create-subscription-order', validate, createSubscriptionOrder,);

router.post('/login', loginValidation, validate, loginSuperAdmin);

// Forgot Password
router.post('/forgot-password', forgotPasswordValidation, validate, forgotPassword);
router.post('/verify-otp-and-reset', verifyOTPAndResetValidation, validate, verifyOTPAndResetPassword);
router.post('/resend-otp', resendOTPValidation, validate, resendOTP);

// Signup OTP
router.post('/send-signup-otp', sendSignupOTP);
router.post('/verify-signup-otp', verifySignupOTP);

// Private routes
router.use(protect, authorize("superadmin"));

router.post('/logout', logoutSuperAdmin);
router.get('/me', getMe);
router.put('/updatepassword', passwordUpdateValidation, updatePassword);

export default router;