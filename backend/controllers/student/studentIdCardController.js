import Student from "../../models/users/student.model.js";
import Parent from "../../models/users/parent.model.js";
import School from "../../models/school/School.js";
import IDCardRecord from "../../models/principal/IDCardRecord.model.js";
import IDCardTemplate from "../../models/principal/IDCardTemplate.model.js";
import mongoose from "mongoose";

const getStudentContext = async (req) => {
    const studentProfile = await Student.findOne({ user: req.user._id })
        .populate("user", "name email")
        .populate("class", "name");

    if (studentProfile && studentProfile.section && mongoose.Types.ObjectId.isValid(studentProfile.section)) {
        await studentProfile.populate("section", "name");
    }

    if (!studentProfile) return { studentProfile: null, parentProfile: null, schoolDoc: null };

    const [parentProfile, schoolDoc] = await Promise.all([
        Parent.findById(studentProfile.parent).select("fatherName motherName primaryContact address"),
        School.findById(studentProfile.school).select("schoolName address officialPhone settings organization"),
    ]);

    return { studentProfile, parentProfile, schoolDoc };
};

const formatAddress = (addressObj) => {
    if (!addressObj || typeof addressObj !== "object") return "";
    const parts = [addressObj.street, addressObj.city, addressObj.state, addressObj.pincode].filter(Boolean);
    return parts.join(", ");
};

const getStudentInfo = (studentProfile, parentProfile) => ({
    name: studentProfile?.user?.name || "",
    rollNumber: studentProfile?.rollNo || "",
    class: studentProfile?.class?.name || "",
    section: studentProfile?.section?.name || studentProfile?.section || "",
    dateOfBirth: studentProfile?.dateOfBirth || null,
    bloodGroup: studentProfile?.bloodGroup || "",
    gender: studentProfile?.gender || "",
    fatherName: parentProfile?.fatherName || "",
    motherName: parentProfile?.motherName || "",
    address: formatAddress(parentProfile?.address),
    phone: parentProfile?.primaryContact || "",
    email: studentProfile?.user?.email || "",
    photo: studentProfile?.photo || "",
});

const getSchoolInfo = (schoolDoc) => ({
    schoolName: schoolDoc?.schoolName || "",
    schoolAddress: schoolDoc?.address || "",
    schoolPhone: schoolDoc?.officialPhone || "",
    schoolLogo: schoolDoc?.settings?.school?.logoUrl || "",
});

const getTemplateInfo = (templateDoc) => ({
    id: templateDoc?._id || null,
    name: templateDoc?.name || "",
    designConfig: {
        backgroundColor: templateDoc?.designConfig?.backgroundColor || "#ffffff",
        primaryColor: templateDoc?.designConfig?.primaryColor || "#1e40af",
        secondaryColor: templateDoc?.designConfig?.secondaryColor || "#facc15",
        textColor: templateDoc?.designConfig?.textColor || "#1e293b",
        headerImage: templateDoc?.designConfig?.headerImage || "",
        logoImage: templateDoc?.designConfig?.logoImage || "",
        showSchoolName: templateDoc?.designConfig?.showSchoolName ?? true,
        showSchoolAddress: templateDoc?.designConfig?.showSchoolAddress ?? false,
    },
    visibleFields: Array.isArray(templateDoc?.visibleFields) ? templateDoc.visibleFields : [],
    paperSize: templateDoc?.paperSize || "PVC",
    dimensions: templateDoc?.dimensions || { width: 85.6, height: 53.98, unit: "mm" },
});

const buildCardDetails = (recordDoc, studentProfile, parentProfile, schoolDoc) => {
    let uiStatus = "active";
    if (recordDoc?.status) {
        const s = recordDoc.status.toLowerCase();
        if (s === "revoked" || s === "expired") {
            uiStatus = "expired";
        } else if (s === "suspended") {
            uiStatus = "suspended";
        } else if (s === "pending") {
            uiStatus = "pending";
        }
    }
    return {
        cardId: recordDoc?._id || null,
        serialNumber: recordDoc?.serialNumber || `STU-${Date.now().toString().slice(-6)}`,
        qrCodeData: recordDoc?.qrCodeData || "",
        status: uiStatus,
        generationDate: recordDoc?.generationDate || null,
        ...getStudentInfo(studentProfile, parentProfile),
        ...getSchoolInfo(schoolDoc),
        template: getTemplateInfo(recordDoc?.template),
    };
};

