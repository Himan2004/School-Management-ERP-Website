import User from "../../models/users/user.model.js";
import Student from "../../models/users/student.model.js";
import ParentProfile from "../../models/users/parent.model.js";
import School from "../../models/school/School.js";
import Attendance from "../../models/academic/attendance.model.js";
import Marksheet from "../../models/academic/marksheet.model.js";
import FeeStructure from "../../models/finance/FeeStructure.model.js";
import FeeInstallment from "../../models/finance/FeeInstallment.model.js";
import { generateStudentCredentials, generateParentCredentials } from "../../utils/generateCredentials.js";
import { sendApprovalEmailWithCredentials } from "../../services/emailService.js";
import mongoose from "mongoose";
import { syncStudentFeeStructure, normalizeAcademicYear } from "../../utils/autoAssignFeeStructure.js";

const repairStudentUserRelationship = async (student, schoolId) => {
    let userDoc = null;
    if (student.user) {
        userDoc = await User.findById(student.user);
    }

    if (!userDoc) {
        const suffix = student.enrollmentNo || student.admissionNo || student._id.toString().substring(18);
        const loginId = `STU-${suffix}`.toUpperCase();
        
        userDoc = await User.findOne({ loginId, role: "student" });
        if (!userDoc) {
            const email = student.phone ? `${student.phone}@school.com` : `student_${student._id}@school.com`;
            userDoc = await User.create({
                name: "Student Name",
                email: email.toLowerCase(),
                loginId,
                password: "ChangeMe123!",
                role: "student",
                school: schoolId,
                status: "active",
                profileId: student._id,
                profileModel: "Student"
            });
        } else {
            userDoc.profileId = student._id;
            userDoc.profileModel = "Student";
            await userDoc.save();
        }

        student.user = userDoc._id;
        await student.save();
    }
    return userDoc;
};

const generateInstallmentSlots = (totalAmount, feeType, academicYear) => {
    const startYear = parseInt(academicYear.split('-')[0]) || new Date().getFullYear();
    const slots = [];
    
    let numInstallments = 1;
    let monthsPerInstallment = 12;
    let labelPrefix = 'Annual';
    let planType = 'one_time';
    
    if (feeType === 'monthly') {
        numInstallments = 12;
        monthsPerInstallment = 1;
        labelPrefix = 'Month';
        planType = 'monthly';
    } else if (feeType === 'quarterly') {
        numInstallments = 4;
        monthsPerInstallment = 3;
        labelPrefix = 'Quarter';
        planType = 'quarterly';
    } else if (feeType === 'half_yearly') {
        numInstallments = 2;
        monthsPerInstallment = 6;
        labelPrefix = 'Half Year';
        planType = 'custom';
    } else {
        // default annual
        numInstallments = 1;
        monthsPerInstallment = 12;
        labelPrefix = 'Annual';
        planType = 'one_time';
    }
    
    const baseAmount = Math.floor(totalAmount / numInstallments);
    const remainder = totalAmount - (baseAmount * numInstallments);
    
    for (let i = 0; i < numInstallments; i++) {
        // Academic year starts in April (Month 3 in JS Date where Jan is 0)
        let monthOffset = 3 + (i * monthsPerInstallment);
        let year = startYear;
        while (monthOffset >= 12) {
            monthOffset -= 12;
            year += 1;
        }
        
        const slotAmount = i === numInstallments - 1 ? baseAmount + remainder : baseAmount;
        const dueDate = new Date(year, monthOffset, 10);
        
        slots.push({
            installmentNo: i + 1,
            label: `${labelPrefix} ${i + 1}`,
            amountDue: slotAmount,
            dueDate,
            amountPaid: 0,
            status: 'upcoming',
        });
    }
    
    return { slots, planType };
};

/**
 * @desc    Create student admission (Admission logic)
 * @route   POST /api/admin/students
 * @access  Private (Admin)
 */
