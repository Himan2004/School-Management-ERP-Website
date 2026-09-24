import User from "../../models/users/user.model.js";
import cloudinary from "../../config/cloudinary.js";

export const loginAccountant = async (req, res) => {
    try {
        const { loginId, password } = req.body;

        const user = await User.findByLogin(loginId);

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid Login ID" });
        }

        if (user.role !== "accountant") {
            return res.status(403).json({ success: false, message: "Access denied. Not an accountant." });
        }

        if (!user.isActiveUser()) {
            return res.status(403).json({ success: false, message: "Account is inactive. Contact your administrator." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid Password" });
        }

        const token = user.generateToken();

        await user.populate("school");

        res.cookie("token", token, {
            httpOnly: true,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });

        res.status(200).json({
            success: true,
            role: "accountant",
            token,
            user: {
                id: user._id,
                name: user.name,
                loginId: user.loginId,
                role: user.role,
                school: user.school
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

//logout
export const logoutAccountant = async (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
    });

    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const getAccountant = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: "Not authenticated" });
        }

        const userData = req.user.toObject ? req.user.toObject() : { ...req.user };
        delete userData.password;

        res.status(200).json({ success: true, data: userData });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateAccountantPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id).select("+password");

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Invalid current password" });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const uploadAccountantAvatar = async (req, res) => {
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

        const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
                success: false,
                message: 'Only image files (jpg, jpeg, png, webp) are allowed'
            });
        }

        const currentUser = await User.findById(userId);

        if (currentUser?.photo) {
            const publicId = currentUser.photo.split('/').pop().split('.')[0];
            try {
                await cloudinary.uploader.destroy(`user-profiles/${publicId}`);
            } catch (err) {
                console.log('Old photo deletion failed:', err.message);
            }
        }

        const photoUrl = req.file.path;

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { photo: photoUrl, updatedAt: new Date() },
            { new: true }
        ).select("-password").populate({
            path: "school",
            populate: {
                path: "organization",
                select: "organizationName organizationLogo _id",
            },
        });

        return res.status(200).json({
            success: true,
            message: 'Profile picture uploaded successfully',
            data: updatedUser,
        });
    } catch (error) {
        console.error('Error in uploadAccountantAvatar:', error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};