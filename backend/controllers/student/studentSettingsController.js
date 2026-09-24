import Student from "../../models/users/student.model.js";
import User from "../../models/users/user.model.js";
import Parent from "../../models/users/parent.model.js";
import mongoose from "mongoose";

/**
 * @desc    Get student account preferences and settings
 * @route   GET /api/student/settings
 * @access  Private (Student)
 */
export const getStudentSettings = async (req, res) => {
    try {
        const userId = req.user._id;

        const student = await Student.findOne({ user: userId })
            .populate("class", "name")
            .populate("parent");
        
        if (!student) {
            return res.status(404).json({ success: false, message: "Student profile not found" });
        }

        if (student.section && mongoose.Types.ObjectId.isValid(student.section)) {
            await student.populate("section", "name");
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            data: {
                profile: {
                    fullName: user.name || "",
                    email: user.email || "",
                    phone: student.phone || "",
                    alternatePhone: student.alternatePhone || "",
                    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split("T")[0] : "",
                    gender: student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : "Male",
                    bloodGroup: student.bloodGroup || "O+",
                    address: student.address || "",
                    bio: student.bio || "",
                    admissionNumber: student.enrollmentNo || student.admissionNo || "",
                    studentId: student._id || "",
                    rollNumber: student.rollNo || "",
                    academicYear: student.academicYear || "",
                    class: student.class?.name || "",
                    section: typeof student.section === "string" ? student.section : (student.section?.name || ""),
                    parentName: student.parent?.fatherName || "",
                    parentContact: student.parent?.primaryContact || ""
                },
                notifications: student.notificationSettings || {},
                privacy: student.privacySettings || {},
                appearance: student.appearanceSettings || {},
                security: {
                    ...(student.securitySettings || {}),
                    passwordLastChanged: student.updatedAt ? student.updatedAt.toISOString().split("T")[0] : "2024-01-15"
                },
                language: student.languageSettings || {},
                downloads: student.downloadSettings || {}
            }
        });
    } catch (error) {
        console.error("Error in getStudentSettings:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update student account preferences and settings
 * @route   PUT /api/student/settings
 * @access  Private (Student)
 */
export const updateStudentSettings = async (req, res) => {
    try {
        const userId = req.user._id;
        const { profile, notifications, privacy, appearance, security, language, downloads } = req.body;

        const student = await Student.findOne({ user: userId })
            .populate("class", "name")
            .populate("parent");
        if (!student) {
            return res.status(404).json({ success: false, message: "Student profile not found" });
        }

        if (student.section && mongoose.Types.ObjectId.isValid(student.section)) {
            await student.populate("section", "name");
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (profile) {
            const { fullName, email, phone, alternatePhone, dateOfBirth, gender, bloodGroup, address, bio } = profile;
            
            if (fullName) user.name = fullName;
            if (email) user.email = email;
            await user.save();

            if (phone !== undefined) student.phone = phone;
            if (alternatePhone !== undefined) student.alternatePhone = alternatePhone;
            if (dateOfBirth !== undefined) student.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
            if (gender !== undefined) student.gender = gender ? gender.toLowerCase() : "male";
            if (bloodGroup !== undefined) student.bloodGroup = bloodGroup;
            if (address !== undefined) student.address = address;
            if (bio !== undefined) student.bio = bio;
        }

        if (notifications) {
            student.notificationSettings = { ...student.notificationSettings, ...notifications };
        }

        if (privacy) {
            student.privacySettings = { ...student.privacySettings, ...privacy };
        }

        if (appearance) {
            student.appearanceSettings = { ...student.appearanceSettings, ...appearance };
        }

        if (security) {
            student.securitySettings = { ...student.securitySettings, ...security };
        }

        if (language) {
            student.languageSettings = { ...student.languageSettings, ...language };
        }

        if (downloads) {
            student.downloadSettings = { ...student.downloadSettings, ...downloads };
        }

        await student.save();

        return res.status(200).json({
            success: true,
            message: "Settings updated successfully",
            data: {
                profile: {
                    fullName: user.name || "",
                    email: user.email || "",
                    phone: student.phone || "",
                    alternatePhone: student.alternatePhone || "",
                    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split("T")[0] : "",
                    gender: student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : "Male",
                    bloodGroup: student.bloodGroup || "O+",
                    address: student.address || "",
                    bio: student.bio || "",
                    admissionNumber: student.enrollmentNo || student.admissionNo || "",
                    studentId: student._id || "",
                    rollNumber: student.rollNo || "",
                    academicYear: student.academicYear || "",
                    class: student.class?.name || "",
                    section: typeof student.section === "string" ? student.section : (student.section?.name || ""),
                    parentName: student.parent?.fatherName || "",
                    parentContact: student.parent?.primaryContact || ""
                },
                notifications: student.notificationSettings || {},
                privacy: student.privacySettings || {},
                appearance: student.appearanceSettings || {},
                security: {
                    ...(student.securitySettings || {}),
                    passwordLastChanged: student.updatedAt ? student.updatedAt.toISOString().split("T")[0] : "2024-01-15"
                },
                language: student.languageSettings || {},
                downloads: student.downloadSettings || {}
            }
        });
    } catch (error) {
        console.error("Error in updateStudentSettings:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Change student account password
 * @route   PUT /api/student/settings/password
 * @access  Private (Student)
 */
export const updateStudentPassword = async (req, res) => {
    try {
        const userId = req.user._id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Current and new passwords are required" });
        }

        const user = await User.findById(userId).select("+password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect current password" });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        console.error("Error in updateStudentPassword:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get complete student profile details for dynamic UI rendering
 * @route   GET /api/student/profile
 * @access  Private (Student)
 */
export const getStudentProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const student = await Student.findOne({ user: userId })
            .populate("user", "name email loginId phone photo")
            .populate("class", "name")
            .populate({
                path: "school",
                select: "schoolName settings organization",
                populate: {
                    path: "organization",
                    select: "organizationName organizationLogo"
                }
            })
            .populate({
                path: "parent",
                populate: { path: "user", select: "name email phone" }
            });

        if (!student) {
            return res.status(404).json({ success: false, message: "Student profile not found" });
        }

        let classTeacher = null;
        if (student.section && mongoose.Types.ObjectId.isValid(student.section)) {
            await student.populate({
                path: "section",
                select: "name homeroomTeacher",
                populate: {
                    path: "homeroomTeacher",
                    select: "name email photo"
                }
            });
            if (student.section?.homeroomTeacher) {
                classTeacher = {
                    name: student.section.homeroomTeacher.name,
                    email: student.section.homeroomTeacher.email,
                    photo: student.section.homeroomTeacher.photo
                };
            }
        } else if (student.section) {
            student.section = { _id: null, name: student.section };
        }

        const parent = student.parent;

        const responseData = {
            success: true,
            data: {
                _id: student.user?._id || student.user || "N/A",
                role: "student",
                classTeacher: classTeacher || { name: "Not Assigned", email: "N/A" },
                school: student.school || null,
                name: student.user?.name || "",
                email: student.user?.email || "",
                phone: student.phone || student.user?.phone || "",
                alternatePhone: student.alternatePhone || parent?.alternateContact || "",
                dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().split("T")[0] : "",
                gender: student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : "Male",
                bloodGroup: student.bloodGroup || "O+",
                address: student.address || "",
                bio: student.bio || "",
                photo: student.photo || "",
                profileImage: student.photo || "",
                avatar: student.photo || "",
                image: student.photo || "",
                
                admissionNo: student.enrollmentNo || "N/A",
                rollNo: student.rollNo || "N/A",
                class: student.class?.name || "N/A",
                section: student.section?.name || student.section || "A",
                academicYear: student.academicYear || "N/A",
                enrollmentDate: student.admissionDate ? student.admissionDate.toISOString().split("T")[0] : "",
                previousSchool: student.previousSchool?.name || "N/A",
                studentId: student._id || "N/A",
                
                fatherName: parent?.fatherName || "",
                fatherOccupation: parent?.profileExtras?.fatherOccupation || "",
                fatherPhone: parent?.primaryContact || "",
                fatherEmail: parent?.profileExtras?.fatherEmail || "",
                motherName: parent?.motherName || "",
                motherOccupation: parent?.profileExtras?.motherOccupation || "",
                motherPhone: parent?.alternateContact || "",
                motherEmail: parent?.profileExtras?.motherEmail || "",
                guardianName: parent?.profileExtras?.guardianName || parent?.fatherName || "",
                guardianRelation: parent?.profileExtras?.guardianRelation || "Father",
                guardianPhone: parent?.profileExtras?.guardianPhone || parent?.primaryContact || "",
                
                emergencyName: parent?.profileExtras?.guardianName || parent?.fatherName || "Emergency Contact",
                emergencyRelation: parent?.profileExtras?.guardianRelation || "Father",
                emergencyPhone: parent?.profileExtras?.guardianPhone || parent?.primaryContact || "",
                emergencyAddress: parent?.profileExtras?.emergencyAddress || student.address || "",
                
                height: student.health?.height || "165 cm",
                weight: student.health?.weight || "52 kg",
                bmi: student.health?.bmi || "19.1",
                vision: parent?.profileExtras?.vision || "20/20",
                dental: parent?.profileExtras?.dental || "Good",
                allergies: student.health?.allergies || "None",
                medicalConditions: student.health?.medicalConditions || "None",
                
                linkedin: parent?.profileExtras?.linkedin || "https://linkedin.com",
                twitter: parent?.profileExtras?.twitter || "https://twitter.com",
                instagram: parent?.profileExtras?.instagram || "https://instagram.com",
                
                achievements: parent?.profileExtras?.achievements?.length ? parent.profileExtras.achievements : [
                    'Top Performer in Mathematics',
                    'Perfect Attendance Award'
                ],
                interests: parent?.profileExtras?.interests?.length ? parent.profileExtras.interests : ['Mathematics', 'Computer Science'],
                languages: parent?.profileExtras?.languages?.length ? parent.profileExtras.languages : ['English', 'Hindi']
            }
        };

        return res.status(200).json(responseData);
    } catch (error) {
        console.error("Error in getStudentProfile:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
