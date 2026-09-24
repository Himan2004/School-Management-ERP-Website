import Student from "../../models/users/student.model.js";
import User from "../../models/users/user.model.js";
import Class from "../../models/organization/organizationClass.js";
import Section from "../../models/school/Section.model.js";
import School from "../../models/school/School.js";
import StudentPromotionHistory from "../../models/StudentPromotionHistory.js";
import mongoose from "mongoose";

// Helper: increment academic year (e.g. "2023-2024" -> "2024-2025" or "2023" -> "2024")
const getNextAcademicYear = (currentYear) => {
    if (!currentYear) return "";
    const match = currentYear.match(/^(\d{4})-(\d{4})$/);
    if (match) {
        const start = parseInt(match[1], 10) + 1;
        const end = parseInt(match[2], 10) + 1;
        return `${start}-${end}`;
    }
    const singleYear = parseInt(currentYear, 10);
    if (!isNaN(singleYear)) {
        return String(singleYear + 1);
    }
    return currentYear;
};

const isRollNumberDuplicate = async (schoolId, classId, sectionId, academicYear, rollNo, excludeStudentId = null, session = null) => {
    if (!rollNo) return false;
    const query = {
        school: schoolId,
        class: classId,
        section: sectionId,
        academicYear,
        rollNo: rollNo.toString(),
        status: "active"
    };
    if (excludeStudentId) {
        query._id = { $ne: excludeStudentId };
    }
    let queryBuilder = Student.findOne(query);
    if (session) {
        queryBuilder = queryBuilder.session(session);
    }
    const student = await queryBuilder.lean();
    return !!student;
};

/**
 * @desc    Get eligible students for promotion with next class/section auto-detection
 * @route   GET /api/admin/students/promotion/eligible
 * @access  Private (Admin)
 */
