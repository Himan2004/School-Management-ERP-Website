import mongoose from 'mongoose';
import FeeInstallment from '../models/finance/FeeInstallment.model.js';
import FeeStructure from '../models/finance/FeeStructure.model.js';
import Student from '../models/users/student.model.js';

/**
 * Normalizes academic year to YYYY-YYYY format (e.g. 2026-2027).
 */
export const normalizeAcademicYear = (year) => {
    if (!year) return '';
    let clean = String(year).trim();
    const match = clean.match(/^(\d{4})-(\d{2,4})$/);
    if (match) {
        const start = match[1];
        let end = match[2];
        if (end.length === 2) {
            const startPrefix = start.slice(0, 2);
            end = `${startPrefix}${end}`;
        }
        return `${start}-${end}`;
    }
    return clean;
};

/**
 * Returns a MongoDB query matching both short (YYYY-YY) and long (YYYY-YYYY) academic year formats.
 */
export const getAcademicYearQuery = (year) => {
    if (!year) return {};
    const normalizedYear = normalizeAcademicYear(year); // YYYY-YYYY format
    const match = normalizedYear.match(/^(\d{4})-(\d{4})$/);
    let yearShort = normalizedYear;
    if (match) {
        yearShort = `${match[1]}-${match[2].slice(-2)}`;
    }
    return { $in: [normalizedYear, yearShort] };
};

/**
 * Normalizes class names before rendering/displaying.
 */
export const normalizeClassName = (name) => {
    if (!name) return '';
    let clean = String(name).trim();
    
    // Check if it matches "class1", "class 1", "CLASS 1" etc.
    const classMatch = clean.match(/^class\s*(\d+)$/i);
    if (classMatch) {
        return `Class ${classMatch[1]}`;
    }

    if (clean.toLowerCase().startsWith("class")) {
        clean = clean.substring(5).trim();
    }
    
    const lower = clean.toLowerCase();
    if (lower === 'nursery') return 'Nursery';
    if (lower === 'junior kg' || lower === 'jr kg' || lower === 'jr. kg' || lower === 'juniorkg') return 'Junior KG';
    if (lower === 'senior kg' || lower === 'sr kg' || lower === 'sr. kg' || lower === 'seniorkg') return 'Senior KG';
    
    if (!isNaN(Number(clean)) && clean.length > 0) {
        return `Class ${clean}`;
    }
    
    return clean.replace(/\b\w/g, c => c.toUpperCase());
};

/**
 * Cleans and formats class names and sections to prevent duplicates/incorrect casing.
 */
export const normalizeClassDisplay = (gradeLevel, section) => {
    if (!gradeLevel) return 'All Classes';
    
    let cleanGrade = String(gradeLevel).trim();
    if (cleanGrade.toLowerCase().startsWith("class")) {
        cleanGrade = cleanGrade.substring(5).trim();
    }
    if (cleanGrade.toLowerCase().startsWith("class")) {
        cleanGrade = cleanGrade.substring(5).trim();
    }
    
    if (cleanGrade.includes("-")) {
        const parts = cleanGrade.split("-");
        cleanGrade = parts[0].trim();
        if (!section) {
            section = parts[1].trim();
        }
    }

    const normalizedName = normalizeClassName(cleanGrade);
    
    if (section) {
        let cleanSec = String(section).trim();
        if (cleanSec.includes("-")) {
            cleanSec = cleanSec.split("-").pop().trim();
        }
        return `${normalizedName} - ${cleanSec.toUpperCase()}`;
    }
    return normalizedName;
};

/**
 * Helper to generate installment slots from totalAmount, feeType, and academicYear.
 */
