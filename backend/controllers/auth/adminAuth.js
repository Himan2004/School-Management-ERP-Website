import User from "../../models/users/user.model.js";
import AdminProfile from "../../models/users/admin.model.js";

export const loginAdmin = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    const user = await User.findByLogin(loginId);

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid Login ID" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Not an admin." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid Password" });
    }

    const token = user.generateToken();

    res.cookie("token", token, {
      httpOnly: true,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    const adminProfile = await AdminProfile.findOne({ user: user._id })
      .populate("school", "schoolName")
      .lean();

    res.status(200).json({
      success: true,
      role: "admin",
      token,
      user: {
        id: user._id,
        name: user.name,
        loginId: user.loginId,
        email: user.email,
        role: user.role,
        school: user.school,
        adminProfile: adminProfile ? {
          name: user.name,
          email: user.email,
          phone: adminProfile.phoneNumber || user.phone || '',
          avatarUrl: adminProfile.photo || null,
          role: user.role,
          schoolName: adminProfile.school?.schoolName || '',
          schoolId: adminProfile.school?._id || user.school,
          address: adminProfile.address || '',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        } : {
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          avatarUrl: null,
          role: user.role,
          schoolName: '',
          schoolId: user.school,
          address: '',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logoutAdmin = async (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const getAdmin = async (req, res) => {
  try {
    // If the user was already populated by 'protect' middleware correctly
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    // Ensure we don't return the password
    const userData = req.user.toObject ? req.user.toObject() : { ...req.user };
    delete userData.password;

    // Attach Admin profile details if the role is admin
    if (userData.role === "admin") {
      const adminProfile = await AdminProfile.findOne({ user: userData._id })
        .populate("school", "schoolName")
        .lean();

      userData.adminProfile = {
        name: userData.name,
        email: userData.email,
        phone: adminProfile?.phoneNumber || userData.phone || '',
        avatarUrl: adminProfile?.photo || null,
        role: userData.role,
        schoolName: adminProfile?.school?.schoolName || '',
        schoolId: adminProfile?.school?._id || userData.school,
        address: adminProfile?.address || '',
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      };
    }

    res.status(200).json({ success: true, data: userData });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};