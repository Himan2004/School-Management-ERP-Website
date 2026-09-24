import Teacher from "../../models/users/teacher.model.js";
import User from "../../models/users/user.model.js";
import Student from "../../models/users/student.model.js";
import cloudinary from "../../config/cloudinary.js";
import SubjectAssignment from "../../models/principal/SubjectAssignment.model.js";
import mongoose from "mongoose";

/**
 * Helper to resolve teacher subjects and classes from SubjectAssignment mapping
 */
const resolveTeacherSubjectsAndClasses = async (userId) => {
    // Fetch raw assignments populated with class
    const rawAssignments = await SubjectAssignment.find({ teacherUser: userId })
        .populate("class", "name numericLevel")
        .lean();

    // Gather all unique subject IDs
    const subjectIds = [...new Set(rawAssignments.map(a => a.subject).filter(Boolean))];

    // Fetch matching subjects from both collections to support both local and organization level schemas
    const [subjectsList, orgSubjectsList] = await Promise.all([
        mongoose.model("Subject").find({ _id: { $in: subjectIds } }).lean(),
        mongoose.model("organizationSubjects").find({ _id: { $in: subjectIds } }).lean()
    ]);

    // Construct a lookup map
    const subjectMap = new Map();
    subjectsList.forEach(s => subjectMap.set(s._id.toString(), s));
    orgSubjectsList.forEach(s => subjectMap.set(s._id.toString(), s));

    const uniqueSubjectsMap = new Map();
    const uniqueClassesMap = new Map();

    rawAssignments.forEach(a => {
        const subId = a.subject ? a.subject.toString() : null;
        const rawSub = subId ? (subjectMap.get(subId) || null) : null;
        if (rawSub) {
            const subObj = {
                _id: rawSub._id,
                name: rawSub.subjectName || rawSub.name || "",
                code: rawSub.subjectCode || rawSub.code || "",
                type: rawSub.type || "Theory",
                status: rawSub.status || "active",
                department: rawSub.department || "General",
                theoryMarks: rawSub.theoryMarks !== undefined ? rawSub.theoryMarks : 80,
                practicalMarks: rawSub.practicalMarks !== undefined ? rawSub.practicalMarks : 0,
                passMarks: rawSub.passMarks !== undefined ? rawSub.passMarks : 33,
            };
            uniqueSubjectsMap.set(rawSub._id.toString(), subObj);
        }
        if (a.class) {
            const classKey = `${a.class._id.toString()}_${a.section || ""}`;
            uniqueClassesMap.set(classKey, {
                _id: a.class._id,
                name: a.class.name,
                numericLevel: a.class.numericLevel,
                section: a.section || ""
            });
        }
    });

    const finalSubjects = Array.from(uniqueSubjectsMap.values()).map(sub => {
        const classesForSubject = rawAssignments
            .filter(a => a.subject && a.subject.toString() === sub._id.toString() && a.class)
            .map(a => ({
                _id: a.class._id,
                name: a.class.name,
                numericLevel: a.class.numericLevel,
                section: a.section || ""
            }));
        return {
            ...sub,
            classesAssigned: classesForSubject
        };
    });

    const finalClasses = Array.from(uniqueClassesMap.values());

    return { subjects: finalSubjects, assignedClasses: finalClasses };
};

/**
 * @desc    Get currently logged-in teacher profile
 * @route   GET /api/subject-teacher/profile
 * @access  Private (Teacher)
 */