export const getEligibleStudents = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const {
            classId,
            sectionId,
            status = "active", // default active
            gender,
            academicYear,
            search,
            admissionNo,
            rollNo,
            page = 1,
            limit = 10
        } = req.query;

        // Fetch school details to get organization
        const school = await School.findById(schoolId).lean();
        if (!school) {
            return res.status(404).json({ success: false, message: "School not found" });
        }

        const orgId = school.organization;

        // 1. Fetch class order
        const allocatedGrades = school.gradesOffered
          ? school.gradesOffered.split(",").map((g) => g.trim().toLowerCase())
          : [];
        const isClassAllowed = (clsName) => {
          if (!clsName) return false;
          let cleanName = clsName.trim().toLowerCase();
          if (allocatedGrades.includes(cleanName)) return true;
          if (cleanName.startsWith("class ")) {
            cleanName = cleanName.substring(6).trim();
          }
          return allocatedGrades.includes(cleanName);
        };

        const sortedClassesRaw = await Class.find({ organization: orgId, isActive: true })
            .sort({ numericLevel: 1 })
            .lean();
        const sortedClasses = sortedClassesRaw.filter((cls) => isClassAllowed(cls.name));

        // 2. Fetch all active sections for mapping in-memory
        const activeSections = await Section.find({ school: schoolId, status: "active" }).lean();

        // 3. Build query
        let query = { school: schoolId };

        if (status && status !== "all") {
            query.status = status;
        } else {
            // Default only active students can be shown, but if admin explicitly selects all, we return all
            // But only status='active' are promotable
        }

        if (classId && classId !== "all") query.class = classId;
        if (sectionId && sectionId !== "all") query.section = sectionId;
        if (gender && gender !== "all") query.gender = gender.toLowerCase();
        if (academicYear && academicYear !== "all") query.academicYear = academicYear;
        if (admissionNo) query.admissionNo = new RegExp(admissionNo.trim(), "i");
        if (rollNo) query.rollNo = new RegExp(rollNo.trim(), "i");

        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            const matchingUsers = await User.find({
                role: "student",
                school: schoolId,
                name: searchRegex
            }).select("_id");
            const studentUserIds = matchingUsers.map(u => u._id);

            query.$or = [
                { user: { $in: studentUserIds } },
                { rollNo: searchRegex },
                { admissionNo: searchRegex },
                { phone: searchRegex }
            ];
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const total = await Student.countDocuments(query);
        const students = await Student.find(query)
            .populate("user", "name email photo")
            .populate("class", "name numericLevel")
            .populate("section", "name")
            .sort({ rollNo: 1, createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Fetch promotion histories for these students in one query
        const studentIds = students.map(s => s._id);
        const histories = await StudentPromotionHistory.find({
            student: { $in: studentIds },
            actionType: "promote"
        }).lean();

        // 4. Map next class, section, and academic year
        const mappedStudents = students.map(student => {
            const isPromotable = student.status === "active";
            let nextClass = null;
            let defaultNextSection = null;
            let nextAcademicYear = getNextAcademicYear(student.academicYear);
            let hasNextClass = false;

            if (isPromotable && student.class) {
                const currentLevel = student.class.numericLevel || 0;
                // Find next class in sorted list
                const currentIndex = sortedClasses.findIndex(c => c._id.toString() === student.class._id.toString());
                if (currentIndex !== -1 && currentIndex < sortedClasses.length - 1) {
                    nextClass = sortedClasses[currentIndex + 1];
                    hasNextClass = true;
                }
            }

            if (nextClass && student.section) {
                // Find section in next class with same name
                const currentSectionName = student.section.name;
                const nextClassSections = activeSections.filter(s => s.classId?.toString() === nextClass._id.toString());
                defaultNextSection = nextClassSections.find(s => s.name.toLowerCase() === currentSectionName.toLowerCase()) || nextClassSections[0] || null;
            }

            // Determine promotionStatus
            let promotionStatus = "Not Eligible";
            const maxClassId = sortedClasses[sortedClasses.length - 1]?._id?.toString();
            const studentClassId = student.class?._id?.toString() || student.class?.toString();

            if (student.status === "passout") {
                promotionStatus = "Pass Out";
            } else if (studentClassId && studentClassId === maxClassId) {
                promotionStatus = "MAX CLASS";
            } else {
                const hasBeenPromoted = histories.some(h => 
                    h.student.toString() === student._id.toString() && 
                    h.newAcademicYear === student.academicYear
                );
                
                if (hasBeenPromoted) {
                    promotionStatus = "Promoted";
                } else if (isPromotable && hasNextClass) {
                    promotionStatus = "Eligible";
                } else {
                    promotionStatus = "Not Eligible";
                }
            }

            return {
                ...student,
                studentId: student._id,
                studentName: student.user?.name || student.name || "",
                profileImage: student.photo || student.user?.photo || "",
                admissionNumber: student.admissionNo || student.enrollmentNo || "",
                rollNumber: student.rollNo || "",
                currentClass: {
                    _id: student.class?._id || student.class || null,
                    name: student.class?.name || ""
                },
                currentSection: {
                    _id: student.section?._id || student.section || null,
                    name: student.section?.name || ""
                },
                academicSession: {
                    _id: student.academicYear || "",
                    sessionName: student.academicYear || ""
                },
                nextClass,
                defaultNextSection,
                nextAcademicYear,
                hasNextClass,
                isEligible: isPromotable && hasNextClass,
                promotionStatus
            };
        });

        res.status(200).json({
            success: true,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            data: mappedStudents
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get promotion dashboard stats
 * @route   GET /api/admin/students/promotion/stats
 * @access  Private (Admin)
 */
export const getPromotionStats = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;

        const school = await School.findById(schoolId).lean();
        if (!school) {
            return res.status(404).json({ success: false, message: "School not found" });
        }

        // Fetch sorted classes to determine eligible students (not in max class)
        const allocatedGrades = school.gradesOffered
          ? school.gradesOffered.split(",").map((g) => g.trim().toLowerCase())
          : [];
        const isClassAllowed = (clsName) => {
          if (!clsName) return false;
          let cleanName = clsName.trim().toLowerCase();
          if (allocatedGrades.includes(cleanName)) return true;
          if (cleanName.startsWith("class ")) {
            cleanName = cleanName.substring(6).trim();
          }
          return allocatedGrades.includes(cleanName);
        };

        const sortedClassesRaw = await Class.find({ organization: school.organization, isActive: true })
            .sort({ numericLevel: 1 })
            .lean();
        const sortedClasses = sortedClassesRaw.filter((cls) => isClassAllowed(cls.name));

        let eligibleCount = 0;
        if (sortedClasses.length > 0) {
            const maxClassId = sortedClasses[sortedClasses.length - 1]._id;
            // Active students not in the max class are eligible
            eligibleCount = await Student.countDocuments({
                school: schoolId,
                status: "active",
                class: { $ne: maxClassId }
            });
        }

        const activeCount = await Student.countDocuments({ school: schoolId, status: "active" });
        const alreadyPromotedCount = await StudentPromotionHistory.countDocuments({ school: schoolId, actionType: "promote" });
        const passoutCount = await Student.countDocuments({ school: schoolId, status: "passout" });
        const droppedCount = await Student.countDocuments({ school: schoolId, status: { $in: ["dropped", "dropout"] } });

        res.status(200).json({
            success: true,
            data: {
                activeStudents: activeCount,
                eligibleForPromotion: eligibleCount,
                alreadyPromoted: alreadyPromotedCount,
                passOutStudents: passoutCount,
                droppedStudents: droppedCount
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Promote a single student
 * @route   POST /api/admin/students/promotion/single
 * @access  Private (Admin)
 */
export const promoteSingleStudent = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { studentId, nextClassId, targetClass, nextSectionId, targetSection, nextAcademicYear, academicSession, newRollNumber, remarks } = req.body;

        const targetClassId = targetClass || nextClassId;
        const targetSectionId = targetSection || nextSectionId;
        const targetAcademicYear = academicSession || nextAcademicYear;

        if (!studentId || !targetClassId || !targetSectionId || !targetAcademicYear || !newRollNumber) {
            return res.status(400).json({ success: false, message: "Missing required promotion details" });
        }

        // Validate roll number type
        const rollNum = parseInt(newRollNumber, 10);
        if (isNaN(rollNum) || rollNum <= 0) {
            return res.status(400).json({ success: false, message: "Roll number must be a positive integer" });
        }

        const student = await Student.findOne({ _id: studentId, school: schoolId }).session(session);
        if (!student) {
            throw new Error("Student not found");
        }

        if (student.status !== "active") {
            throw new Error(`Student is not active (current status: ${student.status})`);
        }

        // Validate next class
        const targetClassDoc = await Class.findById(targetClassId).session(session);
        if (!targetClassDoc) {
            throw new Error("Target class not found");
        }

        // Validate next section
        const targetSectionDoc = await Section.findById(targetSectionId).session(session);
        if (!targetSectionDoc) {
            throw new Error("Target section not found");
        }

        // Duplicate roll number check in target class/section/session
        const isDuplicate = await isRollNumberDuplicate(schoolId, targetClassId, targetSectionId, targetAcademicYear, newRollNumber, studentId, session);
        if (isDuplicate) {
            throw new Error("This roll number is already assigned in the selected class and section.");
        }

        // Check if student already has a promotion history record for this target year
        const existingHistory = await StudentPromotionHistory.findOne({
            student: studentId,
            newAcademicYear: targetAcademicYear,
            actionType: "promote"
        }).session(session);

        const originalClassId = existingHistory ? existingHistory.oldClass : student.class;
        const originalClass = await Class.findById(originalClassId).session(session);
        if (originalClass && targetClassDoc.numericLevel < originalClass.numericLevel) {
            throw new Error("Target class cannot be lower than the current/original class");
        }

        const oldRoll = student.rollNo || "";

        if (existingHistory) {
            // Update existing promotion record
            const oldSectionId = student.section;
            if (String(oldSectionId) !== String(targetSectionId)) {
                if (oldSectionId) {
                    await Section.findByIdAndUpdate(oldSectionId, { $inc: { currentStrength: -1 } }).session(session);
                }
                await Section.findByIdAndUpdate(targetSectionId, { $inc: { currentStrength: 1 } }).session(session);
            }

            existingHistory.newClass = targetClassId;
            existingHistory.newSection = targetSectionId;
            existingHistory.newRoll = newRollNumber;
            existingHistory.promotedBy = req.user._id;
            existingHistory.remarks = remarks || existingHistory.remarks || "Promotion updated successfully";
            await existingHistory.save({ session });

            student.class = targetClassId;
            student.section = targetSectionId;
            student.rollNo = newRollNumber.toString();
            student.lastPromotedDate = new Date();
            student.promotedBy = req.user._id;
            await student.save({ session });

            await session.commitTransaction();
            session.endSession();

            return res.status(200).json({
                success: true,
                message: "Student promotion updated successfully."
            });
        }

        const oldClassId = student.class;
        const oldSectionId = student.section;
        const oldAcademicYear = student.academicYear;

        // 1. Create Promotion History Record
        const historyRecord = await StudentPromotionHistory.create([{
            student: studentId,
            school: schoolId,
            organization: targetClassDoc.organization,
            oldClass: oldClassId,
            oldSection: oldSectionId,
            newClass: targetClassId,
            newSection: targetSectionId,
            oldAcademicYear: oldAcademicYear,
            newAcademicYear: targetAcademicYear,
            oldRoll: oldRoll,
            newRoll: newRollNumber,
            actionType: "promote",
            promotedBy: req.user._id,
            remarks: remarks || "Promoted successfully"
        }], { session });

        // 2. Update Student document
        student.class = targetClassId;
        student.section = targetSectionId;
        student.academicYear = targetAcademicYear;
        student.rollNo = newRollNumber.toString();
        student.lastPromotedDate = new Date();
        student.promotedBy = req.user._id;
        student.promotionHistory.push(historyRecord[0]._id);
        await student.save({ session });

        // 3. Update Section Strengths
        if (oldSectionId) {
            await Section.findByIdAndUpdate(oldSectionId, { $inc: { currentStrength: -1 } }).session(session);
        }
        await Section.findByIdAndUpdate(targetSectionId, { $inc: { currentStrength: 1 } }).session(session);

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Student promoted successfully",
            data: student
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Bulk promote students
 * @route   POST /api/admin/students/promotion/bulk
 * @access  Private (Admin)
 */
export const promoteBulkStudents = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { students, nextClassId, targetClass, nextSectionId, targetSection, nextAcademicYear, academicSession, remarks } = req.body;

        const targetClassId = targetClass || nextClassId;
        const targetSectionId = targetSection || nextSectionId;
        const targetAcademicYear = academicSession || nextAcademicYear;

        if (!students || !Array.isArray(students) || students.length === 0) {
            return res.status(400).json({ success: false, message: "No students selected for promotion" });
        }
        if (!targetClassId || !targetSectionId || !targetAcademicYear) {
            return res.status(400).json({ success: false, message: "Missing required promotion details" });
        }

        const targetClassDoc = await Class.findById(targetClassId).session(session);
        if (!targetClassDoc) {
            throw new Error("Target class not found");
        }
        const targetSectionDoc = await Section.findById(targetSectionId).session(session);
        if (!targetSectionDoc) {
            throw new Error("Target section not found");
        }

        const results = { promoted: [], failed: [] };

        // Duplicate roll numbers check within the payload batch first
        const batchRolls = students.map(s => s.newRollNumber?.toString().trim());
        const uniqueBatchRolls = new Set(batchRolls);
        if (batchRolls.length !== uniqueBatchRolls.size) {
            throw new Error("Roll numbers must be unique.");
        }

        for (const s of students) {
            const studentId = s.studentId;
            const newRollNumber = s.newRollNumber;
            try {
                if (!studentId || !newRollNumber) {
                    throw new Error("Student ID and new roll number are required for all students");
                }
                const rollNum = parseInt(newRollNumber, 10);
                if (isNaN(rollNum) || rollNum <= 0) {
                    throw new Error("Roll number must be a positive integer");
                }

                const student = await Student.findOne({ _id: studentId, school: schoolId }).session(session);
                if (!student) {
                    throw new Error("Student not found");
                }
                if (student.status !== "active") {
                    throw new Error(`Student status is ${student.status}, must be active`);
                }

                // Check duplicate roll in database
                const isDuplicate = await isRollNumberDuplicate(schoolId, targetClassId, targetSectionId, targetAcademicYear, newRollNumber, studentId, session);
                if (isDuplicate) {
                    throw new Error("This roll number is already assigned in the selected class and section.");
                }

                // Check if student already has a promotion history record for this target year
                const existingHistory = await StudentPromotionHistory.findOne({
                    student: studentId,
                    newAcademicYear: targetAcademicYear,
                    actionType: "promote"
                }).session(session);

                const originalClassId = existingHistory ? existingHistory.oldClass : student.class;
                const originalClass = await Class.findById(originalClassId).session(session);
                if (originalClass && targetClassDoc.numericLevel < originalClass.numericLevel) {
                    throw new Error("Target class cannot be lower than the current/original class");
                }

                const oldRoll = student.rollNo || "";

                if (existingHistory) {
                    // Update existing promotion record
                    const oldSectionId = student.section;
                    if (String(oldSectionId) !== String(targetSectionId)) {
                        if (oldSectionId) {
                            await Section.findByIdAndUpdate(oldSectionId, { $inc: { currentStrength: -1 } }).session(session);
                        }
                        await Section.findByIdAndUpdate(targetSectionId, { $inc: { currentStrength: 1 } }).session(session);
                    }

                    existingHistory.newClass = targetClassId;
                    existingHistory.newSection = targetSectionId;
                    existingHistory.newRoll = newRollNumber;
                    existingHistory.promotedBy = req.user._id;
                    existingHistory.remarks = remarks || existingHistory.remarks || "Bulk promotion updated successfully";
                    await existingHistory.save({ session });

                    student.class = targetClassId;
                    student.section = targetSectionId;
                    student.rollNo = newRollNumber.toString();
                    student.lastPromotedDate = new Date();
                    student.promotedBy = req.user._id;
                    await student.save({ session });

                    results.promoted.push(studentId);
                } else {
                    const oldClassId = student.class;
                    const oldSectionId = student.section;
                    const oldAcademicYear = student.academicYear;

                    // 1. Create Promotion History Record
                    const historyRecord = await StudentPromotionHistory.create([{
                        student: studentId,
                        school: schoolId,
                        organization: targetClassDoc.organization,
                        oldClass: oldClassId,
                        oldSection: oldSectionId,
                        newClass: targetClassId,
                        newSection: targetSectionId,
                        oldAcademicYear: oldAcademicYear,
                        newAcademicYear: targetAcademicYear,
                        oldRoll: oldRoll,
                        newRoll: newRollNumber,
                        actionType: "promote",
                        promotedBy: req.user._id,
                        remarks: remarks || "Bulk promoted successfully"
                    }], { session });

                    // 2. Update Student document
                    student.class = targetClassId;
                    student.section = targetSectionId;
                    student.academicYear = targetAcademicYear;
                    student.rollNo = newRollNumber.toString();
                    student.lastPromotedDate = new Date();
                    student.promotedBy = req.user._id;
                    student.promotionHistory.push(historyRecord[0]._id);
                    await student.save({ session });

                    // 3. Update Section Strengths
                    if (oldSectionId) {
                        await Section.findByIdAndUpdate(oldSectionId, { $inc: { currentStrength: -1 } }).session(session);
                    }
                    await Section.findByIdAndUpdate(targetSectionId, { $inc: { currentStrength: 1 } }).session(session);

                    results.promoted.push(studentId);
                }
            } catch (err) {
                results.failed.push({ studentId, error: err.message });
            }
        }

        if (results.promoted.length > 0) {
            await session.commitTransaction();
            session.endSession();
            res.status(200).json({
                success: true,
                message: `Bulk promotion completed. Promoted: ${results.promoted.length}, Failed: ${results.failed.length}`,
                data: results
            });
        } else {
            await session.abortTransaction();
            session.endSession();
            res.status(400).json({
                success: false,
                message: "All promotions failed",
                errors: results.failed
            });
        }
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Mark student as Pass Out
 * @route   POST /api/admin/students/promotion/passout
 * @access  Private (Admin)
 */
export const markPassOut = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { studentId, remarks, reason } = req.body;

        if (!studentId) {
            return res.status(400).json({ success: false, message: "Student ID is required" });
        }

        const student = await Student.findOne({ _id: studentId, school: schoolId }).session(session);
        if (!student) {
            throw new Error("Student not found");
        }

        if (student.status !== "active") {
            throw new Error(`Student must be active (current status: ${student.status})`);
        }

        const school = await School.findById(schoolId).lean();
        const oldClassId = student.class;
        const oldSectionId = student.section;
        const oldAcademicYear = student.academicYear;

        // 1. Create Promotion History Record
        const historyRecord = await StudentPromotionHistory.create([{
            student: studentId,
            school: schoolId,
            organization: school.organization,
            oldClass: oldClassId,
            oldSection: oldSectionId,
            newClass: null,
            newSection: null,
            oldAcademicYear: oldAcademicYear,
            newAcademicYear: oldAcademicYear,
            actionType: "passout",
            promotedBy: req.user._id,
            remarks: remarks || reason || "Marked as Pass Out"
        }], { session });

        // 2. Update Student document
        student.status = "passout";
        student.lastPromotedDate = new Date();
        student.promotedBy = req.user._id;
        student.promotionHistory.push(historyRecord[0]._id);
        await student.save({ session });

        // 3. Update Section Strength
        if (oldSectionId) {
            await Section.findByIdAndUpdate(oldSectionId, { $inc: { currentStrength: -1 } }).session(session);
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Student marked as Pass Out successfully",
            data: student
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Mark student as Dropout
 * @route   POST /api/admin/students/promotion/dropout
 * @access  Private (Admin)
 */
export const markDropout = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { studentId, remarks, reason } = req.body;

        if (!studentId) {
            return res.status(400).json({ success: false, message: "Student ID is required" });
        }

        const student = await Student.findOne({ _id: studentId, school: schoolId }).session(session);
        if (!student) {
            throw new Error("Student not found");
        }

        if (student.status !== "active") {
            throw new Error(`Student must be active (current status: ${student.status})`);
        }

        const school = await School.findById(schoolId).lean();
        const oldClassId = student.class;
        const oldSectionId = student.section;
        const oldAcademicYear = student.academicYear;

        // 1. Create Promotion History Record
        const historyRecord = await StudentPromotionHistory.create([{
            student: studentId,
            school: schoolId,
            organization: school.organization,
            oldClass: oldClassId,
            oldSection: oldSectionId,
            newClass: null,
            newSection: null,
            oldAcademicYear: oldAcademicYear,
            newAcademicYear: oldAcademicYear,
            actionType: "dropout",
            promotedBy: req.user._id,
            remarks: remarks || reason || "Marked as Dropout"
        }], { session });

        // 2. Update Student document
        student.status = "dropout";
        student.lastPromotedDate = new Date();
        student.promotedBy = req.user._id;
        student.promotionHistory.push(historyRecord[0]._id);
        await student.save({ session });

        // 3. Update Section Strength
        if (oldSectionId) {
            await Section.findByIdAndUpdate(oldSectionId, { $inc: { currentStrength: -1 } }).session(session);
        }

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Student marked as Dropout successfully",
            data: student
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get promotion history logs
 * @route   GET /api/admin/students/promotion/history
 * @access  Private (Admin)
 */
export const getPromotionHistory = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { studentId, classId, academicYear, page = 1, limit = 10 } = req.query;

        let query = { school: schoolId };

        if (studentId) query.student = studentId;
        if (academicYear) {
            query.$or = [
                { oldAcademicYear: academicYear },
                { newAcademicYear: academicYear }
            ];
        }

        if (classId) {
            query.$or = [
                { oldClass: classId },
                { newClass: classId }
            ];
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const total = await StudentPromotionHistory.countDocuments(query);
        const history = await StudentPromotionHistory.find(query)
            .populate({
                path: "student",
                populate: { path: "user", select: "name photo email" },
                select: "rollNo admissionNo user"
            })
            .populate("oldClass", "name")
            .populate("newClass", "name")
            .populate("oldSection", "name")
            .populate("newSection", "name")
            .populate("promotedBy", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        res.status(200).json({
            success: true,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            data: history
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