export const createStudent = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const { 
            name, email, rollNo, classId, sectionId, academicYear, gender, 
            parentName, parentEmail, parentPhone, parentRelation, ...studentData 
        } = req.body;
        const schoolId = req.user.school._id || req.user.school;

        const school = await School.findById(schoolId);
        if (!school) throw new Error("School not found");

        const normalizedYear = normalizeAcademicYear(academicYear);

        // Enforce student limit check
        if (school.maxStudentLimit !== undefined && school.maxStudentLimit !== null && school.maxStudentLimit > 0) {
            const currentStudentCount = await Student.countDocuments({ school: schoolId });
            if (currentStudentCount >= school.maxStudentLimit) {
                throw new Error(`Student limit reached. Maximum allowed is ${school.maxStudentLimit}.`);
            }
        }

        // 1. Handle Parent (Create or Find)
        let parentUser = await User.findOne({ email: parentEmail, role: "parent" });
        let parentProfile;

        if (!parentUser) {
            const { loginId: pLogin, plainPassword: pPass } = generateParentCredentials(parentName, school.schoolName);
            parentUser = await User.create([{
                name: parentName,
                email: parentEmail,
                role: "parent",
                loginId: pLogin,
                password: pPass
            }], { session });

            parentProfile = await ParentProfile.create([{
                user: parentUser[0]._id,
                school: schoolId,
                fatherName: parentName,
                primaryContact: parentPhone,
                email: parentEmail,
                students: []
            }], { session });
            parentProfile = parentProfile[0];
        } else {
            parentProfile = await ParentProfile.findOne({ user: parentUser._id, school: schoolId }).session(session);
            if (!parentProfile) {
                parentProfile = await ParentProfile.create([{
                    user: parentUser._id,
                    school: schoolId,
                    fatherName: parentName,
                    primaryContact: parentPhone,
                    email: parentEmail,
                    students: []
                }], { session });
                parentProfile = parentProfile[0];
            }
        }

        // 2. Create Student User & Profile
        const sRoll = rollNo || "";
        const { loginId: sLogin, plainPassword: sPass } = generateStudentCredentials(name, school.schoolName);

        const studentUser = await User.create([{
            name,
            email: email || `${sLogin}@school.com`,
            role: "student",
            loginId: sLogin,
            password: sPass
        }], { session });

        // Ensure roll number is unique in class if provided
        let cleanRollNo = sRoll.trim();
        if (cleanRollNo) {
            const rollExists = await Student.findOne({ 
                school: schoolId, 
                class: classId, 
                rollNo: cleanRollNo 
            }).session(session);
            if (rollExists) {
                throw new Error(`Roll number ${cleanRollNo} already exists in this class`);
            }
        } else {
            cleanRollNo = null;
        }

        const studentProfile = await Student.create([{
            user: studentUser[0]._id,
            school: schoolId,
            rollNo: cleanRollNo,
            class: classId,
            section: sectionId,
            academicYear: normalizedYear,
            gender,
            parent: parentProfile._id,
            ...studentData
        }], { session });

        studentUser[0].profileId = studentProfile[0]._id;
        studentUser[0].profileModel = "Student";
        await studentUser[0].save({ session });

        // ── AUTO-INITIALIZE STUDENT FEE INSTALLMENT ──
        await syncStudentFeeStructure(
            studentUser[0]._id,
            schoolId,
            normalizedYear,
            req.user.organization || school.organization || schoolId,
            req.user._id,
            session
        );

        // 3. Link Student to Parent
        parentProfile.students.push(studentProfile[0]._id);
        await parentProfile.save({ session });

        // 4. Send Email
        // Constructing request object for existing service
        const emailRequest = {
            parent: { email: parentEmail, fullName: parentName },
            organizationName: school.schoolName, // Using school name as org name for now
            branchName: school.schoolName,
            students: [{ name, loginId: sLogin, password: sPass }]
        };
        const credentials = {
            parent: { loginId: parentUser.loginId, password: "Login via ID provided" }, // Masked for security or logic
            students: [{ name, loginId: sLogin, password: sPass }]
        };
        
        sendApprovalEmailWithCredentials(emailRequest, credentials).catch(console.error);

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: "Student admission completed successfully",
            data: { student: studentUser[0], parent: parentUser }
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get all students with filters
 * @route   GET /api/admin/students
 * @access  Private (Admin)
 */
