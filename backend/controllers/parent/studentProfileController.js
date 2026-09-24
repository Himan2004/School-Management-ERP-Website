import Parent from "../../models/users/parent.model.js";
import Student from "../../models/users/student.model.js";
import User from "../../models/users/user.model.js";
import HealthRecord from "../../models/school/HealthRecord.model.js";
import mongoose from "mongoose";

const formatParentAddress = (addressObj = {}) => {
    const parts = [addressObj.street, addressObj.city, addressObj.state, addressObj.pincode].filter(Boolean);
    return parts.join(", ");
};

const csvToArray = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== "string") return [];
    return value.split(",").map((item) => item.trim()).filter(Boolean);
};

const getParentAndStudent = async (req) => {
    const parent = await Parent.findOne({ user: req.user._id });
    if (!parent || !parent.students?.length) return { parent: null, student: null };

    let studentId = req.query.student_id || parent.students[0];
    if (req.query.student_id) {
        const isChild = parent.students.some((id) => id.toString() === req.query.student_id.toString());
        if (!isChild) {
            studentId = parent.students[0];
        }
    }

    const student = await Student.findById(studentId)
        .populate("user", "name email")
        .populate("class", "name");

    if (student && student.section && mongoose.Types.ObjectId.isValid(student.section)) {
        await student.populate("section", "name");
    }

    return { parent, student };
};

