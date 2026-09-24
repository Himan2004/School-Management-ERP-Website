import mongoose from 'mongoose';
import StudentProfile from '../../models/users/student.model.js';
import User from '../../models/users/user.model.js';
import TransferRequest from '../../models/principal/TransferRequest.model.js';
import TransferCertificate from '../../models/principal/TransferCertificate.model.js';
import Parent from '../../models/users/parent.model.js';
import School from '../../models/school/School.js';

// Get all schools in the same organization (branches)
export const getAvailableSchools = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate({
            path: 'school',
            populate: { path: 'organization' }
        });
        if (!user || !user.school || !user.school.organization) {
            return res.status(400).json({ success: false, message: "Organization context not found" });
        }
        const organizationId = user.school.organization._id || user.school.organization;
        const schools = await School.find({ organization: organizationId });
        res.status(200).json({ success: true, data: schools });
    } catch (error) {
        console.error("Error in getAvailableSchools:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET Eligible Students
export const getEligibleStudents = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { 
            classId, 
            sectionId, 
            status, 
            gender, 
            academicYear, 
            search, 
            admissionFeeStatus,
            startDate,
            endDate,
            page = 1, 
            limit = 10, 
            sortBy = "createdAt", 
            sortOrder = "desc" 
        } = req.query;

        let query = { 
            school: schoolId,
            status: { $in: ['active', 'inactive', 'passout'] }
        };

        if (classId && classId !== "all" && classId !== "All") query.class = classId;
        if (sectionId && sectionId !== "all" && sectionId !== "All") query.section = sectionId;
        if (gender && gender !== "all" && gender !== "All") query.gender = gender.toLowerCase();
        if (academicYear && academicYear !== "all" && academicYear !== "All") query.academicYear = academicYear;
        if (admissionFeeStatus && admissionFeeStatus !== "all" && admissionFeeStatus !== "All") query.admissionFeeStatus = admissionFeeStatus;
        
        if (status && status !== "all" && status !== "All") {
            const cleanStatus = status.toLowerCase().replace(/\s+/g, '');
            if (['active', 'inactive', 'passout'].includes(cleanStatus)) {
                query.status = cleanStatus;
            }
        }

        if (startDate || endDate) {
            query.admissionDate = {};
            if (startDate) query.admissionDate.$gte = new Date(startDate);
            if (endDate) query.admissionDate.$lte = new Date(endDate);
        }

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            const matchedUsers = await User.find({
                school: schoolId,
                role: 'student',
                name: { $regex: regex }
            }).select('_id');
            const userIds = matchedUsers.map(u => u._id);

            query.$or = [
                { user: { $in: userIds } },
                { enrollmentNo: { $regex: regex } },
                { admissionNo: { $regex: regex } },
                { rollNo: { $regex: regex } }
            ];
        }

        const total = await StudentProfile.countDocuments(query);
        const students = await StudentProfile.find(query)
            .populate("user", "name email phone photo status gender")
            .populate("class", "name")
            .populate("section", "name")
            .populate({
                path: "parent",
                populate: { path: "user", select: "name email phone" }
            })
            .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
            data: students
        });
    } catch (error) {
        console.error("Error in getEligibleStudents:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET Pending Requests
export const getPendingRequests = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { 
            classId, 
            sectionId, 
            search,
            page = 1, 
            limit = 10, 
            sortBy = "createdAt", 
            sortOrder = "desc" 
        } = req.query;

        let query = { 
            school: schoolId,
            status: 'Pending'
        };

        let studentQuery = {};
        if (classId && classId !== "all" && classId !== "All") studentQuery.class = classId;
        if (sectionId && sectionId !== "all" && sectionId !== "All") studentQuery.section = sectionId;

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            const matchedUsers = await User.find({
                school: schoolId,
                role: 'student',
                name: { $regex: regex }
            }).select('_id');
            const userIds = matchedUsers.map(u => u._id);
            studentQuery.$or = [
                { user: { $in: userIds } },
                { enrollmentNo: { $regex: regex } },
                { admissionNo: { $regex: regex } }
            ];
        }

        if (Object.keys(studentQuery).length > 0) {
            studentQuery.school = schoolId;
            const matchingStudents = await StudentProfile.find(studentQuery).select('_id');
            query.student = { $in: matchingStudents.map(s => s._id) };
        }

        const total = await TransferRequest.countDocuments(query);
        const requests = await TransferRequest.find(query)
            .populate({
                path: "student",
                populate: [
                    { path: "user", select: "name email phone photo" },
                    { path: "class", select: "name" },
                    { path: "section", select: "name" }
                ]
            })
            .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
            data: requests
        });
    } catch (error) {
        console.error("Error in getPendingRequests:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET Transfer History
export const getTransferHistory = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { 
            classId, 
            academicYear,
            startDate,
            endDate,
            search,
            page = 1, 
            limit = 10, 
            sortBy = "createdAt", 
            sortOrder = "desc" 
        } = req.query;

        let query = { school: schoolId };

        if (startDate || endDate) {
            query.issueDate = {};
            if (startDate) query.issueDate.$gte = new Date(startDate);
            if (endDate) query.issueDate.$lte = new Date(endDate);
        }

        let studentQuery = {};
        if (classId && classId !== "all" && classId !== "All") studentQuery.class = classId;
        if (academicYear && academicYear !== "all" && academicYear !== "All") studentQuery.academicYear = academicYear;

        let searchRegex = null;
        if (search && search.trim()) {
            searchRegex = new RegExp(search.trim(), "i");
            const matchedUsers = await User.find({
                school: schoolId,
                role: 'student',
                name: { $regex: searchRegex }
            }).select('_id');
            const userIds = matchedUsers.map(u => u._id);
            
            studentQuery.$or = [
                { user: { $in: userIds } },
                { enrollmentNo: { $regex: searchRegex } },
                { admissionNo: { $regex: searchRegex } }
            ];
            
            query.$or = [
                { tcNumber: { $regex: searchRegex } }
            ];
        }

        if (Object.keys(studentQuery).length > 0) {
            studentQuery.school = schoolId;
            const matchingStudents = await StudentProfile.find(studentQuery).select('_id');
            const studentIds = matchingStudents.map(s => s._id);
            
            if (query.$or) {
                query.$or.push({ student: { $in: studentIds } });
            } else {
                query.student = { $in: studentIds };
            }
        }

        const total = await TransferCertificate.countDocuments(query);
        const history = await TransferCertificate.find(query)
            .populate({
                path: "student",
                populate: [
                    { path: "user", select: "name email phone photo" },
                    { path: "class", select: "name" },
                    { path: "section", select: "name" },
                    { path: "parent", populate: { path: "user", select: "name email phone" } }
                ]
            })
            .populate("issuedBy", "name email role")
            .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / limit),
            data: history
        });
    } catch (error) {
        console.error("Error in getTransferHistory:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST Generate TC
export const generateTC = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { 
            studentId, 
            transferReason, 
            reason, 
            leavingDate, 
            transferDate, 
            tcNumber: customTcNumber, 
            remarks, 
            issueDate, 
            transferredTo, 
            destinationSchool, 
            conduct,
            characterCertificate
        } = req.body;

        if (!studentId) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Student ID is required" });
        }

        const student = await StudentProfile.findOne({ _id: studentId, school: schoolId }).populate("user class section parent");
        if (!student) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const existingTC = await TransferCertificate.findOne({ student: studentId });
        if (existingTC) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "TC has already been generated for this student" });
        }

        let tcNumber = customTcNumber;
        if (!tcNumber) {
            const count = await TransferCertificate.countDocuments({ school: schoolId });
            const year = new Date().getFullYear();
            tcNumber = `TC-${year}-${String(count + 1).padStart(4, '0')}`;
        } else {
            const duplicate = await TransferCertificate.findOne({ tcNumber });
            if (duplicate) {
                await session.abortTransaction();
                return res.status(400).json({ success: false, message: `TC Number ${tcNumber} already exists` });
            }
        }

        const finalReason = transferReason || reason || "Transfer";
        const finalLeavingDate = leavingDate || transferDate || new Date();
        const finalTransferredTo = transferredTo || destinationSchool || "Not Specified";

        const snapshot = `Class: ${student.class?.name || "N/A"}, Section: ${student.section?.name || "N/A"}, Roll No: ${student.rollNo || "N/A"}, Enrollment No: ${student.enrollmentNo || "N/A"}`;

        const newTC = await TransferCertificate.create([{
            student: studentId,
            school: schoolId,
            tcNumber,
            issueDate: issueDate || new Date(),
            transferDate: finalLeavingDate, 
            leavingDate: finalLeavingDate, 
            reason: finalReason, 
            transferReason: finalReason, 
            remarks: remarks || "",
            destinationSchool: finalTransferredTo, 
            transferredTo: finalTransferredTo, 
            lastAttendedDate: finalLeavingDate,
            conduct: conduct || "Good",
            characterCertificate: characterCertificate !== undefined ? characterCertificate : true,
            issuedBy: req.user._id || req.user.id,
            studentStatusSnapshot: snapshot,
            requestStatus: 'Approved'
        }], { session });

        student.status = 'transferred';
        await student.save({ session });

        if (student.user) {
            const userId = student.user._id || student.user;
            await User.findByIdAndUpdate(userId, { status: 'inactive' }, { session });
        }

        await TransferRequest.findOneAndUpdate(
            { student: studentId, status: 'Pending' },
            { status: 'Approved', requestStatus: 'Approved', remarks: remarks || 'TC Generated' },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "TC generated successfully",
            data: newTC[0]
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error in generateTC:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST Approve Request
export const approveRequest = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { id } = req.params;
        const { remarks } = req.body;

        const request = await TransferRequest.findOne({ _id: id, school: schoolId });
        if (!request) {
            return res.status(404).json({ success: false, message: "Transfer request not found" });
        }

        request.status = 'Approved';
        request.requestStatus = 'Approved';
        if (remarks) request.remarks = remarks;
        await request.save();

        res.status(200).json({
            success: true,
            message: "Transfer request approved successfully",
            data: request
        });
    } catch (error) {
        console.error("Error in approveRequest:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST Reject Request
export const rejectRequest = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { id } = req.params;
        const { remarks } = req.body;

        const request = await TransferRequest.findOne({ _id: id, school: schoolId });
        if (!request) {
            return res.status(404).json({ success: false, message: "Transfer request not found" });
        }

        request.status = 'Rejected';
        request.requestStatus = 'Rejected';
        if (remarks) request.remarks = remarks;
        await request.save();

        res.status(200).json({
            success: true,
            message: "Transfer request rejected successfully",
            data: request
        });
    } catch (error) {
        console.error("Error in rejectRequest:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST Transfer Student
export const transferStudent = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { studentId, targetSchoolId, destinationSchool, reason } = req.body;
        const schoolId = req.user.school._id || req.user.school;
        const currentUserId = req.user._id || req.user.id;

        if (!studentId) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Student ID is required" });
        }

        const student = await StudentProfile.findOne({ _id: studentId, school: schoolId }).session(session);
        if (!student) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Student not found in your branch." });
        }

        const count = await TransferCertificate.countDocuments().session(session);
        const year = new Date().getFullYear();
        const tcNumber = `TC-${year}-${String(count + 1).padStart(5, "0")}`;
        const today = new Date();

        let finalDestinationSchool = destinationSchool || "Not Specified";
        let isIntraOrg = false;

        if (targetSchoolId) {
            const targetSchool = await School.findById(targetSchoolId).session(session);
            if (!targetSchool) {
                await session.abortTransaction();
                return res.status(404).json({ success: false, message: "Target school not found." });
            }
            finalDestinationSchool = targetSchool.schoolName;
            isIntraOrg = true;

            // Generate the Transfer Request for the receiving school
            const transferReq = new TransferRequest({
                student: studentId,
                school: targetSchoolId,
                requestedBy: "Office",
                reason: reason || "Branch Transfer",
                status: "Pending",
                requestStatus: "Pending"
            });
            await transferReq.save({ session });
        }

        const snapshot = `Class: ${student.class || "N/A"}, Section: ${student.section || "N/A"}, Roll No: ${student.rollNo || "N/A"}`;

        const tcRecord = new TransferCertificate({
            student: studentId,
            school: schoolId,
            tcNumber: tcNumber,
            issueDate: today,
            leavingDate: today,
            transferDate: today,
            reason: reason || "Transfer",
            transferReason: reason || "Transfer",
            destinationSchool: finalDestinationSchool,
            transferredTo: finalDestinationSchool,
            lastAttendedDate: today,
            conduct: "Good",
            issuedBy: currentUserId,
            studentStatusSnapshot: snapshot,
            requestStatus: isIntraOrg ? 'Pending' : 'Approved'
        });
        await tcRecord.save({ session });

        student.status = "transferred";
        await student.save({ session });

        if (student.user) {
            await User.findByIdAndUpdate(student.user, { status: "inactive" }, { session });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Student transferred and TC issued successfully.",
            data: tcRecord
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Transfer student error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET Single Transfer Details
export const getTransferDetails = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { id } = req.params;

        let tc = await TransferCertificate.findOne({ _id: id, school: schoolId })
            .populate({
                path: "student",
                populate: [
                    { path: "user", select: "name email phone photo gender" },
                    { path: "class", select: "name" },
                    { path: "section", select: "name" },
                    { path: "parent", populate: { path: "user", select: "name email phone" } }
                ]
            })
            .populate("issuedBy", "name email role");

        if (!tc) {
            tc = await TransferCertificate.findOne({ student: id, school: schoolId })
                .populate({
                    path: "student",
                    populate: [
                        { path: "user", select: "name email phone photo gender" },
                        { path: "class", select: "name" },
                        { path: "section", select: "name" },
                        { path: "parent", populate: { path: "user", select: "name email phone" } }
                    ]
                })
                .populate("issuedBy", "name email role");
        }

        if (!tc) {
            return res.status(404).json({ success: false, message: "Transfer Certificate details not found" });
        }

        res.status(200).json({
            success: true,
            data: tc
        });
    } catch (error) {
        console.error("Error in getTransferDetails:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET Transfer Statistics
export const getTransferStats = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;

        const eligibleCount = await StudentProfile.countDocuments({
            school: schoolId,
            status: { $in: ['active', 'inactive', 'passout'] }
        });

        const pendingCount = await TransferRequest.countDocuments({
            school: schoolId,
            status: 'Pending'
        });

        const approvedTcCount = await TransferCertificate.countDocuments({
            school: schoolId
        });

        const totalTransferredCount = await StudentProfile.countDocuments({
            school: schoolId,
            status: { $in: ['transferred', 'tc_issued'] }
        });

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const thisMonthTcCount = await TransferCertificate.countDocuments({
            school: schoolId,
            issueDate: { $gte: startOfMonth }
        });

        res.status(200).json({
            success: true,
            data: {
                eligibleStudents: eligibleCount,
                pendingRequests: pendingCount,
                approvedTc: approvedTcCount,
                totalTransferred: totalTransferredCount,
                thisMonthTc: thisMonthTcCount
            }
        });
    } catch (error) {
        console.error("Error in getTransferStats:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