export const getAllStudents = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { 
            classId, 
            sectionId, 
            status, 
            gender, 
            academicYear, 
            search, 
            page = 1, 
            limit = 10, 
            sortBy = "createdAt", 
            sortOrder = "desc" 
        } = req.query;

        let query = { school: schoolId };

        if (classId && classId !== "all" && classId !== "All") query.class = classId;
        if (sectionId && sectionId !== "all" && sectionId !== "All") query.section = sectionId;
        if (status && status !== "all" && status !== "All") query.status = status;
        if (gender && gender !== "all" && gender !== "All") query.gender = gender.toLowerCase();
        if (academicYear && academicYear !== "all" && academicYear !== "All") query.academicYear = getAcademicYearQuery(academicYear);

        // If search query is provided
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            
            // 1. Search Users (student name)
            const matchingUsers = await User.find({
                role: "student",
                school: schoolId,
                name: searchRegex
            }).select("_id");
            const studentUserIds = matchingUsers.map(u => u._id);

            // 2. Search Parents (parent name)
            const matchingParents = await ParentProfile.find({
                school: schoolId,
                $or: [
                    { fatherName: searchRegex },
                    { motherName: searchRegex }
                ]
            }).select("_id");
            const parentIdsFromProfile = matchingParents.map(p => p._id);
            
            // Also search Parent users
            const matchingParentUsers = await User.find({
                role: "parent",
                school: schoolId,
                name: searchRegex
            }).select("_id");
            const parentUserIds = matchingParentUsers.map(u => u._id);
            
            const matchingParentsByUser = await ParentProfile.find({
                user: { $in: parentUserIds }
            }).select("_id");
            const parentIdsFromUser = matchingParentsByUser.map(p => p._id);
            
            const allParentIds = [...new Set([...parentIdsFromProfile, ...parentIdsFromUser])];

            // 3. Build student match query
            query.$or = [
                { user: { $in: studentUserIds } },
                { parent: { $in: allParentIds } },
                { rollNo: searchRegex },
                { enrollmentNo: searchRegex },
                { phone: searchRegex }
            ];
            
            // Search Parents by phone number
            const matchingParentsByPhone = await ParentProfile.find({
                school: schoolId,
                $or: [
                    { primaryContact: searchRegex },
                    { alternateContact: searchRegex }
                ]
            }).select("_id");
            const parentIdsFromPhone = matchingParentsByPhone.map(p => p._id);
            query.$or.push({ parent: { $in: parentIdsFromPhone } });
        }

        // Pagination setup
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        // Sorting setup
        const sortOptions = {};
        if (sortBy) {
            sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
        } else {
            sortOptions.createdAt = -1; // newest first by default
        }

        const total = await Student.countDocuments(query);
        const studentProfiles = await Student.find(query)
            .populate("user", "name email loginId photo")
            .populate("class", "className name")
            .populate("section", "sectionName name")
            .populate({
                path: "parent",
                populate: { path: "user", select: "name email" }
            })
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum)
            .lean();

        res.status(200).json({
            success: true,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            count: studentProfiles.length,
            data: studentProfiles
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get student by ID
 * @route   GET /api/admin/students/:id
 * @access  Private (Admin)
 */
export const getStudentById = async (req, res) => {
    try {
        const schoolId = req.user?.school?._id || req.user?.school;
        if (!schoolId) {
            return res.status(400).json({ success: false, message: "School ID not found in session" });
        }

        let student = await Student.findById(req.params.id)
            .populate("user", "-password")
            .populate("class")
            .populate("section")
            .populate({
                path: "parent",
                populate: { path: "user", select: "name email loginId" }
            });

        if (!student) {
            // Fallback 1: Check if User ID
            student = await Student.findOne({ user: req.params.id })
                .populate("user", "-password")
                .populate("class")
                .populate("section")
                .populate({
                    path: "parent",
                    populate: { path: "user", select: "name email loginId" }
                });
        }

        if (!student) {
            // Fallback 2: Check if Admission ID
            try {
                const AdmissionRequestModel = mongoose.model("AdmissionRequest");
                const admissionReq = await AdmissionRequestModel.findById(req.params.id).lean();
                if (admissionReq) {
                    const queryOr = [];
                    if (admissionReq.applicationNumber) {
                        queryOr.push({ enrollmentNo: admissionReq.applicationNumber });
                        queryOr.push({ admissionNo: admissionReq.applicationNumber });
                    }
                    const name = admissionReq.students?.fullName || admissionReq.student?.fullName;
                    if (name) {
                        queryOr.push({ name: name });
                    }
                    if (queryOr.length > 0) {
                        student = await Student.findOne({ $or: queryOr })
                            .populate("user", "-password")
                            .populate("class")
                            .populate("section")
                            .populate({
                                path: "parent",
                                populate: { path: "user", select: "name email loginId" }
                            });
                    }
                }
            } catch (e) {
                console.error("Failed to query student by admission ID:", e);
            }
        }

        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const studentSchoolId = student.school?._id || student.school;
        if (!studentSchoolId || studentSchoolId.toString() !== schoolId.toString()) {
            return res.status(403).json({ success: false, message: "Access denied. Student belongs to another school." });
        }

        // Repair relationship if user is null or missing
        if (!student.user) {
            await repairStudentUserRelationship(student, schoolId);
            student = await Student.findById(req.params.id)
                .populate("user", "-password")
                .populate("class")
                .populate("section")
                .populate({
                    path: "parent",
                    populate: { path: "user", select: "name email loginId" }
                });
        }

        const studentObj = student.toObject ? student.toObject() : student;
        if (studentObj.user) {
            studentObj.user.fullName = studentObj.user.name || "";
            studentObj.user.phone = student.phone || "";
        }

        try {
            const AdmissionRequestModel = mongoose.model("AdmissionRequest");
            const queryOr = [];
            if (student.enrollmentNo) queryOr.push({ applicationNumber: student.enrollmentNo });
            if (student.admissionNo) queryOr.push({ applicationNumber: student.admissionNo });
            if (student.user?.name) queryOr.push({ 'students.fullName': student.user.name });
            
            let admissionRequest = null;
            if (queryOr.length > 0) {
                admissionRequest = await AdmissionRequestModel.findOne({ $or: queryOr }).lean();
                studentObj.admissionRequest = admissionRequest;
            }
        } catch (e) {
            console.error("Failed to find admissionRequest in getStudentById:", e);
        }

        res.status(200).json({
            success: true,
            data: studentObj
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update student profile
 * @route   PUT /api/admin/students/:id
 * @access  Private (Admin)
 */
export const updateStudentProfile = async (req, res) => {
    try {
        const schoolId = req.user?.school?._id || req.user?.school;
        if (!schoolId) {
            return res.status(400).json({ success: false, message: "School ID not found in session" });
        }

        const studentProfile = await Student.findById(req.params.id).populate("user", "-password");
        if (!studentProfile) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        const profileSchoolId = studentProfile.school?._id || studentProfile.school;
        if (!profileSchoolId || profileSchoolId.toString() !== schoolId.toString()) {
            return res.status(403).json({ success: false, message: "Access denied. Student belongs to another school." });
        }

        const { 
            name, email, 
            parentName, parentEmail, parentPhone, parentRelation,
            fatherName, motherName, primaryContact, alternateContact, address, profileExtras,
            addressStreet, addressCity, addressState, addressPincode,
            ...profileUpdates 
        } = req.body;

        // Clean up roll number to prevent duplicate key errors
        if ('rollNo' in profileUpdates) {
            const rNo = profileUpdates.rollNo !== null && profileUpdates.rollNo !== undefined ? String(profileUpdates.rollNo).trim() : '';
            if (!rNo || rNo.toUpperCase() === 'NA' || rNo === 'null' || rNo === 'undefined') {
                profileUpdates.rollNo = null;
            }
        }

        // Map documents array from frontend to schema object format
        if (profileUpdates.documents) {
            if (Array.isArray(profileUpdates.documents)) {
                const docObj = {};
                const keyMap = {
                    "birth certificate": "birthCertificate",
                    "student aadhaar card": "studentAadhaar",
                    "parent aadhaar card": "parentAadhaar",
                    "previous year marksheet": "previousYearMarksheet",
                    "transfer certificate": "transferCertificate"
                };
                profileUpdates.documents.forEach(d => {
                    if (d && d.name && d.url) {
                        const normalizedName = d.name.trim().toLowerCase();
                        const key = keyMap[normalizedName] || d.name;
                        docObj[key] = d.url;
                    }
                });
                profileUpdates.documents = docObj;
            }
        }

        // Ensure student has a linked User document and repair relationship if null or invalid
        let studentUserId = studentProfile.user?._id || studentProfile.user;
        if (!studentUserId) {
            const repairedUser = await repairStudentUserRelationship(studentProfile, schoolId);
            studentUserId = repairedUser._id;
        }

        // 1. Update Student User details
        if (name || email) {
            const userUpdate = {};
            if (name) userUpdate.name = name;
            if (email) userUpdate.email = email;
            
            if (studentUserId) {
                await User.findByIdAndUpdate(studentUserId, userUpdate);
            }
        }

        // Apply profile updates safely to prevent overwriting with undefined
        Object.keys(profileUpdates).forEach(key => {
            if (profileUpdates[key] !== undefined) {
                if (key === 'documents') {
                    studentProfile.documents = {
                        ...(studentProfile.documents || {}),
                        ...(profileUpdates.documents || {})
                    };
                } else if (key === 'transport') {
                    studentProfile.transport = {
                        ...(studentProfile.transport || {}),
                        ...(profileUpdates.transport || {})
                    };
                } else if (key === 'previousSchool') {
                    studentProfile.previousSchool = {
                        ...(studentProfile.previousSchool || {}),
                        ...(profileUpdates.previousSchool || {})
                    };
                } else {
                    studentProfile[key] = profileUpdates[key];
                }
            }
        });

        // Apply file uploads if present
        if (req.files) {
            const types = ['studentAadhaar', 'parentAadhaar', 'previousYearMarksheet', 'transferCertificate', 'birthCertificate'];
            if (!studentProfile.documents) studentProfile.documents = {};
            types.forEach(t => {
                if (req.files[t] && req.files[t][0] && req.files[t][0].path) {
                    studentProfile.documents[t] = req.files[t][0].path;
                }
            });
            if (req.files['photo'] && req.files['photo'][0] && req.files['photo'][0].path) {
                studentProfile.photo = req.files['photo'][0].path;
            }
        }

        const updatedProfile = await studentProfile.save();
        await updatedProfile.populate("user", "name email");

        // 3. Update Parent User/Profile details
        if (studentProfile.parent) {
            const parent = await ParentProfile.findById(studentProfile.parent);
            if (parent) {
                // Update parent user name/email
                if (parentName || parentEmail) {
                    const parentUserUpdate = {};
                    if (parentName) parentUserUpdate.name = parentName;
                    if (parentEmail) parentUserUpdate.email = parentEmail;
                    
                    const parentUserId = parent.user?._id || parent.user;
                    if (parentUserId) {
                        await User.findByIdAndUpdate(parentUserId, parentUserUpdate);
                    }
                }

                // Update parent profile details
                const parentUpdates = {};
                if (fatherName !== undefined) parentUpdates.fatherName = fatherName;
                if (motherName !== undefined) parentUpdates.motherName = motherName;
                if (primaryContact !== undefined) parentUpdates.primaryContact = primaryContact;
                if (alternateContact !== undefined) parentUpdates.alternateContact = alternateContact;
                if (address !== undefined) parentUpdates.address = address;
                if (profileExtras !== undefined) parentUpdates.profileExtras = profileExtras;
                if (parentRelation !== undefined) parentUpdates.relation = parentRelation;

                // Construct parent address if individual fields are passed
                if (addressStreet !== undefined || addressCity !== undefined || addressState !== undefined || addressPincode !== undefined) {
                    parentUpdates.address = {
                        street: addressStreet || parent.address?.street || "",
                        city: addressCity || parent.address?.city || "",
                        state: addressState || parent.address?.state || "",
                        pincode: addressPincode || parent.address?.pincode || ""
                    };
                }

                await ParentProfile.findByIdAndUpdate(studentProfile.parent, { $set: parentUpdates });
            }
        }

        res.status(200).json({
            success: true,
            message: "Student profile updated successfully",
            data: updatedProfile
        });
    } catch (error) {
        console.error("updateStudentProfile error:", error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update student status
 * @route   PATCH /api/admin/students/:id/status
 * @access  Private (Admin)
 */
export const updateStudentStatus = async (req, res) => {
    try {
        const schoolId = req.user?.school?._id || req.user?.school;
        if (!schoolId) {
            return res.status(400).json({ success: false, message: "School ID not found in session" });
        }

        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const studentSchoolId = student.school?._id || student.school;
        if (!studentSchoolId || studentSchoolId.toString() !== schoolId.toString()) {
            return res.status(403).json({ success: false, message: "Access denied. Student belongs to another school." });
        }

        const { status } = req.body;
        student.status = status;
        await student.save();

        res.status(200).json({
            success: true,
            message: `Student status updated to ${status}`,
            data: student
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Transfer student (Class/Section change)
 * @route   POST /api/admin/students/:id/transfer
 * @access  Private (Admin)
 */
export const transferStudent = async (req, res) => {
    try {
        const schoolId = req.user?.school?._id || req.user?.school;
        if (!schoolId) {
            return res.status(400).json({ success: false, message: "School ID not found in session" });
        }

        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const studentSchoolId = student.school?._id || student.school;
        if (!studentSchoolId || studentSchoolId.toString() !== schoolId.toString()) {
            return res.status(403).json({ success: false, message: "Access denied. Student belongs to another school." });
        }

        const { targetClassId, targetSectionId, academicYear } = req.body;
        const normalizedYear = normalizeAcademicYear(academicYear || student.academicYear);

        student.class = targetClassId;
        student.section = targetSectionId;
        student.academicYear = normalizedYear;
        
        await student.save();

        const orgId = req.user?.organization || student.school;
        await syncStudentFeeStructure(
            student.user,
            schoolId,
            normalizedYear,
            orgId,
            req.user?._id
        );

        res.status(200).json({
            success: true,
            message: "Student transferred successfully",
            data: student
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Delete/Archive student
 * @route   DELETE /api/admin/students/:id
 * @access  Private (Admin)
 */
export const deleteStudent = async (req, res) => {
    try {
        const schoolId = req.user?.school?._id || req.user?.school;
        if (!schoolId) {
            return res.status(400).json({ success: false, message: "School ID not found in session" });
        }

        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const studentSchoolId = student.school?._id || student.school;
        if (!studentSchoolId || studentSchoolId.toString() !== schoolId.toString()) {
            return res.status(403).json({ success: false, message: "Access denied. Student belongs to another school." });
        }

        student.status = "dropped";
        await student.save();

        res.status(200).json({
            success: true,
            message: "Student record archived (Soft deleted)"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Bulk student import
 * @route   POST /api/admin/students/bulk-import
 * @access  Private (Admin)
 */
export const bulkImportStudents = async (req, res) => {
    try {
        const { students } = req.body;
        const schoolId = req.user.school._id || req.user.school;
        const school = await School.findById(schoolId);

        const results = { success: 0, failed: 0, errors: [] };

        for (const item of students) {
            try {
                // Simplified creation (ideally calls createStudent logic but session handling is complex in loop)
                // This is a placeholder for bulk logic
                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push({ name: item.name, error: err.message });
            }
        }

        res.status(200).json({
            success: true,
            message: `Import completed: ${results.success} success, ${results.failed} failed`,
            data: results
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Upload student document
 * @route   POST /api/admin/students/:id/documents
 * @access  Private (Admin)
 */
export const uploadDocument = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });
        if (!student.documents) student.documents = {};

        const types = ['studentAadhaar', 'parentAadhaar', 'previousYearMarksheet', 'transferCertificate', 'birthCertificate'];

        // If files are uploaded via Multer
        if (req.files) {
            types.forEach(t => {
                if (req.files[t] && req.files[t][0] && req.files[t][0].path) {
                    student.documents[t] = req.files[t][0].path;
                }
            });
            if (req.files['photo'] && req.files['photo'][0] && req.files['photo'][0].path) {
                student.photo = req.files['photo'][0].path;
            }
        } 
        // Backward compatibility: If json body is sent
        else if (req.body.documentType && req.body.documentUrl) {
            student.documents[req.body.documentType] = req.body.documentUrl;
        }

        await student.save();

        // Sync back to AdmissionRequest if exists
        try {
            const AdmissionRequest = mongoose.model("AdmissionRequest");
            const parent = await mongoose.model("Parent").findById(student.parent);
            if (parent) {
                const adm = await AdmissionRequest.findOne({ 'parent.email': parent.email });
                if (adm) {
                    const stu = adm.students.find(s => s.fullName === student.user?.name || s.fullName === student.name);
                    if (stu) {
                        if (!stu.documents) stu.documents = {};
                        types.forEach(t => {
                            if (student.documents[t]) {
                                stu.documents[t] = {
                                    url: student.documents[t],
                                    status: 'submitted',
                                    remarks: ''
                                };
                            }
                        });
                        if (student.photo) {
                            stu.photo = student.photo;
                        }
                        await adm.save();
                    }
                }
            }
        } catch (syncErr) {
            console.error("Error syncing student doc upload to AdmissionRequest:", syncErr);
        }

        res.status(200).json({
            success: true,
            message: `Documents uploaded successfully`,
            data: student.documents
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get student documents
 * @route   GET /api/admin/students/:id/documents
 * @access  Private (Admin)
 */
export const getDocuments = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).select("documents");
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        res.status(200).json({
            success: true,
            data: student.documents
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Delete student document
 * @route   DELETE /api/admin/students/:id/documents/:type
 * @access  Private (Admin)
 */
export const deleteDocument = async (req, res) => {
    try {
        const { type } = req.params;
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        student.documents[type] = undefined;
        await student.save();

        // Sync back deletion to AdmissionRequest if exists
        try {
            const AdmissionRequest = mongoose.model("AdmissionRequest");
            const parent = await mongoose.model("Parent").findById(student.parent);
            if (parent) {
                const adm = await AdmissionRequest.findOne({ 'parent.email': parent.email });
                if (adm) {
                    const stu = adm.students.find(s => s.fullName === student.user?.name || s.fullName === student.name);
                    if (stu) {
                        if (stu.documents) {
                            stu.documents[type] = undefined;
                            await adm.save();
                        }
                    }
                }
            }
        } catch (syncErr) {
            console.error("Error syncing student doc delete to AdmissionRequest:", syncErr);
        }

        res.status(200).json({
            success: true,
            message: `${type} deleted successfully`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get admission details
 * @route   GET /api/admin/students/:id/admission
 * @access  Private (Admin)
 */
export const getAdmissionDetails = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id)
            .select("admissionDate admissionFeeStatus documents previousSchool")
            .populate("user", "name email");
        
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        res.status(200).json({
            success: true,
            data: student
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get student academic history (Marks & Exams)
 * @route   GET /api/admin/students/:id/academic-history
 * @access  Private (Admin)
 */
export const getAcademicHistory = async (req, res) => {
    try {
        const marksheets = await Marksheet.find({ student: req.params.id })
            .populate("exam", "examName term")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: marksheets
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get student attendance records
 * @route   GET /api/admin/students/:id/attendance
 * @access  Private (Admin)
 */
export const getAttendanceRecords = async (req, res) => {
    try {
        const { month, year } = req.query;
        let query = { student: req.params.id };

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            query.date = { $gte: startDate, $lte: endDate };
        }

        const attendance = await Attendance.find(query).sort({ date: -1 });

        res.status(200).json({
            success: true,
            data: attendance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get progress report (Aggregated trends)
 * @route   GET /api/admin/students/:id/progress
 * @access  Private (Admin)
 */
export const getProgressReport = async (req, res) => {
    try {
        const marksheets = await Marksheet.find({ student: req.params.id, status: "published" })
            .populate("exam", "examName date");
        
        const trends = marksheets.map(m => ({
            exam: m.exam?.examName || "Unknown Exam",
            percentage: m.percentage,
            grade: m.grade,
            date: m.exam?.date
        }));

        res.status(200).json({
            success: true,
            data: trends
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get class ranking
 * @route   GET /api/admin/students/:id/ranking
 * @access  Private (Admin)
 */
export const getClassRanking = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const allMarksheets = await Marksheet.find({ 
            class: student.class, 
            academicYear: student.academicYear,
            status: "published"
        }).sort({ percentage: -1 });

        const examRanks = {};
        allMarksheets.forEach(m => {
            const eid = m.exam.toString();
            if (!examRanks[eid]) examRanks[eid] = [];
            examRanks[eid].push(m);
        });

        const ranking = Object.keys(examRanks).map(examId => {
            const sorted = examRanks[examId];
            const studentIndex = sorted.findIndex(m => m.student.toString() === req.params.id);
            return {
                examId,
                rank: studentIndex !== -1 ? studentIndex + 1 : "N/A",
                totalStudents: sorted.length,
                topPercentage: sorted[0]?.percentage
            };
        });

        res.status(200).json({
            success: true,
            data: ranking
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get enrollment statistics
 * @route   GET /api/admin/students/stats/enrollment
 * @access  Private (Admin)
 */
export const getEnrollmentStats = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;

        const stats = await Student.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const genderStats = await Student.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
            { $group: { _id: "$gender", count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            success: true,
            data: { statusStats: stats, genderStats }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get class performance (Average, Toppers)
 * @route   GET /api/admin/students/stats/performance/:classId
 * @access  Private (Admin)
 */
export const getClassPerformance = async (req, res) => {
    try {
        const { classId } = req.params;
        const performance = await Marksheet.aggregate([
            { $match: { class: new mongoose.Types.ObjectId(classId), status: "published" } },
            { $group: {
                _id: "$exam",
                averagePercentage: { $avg: "$percentage" },
                maxPercentage: { $max: "$percentage" },
                minPercentage: { $min: "$percentage" },
                count: { $sum: 1 }
            }}
        ]);

        res.status(200).json({
            success: true,
            data: performance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get attendance-performance correlation
 * @route   GET /api/admin/students/stats/correlation
 * @access  Private (Admin)
 */
export const getCorrelationAnalysis = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        
        // This is a complex analytical query
        // For now, returning a summary of averages grouped by attendance brackets
        const data = await Marksheet.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId), status: "published" } },
            { $lookup: {
                from: "attendances",
                localField: "student",
                foreignField: "student",
                as: "attendance"
            }},
            { $project: {
                percentage: 1,
                attendanceCount: { $size: "$attendance" },
                presentCount: { $size: { $filter: { input: "$attendance", as: "a", cond: { $eq: ["$$a.status", "present"] } } } }
            }},
            { $project: {
                percentage: 1,
                attendanceRatio: { $cond: [{ $gt: ["$attendanceCount", 0] }, { $divide: ["$presentCount", "$attendanceCount"] }, 0] }
            }},
            { $group: {
                _id: { $floor: { $multiply: ["$attendanceRatio", 10] } }, // Groups by 10% brackets
                avgPerformance: { $avg: "$percentage" }
            }},
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: data.map(item => ({ bracket: `${item._id * 10}-${(item._id + 1) * 10}%`, avgMarks: item.avgPerformance }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
