import Settings from '../../models/users/settings.model.js'; 
import User from '../../models/users/user.model.js';
import bcrypt from 'bcryptjs';

/**
 * @desc    Get teacher settings
 * @route   GET /api/teacher/settings
 * @access  Private (Teacher Only)
 */
export const getTeacherSettings = async (req, res) => {
    try {
        let settings = await Settings.findOne({ user: req.user._id }).lean();
        
        if (!settings) {
            settings = {
                emailNotifications: true,
                assignmentAlerts: true,
                messageAlerts: true,
                attendanceAlerts: false,
                twoFactorAuth: false,
                language: 'en',
                timezone: 'UTC'
            };
        }

        res.status(200).json({
            success: true,
            data: settings
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update teacher settings
 * @route   PUT /api/teacher/settings
 * @access  Private (Teacher Only)
 */
export const updateTeacherSettings = async (req, res) => {
    try {
        const updatedSettings = await Settings.findOneAndUpdate(
            { user: req.user._id },
            { $set: req.body },
            { new: true, upsert: true, runValidators: true } 
        );

        res.status(200).json({
            success: true,
            message: 'Teacher settings saved successfully',
            data: updatedSettings
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Change Teacher Password
 * @route   PUT /api/teacher/settings/change-password
 * @access  Private (Teacher Only)
 */
export const changeTeacherPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current password and new password are required' });
        }

        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Incorrect current password' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};