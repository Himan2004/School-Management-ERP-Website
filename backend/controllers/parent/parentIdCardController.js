import Parent from "../../models/users/parent.model.js";
import Student from "../../models/users/student.model.js";
import School from "../../models/school/School.js";
import IDCardRecord from "../../models/principal/IDCardRecord.model.js";
import IDCardTemplate from "../../models/principal/IDCardTemplate.model.js";
import mongoose from "mongoose";

const formatAddress = (addressObj) => {
    if (!addressObj) return "";
    if (typeof addressObj === "string") return addressObj;
    if (typeof addressObj === "object") {
        const parts = [addressObj.street, addressObj.city, addressObj.state, addressObj.pincode].filter(Boolean);
        return parts.join(", ");
    }
    return "";
};

const resolveParentStudentContext = async (req) => {
    // Fetch parent profile and populate students relation
    const parent = await Parent.findOne({ user: req.user._id })
        .select("fatherName motherName primaryContact alternateContact address students")
        .lean();
    if (!parent || !parent.students?.length) return null;

    let studentId = req.query.student_id || parent.students[0];
    if (req.query.student_id) {
        const isChild = parent.students.some((id) => id.toString() === req.query.student_id.toString());
        if (!isChild) {
            studentId = parent.students[0];
        }
    }

    // Load student profile with latest data (user, class, section, transport route)
    const student = await Student.findById(studentId)
        .populate("user", "name email photo")
        .populate("class", "name")
        .populate("section", "name sectionName")
        .populate({
            path: "transport.routeId",
            select: "routeName routeCode"
        })
        .lean();

    if (!student) return null;

    // Load school details with organization populated to avoid hardcoded organization or logo values
    const schoolDoc = await School.findById(student.school)
        .populate("organization", "organizationName organizationLogo logo logoUrl")
        .select("schoolName address officialPhone officialEmail website settings organization logo")
        .lean();

    return { parent, student, schoolDoc };
};

const toCardDetails = (recordDoc, student, parent, schoolDoc) => {
    const parentName = parent.fatherName || parent.motherName || student.parentName || "";
    const emergencyContact = parent.alternateContact || parent.primaryContact || student.alternatePhone || student.phone || "";
    const transportRoute = student.transport?.enrolled 
        ? (student.transport?.routeId?.routeName || "Enrolled") 
        : "Not Enrolled";

    return {
        cardId: recordDoc?._id || null,
        serialNumber: recordDoc?.serialNumber || `STU-${student._id.toString().substring(18).toUpperCase()}`,
        qrCodeData: recordDoc?.qrCodeData || `STU-${student._id.toString()}`,
        status: recordDoc?.status || "Pending",
        generationDate: recordDoc?.generationDate || recordDoc?.createdAt || null,
        studentData: {
            id: student._id,
            name: student.user?.name || "",
            class: student.class?.name || "",
            section: student.section?.name || student.section?.sectionName || student.section || "",
            rollNo: student.rollNo || "",
            admissionNo: student.enrollmentNo || student.admissionNo || "",
            bloodGroup: student.bloodGroup || "",
            dob: student.dateOfBirth || null,
            gender: student.gender || "",
            photo: student.photo || student.user?.photo || "",
            address: student.address || formatAddress(parent.address) || "",
            parentName: parentName,
            fatherName: parent.fatherName || "",
            motherName: parent.motherName || "",
            phone: parent.primaryContact || "",
            emergencyContact: emergencyContact,
            transport: transportRoute,
            house: student.house || student.profileExtras?.house || "N/A",
            academicYear: student.academicYear || "",
        },
        schoolData: {
            schoolName: schoolDoc?.schoolName || "",
            schoolAddress: schoolDoc?.address || "",
            schoolContact: schoolDoc?.officialPhone || "",
            schoolEmail: schoolDoc?.settings?.school?.email || schoolDoc?.officialEmail || "",
            schoolWebsite: schoolDoc?.settings?.school?.website || schoolDoc?.website || "",
            schoolLogo: schoolDoc?.settings?.school?.logoUrl || schoolDoc?.logo || "",
            tagline: schoolDoc?.settings?.school?.tagline || "Official Identity Card",
            principalSignature: schoolDoc?.settings?.school?.principalSignature || "",
            organizationName: schoolDoc?.organization?.organizationName || "",
            organizationLogo: schoolDoc?.organization?.organizationLogo || schoolDoc?.organization?.logoUrl || "",
        },
        template: recordDoc?.template || null,
        instructions: [
            "Carry ID card to school every day",
            "Show ID card at school entrance",
            "Report lost card immediately",
            "ID card is non-transferable",
            "For corrections contact the school administration"
        ]
    };
};

