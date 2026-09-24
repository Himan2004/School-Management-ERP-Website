import IDCardRecord from "../../models/principal/IDCardRecord.model.js";
import Student from "../../models/users/student.model.js";
import School from "../../models/school/School.js";

export const verifyIdCardPublic = async (req, res) => {
    try {
        const { token } = req.params;
        if (!token) {
            return res.status(400).json({ success: false, verified: false, message: "Token (Card Number) is required" });
        }

        let record = await IDCardRecord.findOne({ 
            serialNumber: token 
        }).populate("template").lean();

        if (!record) {
            record = await IDCardRecord.findOne({ 
                serialNumber: token.toUpperCase() 
            }).populate("template").lean();
        }

        if (!record && token.toUpperCase().startsWith("STU-")) {
            const suffix = token.substring(4).toLowerCase();
            if (suffix.length === 6) {
                const allStudents = await Student.find({}).select("_id").lean();
                const matchedStudent = allStudents.find(s => 
                    s._id.toString().toLowerCase().endsWith(suffix)
                );
                
                if (matchedStudent) {
                    record = await IDCardRecord.findOne({ 
                        entityId: matchedStudent._id,
                        entityType: 'Student'
                    }).populate("template").lean();
                }
            }
        }

        if (!record) {
            return res.status(404).json({
                success: false,
                verified: false,
                message: "Student ID card record not found"
            });
        }

        const student = await Student.findById(record.entityId)
            .populate("user", "name email photo")
            .populate("class", "name")
            .populate("section", "name sectionName")
            .populate("parent", "fatherName motherName primaryContact address")
            .lean();

        if (!student) {
            return res.status(404).json({
                success: false,
                verified: false,
                message: "Student profile not found"
            });
        }

        const schoolDoc = await School.findById(student.school)
            .populate("organization", "organizationName organizationLogo logo logoUrl")
            .select("schoolName address officialPhone settings organization logo")
            .lean();

        const parentName = student.parent?.fatherName || student.parent?.motherName || student.parentName || "N/A";
        
        const isVerified = record.status === "Active" || record.status === "Printed" || record.status === "Distributed";
        
        const verificationDetails = {
            verified: isVerified,
            student: {
                name: student.user?.name || "N/A",
                photo: student.photo || student.user?.photo || "",
                admissionNo: student.enrollmentNo || student.admissionNo || "N/A",
                rollNo: student.rollNo || "N/A",
                class: student.class?.name || "N/A",
                section: student.section?.name || student.section?.sectionName || "N/A",
                academicYear: student.academicYear || "N/A",
                bloodGroup: student.bloodGroup || "N/A",
                parentName: parentName,
            },
            school: {
                schoolName: schoolDoc?.schoolName || "N/A",
                schoolAddress: schoolDoc?.address || "N/A",
                schoolLogo: schoolDoc?.settings?.school?.logoUrl || schoolDoc?.logo || "",
                organizationLogo: schoolDoc?.organization?.organizationLogo || schoolDoc?.organization?.logoUrl || "",
            },
            card: {
                serialNumber: record.serialNumber || "N/A",
                cardNumber: record.serialNumber || "N/A",
                status: record.status || "Pending",
                issueDate: record.generationDate || record.createdAt || null,
                validUntil: "Current Academic Session",
            }
        };

        return res.status(200).json({
            success: true,
            verified: isVerified,
            data: verificationDetails,
            message: isVerified ? "ID Card verified successfully" : `ID Card status is ${record.status}`
        });

    } catch (error) {
        console.error("ID Card Verification Error:", error);
        return res.status(500).json({ success: false, verified: false, message: error.message });
    }
};
