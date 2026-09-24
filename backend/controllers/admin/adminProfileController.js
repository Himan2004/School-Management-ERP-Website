import Admin from '../../models/users/admin.model.js';
import User from '../../models/users/user.model.js';
import cloudinary from '../../config/cloudinary.js';

/**
 * @desc    Get admin profile
 * @route   GET /api/admin/profile
 * @access  Private (Admin)
 */
export const getAdminProfile = async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not found',
            });
        }

        // Get user details
        const user = await User.findById(userId).select('-password').lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Get admin details
        let admin = await Admin.findOne({ user: userId })
            .populate('school', 'name')
            .lean();

        // Combine profile data
        const profileData = {
            _id: userId,
            name: user.name,
            email: user.email,
            phone: admin?.phoneNumber || user.phone || '',
            avatarUrl: admin?.photo || user.photo || null,
            role: user.role || 'admin',
            schoolId: admin?.school?._id || user.school,
            schoolName: admin?.school?.name || '',
            address: admin?.address || null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };

        return res.status(200).json({
            success: true,
            data: profileData,
        });
    } catch (error) {
        console.error('Error in getAdminProfile:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Update admin profile
 * @route   PUT /api/admin/profile
 * @access  Private (Admin)
 */
export const updateAdminProfile = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { name, email, phone } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not found',
            });
        }

        // Update User model
        const userUpdateData = {};
        if (name) userUpdateData.name = name;
        if (email) userUpdateData.email = email;
        if (phone) userUpdateData.phone = phone;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { ...userUpdateData, updatedAt: new Date() },
            { new: true, runValidators: true }
        ).select('-password');

        // Update Admin model
        const adminUpdateData = {};
        if (phone) adminUpdateData.phoneNumber = phone;

        const updatedAdmin = await Admin.findOneAndUpdate(
            { user: userId },
            { ...adminUpdateData, updatedAt: new Date() },
            { new: true, upsert: true }
        ).populate('school', 'name');

        // Prepare response
        const profileData = {
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedAdmin?.phoneNumber || updatedUser.phone || '',
            avatarUrl: updatedAdmin?.photo || updatedUser.photo || null,
            role: updatedUser.role,
            schoolId: updatedAdmin?.school?._id || updatedUser.school,
            schoolName: updatedAdmin?.school?.name || '',
            updatedAt: updatedUser.updatedAt,
        };

        return res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: profileData,
        });
    } catch (error) {
        console.error('Error in updateAdminProfile:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Upload profile picture
 * @route   POST /api/admin/profile/upload-avatar
 * @access  Private (Admin)
 */
export const uploadProfileAvatar = async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not found',
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
        }

        // Get current admin to delete old photo
        const currentAdmin = await Admin.findOne({ user: userId });
        const currentUser = await User.findById(userId);

        // Delete old photo from Cloudinary if exists
        if (currentAdmin?.photo) {
            const publicId = currentAdmin.photo.split('/').pop().split('.')[0];
            try {
                await cloudinary.uploader.destroy(`admin-profiles/${publicId}`);
            } catch (err) {
                console.log('Old photo deletion failed:', err.message);
            }
        }

        if (currentUser?.photo) {
            const publicId = currentUser.photo.split('/').pop().split('.')[0];
            try {
                await cloudinary.uploader.destroy(`user-profiles/${publicId}`);
            } catch (err) {
                console.log('Old photo deletion failed:', err.message);
            }
        }

        // Update with new photo URL
        const photoUrl = req.file.path;

        await Admin.findOneAndUpdate(
            { user: userId },
            { photo: photoUrl, updatedAt: new Date() },
            { upsert: true, new: true }
        );

        await User.findByIdAndUpdate(
            userId,
            { photo: photoUrl, updatedAt: new Date() },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Profile picture uploaded successfully',
            data: { avatarUrl: photoUrl },
        });
    } catch (error) {
        console.error('Error in uploadProfileAvatar:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Remove profile picture
 * @route   DELETE /api/admin/profile/avatar
 * @access  Private (Admin)
 */
export const removeProfileAvatar = async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not found',
            });
        }

        const currentAdmin = await Admin.findOne({ user: userId });
        const currentUser = await User.findById(userId);

        // Delete from Cloudinary
        if (currentAdmin?.photo) {
            const publicId = currentAdmin.photo.split('/').pop().split('.')[0];
            try {
                await cloudinary.uploader.destroy(`admin-profiles/${publicId}`);
            } catch (err) {
                console.log('Photo deletion failed:', err.message);
            }
        }

        if (currentUser?.photo) {
            const publicId = currentUser.photo.split('/').pop().split('.')[0];
            try {
                await cloudinary.uploader.destroy(`user-profiles/${publicId}`);
            } catch (err) {
                console.log('Photo deletion failed:', err.message);
            }
        }

        // Remove photo references
        await Admin.findOneAndUpdate(
            { user: userId },
            { photo: null, updatedAt: new Date() }
        );

        await User.findByIdAndUpdate(
            userId,
            { photo: null, updatedAt: new Date() }
        );

        return res.status(200).json({
            success: true,
            message: 'Profile picture removed successfully',
        });
    } catch (error) {
        console.error('Error in removeProfileAvatar:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * @desc    Change password
 * @route   POST /api/admin/profile/change-password
 * @access  Private (Admin)
 */
export const changeAdminPassword = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User not found',
            });
        }

        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'All password fields are required',
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'New password and confirm password do not match',
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters',
            });
        }

        // Get user with password
        const user = await User.findById(userId).select('+password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect',
            });
        }

        // Update password
        user.password = newPassword;
        user.passwordChangedAt = new Date();
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully',
        });
    } catch (error) {
        console.error('Error in changeAdminPassword:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};