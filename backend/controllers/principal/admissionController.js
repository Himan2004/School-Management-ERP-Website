import mongoose from 'mongoose';
import AdmissionRequest from '../../models/school/admissionRequest.js';
import Notification from '../../models/common/Notification.js';
import Class from '../../models/organization/organizationClass.js';
import User from '../../models/users/user.model.js';
import StudentProfile from '../../models/users/student.model.js';
import AdmissionCancellation from '../../models/principal/AdmissionCancellation.model.js';
import TransferCertificate from '../../models/principal/TransferCertificate.model.js';
import TransferRequest from '../../models/principal/TransferRequest.model.js';
import { sendCustomEmail, sendApprovalEmailWithCredentials, sendAdmissionCancellationEmail } from '../../services/emailService.js';
import Section from '../../models/school/Section.model.js';
import Parent from '../../models/users/parent.model.js';
import bcrypt from "bcryptjs";
import { generateStudentCredentials, generateParentCredentials } from '../../utils/generateCredentials.js';
import School from '../../models/school/School.js';

// Add these helper functions BEFORE your processTransfer function

const generateLoginId = async (role, name) => {
    const prefix = role === 'student' ? 'STU' : 'PAR';
    const baseName = name?.replace(/\s/g, '').substring(0, 6).toUpperCase() || 'USER';
    let loginId = `${prefix}-${baseName}${Math.floor(Math.random() * 1000)}`;
    
    let existing = await User.findOne({ loginId });
    while (existing) {
        loginId = `${prefix}-${baseName}${Math.floor(Math.random() * 10000)}`;
        existing = await User.findOne({ loginId });
    }
    return loginId;
};

const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};
const getSchoolContext = async (req) => {
    const u = await User.findById(req.user.id).populate("school");
    if (!u || !u.school) return null;
    return u.school._id;
};

const toSchoolId = (u) => u?.school?._id || u?.school;