export const getParentStudentIdCard = async (req, res) => {
    try {
        const context = await resolveParentStudentContext(req);
        if (!context) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }
        const { student, parent, schoolDoc } = context;

        // Fetch latest active ID Card Record
        const latestCardRecord = await IDCardRecord.findOne({
            entityId: student._id,
            entityType: "Student",
            school: student.school,
            status: { $ne: "Revoked" },
        }).populate("template").sort({ createdAt: -1 }).lean();

        return res.status(200).json({
            success: true,
            data: {
                hasCard: Boolean(latestCardRecord && latestCardRecord.status !== "Pending"),
                cardDetails: toCardDetails(latestCardRecord, student, parent, schoolDoc),
            },
            message: latestCardRecord ? "Student ID card fetched successfully" : "Student ID card record not found",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const requestParentIdCardReissue = async (req, res) => {
    try {
        const context = await resolveParentStudentContext(req);
        if (!context) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }
        const { student, parent, schoolDoc } = context;
        const { reason = "Reissue requested by parent", description = "" } = req.body || {};

        let template = await IDCardTemplate.findOne({
            school: student.school,
            targetRole: "Student",
            isDefault: true,
        }).sort({ createdAt: -1 });

        if (!template) {
            template = await IDCardTemplate.findOne({ school: student.school, targetRole: "Student" }).sort({ createdAt: -1 });
        }

        if (!template) {
            return res.status(404).json({ success: false, data: null, message: "No ID card template configured for this school" });
        }

        const now = new Date();
        const qrCodeData = Buffer.from(`${student.school}:${student._id}:${Date.now()}`).toString('base64');
        
        let cardRecord = await IDCardRecord.findOne({
            entityId: student._id,
            entityType: "Student",
            school: student.school,
        }).sort({ createdAt: -1 });

        if (cardRecord) {
            cardRecord.template = template._id;
            cardRecord.generationDate = now;
            cardRecord.status = "Pending"; // Set back to Pending for reissue approval
            cardRecord.qrCodeData = qrCodeData;
            if (!cardRecord.serialNumber) {
                cardRecord.serialNumber = `STU-${student._id.toString().substring(18).toUpperCase()}`;
            }
            cardRecord.history = Array.isArray(cardRecord.history) ? cardRecord.history : [];
            cardRecord.history.push({
                status: "Pending",
                date: now,
                note: `Reissue requested by parent: ${reason}${description ? `. Details: ${description}` : ""}`,
                updatedBy: req.user._id,
            });
            await cardRecord.save();
        } else {
            cardRecord = await IDCardRecord.create({
                organization: schoolDoc?.organization?._id || schoolDoc?.organization || null,
                school: student.school,
                entityType: "Student",
                entityId: student._id,
                entityTypeModel: "Student",
                template: template._id,
                serialNumber: `STU-${student._id.toString().substring(18).toUpperCase()}`,
                status: "Pending",
                qrCodeData,
                generationDate: now,
                history: [{
                    status: "Pending",
                    date: now,
                    note: `Reissue requested by parent: ${reason}${description ? `. Details: ${description}` : ""}`,
                    updatedBy: req.user._id,
                }],
            });
        }

        const populated = await IDCardRecord.findById(cardRecord._id).populate("template");
        
        return res.status(200).json({
            success: true,
            data: { cardDetails: toCardDetails(populated, student, parent, schoolDoc) },
            message: "ID card reissue requested successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};
