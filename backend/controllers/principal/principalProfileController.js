import Principal from "../../models/users/principal.model.js";
import User from "../../models/users/user.model.js";
import cloudinary from "../../config/cloudinary.js";

const buildProfileData = (user, principal) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  loginId: user.loginId,
  role: user.role,
  phone: principal?.phone || "",
  qualification: principal?.qualification || "",
  experience: principal?.experience || "",
  joiningDate: principal?.joiningDate || null,
  address: principal?.address || "",
  photo: principal?.photo || user.photo || null,
  schoolName: principal?.school?.schoolName || "",
  schoolId: principal?.school?._id || user.school,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * @desc    Get principal profile
 * @route   GET /api/principal/profile
 * @access  Private (Principal)
 */
export const getPrincipalProfile = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found",
      });
    }

    const user = await User.findById(userId).select("-password").lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const principal = await Principal.findOne({ user: userId })
      .populate("school", "schoolName")
      .lean();

    return res.status(200).json({
      success: true,
      data: buildProfileData(user, principal),
    });
  } catch (error) {
    console.error("Error in getPrincipalProfile:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Update principal profile
 * @route   PUT /api/principal/profile
 * @access  Private (Principal)
 */
export const updatePrincipalProfile = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { name, email, phone, qualification, experience, address } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found",
      });
    }

    const userUpdateData = {};
    if (name !== undefined) userUpdateData.name = name;
    if (email !== undefined) userUpdateData.email = email;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { ...userUpdateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const principalUpdateData = {};
    if (phone !== undefined) principalUpdateData.phone = phone;
    if (qualification !== undefined) principalUpdateData.qualification = qualification;
    if (experience !== undefined) principalUpdateData.experience = experience;
    if (address !== undefined) principalUpdateData.address = address;

    const updatedPrincipal = await Principal.findOneAndUpdate(
      { user: userId },
      { ...principalUpdateData, updatedAt: new Date() },
      { new: true, upsert: true }
    ).populate("school", "schoolName");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: buildProfileData(updatedUser, updatedPrincipal),
    });
  } catch (error) {
    console.error("Error in updatePrincipalProfile:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Upload principal avatar
 * @route   POST /api/principal/profile/upload-avatar
 * @access  Private (Principal)
 */
export const uploadPrincipalAvatar = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const photoUrl = req.file.path;

    await Principal.findOneAndUpdate(
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
      message: "Profile picture uploaded successfully",
      data: { avatarUrl: photoUrl },
    });
  } catch (error) {
    console.error("Error in uploadPrincipalAvatar:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Remove principal avatar
 * @route   DELETE /api/principal/profile/avatar
 * @access  Private (Principal)
 */
export const removePrincipalAvatar = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found",
      });
    }

    const currentPrincipal = await Principal.findOne({ user: userId });
    const currentUser = await User.findById(userId);

    if (currentPrincipal?.photo) {
      const publicId = currentPrincipal.photo.split("/").pop()?.split(".")[0];
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.log("Photo deletion failed:", err.message);
        }
      }
    }

    if (currentUser?.photo) {
      const publicId = currentUser.photo.split("/").pop()?.split(".")[0];
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId);
        } catch (err) {
          console.log("Photo deletion failed:", err.message);
        }
      }
    }

    await Principal.findOneAndUpdate(
      { user: userId },
      { photo: null, updatedAt: new Date() }
    );

    await User.findByIdAndUpdate(
      userId,
      { photo: null, updatedAt: new Date() }
    );

    return res.status(200).json({
      success: true,
      message: "Profile picture removed successfully",
    });
  } catch (error) {
    console.error("Error in removePrincipalAvatar:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * @desc    Change principal password
 * @route   POST /api/principal/profile/change-password
 * @access  Private (Principal)
 */
export const changePrincipalPassword = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found",
      });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error in changePrincipalPassword:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