const findLatestStudentCard = async (studentId, schoolId, includeRevoked = false) => {
    const query = {
        entityId: studentId,
        entityType: "Student",
        school: schoolId,
    };
    if (!includeRevoked) {
        query.status = { $ne: "Revoked" };
    }

    return IDCardRecord.findOne(query)
        .populate("template")
        .sort({ createdAt: -1 });
};

export const getStudentIdCard = async (req, res) => {
    try {
        const { studentProfile, parentProfile, schoolDoc } = await getStudentContext(req);
        if (!studentProfile) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        let latestCardRecord = await findLatestStudentCard(studentProfile._id, studentProfile.school, false);
        
        if (!latestCardRecord) {
            // Auto-generate ID Card template & record if none exists
            const schoolId = studentProfile.school;
            const organizationId = req.user?.school?.organization || schoolDoc?.organization || null;

            let selectedTemplate = await IDCardTemplate.findOne({
                school: schoolId,
                targetRole: "Student",
                isDefault: true,
            }).sort({ createdAt: -1 });

            if (!selectedTemplate) {
                selectedTemplate = await IDCardTemplate.findOne({
                    school: schoolId,
                    targetRole: "Student",
                }).sort({ createdAt: -1 });
            }

            // Create a default template if none is found
            if (!selectedTemplate && organizationId) {
                selectedTemplate = await IDCardTemplate.create({
                    organization: organizationId,
                    school: schoolId,
                    name: "Default Student Template",
                    targetRole: "Student",
                    paperSize: "PVC",
                    isDefault: true,
                    designConfig: {
                        backgroundColor: "#ffffff",
                        primaryColor: "#223F74",
                        secondaryColor: "#F59B87",
                        textColor: "#1d1d1f",
                        showSchoolName: true,
                        showSchoolAddress: true,
                    },
                    visibleFields: [
                        { field: "name", label: "Name", isEnabled: true },
                        { field: "rollNo", label: "Roll No", isEnabled: true },
                        { field: "class", label: "Class", isEnabled: true },
                        { field: "bloodGroup", label: "Blood Group", isEnabled: true },
                    ]
                });
            }

            if (selectedTemplate) {
                const now = new Date();
                const qrCodeData = `STU-${studentProfile._id}-${Date.now()}`;
                
                // Create card record
                latestCardRecord = await IDCardRecord.create({
                    organization: organizationId,
                    school: schoolId,
                    entityType: "Student",
                    entityId: studentProfile._id,
                    entityTypeModel: "Student",
                    template: selectedTemplate._id,
                    serialNumber: `STU-${Date.now().toString().slice(-8)}`,
                    status: "Generated",
                    qrCodeData,
                    generationDate: now,
                    history: [{
                        status: "Generated",
                        date: now,
                        note: "Automatically generated on first load",
                        updatedBy: req.user._id,
                    }],
                });

                // Populate template
                latestCardRecord = await IDCardRecord.findById(latestCardRecord._id).populate("template");
            }
        }

        if (!latestCardRecord) {
            return res.status(200).json({
                success: true,
                data: {
                    hasCard: false,
                    studentData: {
                        ...getStudentInfo(studentProfile, parentProfile),
                        ...getSchoolInfo(schoolDoc),
                    },
                },
                message: "Student ID card record not found",
            });
        }

        const cardDetails = buildCardDetails(latestCardRecord, studentProfile, parentProfile, schoolDoc);
        return res.status(200).json({
            success: true,
            data: {
                hasCard: true,
                cardDetails,
            },
            message: "Student ID card fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const downloadIdCard = async (req, res) => {
    try {
        const { studentProfile, parentProfile, schoolDoc } = await getStudentContext(req);
        if (!studentProfile) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const cardRecord = await findLatestStudentCard(studentProfile._id, studentProfile.school, false);
        if (!cardRecord || cardRecord.status === "Revoked") {
            return res.status(404).json({ success: false, data: null, message: "ID Card not available for download" });
        }

        if (cardRecord.status === "Generated") {
            cardRecord.status = "Printed";
            cardRecord.printedDate = new Date();
        }

        const history = Array.isArray(cardRecord.history) ? cardRecord.history : [];
        history.push({
            status: "Downloaded",
            date: new Date(),
            note: "Downloaded by student",
            updatedBy: req.user._id,
        });
        cardRecord.history = history;
        await cardRecord.save();

        const populatedRecord = await IDCardRecord.findById(cardRecord._id).populate("template");
        const cardDetails = buildCardDetails(populatedRecord, studentProfile, parentProfile, schoolDoc);

        return res.status(200).json({
            success: true,
            data: { cardDetails },
            message: "ID Card ready for download",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const regenerateIdCard = async (req, res) => {
    try {
        const { studentProfile, parentProfile, schoolDoc } = await getStudentContext(req);
        if (!studentProfile) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const schoolId = studentProfile.school;
        const organizationId = req.user?.school?.organization || schoolDoc?.organization || null;

        let selectedTemplate = await IDCardTemplate.findOne({
            school: schoolId,
            targetRole: "Student",
            isDefault: true,
        }).sort({ createdAt: -1 });

        if (!selectedTemplate) {
            selectedTemplate = await IDCardTemplate.findOne({
                school: schoolId,
                targetRole: "Student",
            }).sort({ createdAt: -1 });
        }

        if (!selectedTemplate) {
            return res.status(404).json({
                success: false,
                data: null,
                message: "No ID card template configured for this school",
            });
        }

        const now = new Date();
        const qrCodeData = `STU-${studentProfile._id}-${Date.now()}`;
        let cardRecord = await IDCardRecord.findOne({
            entityId: studentProfile._id,
            entityType: "Student",
            school: schoolId,
        }).sort({ createdAt: -1 });

        if (cardRecord) {
            cardRecord.template = selectedTemplate._id;
            cardRecord.generationDate = now;
            cardRecord.status = "Generated";
            cardRecord.qrCodeData = qrCodeData;

            const history = Array.isArray(cardRecord.history) ? cardRecord.history : [];
            history.push({
                status: "Regenerated",
                date: now,
                note: "Regenerated by student",
                updatedBy: req.user._id,
            });
            cardRecord.history = history;
            await cardRecord.save();
        } else {
            cardRecord = await IDCardRecord.create({
                organization: organizationId,
                school: schoolId,
                entityType: "Student",
                entityId: studentProfile._id,
                entityTypeModel: "Student",
                template: selectedTemplate._id,
                serialNumber: `STU-${Date.now()}`,
                status: "Generated",
                qrCodeData,
                generationDate: now,
                history: [{
                    status: "Regenerated",
                    date: now,
                    note: "Regenerated by student",
                    updatedBy: req.user._id,
                }],
            });
        }

        const populatedRecord = await IDCardRecord.findById(cardRecord._id).populate("template");
        const cardDetails = buildCardDetails(populatedRecord, studentProfile, parentProfile, schoolDoc);

        return res.status(200).json({
            success: true,
            data: { cardDetails },
            message: "ID Card regenerated successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getIdCardHistory = async (req, res) => {
    try {
        const studentProfile = await Student.findOne({ user: req.user._id }).select("_id school");
        if (!studentProfile) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const records = await IDCardRecord.find({
            entityId: studentProfile._id,
            entityType: "Student",
            school: studentProfile.school,
        }).sort({ createdAt: -1 });

        const formattedRecords = records.map((record) => ({
            id: record._id,
            serialNumber: record.serialNumber || "",
            status: record.status || "",
            generationDate: record.generationDate || null,
            printedDate: record.printedDate || null,
            distributedDate: record.distributedDate || null,
            history: Array.isArray(record.history)
                ? record.history.map((h) => ({
                    status: h.status || "",
                    date: h.date || null,
                    note: h.note || "",
                }))
                : [],
        }));

        return res.status(200).json({
            success: true,
            data: {
                records: formattedRecords,
                totalRecords: formattedRecords.length,
            },
            message: "ID card history fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getIdCardStats = async (req, res) => {
    try {
        const studentProfile = await Student.findOne({ user: req.user._id }).select("_id school");
        if (!studentProfile) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const latestRecord = await IDCardRecord.findOne({
            entityId: studentProfile._id,
            entityType: "Student",
            school: studentProfile.school,
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: {
                hasActiveCard: !!latestRecord && latestRecord.status !== "Revoked",
                cardStatus: latestRecord?.status || null,
                generationDate: latestRecord?.generationDate || null,
                lastDownloaded: latestRecord?.printedDate || null,
                totalRegenerations: Array.isArray(latestRecord?.history) ? latestRecord.history.length : 0,
                qrCodeData: latestRecord?.qrCodeData || null,
                serialNumber: latestRecord?.serialNumber || null,
            },
            message: "ID card stats fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};
