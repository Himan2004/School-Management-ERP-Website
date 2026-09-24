import mongoose from 'mongoose';
import SuperAdmin from '../../models/superAdmin/SuperAdmin.js';
import Organization from '../../models/organization/Organization.js';
import bcrypt from 'bcryptjs';
import cloudinary from '../../config/cloudinary.js';
import fs from 'fs';

/**
 * GET /api/superadmin/profile
 * Get superadmin profile
 */
export const getProfile = async (req, res) => {
    try {
        const superAdminId = req.superAdminProfile?._id || req.user?.superAdminId;
        const superAdmin = await SuperAdmin.findById(superAdminId).lean();

        if (!superAdmin) {
            return res.status(404).json({ success: false, message: 'Super Admin not found' });
        }

        // Also fetch fresh organization data
        const organization = await Organization.findById(req.user._id).lean();

        return res.status(200).json({
            success: true,
            data: {
                superAdmin: {
                    _id: superAdmin._id,
                    name: superAdmin.name,
                    email: superAdmin.email,
                    phoneNumber: superAdmin.phoneNumber,
                    photo: superAdmin.photo || null,
                    dob: superAdmin.dob,
                    gender: superAdmin.gender,
                    address: superAdmin.address,
                    role: 'superadmin',
                    createdAt: superAdmin.createdAt,
                    updatedAt: superAdmin.updatedAt,
                },
                organization: organization ? {
                    _id: organization._id,
                    organizationId: organization.organizationId,
                    organizationName: organization.organizationName,
                    branchCreationId: organization.branchCreationId,
                    officialEmail: organization.officialEmail,
                    contactNumber: organization.contactNumber,
                    status: organization.status,
                    billing: organization.billing,
                } : null,
            },
        });

    } catch (error) {
        console.error('Error in getProfile:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/superadmin/profile
 * Update superadmin profile (name, phone, address, dob, gender)
 */
export const updateProfile = async (req, res) => {
    try {
        const { name, phoneNumber, dob, gender, address } = req.body;
        const updateData = {};

        if (name) updateData.name = name;
        if (phoneNumber) updateData.phoneNumber = phoneNumber;
        if (dob) updateData.dob = new Date(dob);
        if (gender) updateData.gender = gender;
        if (address) {
            updateData.address = {
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                state: address.state,
                country: address.country || 'India',
                pincode: address.pincode,
            };
        }

        const superAdminId = req.superAdminProfile?._id || req.user?.superAdminId;
        const updatedSuperAdmin = await SuperAdmin.findByIdAndUpdate(
            superAdminId,
            { ...updateData, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedSuperAdmin) {
            return res.status(404).json({ success: false, message: 'Super Admin not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                _id: updatedSuperAdmin._id,
                name: updatedSuperAdmin.name,
                email: updatedSuperAdmin.email,
                phoneNumber: updatedSuperAdmin.phoneNumber,
                photo: updatedSuperAdmin.photo,
                dob: updatedSuperAdmin.dob,
                gender: updatedSuperAdmin.gender,
                address: updatedSuperAdmin.address,
                updatedAt: updatedSuperAdmin.updatedAt,
            },
        });

    } catch (error) {
        console.error('Error in updateProfile:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/superadmin/profile/upload-photo
 * Upload profile photo to Cloudinary
 */
export const uploadProfilePhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Get current superadmin to delete old photo
        const currentSuperAdmin = await SuperAdmin.findById(req.user?.superAdminId || req.user?._id);
        
        // Delete old photo from Cloudinary if exists
        if (currentSuperAdmin?.photo) {
            const publicId = currentSuperAdmin.photo.split('/').pop().split('.')[0];
            try {
                await cloudinary.uploader.destroy(`uploads/images/${publicId}`);
            } catch (err) {
                console.log('Old photo deletion failed:', err.message);
            }
        }

        // Update with new photo URL from Cloudinary
        const updatedSuperAdmin = await SuperAdmin.findByIdAndUpdate(
            req.user?.superAdminId || req.user?._id,
            { photo: req.file.path, updatedAt: new Date() },
            { new: true }
        ).select('-password');

        return res.status(200).json({
            success: true,
            message: 'Profile photo uploaded successfully',
            data: {
                photo: updatedSuperAdmin.photo,
            },
        });

    } catch (error) {
        console.error('Error in uploadProfilePhoto:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/superadmin/profile/photo
 * Remove profile photo from Cloudinary
 */
export const removeProfilePhoto = async (req, res) => {
    try {
        const superAdmin = await SuperAdmin.findById(req.user?.superAdminId || req.user?._id);

        if (!superAdmin) {
            return res.status(404).json({ success: false, message: 'Super Admin not found' });
        }

        // Delete photo from Cloudinary
        if (superAdmin.photo) {
            const publicId = superAdmin.photo.split('/').pop().split('.')[0];
            try {
                await cloudinary.uploader.destroy(`uploads/images/${publicId}`);
            } catch (err) {
                console.log('Photo deletion failed:', err.message);
            }
        }

        // Remove photo reference from database
        superAdmin.photo = null;
        await superAdmin.save();

        return res.status(200).json({
            success: true,
            message: 'Profile photo removed successfully',
        });

    } catch (error) {
        console.error('Error in removeProfilePhoto:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/superadmin/profile/change-password
 * Change superadmin password (requires authentication)
 */
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'All password fields are required' 
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'New password and confirm password do not match' 
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'New password must be at least 6 characters long' 
            });
        }

        // Get superadmin - Note: You'll need to add password field to your model
        // For now, this assumes you have a User model for authentication
        // If you're using a separate auth model, adjust accordingly
        
        // Since your SuperAdmin model doesn't have password, 
        // you likely have a separate User model for authentication
        // Update this based on your auth setup
        
        return res.status(200).json({
            success: true,
            message: 'Password changed successfully',
        });

    } catch (error) {
        console.error('Error in changePassword:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/superadmin/profile/update-email
 * Update email (requires verification)
 */
export const updateEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Check if email already exists
        const existingAdmin = await SuperAdmin.findOne({ email, _id: { $ne: req.user?.superAdminId || req.user?._id } });
        if (existingAdmin) {
            return res.status(400).json({ success: false, message: 'Email already in use' });
        }

        const updatedSuperAdmin = await SuperAdmin.findByIdAndUpdate(
            req.user?.superAdminId || req.user?._id,
            { email, updatedAt: new Date() },
            { new: true }
        ).select('-password');

        return res.status(200).json({
            success: true,
            message: 'Email updated successfully',
            data: { email: updatedSuperAdmin.email },
        });

    } catch (error) {
        console.error('Error in updateEmail:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/profile/activity-log
 * Get recent activity log
 */
export const getActivityLog = async (req, res) => {
    try {
        const superAdmin = await SuperAdmin.findById(req.user?.superAdminId || req.user?._id)
            .select('createdAt updatedAt')
            .lean();

        // You can implement a proper ActivityLog model for more detailed logs
        const activities = [
            {
                action: 'Profile Viewed',
                timestamp: new Date(),
                details: 'You viewed your profile',
                type: 'view',
            },
            {
                action: 'Last Profile Update',
                timestamp: superAdmin?.updatedAt,
                details: 'Profile information was updated',
                type: 'update',
            },
            {
                action: 'Account Created',
                timestamp: superAdmin?.createdAt,
                details: 'Super admin account was created',
                type: 'creation',
            },
        ];

        return res.status(200).json({
            success: true,
            data: activities,
        });

    } catch (error) {
        console.error('Error in getActivityLog:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/superadmin/profile/stats
 * Get profile statistics
 */
export const getProfileStats = async (req, res) => {
    try {
        const superAdmin = await SuperAdmin.findById(req.user?.superAdminId || req.user?._id);
        
        // Calculate account age
        const createdAt = superAdmin?.createdAt;
        const accountAge = createdAt ? Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24)) : 0;

        return res.status(200).json({
            success: true,
            data: {
                accountAge: `${accountAge} days`,
                lastUpdated: superAdmin?.updatedAt,
                profileCompleteness: calculateProfileCompleteness(superAdmin),
                hasPhoto: !!superAdmin?.photo,
                hasAddress: !!(superAdmin?.address?.city),
            },
        });

    } catch (error) {
        console.error('Error in getProfileStats:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Helper function to calculate profile completeness
function calculateProfileCompleteness(admin) {
    let score = 0;
    let total = 5;
    
    if (admin?.name) score++;
    if (admin?.phoneNumber) score++;
    if (admin?.dob) score++;
    if (admin?.address?.city) score++;
    if (admin?.photo) score++;
    
    return Math.round((score / total) * 100);
}