export const getTeacherProfile = async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
        }

        const user = await User.findById(userId).select("-password").lean();
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Find associated Teacher document
        const teacher = await Teacher.findOne({ user: userId })
            .populate("school")
            .lean();

        if (!teacher) {
            return res.status(404).json({ success: false, message: "Teacher profile not found" });
        }

        // Dynamically resolve assigned subjects and classes from SubjectAssignment mapping
        const { subjects, assignedClasses } = await resolveTeacherSubjectsAndClasses(userId);

        // Merge profile info dynamically
        const profileData = {
            _id: userId,
            teacherId: teacher._id,
            name: user.name,
            email: user.email,
            loginId: user.loginId,
            role: user.role,
            status: user.status,
            photo: teacher.photo || user.photo || null,
            phone: teacher.phone || "",
            alternativePhone: teacher.alternativePhone || "",
            staffId: teacher.staffId || "",
            department: teacher.department || "",
            designation: teacher.designation || "Subject Teacher",
            gender: teacher.gender || "Male",
            dateOfBirth: teacher.dateOfBirth || null,
            qualifications: teacher.qualification || "",
            experience: teacher.experience || 0,
            joiningDate: teacher.joiningDate || null,
            address: teacher.address || { street: "", city: "", state: "", pincode: "" },
            emergencyContact: teacher.emergencyContact || "",
            emergencyContactName: teacher.emergencyContactName || "",
            emergencyContactRelation: teacher.emergencyContactRelation || "",
            emergencyContactPhone: teacher.emergencyContactPhone || "",
            bloodGroup: teacher.bloodGroup || "",
            maritalStatus: teacher.maritalStatus || "",
            nationality: teacher.nationality || "",
            subjects: subjects,
            assignedClasses: assignedClasses,
            stats: {
                totalClasses: assignedClasses.length,
                totalStudents: assignedClasses.length 
                    ? await mongoose.model("Student").countDocuments({ class: { $in: assignedClasses.map(c => c._id) }, status: 'active' })
                    : 0
            },
            school: {
                _id: teacher.school?._id,
                schoolName: teacher.school?.schoolName || "",
                officialEmail: teacher.school?.officialEmail || "",
                officialPhone: teacher.school?.officialPhone || "",
                branchId: teacher.school?.branchId || "",
                city: teacher.school?.city || "",
                principalName: teacher.school?.principalName || "Principal Admin"
            },
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        return res.status(200).json({
            success: true,
            data: profileData
        });

    } catch (error) {
        console.error("Error in getTeacherProfile:", error);
        try {
            import('fs').then(fs => {
                fs.appendFileSync('error.log', `[${new Date().toISOString()}] Error in getTeacherProfile: ${error.stack}\n`);
            });
        } catch (e) {}
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update currently logged-in teacher profile
 * @route   PUT /api/subject-teacher/profile
 * @access  Private (Teacher)
 */
export const updateTeacherProfile = async (req, res) => {
    try {
        const userId = req.user?._id;
        const {
            phone,
            alternativePhone,
            address,
            emergencyContactName,
            emergencyContactRelation,
            emergencyContactPhone,
            gender,
            dateOfBirth,
            qualification,
            qualifications,
            maritalStatus,
            nationality,
            bloodGroup,
            experience
        } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
        }

        // Locate teacher profile
        const teacher = await Teacher.findOne({ user: userId });
        if (!teacher) {
            return res.status(404).json({ success: false, message: "Teacher profile not found" });
        }

        // Only allowed update fields
        if (phone !== undefined) teacher.phone = phone;
        if (alternativePhone !== undefined) teacher.alternativePhone = alternativePhone;
        if (gender !== undefined) teacher.gender = gender;
        if (dateOfBirth !== undefined) teacher.dateOfBirth = dateOfBirth;
        const qualVal = qualifications !== undefined 
            ? (Array.isArray(qualifications) ? qualifications.join(", ") : qualifications)
            : qualification;
        if (qualVal !== undefined) teacher.qualification = qualVal;
        if (maritalStatus !== undefined) teacher.maritalStatus = maritalStatus;
        if (nationality !== undefined) teacher.nationality = nationality;
        if (bloodGroup !== undefined) teacher.bloodGroup = bloodGroup;
        if (experience !== undefined) teacher.experience = experience;

        if (address) {
            teacher.address = {
                street: address.street !== undefined ? address.street : (teacher.address?.street || ""),
                city: address.city !== undefined ? address.city : (teacher.address?.city || ""),
                state: address.state !== undefined ? address.state : (teacher.address?.state || ""),
                pincode: address.pincode !== undefined ? address.pincode : (teacher.address?.pincode || ""),
            };
        }

        if (emergencyContactName !== undefined) teacher.emergencyContactName = emergencyContactName;
        if (emergencyContactRelation !== undefined) teacher.emergencyContactRelation = emergencyContactRelation;
        if (emergencyContactPhone !== undefined) teacher.emergencyContactPhone = emergencyContactPhone;
        
        // Populate standard emergencyContact string field for backwards compatibility
        if (emergencyContactName || emergencyContactPhone) {
            teacher.emergencyContact = `${emergencyContactName || ""} (${emergencyContactRelation || ""}) - ${emergencyContactPhone || ""}`.trim();
        }

        await teacher.save();

        // Retrieve full populated profile
        const user = await User.findById(userId).select("-password").lean();
        const populatedTeacher = await Teacher.findById(teacher._id)
            .populate("school")
            .lean();

        // Dynamically resolve assigned subjects and classes from SubjectAssignment mapping
        const { subjects, assignedClasses } = await resolveTeacherSubjectsAndClasses(userId);

        const profileData = {
            _id: userId,
            teacherId: populatedTeacher._id,
            name: user.name,
            email: user.email,
            loginId: user.loginId,
            role: user.role,
            status: user.status,
            photo: populatedTeacher.photo || user.photo || null,
            phone: populatedTeacher.phone || "",
            alternativePhone: populatedTeacher.alternativePhone || "",
            staffId: populatedTeacher.staffId || "",
            department: populatedTeacher.department || "",
            designation: populatedTeacher.designation || "Subject Teacher",
            gender: populatedTeacher.gender || "Male",
            dateOfBirth: populatedTeacher.dateOfBirth || null,
            qualifications: populatedTeacher.qualification || "",
            experience: populatedTeacher.experience || 0,
            joiningDate: populatedTeacher.joiningDate || null,
            address: populatedTeacher.address || { street: "", city: "", state: "", pincode: "" },
            emergencyContact: populatedTeacher.emergencyContact || "",
            emergencyContactName: populatedTeacher.emergencyContactName || "",
            emergencyContactRelation: populatedTeacher.emergencyContactRelation || "",
            emergencyContactPhone: populatedTeacher.emergencyContactPhone || "",
            bloodGroup: populatedTeacher.bloodGroup || "",
            maritalStatus: populatedTeacher.maritalStatus || "",
            nationality: populatedTeacher.nationality || "",
            subjects: subjects,
            assignedClasses: assignedClasses,
            stats: {
                totalClasses: assignedClasses.length,
                totalStudents: assignedClasses.length 
                    ? await mongoose.model("Student").countDocuments({ class: { $in: assignedClasses.map(c => c._id) }, status: 'active' })
                    : 0
            },
            school: {
                _id: populatedTeacher.school?._id,
                schoolName: populatedTeacher.school?.schoolName || "",
                officialEmail: populatedTeacher.school?.officialEmail || "",
                officialPhone: populatedTeacher.school?.officialPhone || "",
                branchId: populatedTeacher.school?.branchId || "",
                city: populatedTeacher.school?.city || "",
                principalName: populatedTeacher.school?.principalName || "Principal Admin"
            },
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: profileData
        });

    } catch (error) {
        console.error("Error in updateTeacherProfile:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Upload profile image
 * @route   PATCH /api/subject-teacher/profile/image
 * @access  Private (Teacher)
 */
export const uploadProfileImage = async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file uploaded" });
        }

        // Get current teacher profile
        const teacher = await Teacher.findOne({ user: userId });
        const user = await User.findById(userId);

        if (!teacher) {
            return res.status(404).json({ success: false, message: "Teacher profile not found" });
        }

        // Delete old photo from Cloudinary if exists
        if (teacher.photo) {
            const publicId = teacher.photo.split("/").pop().split(".")[0];
            try {
                await cloudinary.uploader.destroy(`teacher-profiles/${publicId}`);
            } catch (err) {
                console.log("Old photo deletion failed:", err.message);
            }
        }
        if (user.photo) {
            const publicId = user.photo.split("/").pop().split(".")[0];
            try {
                await cloudinary.uploader.destroy(`user-profiles/${publicId}`);
            } catch (err) {
                console.log("Old photo deletion failed:", err.message);
            }
        }

        // Save new photo URL
        const photoUrl = req.file.path;
        teacher.photo = photoUrl;
        await teacher.save();

        user.photo = photoUrl;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile image updated successfully",
            data: { photo: photoUrl }
        });

    } catch (error) {
        console.error("Error in uploadProfileImage:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Change password
 * @route   PATCH /api/subject-teacher/change-password
 * @access  Private (Teacher)
 */
export const changeTeacherPassword = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match." });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
        }

        const user = await User.findById(userId).select("+password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Current password is incorrect." });
        }

        // Prevent reusing same password
        const isSame = await user.comparePassword(newPassword);
        if (isSame) {
            return res.status(400).json({ success: false, message: "New password cannot be the same as the current password." });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("Error in changeTeacherPassword:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
