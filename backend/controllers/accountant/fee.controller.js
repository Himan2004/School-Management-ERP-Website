import Student from '../../models/users/student.model.js';
import User from '../../models/users/user.model.js';
import Parent from '../../models/users/parent.model.js';
import FeeInstallment from '../../models/finance/FeeInstallment.model.js';
import FeePayment from '../../models/finance/FeePayment.model.js';
import LateFeeSetting from '../../models/finance/LateFeeSetting.model.js';
import FeeStructure from '../../models/finance/FeeStructure.model.js';
import mongoose from 'mongoose';
import { 
    syncStudentFeeStructure, 
    resolveStudentClassId, 
    normalizeAcademicYear, 
    getAcademicYearQuery, 
    normalizeClassDisplay 
} from '../../utils/autoAssignFeeStructure.js';


// ── Helper: generate receipt number ──
const generateReceiptNumber = () => {
    const ts = Date.now().toString();
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RCP${ts.slice(-7)}${rand}`;
};

// ── Helper: calculate late fee for a student ──
const calcLateFee = (installment, lateFeeSetting) => {
    if (!lateFeeSetting?.isActive) return { daysLate: 0, penalty: 0 };

    const today = new Date();
    const dueDay = lateFeeSetting.dueDay || 10;
    const penaltyPerDay = lateFeeSetting.penaltyPerDay || 0;
    const gracePeriod = lateFeeSetting.gracePeriod || 0;
    const maxPenalty = lateFeeSetting.maxPenalty || 0;

    // Find the earliest overdue installment slot
    const overdueSlot = installment.installments?.find(
        (s) => ['due', 'overdue', 'partially_paid'].includes(s.status)
    );
    if (!overdueSlot) return { daysLate: 0, penalty: 0 };

    const dueDate = new Date(overdueSlot.dueDate);
    const diffMs = today - dueDate;
    if (diffMs <= 0) return { daysLate: 0, penalty: 0 };

    const daysLate = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)) - gracePeriod);
    if (daysLate <= 0) return { daysLate: 0, penalty: 0 };

    let penalty = daysLate * penaltyPerDay;
    if (maxPenalty > 0) penalty = Math.min(penalty, maxPenalty);

    return { daysLate, penalty, dueDay, penaltyPerDay };
};

// ── Helper: format student for frontend ──
const formatStudent = (student, userDoc, parentDoc, installment, lateFeeSetting) => {
    const lateFeeInfo = installment
        ? calcLateFee(installment, lateFeeSetting)
        : { daysLate: 0, penalty: 0 };

    const totalFee = installment?.netAmount || 0;
    const totalPaid = installment?.totalPaid || 0;
    const totalDue = installment?.totalDue || 0;
    const advanceBalance = installment?.advanceBalance || 0;

    let feeStatus = 'pending';
    if (totalDue === 0 && totalPaid > 0) feeStatus = 'paid';
    else if (advanceBalance > 0) feeStatus = 'advance';

    // Build recent payments from FeePayment refs stored on slots
    const recentPayments = (installment?.installments || [])
        .flatMap((slot) =>
            (slot.paymentRefs || []).map((ref) => ({
                paymentRefId: ref,
                slotLabel: slot.label,
                paidOn: slot.paidOn,
                amount: slot.amountPaid,
            }))
        )
        .slice(0, 6);

    const lateFeeEnabled =
        lateFeeSetting?.isActive &&
        lateFeeInfo.daysLate > 0 &&
        (!lateFeeSetting.applicableClasses?.length ||
            lateFeeSetting.applicableClasses.includes(String(student.class)));

    const rawClassName = student.class?.name || (typeof student.class === 'string' ? student.class : '');
    const rawSectionName = student.section?.name || (typeof student.section === 'string' ? student.section : '');
    
    let cleanClassName = rawClassName.trim();
    if (cleanClassName.toLowerCase().startsWith("class")) {
        cleanClassName = cleanClassName.substring(5).trim();
    }
    if (cleanClassName.toLowerCase().startsWith("class")) {
        cleanClassName = cleanClassName.substring(5).trim();
    }
    
    if (cleanClassName.includes("-")) {
        const parts = cleanClassName.split("-");
        cleanClassName = parts[0].trim();
    }

    if (isNaN(Number(cleanClassName)) && cleanClassName.length > 0) {
        cleanClassName = cleanClassName.charAt(0).toUpperCase() + cleanClassName.slice(1);
    }
    
    let cleanSectionName = rawSectionName.trim();
    if (cleanSectionName.includes("-")) {
        cleanSectionName = cleanSectionName.split("-").pop().trim();
    }
    cleanSectionName = cleanSectionName.toUpperCase();

    return {
        id: String(student._id),
        userId: String(student.user),
        name: userDoc?.name || 'Unknown',
        admissionNo: student.admissionNo || student.enrollmentNo || '',
        rollNo: student.rollNo || '',
        class: cleanClassName,
        classId: String(student.class?._id || student.class),
        section: cleanSectionName || 'A',
        sectionId: String(student.section?._id || student.section),
        fatherName: parentDoc?.fatherName || '',
        motherName: parentDoc?.motherName || '',
        phone: parentDoc?.primaryContact || userDoc?.email || '',
        email: userDoc?.email || '',
        address: student.address || '',
        totalFee,
        totalPaid,
        totalDue,
        advanceBalance,
        feeStatus,
        installmentId: installment ? String(installment._id) : null,
        lateFee: lateFeeEnabled
            ? {
                  isEnabled: true,
                  penaltyPerDay: lateFeeSetting.penaltyPerDay,
                  daysLate: lateFeeInfo.daysLate,
                  currentPenalty: lateFeeInfo.penalty,
                  dueDay: lateFeeSetting.dueDay,
              }
            : null,
        // recentPayments are enriched separately via a pipeline or populated call
        recentPayments: [],
    };
};

// ════════════════════════════════════════════════════════════
// GET /api/accountant/fees/students
// Query: class, section, status, search, page, limit, academicYear
// ════════════════════════════════════════════════════════════
export const getStudentsWithFees = async (req, res) => {
    try {
        const school = req.user.school;
        const {
            classId,
            sectionId,
            status,
            search,
            page = 1,
            limit = 50,
            academicYear,
        } = req.query;

        // Resolve academic year
        const rawYear = academicYear || (() => {
            const now = new Date();
            const y = now.getFullYear();

            if (now.getMonth() >= 3) {
                return `${y}-${String(y + 1).slice(-2)}`;
            } else {
                return `${y - 1}-${String(y).slice(-2)}`;
            }
        })();
        const year = normalizeAcademicYear(rawYear);
        const yearQuery = getAcademicYearQuery(year);

        // Build student filter
        const studentFilter = { school, status: 'active' };
        if (classId && classId !== 'all' && classId !== 'null' && classId !== 'undefined' && mongoose.Types.ObjectId.isValid(classId)) {
            studentFilter.class = new mongoose.Types.ObjectId(classId);
        }
        if (sectionId && sectionId !== 'all' && sectionId !== 'null' && sectionId !== 'undefined' && mongoose.Types.ObjectId.isValid(sectionId)) {
            studentFilter.section = new mongoose.Types.ObjectId(sectionId);
        }

        // Fetch students (populate class/section name)
        let students = await Student.find(studentFilter)
            .populate('class', 'name')
            .populate('section', 'name')
            .lean();

        // If search, filter by user name/admissionNo
        let userIds = students.map((s) => s.user);
        let userMap = {};
        const userDocs = await User.find({
            _id: { $in: userIds },
            ...(search
                ? { name: { $regex: search, $options: 'i' } }
                : {}),
        })
            .select('name email')
            .lean();

        const matchedUserIds = new Set(userDocs.map((u) => String(u._id)));
        userDocs.forEach((u) => (userMap[String(u._id)] = u));

        // Also filter by admissionNo
        if (search) {
            students = students.filter(
                (s) =>
                    matchedUserIds.has(String(s.user)) ||
                    (s.admissionNo || '').toLowerCase().includes(search.toLowerCase())
            );
        }

        // Fetch parents keyed by student._id
        const studentIds = students.map((s) => s._id);
        const parents = await Parent.find({ students: { $in: studentIds } })
            .select('students fatherName motherName primaryContact')
            .lean();
        const parentMap = {};
        parents.forEach((p) => {
            p.students.forEach((sid) => {
                parentMap[String(sid)] = p;
            });
        });

        // Fetch fee installments for this school + year
        const installments = await FeeInstallment.find({
            school,
            academicYear: yearQuery,
            studentId: { $in: students.map((s) => s.user) },
        }).lean();
        const installmentMap = {};
        installments.forEach((fi) => {
            installmentMap[String(fi.studentId)] = fi;
        });

        // ── ON-THE-FLY SYNC FOR OUT-OF-SYNC OR MISSING STRUCTURES ──
        const classIds = [...new Set(students.map(s => resolveStudentClassId(s)))]
            .filter(id => id && mongoose.Types.ObjectId.isValid(String(id)))
            .map(id => new mongoose.Types.ObjectId(String(id)));
        const orgId = req.user.organization || (req.user.school?.organization?._id || req.user.school?.organization);
        const activeStructures = classIds.length > 0 ? await FeeStructure.find({
            organization: orgId,
            school,
            classId: { $in: classIds },
            academicYear: yearQuery,
            isActive: true,
            isDeleted: { $ne: true }
        }).lean() : [];

        const activeStructureMap = {};
        activeStructures.forEach(fs => {
            activeStructureMap[String(fs.classId)] = fs;
        });

        const syncPromises = [];
        for (const student of students) {
            const studentClassId = resolveStudentClassId(student);
            const activeFS = studentClassId ? activeStructureMap[String(studentClassId)] : null;
            const existingFI = installmentMap[String(student.user)];

            if (activeFS) {
                if (!existingFI || String(existingFI.feeStructureId) !== String(activeFS._id) || existingFI.grossAmount !== activeFS.totalAmount) {
                    syncPromises.push(syncStudentFeeStructure(
                        student.user,
                        school,
                        normalizeAcademicYear(student.academicYear || year),
                        orgId,
                        req.user._id
                    ));
                }
            } else {
                if (existingFI) {
                    syncPromises.push(syncStudentFeeStructure(
                        student.user,
                        school,
                        normalizeAcademicYear(student.academicYear || year),
                        orgId,
                        req.user._id
                    ));
                }
            }
        }

        if (syncPromises.length > 0) {
            console.log(`[getStudentsWithFees] Syncing ${syncPromises.length} student(s) on-the-fly...`);
            await Promise.all(syncPromises);

            // Re-fetch fee installments to get updated ones
            const updatedInstallments = await FeeInstallment.find({
                school,
                academicYear: yearQuery,
                studentId: { $in: students.map((s) => s.user) },
            }).lean();
            
            // Clear map and re-populate
            Object.keys(installmentMap).forEach(key => delete installmentMap[key]);
            updatedInstallments.forEach((fi) => {
                installmentMap[String(fi.studentId)] = fi;
            });
        }
console.log("================================");
console.log("School:", school.toString());
console.log("Academic Year:", year);
console.log("Students Found:", students.length);
console.log("FeeInstallments Found:", installments.length);
console.log("================================");
        // Fetch late fee setting
        const lateFeeSetting = await LateFeeSetting.findOne({
            school,
            isActive: true,
        }).lean();
// console.log("==================================");
// console.log("Student ID :", student._id.toString());
// console.log("User ID    :", student.user.toString());
// console.log("School     :", school.toString());
// console.log("Year       :", year);
// console.log("Installment Found :", installment);
// console.log("==================================");

        // Format all students
      let formatted = students
    .filter((s) => userMap[String(s.user)]) // Skip students whose user doesn't exist
    .map((s) => {
        const userDoc = userMap[String(s.user)];
        const parentDoc = parentMap[String(s._id)] || {};
        const installment = installmentMap[String(s.user)] || null;

        return formatStudent(
            s,
            userDoc,
            parentDoc,
            installment,
            lateFeeSetting
        );
    });

        // Filter by fee status after formatting
        if (status && status !== 'all') {
            formatted = formatted.filter((s) => s.feeStatus === status);
        }

        // Summary stats
        const stats = {
            totalStudents: formatted.length,
            totalPending: formatted.filter((s) => s.feeStatus === 'pending').length,
            totalPaid: formatted.filter((s) => s.feeStatus === 'paid').length,
            totalAdvance: formatted.filter((s) => s.feeStatus === 'advance').length,
            totalDueAmount: formatted.reduce((sum, s) => sum + s.totalDue, 0),
            totalCollected: formatted.reduce((sum, s) => sum + s.totalPaid, 0),
        };

        // Paginate
        const total = formatted.length;
        const skip = (Number(page) - 1) * Number(limit);
        const paginated = formatted.slice(skip, skip + Number(limit));

        res.status(200).json({
            success: true,
            data: paginated,
            stats,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
            academicYear: year,
        });
    } catch (err) {
        console.error('[getStudentsWithFees]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ════════════════════════════════════════════════════════════
// GET /api/accountant/fees/students/:studentId
// Full profile: student + fee installment + payment history
// ════════════════════════════════════════════════════════════
export const getStudentFeeProfile = async (req, res) => {
    try {
        const school = req.user.school;
        const { studentId } = req.params;
        const { academicYear } = req.query;

        const rawYear = academicYear || (() => {
            const now = new Date();
            const y = now.getFullYear();
            if (now.getMonth() >= 3) {
                return `${y}-${String(y + 1).slice(-2)}`;
            } else {
                return `${y - 1}-${String(y).slice(-2)}`;
            }
        })();
        const year = normalizeAcademicYear(rawYear);
        const yearQuery = getAcademicYearQuery(year);

        const student = await Student.findOne({ _id: studentId, school })
            .populate('class', 'name')
            .populate('section', 'name')
            .lean();
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const [userDoc, parentDoc, installment, lateFeeSetting] = await Promise.all([
            User.findById(student.user).select('name email').lean(),
            Parent.findOne({ students: student._id })
                .select('fatherName motherName primaryContact alternateContact address')
                .lean(),
            FeeInstallment.findOne({ studentId: student.user, school, academicYear: yearQuery }).lean(),
            LateFeeSetting.findOne({ school, isActive: true }).lean(),
        ]);

        // ── ON-THE-FLY SYNC FOR OUT-OF-SYNC OR MISSING STRUCTURES ──
        const orgId = req.user.organization || (req.user.school?.organization?._id || req.user.school?.organization);
        const studentClassId = resolveStudentClassId(student);
        const activeFS = (studentClassId && mongoose.Types.ObjectId.isValid(String(studentClassId))) ? await FeeStructure.findOne({
            organization: orgId,
            school,
            classId: new mongoose.Types.ObjectId(String(studentClassId)),
            academicYear: yearQuery,
            isActive: true,
            isDeleted: { $ne: true }
        }).lean() : null;

        let currentInstallment = installment;
        let needsSync = false;
        if (activeFS) {
            if (!currentInstallment || String(currentInstallment.feeStructureId) !== String(activeFS._id) || currentInstallment.grossAmount !== activeFS.totalAmount) {
                needsSync = true;
            }
        } else {
            if (currentInstallment) {
                needsSync = true;
            }
        }

        if (needsSync) {
            console.log(`[getStudentFeeProfile] Syncing student ${student.user} on-the-fly...`);
            const synced = await syncStudentFeeStructure(
                student.user,
                school,
                normalizeAcademicYear(student.academicYear || year),
                orgId,
                req.user._id
            );
            currentInstallment = synced ? (synced.toObject ? synced.toObject() : synced) : null;
        }

        const base = formatStudent(student, userDoc, parentDoc, currentInstallment, lateFeeSetting);

        // Enrich recent payments from FeePayment collection
        const payments = await FeePayment.find({
            school,
            studentId: student.user,
        })
            .sort({ paymentDate: -1 })
            .limit(20)
            .lean();

        base.recentPayments = payments.map((p) => ({
            date: p.paymentDate,
            amount: p.totalCollected || p.amountPaid,
            mode: p.paymentMode,
            receipt: p.receiptNumber,
            status: p.paymentStatus,
            lateFeePaid: p.lateFeePaid,
            gstAmount: p.gstAmount,
        }));

        // Include installment slots detail
        base.installmentSlots = currentInstallment?.installments || [];
        base.feeStructureId = currentInstallment?.feeStructureId || null;
        base.planType = currentInstallment?.planType || null;
        base.grossAmount = currentInstallment?.grossAmount || 0;
        base.waiverAmount = currentInstallment?.waiverAmount || 0;
        base.parentAddress = parentDoc?.address || {};
        base.alternatePhone = parentDoc?.alternateContact || '';

        // Populate feeLines from active structure
        if (activeFS) {
            const populatedFS = await FeeStructure.findById(activeFS._id)
                .populate("feeLines.feeHeadId", "name isInstallmentable feeType")
                .lean();
            base.feeLines = (populatedFS?.feeLines || []).map(line => ({
                headName: line.feeHeadId?.name || line.headName || 'Unknown Head',
                amount: line.amount,
                dueDate: line.dueDate
            }));
        } else {
            base.feeLines = [];
        }

        res.status(200).json({ success: true, data: base });
    } catch (err) {
        console.error('[getStudentFeeProfile]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ════════════════════════════════════════════════════════════
// POST /api/accountant/fees/pay
// Body: { studentId, installmentId, installmentSlotId,
//         amount, mode, reference, remarks,
//         applyLateFee, includeGST, isAdvance, isPartial, academicYear }
// ════════════════════════════════════════════════════════════
export const processPayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const school = req.user.school;
        const collectedBy = req.user._id;

        const {
            studentId,          // Student._id
            installmentId,      // FeeInstallment._id
            installmentSlotId,  // slot _id inside FeeInstallment.installments
            amount,
            mode,
            reference,
            remarks,
            applyLateFee = false,
            includeGST = false,
            isAdvance = false,
            isPartial = false,
            academicYear,
        } = req.body;

        if (!studentId || !amount || amount <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'studentId and amount are required' });
        }

        if (mode !== 'cash' && mode !== 'Cash' && !reference) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Reference number required for non-cash payments' });
        }

        // Fetch student to get userId
        const student = await Student.findOne({ _id: studentId, school }).session(session).lean();
        if (!student) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const rawYear = academicYear || (() => {
            const now = new Date();
            const y = now.getFullYear();
            if (now.getMonth() >= 3) {
                return `${y}-${String(y + 1).slice(-2)}`;
            } else {
                return `${y - 1}-${String(y).slice(-2)}`;
            }
        })();
        const year = normalizeAcademicYear(rawYear);
        const yearQuery = getAcademicYearQuery(year);

        // Fetch fee installment
        const installment = await FeeInstallment.findOne({
            _id: installmentId || undefined,
            studentId: student.user,
            school,
            academicYear: yearQuery,
        }).session(session);

        if (!installment && !isAdvance) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Fee installment not found' });
        }

        // Late fee calculation
        const lateFeeSetting = await LateFeeSetting.findOne({ school, isActive: true }).lean();
        const lateFeeInfo = applyLateFee && installment
            ? calcLateFee(installment, lateFeeSetting)
            : { daysLate: 0, penalty: 0 };

        const baseAmount = parseFloat(amount);
        const lateFeePaid = applyLateFee ? (lateFeeInfo.penalty || 0) : 0;

        // GST
        let gstPercentage = 0;
        let gstAmount = 0;
        if (includeGST) {
            // Check fee structure for GST %
            const feeStructure = installment?.feeStructureId
                ? await FeeStructure.findById(installment.feeStructureId).lean()
                : null;
            gstPercentage = feeStructure?.gstPercent || 18;
            gstAmount = parseFloat(((baseAmount * gstPercentage) / 100).toFixed(2));
        }

        const totalCollected = baseAmount + lateFeePaid + gstAmount;
        const receiptNumber = generateReceiptNumber();

        // Determine target slot
        let targetSlotId = installmentSlotId;
        if (!targetSlotId && installment) {
            const slot = installment.installments.find((s) =>
                ['due', 'overdue', 'partially_paid', 'upcoming'].includes(s.status)
            );
            targetSlotId = slot ? String(slot._id) : null;
        }

        // Create FeePayment record
        const paymentMode = mode.toLowerCase().replace(' ', '_');
        const normalizedMode = ['cash','upi','net_banking','card','cheque','demand_draft','online_portal'].includes(paymentMode)
            ? paymentMode : 'cash';

        const [feePayment] = await FeePayment.create(
            [
                {
                    organization: req.user.organization || student.school,
                    school,
                    studentId: student.user,
                    feeInstallmentId: installment?._id || new mongoose.Types.ObjectId(),
                    installmentSlotId: targetSlotId
                        ? new mongoose.Types.ObjectId(targetSlotId)
                        : new mongoose.Types.ObjectId(),
                    academicYear: year,
                    amountPaid: baseAmount,
                    lateFeePaid,
                    totalCollected,
                    paymentMode: normalizedMode,
                    paymentStatus: 'success',
                    paymentGateway: 'none',
                    receiptNumber,
                    gstApplicable: includeGST,
                    gstPercentage,
                    gstAmount,
                    collectedBy,
                    paymentDate: new Date(),
                    remarks,
                    ...(reference && { gatewayPaymentId: reference }),
                    ...(normalizedMode === 'cheque' && { chequeNumber: reference }),
                },
            ],
            { session }
        );

        // Update FeeInstallment
        if (installment) {
            // Update the specific slot
            if (targetSlotId) {
                const slotIdx = installment.installments.findIndex(
                    (s) => String(s._id) === String(targetSlotId)
                );
                if (slotIdx !== -1) {
                    const slot = installment.installments[slotIdx];
                    slot.amountPaid = (slot.amountPaid || 0) + baseAmount;
                    slot.paymentRefs.push(feePayment._id);
                    slot.lateFeeCharged = (slot.lateFeeCharged || 0) + lateFeePaid;

                    if (slot.amountPaid >= slot.amountDue) {
                        slot.status = 'paid';
                        slot.paidOn = new Date();
                    } else {
                        slot.status = 'partially_paid';
                    }
                }
            }

            installment.totalPaid = (installment.totalPaid || 0) + baseAmount;
            installment.totalDue = Math.max(0, installment.netAmount - installment.totalPaid);

            if (isAdvance && installment.totalPaid > installment.netAmount) {
                installment.advanceBalance = installment.totalPaid - installment.netAmount;
            }

            if (installment.totalPaid >= installment.netAmount) {
                installment.status = 'completed';
            }

            installment.markModified('installments');
            await installment.save({ session });
        }

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Payment processed successfully',
            data: {
                receiptNumber,
                totalAmount: totalCollected,
                baseAmount,
                lateFeeAmount: lateFeePaid,
                gstAmount,
                mode: normalizedMode,
                reference,
                isAdvance,
                isPartial,
                paymentId: String(feePayment._id),
                paymentDate: feePayment.paymentDate,
                // Updated student fee summary
                updatedFee: installment
                    ? {
                          totalPaid: installment.totalPaid,
                          totalDue: installment.totalDue,
                          advanceBalance: installment.advanceBalance,
                          feeStatus:
                              installment.status === 'completed'
                                  ? 'paid'
                                  : installment.advanceBalance > 0
                                  ? 'advance'
                                  : 'pending',
                      }
                    : null,
            },
        });
    } catch (err) {
        await session.abortTransaction();
        console.error('[processPayment]', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        session.endSession();
    }
};

// ════════════════════════════════════════════════════════════
// GET /api/accountant/fees/payments/:studentId
// Payment history for a student
// ════════════════════════════════════════════════════════════
export const getPaymentHistory = async (req, res) => {
    try {
        const school = req.user.school;
        const { studentId } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const student = await Student.findOne({ _id: studentId, school }).lean();
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const payments = await FeePayment.find({ school, studentId: student.user })
            .sort({ paymentDate: -1 })
            .skip((Number(page) - 1) * Number(limit))
            .limit(Number(limit))
            .lean();

        const total = await FeePayment.countDocuments({ school, studentId: student.user });

        const formatted = payments.map((p) => ({
            date: p.paymentDate,
            amount: p.totalCollected,
            mode: p.paymentMode,
            receipt: p.receiptNumber,
            status: p.paymentStatus,
            lateFeePaid: p.lateFeePaid,
            gstAmount: p.gstAmount,
            remarks: p.remarks,
            reference: p.gatewayPaymentId || p.chequeNumber || '',
        }));

        res.status(200).json({
            success: true,
            data: formatted,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (err) {
        console.error('[getPaymentHistory]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ════════════════════════════════════════════════════════════
// GET /api/accountant/fees/late-fee-setting
// ════════════════════════════════════════════════════════════
export const getLateFeeSetting = async (req, res) => {
    try {
        const school = req.user.school;
        const setting = await LateFeeSetting.findOne({ school }).lean();
        res.status(200).json({ success: true, data: setting || null });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ════════════════════════════════════════════════════════════
// POST /api/accountant/fees/late-fee-setting
// Create or update late fee setting
// ════════════════════════════════════════════════════════════
export const saveLateFeeSetting = async (req, res) => {
    try {
        const school = req.user.school;
        const { dueDay, penaltyPerDay, gracePeriod, maxPenalty, isActive, applicableClasses } =
            req.body;

        const setting = await LateFeeSetting.findOneAndUpdate(
            { school },
            {
                organization: req.user.organization || school,
                school,
                dueDay: dueDay || 10,
                penaltyPerDay: penaltyPerDay || 50,
                gracePeriod: gracePeriod || 0,
                maxPenalty: maxPenalty || 0,
                isActive: isActive !== undefined ? isActive : true,
                applicableClasses: applicableClasses || [],
                updatedBy: req.user._id,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({
            success: true,
            message: 'Late fee settings saved',
            data: setting,
        });
    } catch (err) {
        console.error('[saveLateFeeSetting]', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ════════════════════════════════════════════════════════════
// GET /api/accountant/fees/summary
// Dashboard summary stats
// ════════════════════════════════════════════════════════════
export const getFeeSummary = async (req, res) => {
    try {
        const school = req.user.school;
        const { academicYear } = req.query;

        const rawYear = academicYear || (() => {
            const now = new Date();
            const y = now.getFullYear();
            if (now.getMonth() >= 3) {
                return `${y}-${String(y + 1).slice(-2)}`;
            } else {
                return `${y - 1}-${String(y).slice(-2)}`;
            }
        })();
        const year = normalizeAcademicYear(rawYear);
        const yearQuery = getAcademicYearQuery(year);

        const [installments, todayPayments, monthPayments] = await Promise.all([
            FeeInstallment.find({ school, academicYear: yearQuery }).lean(),
            FeePayment.aggregate([
                {
                    $match: {
                        school: new mongoose.Types.ObjectId(school),
                        paymentStatus: 'success',
                        paymentDate: {
                            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        },
                    },
                },
                { $group: { _id: null, total: { $sum: '$totalCollected' }, count: { $sum: 1 } } },
            ]),
            FeePayment.aggregate([
                {
                    $match: {
                        school: new mongoose.Types.ObjectId(school),
                        paymentStatus: 'success',
                        paymentDate: {
                            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                        },
                    },
                },
                { $group: { _id: null, total: { $sum: '$totalCollected' }, count: { $sum: 1 } } },
            ]),
        ]);

        const totalFee = installments.reduce((s, i) => s + i.netAmount, 0);
        const totalCollected = installments.reduce((s, i) => s + i.totalPaid, 0);
        const totalDue = installments.reduce((s, i) => s + i.totalDue, 0);

        res.status(200).json({
            success: true,
            data: {
                totalFee,
                totalCollected,
                totalDue,
                totalStudents: installments.length,
                paidCount: installments.filter((i) => i.status === 'completed').length,
                pendingCount: installments.filter((i) => i.status === 'active').length,
                todayCollection: todayPayments[0]?.total || 0,
                todayTransactions: todayPayments[0]?.count || 0,
                monthCollection: monthPayments[0]?.total || 0,
                monthTransactions: monthPayments[0]?.count || 0,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