export const generateInstallmentSlots = (totalAmount, feeType, academicYear) => {
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
 * Resolves a student's class ID from various fallback fields to prevent crashes if 'class' is missing or null.
 */
export const resolveStudentClassId = (student) => {
    if (!student) return null;
    
    // Try primary "class" field
    let cid = student.class?._id || student.class;
    if (cid && mongoose.Types.ObjectId.isValid(String(cid)) && String(cid) !== "null" && String(cid) !== "undefined") {
        return String(cid);
    }
    
    // Try fallback "currentClass" field
    cid = student.currentClass?._id || student.currentClass;
    if (cid && mongoose.Types.ObjectId.isValid(String(cid)) && String(cid) !== "null" && String(cid) !== "undefined") {
        return String(cid);
    }

    // Try fallback "classId" field
    cid = student.classId?._id || student.classId;
    if (cid && mongoose.Types.ObjectId.isValid(String(cid)) && String(cid) !== "null" && String(cid) !== "undefined") {
        return String(cid);
    }
    
    // Try fallback "admission" or "admissionRecord" class
    cid = student.admission?.class || student.admissionRecord?.class;
    if (cid && mongoose.Types.ObjectId.isValid(String(cid)) && String(cid) !== "null" && String(cid) !== "undefined") {
        return String(cid);
    }
    
    return null;
};

/**
 * Synchronizes a single student's fee structure with the active fee structure of their class.
 * Replaces any existing out-of-sync or inactive structure fee installment.
 */
export const syncStudentFeeStructure = async (studentUserOrProfileId, schoolId, academicYear, organizationId, createdByUserId, session = null) => {
    try {
        const studentProfile = await Student.findOne({
            $or: [
                { user: studentUserOrProfileId },
                { _id: studentUserOrProfileId }
            ],
            school: schoolId
        }).session(session);

        if (!studentProfile) {
            console.log(`[syncStudentFeeStructure] Student profile not found for ID: ${studentUserOrProfileId}`);
            return null;
        }

        const userId = studentProfile.user;
        const classId = resolveStudentClassId(studentProfile);
        const studentAcademicYear = normalizeAcademicYear(studentProfile.academicYear || academicYear);
        const yearQuery = getAcademicYearQuery(studentAcademicYear);

        if (!classId) {
            console.log(`[syncStudentFeeStructure] Could not resolve classId for student ${userId}, skipping fee sync`);
            await FeeInstallment.deleteOne({
                studentId: userId,
                school: schoolId,
                academicYear: yearQuery
            }).session(session);
            return null;
        }

        let orgId = organizationId;
        if (!orgId) {
            const SchoolModel = mongoose.model('School');
            const schoolDoc = await SchoolModel.findById(schoolId).session(session).lean();
            orgId = schoolDoc?.organization?._id || schoolDoc?.organization;
        }

        if (!orgId) {
            console.log(`[syncStudentFeeStructure] No organizationId found for school ${schoolId}`);
            return null;
        }

        // Find active fee structure (filtered by Organization, School, Class, and Academic Year)
        const activeStructure = await FeeStructure.findOne({
            organization: orgId,
            school: schoolId,
            classId: classId,
            academicYear: yearQuery,
            isActive: true,
            isDeleted: { $ne: true }
        }).session(session);

        if (!activeStructure) {
            console.log(`[syncStudentFeeStructure] No active structure for class ${classId}, year ${studentAcademicYear}`);
            // If an inactive or wrong structure is currently linked, remove it since inactive structures must be ignored
            await FeeInstallment.deleteOne({
                studentId: userId,
                school: schoolId,
                academicYear: yearQuery
            }).session(session);
            return null;
        }

        const derivedFeeType = (activeStructure.feeLines && activeStructure.feeLines.length > 0 && activeStructure.feeLines[0].feeType)
            ? activeStructure.feeLines[0].feeType
            : 'quarterly';

        const { slots, planType } = generateInstallmentSlots(
            activeStructure.totalAmount,
            derivedFeeType,
            studentAcademicYear
        );

        let existingInstallment = await FeeInstallment.findOne({
            studentId: userId,
            school: schoolId,
            academicYear: yearQuery
        }).session(session);

        if (existingInstallment) {
            // If already pointing to the same active structure and same amount, we are good
            if (String(existingInstallment.feeStructureId) === String(activeStructure._id) && 
                existingInstallment.grossAmount === activeStructure.totalAmount) {
                return existingInstallment;
            }

            // Otherwise we replace it
            const totalPaid = existingInstallment.totalPaid || 0;
            let remainingPaid = totalPaid;

            const updatedSlots = slots.map(slot => {
                const amountDue = slot.amountDue;
                if (remainingPaid >= amountDue) {
                    remainingPaid -= amountDue;
                    return {
                        ...slot,
                        amountPaid: amountDue,
                        status: 'paid',
                        paidOn: new Date()
                    };
                } else if (remainingPaid > 0) {
                    const paid = remainingPaid;
                    remainingPaid = 0;
                    return {
                        ...slot,
                        amountPaid: paid,
                        status: 'partially_paid'
                    };
                } else {
                    return slot;
                }
            });

            existingInstallment.feeStructureId = activeStructure._id;
            existingInstallment.planType = planType;
            existingInstallment.grossAmount = activeStructure.totalAmount;
            existingInstallment.netAmount = activeStructure.totalAmount;
            existingInstallment.totalPaid = totalPaid;
            existingInstallment.totalDue = Math.max(0, activeStructure.totalAmount - totalPaid);
            existingInstallment.installments = updatedSlots;
            existingInstallment.status = totalPaid >= activeStructure.totalAmount ? 'completed' : 'active';
            existingInstallment.markModified('installments');

            await existingInstallment.save({ session });
            console.log(`[syncStudentFeeStructure] Updated student ${userId} to active structure ${activeStructure._id}`);
            return existingInstallment;
        } else {
            // Create a brand new installment
            const newInstallment = await FeeInstallment.create([{
                organization: orgId,
                school: schoolId,
                studentId: userId,
                feeStructureId: activeStructure._id,
                academicYear: studentAcademicYear,
                planType: planType,
                grossAmount: activeStructure.totalAmount,
                waiverAmount: 0,
                netAmount: activeStructure.totalAmount,
                totalPaid: 0,
                totalDue: activeStructure.totalAmount,
                installments: slots,
                status: 'active',
                createdBy: createdByUserId || userId
            }], { session });

            console.log(`[syncStudentFeeStructure] Created fee record for student ${userId} using active structure ${activeStructure._id}`);
            return newInstallment[0];
        }
    } catch (err) {
        console.error(`[syncStudentFeeStructure] Error:`, err);
        return null;
    }
};

/**
 * Bulk syncs fee structures for all students in a class or the entire school.
 */
export const syncAllStudentsFeeStructures = async (schoolId, academicYear, organizationId, classId = null, createdByUserId = null) => {
    try {
        const query = { school: schoolId };
        if (academicYear) query.academicYear = getAcademicYearQuery(academicYear);
        if (classId) query.class = classId;

        const students = await Student.find(query).lean();
        if (!students.length) return [];

        console.log(`[syncAllStudentsFeeStructures] Bulk sync triggered for ${students.length} students...`);
        const results = [];
        for (const student of students) {
            const res = await syncStudentFeeStructure(
                student.user,
                schoolId,
                student.academicYear || academicYear,
                organizationId,
                createdByUserId
            );
            if (res) results.push(res);
        }
        return results;
    } catch (err) {
        console.error(`[syncAllStudentsFeeStructures] Error:`, err);
        return [];
    }
};