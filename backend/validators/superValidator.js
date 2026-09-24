import { body } from "express-validator";

// Register Validation
export const registerValidation = [
    body('organizationName').notEmpty().withMessage('Organization name is required'),
    body('organizationType').isIn(['Single School', 'Multi-Branch']).withMessage('Invalid organization type'),
    body('numberOfBranches').isIn(['1', '2-5', '5-10', '10+']).withMessage('Invalid number of branches'),
    body('address').notEmpty().withMessage('HQ Address is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('state').notEmpty().withMessage('State is required'),
    body('pincode').notEmpty().withMessage('Pincode is required'),
    body('officialEmail').isEmail().withMessage('Please enter a valid official email'),
    body('contactNumber').notEmpty().withMessage('Contact number is required'),
    body('adminName').notEmpty().withMessage('Admin name is required'),
    body('adminEmail').isEmail().withMessage('Please enter a valid admin email'),
    body('adminPhone').notEmpty().withMessage('Admin phone number is required'),
    body('registrationNumber').notEmpty().withMessage('Registration number is required'),
    body('panNumber').notEmpty().withMessage('PAN number is required'),
];



// Login Validation
export const loginValidation = [
    body('organizationId').notEmpty().withMessage('Organization ID is required'),
    body('password').notEmpty().withMessage('Password is required')
];

// Password Update Validation
export const passwordUpdateValidation = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    body('confirmNewPassword').custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('New password confirmation does not match');
        }
        return true;
    })
];

// Forgot Password
export const forgotPasswordValidation = [
    body('email').isEmail().withMessage('Valid email is required')
];

// Verify OTP
export const verifyOTPAndResetValidation = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').notEmpty().withMessage('OTP is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmNewPassword').notEmpty().withMessage('Please confirm your new password')
];

// Resend OTP
export const resendOTPValidation = [
    body('email').isEmail().withMessage('Valid email is required')
];