export const sendCustomAdmissionEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, message } = req.body;
        const rawId = toSchoolId(req.user);
        if (!rawId) return res.status(400).json({ success: false, message: 'Auth Error' });
        const adm = await AdmissionRequest.findOne({ _id: id, branch: rawId });
        if (!adm) return res.status(404).json({ success: false, message: "Admission not found" });
        await sendCustomEmail(adm.parent.email, adm.parent.fullName, subject || "Update", message);
        res.status(200).json({ success: true, message: "Email sent" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const submitAdmission = async (req, res) => {
    try {
        const aadhar = req.body.parent?.aadharNumber;
        if (aadhar !== undefined && aadhar !== null && aadhar !== "") {
            if (!/^\d{12}$/.test(String(aadhar))) {
                return res.status(400).json({ success: false, message: "Aadhaar Number must be exactly 12 digits." });
            }
        }

        const schId = await getSchoolContext(req);
        if (!schId) return res.status(404).json({ success: false, message: "School not found" });
        const u = await User.findById(req.user.id).populate("school");
        const orgId = u.school.organization;
        const Organization = mongoose.model('Organization');
        const org = await Organization.findById(orgId);

        const adm = new AdmissionRequest({
            ...req.body,
            branch: schId,
            organization: orgId,
            organizationName: org ? org.organizationName : "Organization",
            branchName: u.school.schoolName || "Branch"
        });

        await adm.save();

        try {
            // Find school admins
            const schoolAdmins = await User.find({ school: schId, role: 'admin' }).lean();
            const notificationsToInsert = [];
            const studentName = adm.students?.[0]?.fullName || "Student";
            const parentName = adm.parent?.fullName || "Parent";
            const title = "New Admission Request";
            const message = `A new admission request has been submitted by ${studentName}.`;

            for (const admin of schoolAdmins) {
                notificationsToInsert.push({
                    user: admin._id,
                    title,
                    message,
                    type: 'admissions',
                    school: schId,
                    senderName: parentName,
                    senderRole: 'Parent',
                    source: 'Admissions',
                    metadata: {
                        link: `/admin/admissions/request`,
                        messageId: adm._id,
                        subject: studentName
                    },
                    createdAt: adm.createdAt || new Date()
                });
            }

            if (notificationsToInsert.length > 0) {
                await Notification.insertMany(notificationsToInsert);
            }
        } catch (notifErr) {
            console.error("Error creating notifications on submitAdmission:", notifErr);
        }

        res.status(201).json({ success: true, data: adm });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getAllAdmissions = async (req, res) => {
    try {
        const rawId = toSchoolId(req.user);
        if (!rawId) return res.status(400).json({ success: false, message: 'Auth Error' });

        const schId = new mongoose.Types.ObjectId(rawId);
        const { page = 1, limit = 10, status, search, classId, fromDate, toDate } = req.query;
        const q = { branch: schId, admissionSource: { $ne: 'ADMIN' } };

        if (status && status !== 'all') q.status = status;
        if (search) {
            q.$or = [
                { applicationNumber: { $regex: search, $options: 'i' } },
                { 'parent.fullName': { $regex: search, $options: 'i' } },
                { 'parent.primaryContact': { $regex: search, $options: 'i' } },
                { 'parent.email': { $regex: search, $options: 'i' } },
                { 'students.fullName': { $regex: search, $options: 'i' } }
            ];
        }
        if (classId && classId !== 'all') q['students.class'] = classId;
        
        if (fromDate || toDate) {
            q.submittedAt = {};
            if (fromDate) q.submittedAt.$gte = new Date(fromDate);
            if (toDate) q.submittedAt.$lte = new Date(toDate);
        }

        const skp = (parseInt(page) - 1) * parseInt(limit);
        const adms = await AdmissionRequest.find(q)
            .populate('students.class', 'name')
            .sort({ createdAt: -1 })
            .skip(skp)
            .limit(parseInt(limit))
            .lean();

        const tot = await AdmissionRequest.countDocuments(q);

        res.status(200).json({
            success: true,
            data: adms,
            pagination: {
                total: tot,
                page: parseInt(page),
                pages: Math.ceil(tot / parseInt(limit))
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getAdmissionById = async (req, res) => {
    try {
        const rawId = toSchoolId(req.user);
        if (!rawId) return res.status(400).json({ success: false, message: 'Auth Error' });
        const adm = await AdmissionRequest.findOne({ _id: req.params.id, branch: rawId }).populate('students.class', 'name');
        if (!adm) return res.status(404).json({ success: false, message: "Not found" });
        res.status(200).json({ success: true, data: adm });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getAdmissionByRef = async (req, res) => {
    try {
        const rawId = toSchoolId(req.user);
        if (!rawId) return res.status(400).json({ success: false, message: 'Auth Error' });
        const adm = await AdmissionRequest.findOne({ applicationNumber: req.params.refNo, branch: rawId }).populate('students.class', 'name');
        if (!adm) return res.status(404).json({ success: false, message: "Not found" });
        res.status(200).json({ success: true, data: adm });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const markInReview = async (req, res) => {
    try {
        const rawId = toSchoolId(req.user);
        if (!rawId) return res.status(400).json({ success: false, message: 'Auth Error' });
        const adm = await AdmissionRequest.findOneAndUpdate(
            { _id: req.params.id, branch: rawId },
            { status: 'under_review' },
            { new: true }
        );
        if (!adm) return res.status(404).json({ success: false, message: "Not found or unauthorized" });
        res.status(200).json({ success: true, data: adm });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const checkDuplicateAdmission = async (req, res) => {
    try {
        const { email, phone, studentName } = req.body;
        const q = { $or: [] };
        if (email) q.$or.push({ 'parent.email': email });
        if (phone) q.$or.push({ 'parent.primaryContact': phone });
        if (studentName) q.$or.push({ 'students.fullName': studentName });

        if (q.$or.length === 0) return res.status(400).json({ success: false, message: "Provide params" });

        const dups = await AdmissionRequest.find(q);
        res.status(200).json({ success: true, isDuplicate: dups.length > 0, matches: dups });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getAdmissionTemplate = async (req, res) => {
    try {
        const tpl = {
            parent: { fullName: "", email: "", primaryContact: "", relation: "Father", address: { city: "", state: "", pincode: "" } },
            students: [{ fullName: "", dob: "", class: "", gender: "Male" }],
            declarationAccepted: false
        };
        res.status(200).json({ success: true, data: tpl });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const uploadDocuments = async (req, res) => {
    try {
        const { studentId } = req.body;
        const { id } = req.params;
        const rawId = toSchoolId(req.user);
        if (!rawId) return res.status(400).json({ success: false, message: 'Auth Error' });
        const adm = await AdmissionRequest.findOne({ _id: id, branch: rawId });
        if (!adm) return res.status(404).json({ success: false, message: "Not found" });

        const stu = adm.students.id(studentId);
        if (!stu) return res.status(404).json({ success: false, message: "Student not found" });
        if (!stu.documents) stu.documents = {};

        const types = ['studentAadhaar', 'parentAadhaar', 'previousYearMarksheet', 'transferCertificate', 'birthCertificate'];

        if (req.files) {
            types.forEach(t => {
                if (req.files[t] && req.files[t][0] && req.files[t][0].path) {
                    stu.documents[t] = {
                        url: req.files[t][0].path,
                        status: 'submitted',
                        remarks: ''
                    };
                }
            });
            if (req.files['photo'] && req.files['photo'][0] && req.files['photo'][0].path) {
                stu.photo = req.files['photo'][0].path;
            }

            // Sync to Student profile if already approved/created
            try {
                const User = mongoose.model("User");
                const StudentProfile = mongoose.model("Student");
                const studentUser = await User.findOne({
                    name: stu.fullName,
                    role: "student",
                    school: adm.branch
                });
                if (studentUser) {
                    const studentProfile = await StudentProfile.findOne({ user: studentUser._id });
                    if (studentProfile) {
                        if (!studentProfile.documents) studentProfile.documents = {};
                        types.forEach(t => {
                            if (stu.documents[t] && stu.documents[t].url) {
                                studentProfile.documents[t] = stu.documents[t].url;
                            }
                        });
                        if (stu.photo) {
                            studentProfile.photo = stu.photo;
                        }
                        await studentProfile.save();
                    }
                }
            } catch (syncErr) {
                console.error("Error syncing doc upload to Student profile:", syncErr);
            }
        }
        await adm.save();
        res.status(200).json({ success: true, message: "Uploaded", data: adm });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const verifyDocument = async (req, res) => {
    try {
        const { studentId, status, remarks } = req.body;
        const { id, docType } = req.params;
        const rawId = toSchoolId(req.user);
        if (!rawId) return res.status(400).json({ success: false, message: 'Auth Error' });
        const adm = await AdmissionRequest.findOne({ _id: id, branch: rawId });
        if (!adm) return res.status(404).json({ success: false, message: "Not found" });

        const stu = adm.students.id(studentId);
        if (!stu || !stu.documents || !stu.documents[docType]) {
            return res.status(404).json({ success: false, message: "Doc not found" });
        }

        stu.documents[docType].status = status;
        stu.documents[docType].remarks = remarks;

        await adm.save();
        res.status(200).json({ success: true, data: adm });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getDocumentStatus = async (req, res) => {
    try {
        const rawId = toSchoolId(req.user);
        if (!rawId) return res.status(400).json({ success: false, message: 'Auth Error' });
        const adm = await AdmissionRequest.findOne({ _id: req.params.id, branch: rawId });
        if (!adm) return res.status(404).json({ success: false, message: "Not found" });
        const stat = adm.students.map(s => ({
            studentId: s._id,
            name: s.fullName,
            documents: s.documents
        }));
        res.status(200).json({ success: true, data: stat });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const updateDocumentDetails = async (req, res) => {
    res.status(200).json({ success: true, message: "Updated" });
};

export const deleteDocument = async (req, res) => {
    res.status(200).json({ success: true, message: "Deleted" });
};

export const getMissingDocuments = async (req, res) => {
    try {
        const rawId = toSchoolId(req.user);
        if (!rawId) return res.status(400).json({ success: false, message: 'Auth Error' });
        const adm = await AdmissionRequest.findOne({ _id: req.params.id, branch: rawId });
        if (!adm) return res.status(404).json({ success: false, message: "Not found" });
        const reqDocs = ['aadhar', 'birthCertificate', 'addressProof'];
        const m = adm.students.map(s => {
            const up = Object.keys(s.documents || {}).filter(k => s.documents[k]?.url);
            return {
                studentId: s._id,
                missing: reqDocs.filter(r => !up.includes(r))
            };
        });
        res.status(200).json({ success: true, data: m });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const generateUniqueAdmissionNumber = async (baseApplicationNumber, index, session) => {
    let year = new Date().getFullYear();
    let sequence = 1;
    
    const match = baseApplicationNumber?.match(/^(?:APP|ADM)-(\d{4})-(\d+)$/);
    if (match) {
        year = parseInt(match[1], 10);
        sequence = parseInt(match[2], 10) + index;
    } else {
        const count = await mongoose.model('Student').countDocuments().session(session);
        sequence = count + 1 + index;
    }
    
    let admissionNo = `ADM-${year}-${String(sequence).padStart(5, '0')}`;
    
    // Ensure uniqueness
    let exists = await mongoose.model('Student').findOne({
        $or: [{ admissionNo }, { enrollmentNo: admissionNo }]
    }).session(session);
    
    while (exists) {
        sequence += 1;
        admissionNo = `ADM-${year}-${String(sequence).padStart(5, '0')}`;
        exists = await mongoose.model('Student').findOne({
            $or: [{ admissionNo }, { enrollmentNo: admissionNo }]
        }).session(session);
    }
    
    return admissionNo;
};

export const approveAdmission = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        console.log("--- STARTING APPROVAL FOR ID:", req.params.id, "---");

        const rawId = toSchoolId(req.user);
        if (!rawId) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: 'Auth Error' });
        }

        // 1. Fetch the raw data safely
        const adm = await AdmissionRequest.findOne({ _id: req.params.id, branch: rawId }).session(session);
        if (!adm) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: "Admission request not found" });
        }

        if (adm.status === 'approved') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ success: false, message: "Admission request is already approved" });
        }

        // Validate uploads before approval
        for (const student of adm.students) {
            if (!student.photo) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: "Profile upload failed: Missing student passport photo" });
            }
            if (!student.documents || !student.documents.birthCertificate?.url) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: "Document validation failed: Missing birthCertificate" });
            }
            if (!student.documents || !student.documents.studentAadhaar?.url) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: "Document validation failed: Missing studentAadhaar" });
            }
            if (!student.documents || !student.documents.parentAadhaar?.url) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ success: false, message: "Document validation failed: Missing parentAadhaar" });
            }
        }

        // 2. Fetch the School to get schoolName
        const school = await School.findById(adm.branch).session(session);
        if (!school) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ success: false, message: "School not found" });
        }

        // 3. Update status safely
        const isPaid = req.body.feeDetails?.paymentStatus === 'Paid' || (!req.body.feeDetails && adm.feeDetails?.paymentStatus === 'Paid');

        if (isPaid) {
            adm.status = 'approved';
            adm.admissionStatus = 'approved';
            adm.reviewedBy = req.user.id;
            adm.reviewedAt = Date.now();
            adm.approvedBy = req.user.id;
            adm.approvedAt = Date.now();
            adm.credentialsSent = true;
            adm.isCredentialsSent = true;
        } else {
            adm.status = 'pending';
            adm.admissionStatus = 'pending';
            adm.reviewedBy = req.user.id;
            adm.reviewedAt = Date.now();
            adm.approvedBy = null;
            adm.approvedAt = null;
            adm.credentialsSent = false;
            adm.isCredentialsSent = false;
        }

        if (req.body.students && Array.isArray(req.body.students)) {
            let totalPayableSum = 0;
            let amountPaidSum = 0;
            let remainingAmountSum = 0;
            let paymentStatus = 'Paid';
            let paymentMode = '';
            
            req.body.students.forEach((sData, idx) => {
                if (adm.students[idx]) {
                    if (sData.feeDetails) {
                        adm.students[idx].feeDetails = {
                            ...adm.students[idx].feeDetails,
                            ...sData.feeDetails
                        };
                        totalPayableSum += Number(sData.feeDetails.totalPayable) || 0;
                        amountPaidSum += Number(sData.feeDetails.amountPaid) || 0;
                        remainingAmountSum += Number(sData.feeDetails.remainingAmount) || 0;
                        paymentMode = sData.feeDetails.paymentMode || paymentMode;
                        if (sData.feeDetails.paymentStatus === 'Unpaid') {
                            paymentStatus = 'Unpaid';
                        }
                    }
                }
            });
            
            adm.feeDetails = {
                ...adm.feeDetails,
                totalPayable: totalPayableSum,
                amountPaid: amountPaidSum,
                remainingAmount: remainingAmountSum,
                paymentStatus: paymentStatus,
                paymentMode: paymentMode,
                paymentDate: req.body.feeDetails?.paymentDate || new Date().toISOString().split('T')[0],
                receiptNumber: req.body.feeDetails?.receiptNumber || `RCP-2026-${Math.floor(10000 + Math.random() * 90000)}`
            };
        } else if (req.body.feeDetails) {
            adm.feeDetails = {
                ...adm.feeDetails,
                ...req.body.feeDetails
            };
        } else {
            adm.feeDetails.paymentStatus = 'Paid';
            adm.feeDetails.amountPaid = adm.feeDetails.totalPayable;
            adm.feeDetails.remainingAmount = 0;
        }

        await adm.save({ session });
        console.log("Status, metadata, and feeDetails updated");

        if (!isPaid) {
            await session.commitTransaction();
            session.endSession();
            return res.status(200).json({
                success: true,
                message: "Admission request processed successfully (Pending Payment).",
                studentId: null,
                studentProfileIds: [],
                data: {}
            });
        }

        // 4. Create Parent User & Profile (Create or Find)
        let parentUser = await User.findOne({ email: adm.parent.email, role: "parent" }).session(session);
        let parentRecord;
        let parentPlainPassword;

        if (!parentUser) {
            const { loginId: pLogin, plainPassword: pPass } = generateParentCredentials(adm.parent.fullName, school.schoolName);
            parentPlainPassword = pPass;
            
            const newParentUsers = await User.create([{
                name: adm.parent.fullName,
                email: adm.parent.email,
                loginId: pLogin,
                password: pPass, // pre-save hook will hash this
                role: "parent",
                school: adm.branch,
                status: "active"
            }], { session });
            parentUser = newParentUsers[0];

            const relationValue = adm.parent.relation?.toLowerCase() || 'father';
            const finalRelation = ['father', 'mother', 'guardian'].includes(relationValue) ? relationValue : 'father';

            const newParents = await Parent.create([{
                user: parentUser._id,
                school: adm.branch,
                fatherName: finalRelation === 'father' ? adm.parent.fullName : (adm.parent.fatherName || ''),
                motherName: finalRelation === 'mother' ? adm.parent.fullName : (adm.parent.motherName || ''),
                primaryContact: adm.parent.primaryContact,
                alternateContact: adm.parent.alternateContact || null,
                address: adm.parent.address,
                relation: finalRelation,
                gender: adm.parent.gender ? adm.parent.gender.toLowerCase() : undefined,
                students: []
            }], { session });
            parentRecord = newParents[0];

            parentUser.profileId = parentRecord._id;
            parentUser.profileModel = "Parent";
            await parentUser.save({ session });
        } else {
            parentRecord = await Parent.findOne({ user: parentUser._id }).session(session);
            parentPlainPassword = "Login using your existing parent credentials";
        }

        // 5. Loop through students and create User accounts and Profiles
        const studentCredentials = [];
        const studentProfileIds = [];
        let studentIndex = 0;

        for (const sData of adm.students) {
            // Create student user
            const { loginId: sLogin, plainPassword: sPass } = generateStudentCredentials(sData.fullName, school.schoolName);
            
            const newStudentUsers = await User.create([{
                name: sData.fullName,
                email: sData.email || `${sData.fullName.toLowerCase().replace(/\s/g, '')}_${Date.now()}@student.com`,
                loginId: sLogin,
                password: sPass, // pre-save hook will hash this
                role: "student",
                school: adm.branch,
                status: "active"
            }], { session });
            const studentUserRecord = newStudentUsers[0];

            // Find or create Section A for this class
            const targetSectionName = sData.section || 'A';
            let sectionDoc = await Section.findOne({
                school: adm.branch,
                classId: sData.class,
                name: targetSectionName
            }).session(session);
            if (!sectionDoc) {
                const newSection = await Section.create([{
                    organization: adm.organization,
                    school: adm.branch,
                    classId: sData.class,
                    name: targetSectionName,
                    capacity: 40,
                    status: 'active'
                }], { session });
                sectionDoc = newSection[0];
            }
            const sectionValue = sectionDoc._id;

            const finalAdmissionNo = await generateUniqueAdmissionNumber(adm.applicationNumber, studentIndex, session);
            studentIndex++;

            // Create student profile
            const newStudentProfiles = await StudentProfile.create([{
                user: studentUserRecord._id,
                parent: parentRecord._id,
                school: adm.branch,
                class: sData.class,
                section: sectionValue,
                rollNo: (sData.rollNumber && sData.rollNumber.toUpperCase() !== 'NA' && sData.rollNumber !== 'null' && sData.rollNumber !== 'undefined') ? sData.rollNumber.trim() : null,
                admissionNo: finalAdmissionNo,
                enrollmentNo: finalAdmissionNo,
                academicYear: sData.academicYear || adm.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
                status: 'active',
                gender: sData.gender ? sData.gender.toLowerCase() : undefined,
                dateOfBirth: sData.dob,
                bloodGroup: sData.bloodGroup,
                previousSchool: sData.previousSchool ? { name: sData.previousSchool } : undefined,
                photo: sData.photo,
                documents: sData.documents ? {
                    birthCertificate: sData.documents.birthCertificate?.url,
                    studentAadhaar: sData.documents.studentAadhaar?.url,
                    parentAadhaar: sData.documents.parentAadhaar?.url,
                    previousYearMarksheet: sData.documents.previousYearMarksheet?.url,
                    transferCertificate: sData.documents.transferCertificate?.url
                } : undefined
            }], { session });
            const studentProfile = newStudentProfiles[0];

            studentUserRecord.profileId = studentProfile._id;
            studentUserRecord.profileModel = "Student";
            await studentUserRecord.save({ session });

            studentProfileIds.push(studentProfile._id);

            studentCredentials.push({
                name: sData.fullName,
                loginId: sLogin,
                password: sPass,
                admissionNo: finalAdmissionNo
            });
        }

        // Link student profiles to parent
        if (studentProfileIds.length > 0) {
            parentRecord.students.push(...studentProfileIds);
            await parentRecord.save({ session });
        }

        // 6. Send Approval Email With Credentials
        const emailRequest = {
            parent: { email: adm.parent.email, fullName: adm.parent.fullName },
            organizationName: adm.organizationName || school.schoolName,
            branchName: adm.branchName || school.schoolName,
            students: studentCredentials
        };
        const credentials = {
            parent: { loginId: parentUser.loginId, password: parentPlainPassword },
            students: studentCredentials
        };

        sendApprovalEmailWithCredentials(emailRequest, credentials).catch((err) => {
            console.error("❌ ERROR SENDING CREDENTIALS EMAIL:", err);
        });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ 
            success: true, 
            message: "Admission approved, credentials generated, and notification email sent successfully!",
            studentId: studentProfileIds[0] || null,
            studentProfileIds: studentProfileIds,
            data: {
                studentId: studentProfileIds[0] || null,
                studentProfileIds: studentProfileIds,
                student: {
                    _id: studentProfileIds[0] || null
                }
            }
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("❌ FINAL APPROVAL ERROR:", err);
        let errMsg = err.message || "Failed to approve admission.";
        if (err.code === 11000 || err.message?.includes("E11000")) {
            errMsg = "Duplicate roll number error. This roll number is already assigned to another student in the same class and academic year.";
        }
        res.status(400).json({ success: false, message: errMsg });
    }
};

export const rejectAdmission = async (req, res) => {
    try {
        const { remarks } = req.body;
        const rawId = toSchoolId(req.user);
        if (!rawId) return res.status(400).json({ success: false, message: 'Auth Error' });
        const adm = await AdmissionRequest.findOneAndUpdate({ _id: req.params.id, branch: rawId }, {
            status: 'rejected',
            remarks,
            reviewedBy: req.user.id,
            reviewedAt: Date.now()
        }, { new: true });

        // Notify parent via email
        if (adm && adm.parent && adm.parent.email) {
            const subject = "Admission Request Update — Rejected";
            const message = `Dear ${adm.parent.fullName},\n\nWe regret to inform you that your admission application (${adm.applicationNumber || 'N/A'}) has been rejected.\n\nReason:\n${remarks || 'No specific reason provided.'}\n\nIf you have any questions, please contact the school administration.`;
            sendCustomEmail(adm.parent.email, adm.parent.fullName, subject, message).catch((err) => {
                console.error("❌ Failed to send rejection email:", err);
            });
        }

        res.status(200).json({ success: true, data: adm, message: "Rejected" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const createStudentProfile = async (req, res) => {
    res.status(200).json({ success: true, message: "Created" });
};

export const sendDecisionNotification = async (req, res) => {
    res.status(200).json({ success: true, message: "Sent" });
};

export const bulkApproveAdmissions = async (req, res) => {
    try {
        const { ids } = req.body;
        const rawId = toSchoolId(req.user);
        if (!rawId) return res.status(400).json({ success: false, message: 'Auth Error' });
        await AdmissionRequest.updateMany({ _id: { $in: ids }, branch: rawId }, {
            status: 'approved',
            reviewedBy: req.user.id,
            reviewedAt: Date.now()
        });
        res.status(200).json({ success: true, message: "Approved" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const generateCredentialsForAdmission = async (req, res) => {
    res.status(200).json({ success: true, message: "Generated" });
};

export const getAdmissionStats = async (req, res) => {
    try {
        const schId = await getSchoolContext(req);
        const st = await AdmissionRequest.aggregate([
            { $match: { branch: schId } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        res.status(200).json({ success: true, data: st });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getAvailableClasses = async (req, res) => {
    try {
        const u = await User.findById(req.user.id).populate("school");
        if (!u || !u.school) return res.status(400).json({ success: false, message: 'Auth Error' });
        
        const orgId = u.school.organization;
        const schId = u.school._id;
        
        const cls = await Class.find({ organization: orgId }).sort({ numericLevel: 1 }).lean();

        // If no classes exist at all in the database, log a warning
        if (cls.length === 0) {
            console.log("⚠️ WARNING: There are absolutely 0 classes in your database!");
        }

        const Period = mongoose.model('Period');
        // Use a try-catch here just in case Period isn't set up right
        let prds = [];
        try {
             prds = await Period.find({ schoolId: schId, status: 'active' }).lean();
        } catch (e) {
             console.log("No periods found or Period model missing");
        }

        const dyn = cls.map(c => {
            const mtch = prds.filter(p => p.gradeLevel === c.name || p.gradeLevel === c.numericLevel?.toString());
            const secs = [...new Set(mtch.map(p => p.section))].filter(Boolean);
            return {
                _id: c._id,
                name: c.name || "Unnamed Class",
                numericLevel: c.numericLevel,
                // Fallback to A and B if no periods define the sections
                sections: secs.length > 0 ? secs.sort() : ['A', 'B'] 
            };
        });

        res.status(200).json({ success: true, data: dyn });
    } catch (err) {
        console.error("Backend Error fetching classes:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getDuplicateApplicants = async (req, res) => {
    res.status(200).json({ success: true, data: [] });
};

export const exportAdmissionReports = async (req, res) => {
    res.status(200).json({ success: true, message: "Exported" });
};

export const identifyAvailableSeats = async (req, res) => {
    try {
        const schId = await getSchoolContext(req);
        const sections = await Section.find({ school: schId, status: 'active' }).populate('classId', 'name').lean();
        const sts = sections.map(s => {
            const className = s.classId?.name || s.className || 'Unknown';
            return {
                class: `${className} - ${s.name}`,
                total: s.capacity || 40,
                filled: s.currentStrength || 0,
                available: (s.capacity || 40) - (s.currentStrength || 0)
            };
        });
        res.status(200).json({ success: true, data: sts });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const autoGenerateRef = async (req, res) => {
    const c = await AdmissionRequest.countDocuments();
    const y = new Date().getFullYear();
    res.status(200).json({ success: true, ref: `APP-${y}-${String(c + 1).padStart(5, '0')}` });
};

export const checkDuplicateEmailPhone = async (req, res) => {
    const { email, phone } = req.body;
    const ex = await AdmissionRequest.findOne({ $or: [{ 'parent.email': email }, { 'parent.primaryContact': phone }] });
    res.status(200).json({ success: true, exists: !!ex });
};

export const trackAdmissionRealTime = async (req, res) => {
    const adm = await AdmissionRequest.findById(req.params.id).select('status submittedAt reviewedAt remarks documents');
    res.status(200).json({ success: true, data: adm });
};

export const cancelAdmission = async (req, res) => {
    const s = await mongoose.startSession();
    s.startTransaction();
    try {
        const { reason, remarks, clearanceChecklist, isAdmissionRequest } = req.body;
        const tId = req.params.id;
        const schId = await getSchoolContext(req);

        if (!schId) return res.status(404).json({ success: false, message: "School not found" });

        if (isAdmissionRequest) {
            const adm = await AdmissionRequest.findOne({ _id: tId, branch: schId });
            if (!adm) return res.status(404).json({ success: false, message: "Not found" });
            adm.status = 'cancelled';
            adm.remarks = remarks || `Cancelled: ${reason}`;
            await adm.save({ session: s });

            // Fetch school for name
            const school = await School.findById(schId);
            const schoolName = school ? school.schoolName : "our institution";

            // Send email to parent
            if (adm.parent && adm.parent.email) {
                const studentName = adm.students.map(std => std.fullName).join(", ");
                sendAdmissionCancellationEmail({
                    parentEmail: adm.parent.email,
                    parentName: adm.parent.fullName || "Parent",
                    studentName,
                    schoolName,
                    reason: reason || remarks
                }).catch(err => console.error("Error sending cancellation email:", err));
            }

            await s.commitTransaction();
            s.endSession();
            return res.status(200).json({ success: true, message: "Cancelled", data: adm });
        }

        const stu = await StudentProfile.findOne({ _id: tId, school: schId })
            .populate("user", "name")
            .populate({
                path: "parent",
                populate: { path: "user", select: "name email" }
            })
            .populate("school", "schoolName");

        if (!stu) return res.status(404).json({ success: false, message: "Student not found" });

        const ex = await AdmissionCancellation.findOne({ student: tId });
        if (ex) return res.status(400).json({ success: false, message: "Already cancelled" });

        const can = await AdmissionCancellation.create([{
            student: tId,
            school: schId,
            reason,
            remarks,
            clearanceChecklist,
            cancelledBy: req.user.id,
            cancellationDate: new Date()
        }], { session: s });

        stu.status = 'inactive';
        await stu.save({ session: s });

        if (stu.user) {
            const userId = stu.user._id || stu.user;
            await User.findByIdAndUpdate(userId, { status: 'inactive' }, { session: s });
        }

        // Send email to parent
        const parentEmail = stu.parent?.user?.email;
        if (parentEmail) {
            const parentName = stu.parent?.user?.name || stu.parent?.fatherName || stu.parent?.motherName || "Parent";
            const studentName = stu.user?.name || "Your child";
            const schoolName = stu.school?.schoolName || "our institution";
            sendAdmissionCancellationEmail({
                parentEmail,
                parentName,
                studentName,
                schoolName,
                reason: reason || remarks
            }).catch(err => console.error("Error sending cancellation email:", err));
        }

        await s.commitTransaction();
        s.endSession();
        res.status(200).json({ success: true, message: "Cancelled", data: can[0] });
    } catch (err) {
        await s.abortTransaction();
        s.endSession();
        res.status(500).json({ success: false, message: err.message });
    }
};

export const processTransfer = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { transferDate, reason, destinationSchool, lastAttendedDate, conduct, characterCertificate } = req.body;
        const targetId = req.params.id; 
        const schoolId = await getSchoolContext(req);
        
        if (!schoolId) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "School context not found" });
        }

        const admission = await AdmissionRequest.findOne({ _id: targetId, branch: schoolId });
        if (!admission) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Admission request not found" });
        }

        // Get student data from admission (defined ONCE at the top)
        const sData = admission.students[0];
        if (!sData) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: "Student data not found in admission" });
        }

        // ==================== PARENT ====================
        let parentRecord = await Parent.findOne({ 
            $or: [
                { primaryContact: admission.parent.primaryContact },
                { user: admission.parent.user }
            ]
        });

        if (!parentRecord) {
            let parentUser = admission.parent.user;

            if (!parentUser) {
                const existingParent = await User.findOne({ 
                    $or: [
                        { email: admission.parent.email },
                        { phone: admission.parent.primaryContact }
                    ]
                });
                
                if (existingParent) {
                    parentUser = existingParent._id;
                } else {
                    const newParentUser = await User.create([{
                        name: admission.parent.fullName,
                        email: admission.parent.email,
                        phone: admission.parent.primaryContact,
                        loginId: await generateLoginId('parent', admission.parent.fullName),
                        password: await bcrypt.hash(generatePassword(), 10),
                        role: 'parent',
                        school: schoolId,
                        status: 'active'
                    }], { session });
                    parentUser = newParentUser[0]._id;
                }
            }

            const relationValue = admission.parent.relation?.toLowerCase() || 'father';
            const finalRelation = ['father', 'mother', 'guardian'].includes(relationValue) ? relationValue : 'father';

            const newParent = await Parent.create([{
                user: parentUser,
                school: schoolId,
                fatherName: admission.parent.fatherName || admission.parent.fullName,
                motherName: admission.parent.motherName,
                primaryContact: admission.parent.primaryContact,
                alternateContact: admission.parent.alternateContact,
                address: admission.parent.address,
                relation: finalRelation,
                students: []
            }], { session });
            parentRecord = newParent[0];
        }

        // ==================== STUDENT ====================
        let studentProfile = await StudentProfile.findOne({ 
            user: admission.parent.user, 
            school: schoolId 
        });

        if (!studentProfile) {
            let studentUser = sData.user;

            if (!studentUser) {
                const existingStudent = await User.findOne({ 
                    name: sData.fullName,
                    role: 'student'
                });
                
                if (existingStudent) {
                    studentUser = existingStudent._id;
                } else {
                    const newStudentUser = await User.create([{
                        name: sData.fullName,
                        email: sData.email || `${sData.fullName.toLowerCase().replace(/\s/g, '')}_${Date.now()}@student.com`,
                        phone: sData.phone || parentRecord.primaryContact,
                        loginId: await generateLoginId('student', sData.fullName),
                        password: await bcrypt.hash(generatePassword(), 10),
                        role: 'student',
                        school: schoolId,
                        class: sData.class,
                        section: sData.section,
                        status: 'active'
                    }], { session });
                    studentUser = newStudentUser[0]._id;
                }
            }

            // Find or create Section A for this class
            const targetSectionName2 = sData.section || 'A';
            let sectionDoc2 = await Section.findOne({
                school: schoolId,
                classId: sData.class,
                name: targetSectionName2
            }).session(session);
            if (!sectionDoc2) {
                const newSection2 = await Section.create([{
                    organization: admission.organization,
                    school: schoolId,
                    classId: sData.class,
                    name: targetSectionName2,
                    capacity: 40,
                    status: 'active'
                }], { session });
                sectionDoc2 = newSection2[0];
            }
            const sectionValue2 = sectionDoc2._id;

            // Create StudentProfile
            const newProfiles = await StudentProfile.create([{
                user: studentUser,
                parent: parentRecord._id,
                school: schoolId,
                class: sData.class,
                section: sectionValue2,
                rollNo: sData.rollNumber || `STU${Date.now()}`,
                admissionNo: sData.admissionNumber || `ADM${Date.now()}`,
                academicYear: admission.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
                status: 'active'
            }], { session });
            studentProfile = newProfiles[0];

            await Parent.findByIdAndUpdate(
                parentRecord._id,
                { $addToSet: { students: studentProfile._id } },
                { session }
            );
        }

        const studentId = studentProfile._id;

        // ==================== TRANSFER CERTIFICATE ====================
        const existingTC = await TransferCertificate.findOne({ student: studentId });
        if (existingTC) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: "Transfer Certificate already issued" });
        }

        const count = await TransferCertificate.countDocuments({ school: schoolId });
        const year = new Date().getFullYear();
        const tcNumber = `TC-${year}-${String(count + 1).padStart(4, '0')}`;

        await TransferCertificate.create([{
            student: studentId,
            studentName: sData.fullName,
            fatherName: parentRecord.fatherName,
            motherName: parentRecord.motherName,
            dateOfBirth: sData.dob,
            classAtWithdrawal: sData.class,
            sectionAtWithdrawal: sData.section,
            admissionNumber: studentProfile.admissionNo,
            school: schoolId,
            tcNumber,
            tcDate: new Date(),
            transferDate: transferDate || new Date(),
            reason: reason || "Transfer",
            destinationSchool: destinationSchool || "Not Specified",
            lastAttendedDate: lastAttendedDate || new Date(),
            conduct: conduct || "Good",
            characterCertificate: characterCertificate ?? true,
            issuedBy: req.user.id,
            status: 'issued'
        }], { session });

        // ==================== UPDATE STATUS ====================
        studentProfile.status = 'transferred';
        await studentProfile.save({ session });

        if (studentProfile.user) {
            await User.findByIdAndUpdate(studentProfile.user, { status: 'inactive' }, { session });
        }

        await session.commitTransaction();

        res.status(200).json({ 
            success: true, 
            message: "Transfer processed successfully. TC issued.",
            data: { tcNumber, studentId: studentProfile._id }
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Transfer error:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

export const getTCByStudent = async (req, res) => {
    try {
        const tc = await TransferCertificate.findOne({ student: req.params.id })
            .populate({
                path: 'student',
                populate: [
                    { path: 'user', select: 'name photo' },
                    { path: 'class', select: 'name' }
                ]
            })
            .populate({
                path: 'school',
                populate: {
                    path: 'organization'
                }
            })
            .populate('issuedBy', 'name');
        if (!tc) return res.status(404).json({ success: false, message: "TC not found" });
        res.status(200).json({ success: true, data: tc });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getAllTCs = async (req, res) => {
    try {
        const schId = await getSchoolContext(req);
        const tcs = await TransferCertificate.find({ school: schId })
            .populate({
                path: 'student',
                populate: [
                    { path: 'user', select: 'name photo' },
                    { path: 'class', select: 'name' }
                ]
            })
            .populate({
                path: 'school',
                populate: {
                    path: 'organization'
                }
            })
            .populate('issuedBy', 'name')
            .sort({ issueDate: -1 });
        res.status(200).json({ success: true, data: tcs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getAllTransferRequests = async (req, res) => {
    try {
        const schId = await getSchoolContext(req);
        const reqs = await TransferRequest.find({ school: schId, status: 'Pending' })
            .populate({
                path: 'student',
                populate: [
                    { path: 'user', select: 'name photo' },
                    { path: 'class', select: 'name' },
                    {
                        path: 'parent',
                        populate: { path: 'user', select: 'name' }
                    }
                ]
            })
            .sort({ requestDate: -1 });
        res.status(200).json({ success: true, data: reqs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const searchStudents = async (req, res) => {
    try {
        const { query } = req.query;
        const schId = await getSchoolContext(req);

        const profs = await StudentProfile.find({ school: schId, status: 'active' })
            .populate('user')
            .populate('class')
            .lean();

        const q = query.toLowerCase();
        const matches = profs.filter(p => {
            const n = p.user?.name?.toLowerCase() || '';
            const r = p.rollNo?.toLowerCase() || '';
            return n.includes(q) || r.includes(q);
        });

        res.status(200).json({ success: true, data: matches });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};