export const getStudentProfileForParent = async (req, res) => {
    try {
        const { parent, student } = await getParentAndStudent(req);
        if (!parent || !student) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const healthRecord = await HealthRecord.findOne({
            school: student.school,
            $or: [{ student: student.user?._id }, { student: student._id }],
        });
        const extras = parent.profileExtras || {};

        return res.status(200).json({
            success: true,
            data: {
                name: student.user?.name || "",
                email: student.user?.email || "",
                phone: student.phone || parent.primaryContact || "",
                alternatePhone: student.alternatePhone || parent.alternateContact || "",
                dateOfBirth: student.dateOfBirth || null,
                gender: student.gender || parent.gender || "",
                bloodGroup: healthRecord?.bloodGroup || student.bloodGroup || "",
                address: student.address || formatParentAddress(parent.address),
                city: parent.address?.city || "",
                state: parent.address?.state || "",
                pincode: parent.address?.pincode || "",
                country: "India",
                admissionNo: student.enrollmentNo || "",
                rollNo: student.rollNo || "",
                class: student.class?.name || "",
                section: student.section?.name || student.section || "",
                academicYear: student.academicYear || "",
                enrollmentDate: student.admissionDate || null,
                previousSchool: student.previousSchool?.name || "",
                studentId: student._id,
                fatherName: parent.fatherName || "",
                fatherOccupation: extras.fatherOccupation || "",
                fatherPhone: parent.primaryContact || "",
                fatherEmail: extras.fatherEmail || "",
                motherName: parent.motherName || "",
                motherOccupation: extras.motherOccupation || "",
                motherPhone: parent.alternateContact || "",
                motherEmail: extras.motherEmail || "",
                guardianName: extras.guardianName || req.user.name || "",
                guardianRelation: extras.guardianRelation || parent.relation || "",
                guardianPhone: extras.guardianPhone || parent.primaryContact || "",
                emergencyName: healthRecord?.emergencyContact?.name || parent.fatherName || parent.motherName || "",
                emergencyRelation: healthRecord?.emergencyContact?.relation || "",
                emergencyPhone: healthRecord?.emergencyContact?.phone || parent.primaryContact || "",
                emergencyAddress: extras.emergencyAddress || formatParentAddress(parent.address),
                height: healthRecord?.height || "",
                weight: healthRecord?.weight || "",
                bmi: healthRecord?.bmi || "",
                vision: extras.vision || "",
                dental: extras.dental || "",
                allergies: (healthRecord?.allergies || []).join(", "),
                medicalConditions: (healthRecord?.chronicConditions || []).join(", "),
                bio: student.bio || "",
                achievements: extras.achievements || [],
                interests: extras.interests || [],
                languages: extras.languages || [],
                profileImage: student.photo || parent.photo || "",
            },
            message: "Student profile fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const updateStudentProfileForParent = async (req, res) => {
    try {
        const { parent, student } = await getParentAndStudent(req);
        if (!parent || !student) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const payload = req.body || {};
        const updatableStudentFields = ["phone", "alternatePhone", "address", "bio", "dateOfBirth", "gender"];
        const updatableUserFields = ["name", "email"];
        const updatableParentFields = ["primaryContact", "alternateContact", "fatherName", "motherName", "relation"];

        updatableStudentFields.forEach((field) => {
            if (payload[field] !== undefined) student[field] = payload[field];
        });
        if (payload.class !== undefined) student.class = student.class;
        if (payload.section !== undefined) student.section = student.section;
        if (payload.previousSchool !== undefined) {
            student.previousSchool = student.previousSchool || {};
            student.previousSchool.name = payload.previousSchool;
        }
        await student.save();

        if (updatableUserFields.some((field) => payload[field] !== undefined)) {
            const userDoc = await User.findById(student.user?._id);
            if (userDoc) {
                updatableUserFields.forEach((field) => {
                    if (payload[field] !== undefined) userDoc[field] = payload[field];
                });
                await userDoc.save();
            }
        }

        updatableParentFields.forEach((field) => {
            if (payload[field] !== undefined) parent[field] = payload[field];
        });
        parent.address = parent.address || {};
        if (payload.city !== undefined) parent.address.city = payload.city;
        if (payload.state !== undefined) parent.address.state = payload.state;
        if (payload.pincode !== undefined) parent.address.pincode = payload.pincode;
        if (payload.address !== undefined) parent.address.street = payload.address;
        parent.profileExtras = parent.profileExtras || {};
        if (payload.fatherOccupation !== undefined) parent.profileExtras.fatherOccupation = payload.fatherOccupation;
        if (payload.fatherEmail !== undefined) parent.profileExtras.fatherEmail = payload.fatherEmail;
        if (payload.motherOccupation !== undefined) parent.profileExtras.motherOccupation = payload.motherOccupation;
        if (payload.motherEmail !== undefined) parent.profileExtras.motherEmail = payload.motherEmail;
        if (payload.guardianName !== undefined) parent.profileExtras.guardianName = payload.guardianName;
        if (payload.guardianRelation !== undefined) parent.profileExtras.guardianRelation = payload.guardianRelation;
        if (payload.guardianPhone !== undefined) parent.profileExtras.guardianPhone = payload.guardianPhone;
        if (payload.emergencyAddress !== undefined) parent.profileExtras.emergencyAddress = payload.emergencyAddress;
        if (payload.vision !== undefined) parent.profileExtras.vision = payload.vision;
        if (payload.dental !== undefined) parent.profileExtras.dental = payload.dental;
        if (payload.achievements !== undefined) parent.profileExtras.achievements = Array.isArray(payload.achievements) ? payload.achievements : [];
        if (payload.interests !== undefined) parent.profileExtras.interests = Array.isArray(payload.interests) ? payload.interests : [];
        if (payload.languages !== undefined) parent.profileExtras.languages = Array.isArray(payload.languages) ? payload.languages : [];
        await parent.save();

        const healthSet = {};
        if (payload.bloodGroup !== undefined) healthSet.bloodGroup = payload.bloodGroup;
        if (payload.height !== undefined) healthSet.height = payload.height;
        if (payload.weight !== undefined) healthSet.weight = payload.weight;
        if (
            payload.emergencyName !== undefined ||
            payload.emergencyRelation !== undefined ||
            payload.emergencyPhone !== undefined
        ) {
            healthSet.emergencyContact = {
                name: payload.emergencyName ?? "",
                relation: payload.emergencyRelation ?? "",
                phone: payload.emergencyPhone ?? "",
            };
        }
        if (payload.allergies !== undefined) healthSet.allergies = csvToArray(payload.allergies);
        if (payload.medicalConditions !== undefined) healthSet.chronicConditions = csvToArray(payload.medicalConditions);

        if (Object.keys(healthSet).length > 0) {
            await HealthRecord.findOneAndUpdate(
                { school: student.school, $or: [{ student: student.user?._id }, { student: student._id }] },
                { $set: healthSet },
                { upsert: true, new: true }
            );
        }

        if (payload.bloodGroup !== undefined && payload.bloodGroup !== student.bloodGroup) {
            student.bloodGroup = payload.bloodGroup;
            await student.save();
        }

        return res.status(200).json({
            success: true,
            message: "Student profile updated successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
