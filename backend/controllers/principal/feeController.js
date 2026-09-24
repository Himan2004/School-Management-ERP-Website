import mongoose from 'mongoose';
import FeeInstallment from '../../models/finance/FeeInstallment.model.js';
import FeePayment from '../../models/finance/FeePayment.model.js';
import FeeStructure from '../../models/finance/FeeStructure.model.js';
import FeeHead from '../../models/finance/FeeHead.model.js';
import WaiverPolicy from '../../models/finance/FeeWavier.model.js';
import User from '../../models/users/user.model.js';
import StudentProfile from '../../models/users/student.model.js';
import Class from '../../models/organization/organizationClass.js';
import School from '../../models/school/School.js';

// --- HELPER: Securely get School ID from Token ---
const getSecureSchoolId = (req) => {
    const realSchoolId = req.user?.school?._id || req.user?.school;
    if (!realSchoolId) {
        throw new Error("Unauthorized: School context missing from token");
    }
    return new mongoose.Types.ObjectId(realSchoolId);
};

// --- HELPER: Safely Map Frontend Fee Types to Database Enums ---
const mapFeeType = (frontendType) => {
    if (!frontendType) return 'monthly';
    const t = frontendType.toLowerCase();
    if (t === 'annually' || t === 'annual' || t === 'Annually') return 'annual';
    if (t === 'one time' || t === 'one-time' || t === 'one_time' || t === 'One Time') return 'one_time';
    if (t === 'quarterly') return 'quarterly';
    return 'monthly';
};

// Helper function to get current academic year
const getCurrentAcademicYear = () => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    return `${currentYear}-${nextYear}`;
};

// Helper function for ordinal suffix
function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}



// ==================== DUE REPORTS ====================

/**
 * GET /api/principal/fees/due
 * Get all students with pending dues
 */
export const getDueReports = async (req, res) => {
    try {
        const secureSchoolId = getSecureSchoolId(req);
        
        const { 
            search, 
            class: classFilter, 
            section, 
            dueRange, 
            amountRange,
            page = 1,
            limit = 50
        } = req.query;

        // Get all active fee installments with pending dues
        const query = {
            school: secureSchoolId,
            status: 'active',
            totalDue: { $gt: 0 }
        };

        const installments = await FeeInstallment.find(query)
            .populate({
                path: 'studentId',
                model: 'User',
                select: 'name email phone'
            })
            .populate('feeStructureId')
            .lean();

        // Fetch StudentProfiles for all students to get class and section
        const userIds = installments.map(inst => inst.studentId?._id || inst.studentId).filter(id => id);
        const studentProfiles = await StudentProfile.find({ user: { $in: userIds } })
            .populate('class', 'name')
            .populate('section', 'name')
            .populate('parent', 'fatherName')
            .lean();

        // Create a map of userId -> profile
        const profileMap = {};
        studentProfiles.forEach(profile => {
            if (profile.user) {
                profileMap[profile.user.toString()] = profile;
            }
        });

        // Filter and calculate due details
        let dueStudents = await Promise.all(installments.map(async (installment) => {
            const student = installment.studentId;
            if (!student) return null;

            const profile = profileMap[student._id.toString()];
            const className = profile?.class?.name || 'N/A';
            const sectionName = profile?.section?.name || 'N/A';
            const fatherName = profile?.parent?.fatherName || 'N/A';

            // Get the latest installment slot to calculate dues since
            const currentSlot = installment.installments?.find(slot => 
                slot.status === 'due' || slot.status === 'overdue'
            ) || installment.installments?.[installment.installments.length - 1];

            const duesSince = currentSlot?.dueDate 
                ? Math.ceil((new Date() - new Date(currentSlot.dueDate)) / (1000 * 60 * 60 * 24))
                : 0;

            return {
                id: student._id,
                name: student.name,
                class: className,
                section: sectionName,
                fatherName: fatherName,
                contact: student.phone || 'N/A',
                totalFee: installment.grossAmount,
                amountPaid: installment.totalPaid,
                due: installment.totalDue,
                duesSince: Math.max(0, duesSince),
                status: duesSince > 60 ? 'critical' : duesSince > 30 ? 'overdue' : 'due',
                installmentId: installment._id
            };
        }));

        // Remove null entries
        dueStudents = dueStudents.filter(s => s !== null);

        // Apply filters
        if (search) {
            dueStudents = dueStudents.filter(s => 
                s.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (classFilter) {
            dueStudents = dueStudents.filter(s => s.class === classFilter);
        }

        if (section) {
            dueStudents = dueStudents.filter(s => s.section === section);
        }

        if (dueRange) {
            if (dueRange === '0-30') {
                dueStudents = dueStudents.filter(s => s.duesSince <= 30);
            } else if (dueRange === '31-60') {
                dueStudents = dueStudents.filter(s => s.duesSince > 30 && s.duesSince <= 60);
            } else if (dueRange === '60+') {
                dueStudents = dueStudents.filter(s => s.duesSince > 60);
            }
        }

        if (amountRange) {
            if (amountRange === 'below-1000') {
                dueStudents = dueStudents.filter(s => s.due < 1000);
            } else if (amountRange === '1000-5000') {
                dueStudents = dueStudents.filter(s => s.due >= 1000 && s.due <= 5000);
            } else if (amountRange === '5000+') {
                dueStudents = dueStudents.filter(s => s.due > 5000);
            }
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedStudents = dueStudents.slice(skip, skip + parseInt(limit));

        // Calculate summary stats
        const totalDueAmount = dueStudents.reduce((sum, s) => sum + s.due, 0);
        const criticalDues = dueStudents.filter(s => s.duesSince > 60);
        const overdue30Plus = dueStudents.filter(s => s.duesSince > 30);
        const highestDue = dueStudents.length > 0 
            ? Math.max(...dueStudents.map(s => s.due)) 
            : 0;

        // Chart data - due by class
        const dueByClass = {};
        dueStudents.forEach(s => {
            if (!dueByClass[s.class]) {
                dueByClass[s.class] = 0;
            }
            dueByClass[s.class] += s.due;
        });

        const chartData = Object.entries(dueByClass).map(([className, amount]) => ({
            name: `Class ${className}`,
            due: amount
        }));

        return res.status(200).json({
            success: true,
            data: {
                students: paginatedStudents,
                summary: {
                    totalDueAmount,
                    studentsWithDues: dueStudents.length,
                    overdue30Plus: overdue30Plus.length,
                    highestDue
                },
                criticalDues: criticalDues.map(s => ({
                    id: s.id,
                    name: s.name,
                    due: s.due,
                    duesSince: s.duesSince,
                    fatherName: s.fatherName,
                    contact: s.contact
                })),
                chartData,
                pagination: {
                    total: dueStudents.length,
                    page: parseInt(page),
                    pages: Math.ceil(dueStudents.length / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error in getDueReports:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/principal/fees/send-reminder
 * Send reminder to parent for fee payment
 */
export const sendFeeReminder = async (req, res) => {
    try {
        const secureSchoolId = getSecureSchoolId(req);
        const { studentId, installmentId, amount, message } = req.body;

        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Get student details
        const student = await User.findById(studentId)
            .select('name phone fatherName email motherName')
            .lean();
        
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // TODO: Integrate with SMS/Email service
        // For now, just log the reminder
        console.log(`[Fee Reminder] Sent to ${student.fatherName || student.motherName || 'Parent'} (${student.phone}) for amount ₹${amount}`);
        console.log(`[Fee Reminder] Message: ${message || 'Default reminder message'}`);

        // You would typically call an SMS gateway API here
        // Example: await sendSMS(student.phone, `Dear ${student.fatherName}, fee of ₹${amount} is due...`);

        // Save reminder to database (optional)
        // You could create a Reminder model to track sent reminders

        return res.status(200).json({
            success: true,
            message: 'Reminder sent successfully',
            data: {
                sentTo: student.fatherName || student.motherName || 'Parent',
                contact: student.phone || student.email,
                amount: amount || 0,
                studentName: student.name
            }
        });

    } catch (error) {
        console.error('Error in sendFeeReminder:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/principal/fees/send-bulk-reminder
 * Send bulk reminders to all parents with critical dues
 */
export const sendBulkReminder = async (req, res) => {
    try {
        const secureSchoolId = getSecureSchoolId(req);
        const { dueThreshold = 30, message } = req.body;

        // Get all critical due students
        const installments = await FeeInstallment.find({
            school: secureSchoolId,
            status: 'active',
            totalDue: { $gt: 0 }
        }).populate({
            path: 'studentId',
            model: 'User',
            select: 'name phone fatherName motherName email'
        });

        const criticalStudents = [];
        
        for (const installment of installments) {
            const currentSlot = installment.installments?.find(slot => 
                slot.status === 'due' || slot.status === 'overdue'
            );
            
            if (currentSlot?.dueDate) {
                const duesSince = Math.ceil((new Date() - new Date(currentSlot.dueDate)) / (1000 * 60 * 60 * 24));
                
                if (duesSince >= dueThreshold) {
                    const student = installment.studentId;
                    if (student) {
                        criticalStudents.push({
                            student: student,
                            amount: installment.totalDue,
                            duesSince
                        });
                        
                        // TODO: Send actual SMS/Email
                        console.log(`[Bulk Reminder] To ${student.fatherName || student.motherName || 'Parent'} (${student.phone}) - Due: ₹${installment.totalDue}`);
                    }
                }
            }
        }

        return res.status(200).json({
            success: true,
            message: `Bulk reminders sent to ${criticalStudents.length} parents`,
            data: {
                totalSent: criticalStudents.length,
                students: criticalStudents.map(s => ({
                    id: s.student._id,
                    name: s.student.name,
                    fatherName: s.student.fatherName,
                    motherName: s.student.motherName,
                    amount: s.amount,
                    duesSince: s.duesSince
                }))
            }
        });

    } catch (error) {
        console.error('Error in sendBulkReminder:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== FEE COLLECTIONS ====================

/**
 * GET /api/principal/fees/statement/:studentId
 * Generate and return a full fee statement (all payments + summary) for download
 */
export const getStudentFeeStatement = async (req, res) => {
    try {
        const { studentId } = req.params;
        const secureSchoolId = getSecureSchoolId(req);

        const student = await User.findById(studentId).select('name email phone').lean();
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const payments = await FeePayment.find({
            school: secureSchoolId,
            studentId: new mongoose.Types.ObjectId(studentId),
            paymentStatus: 'success'
        }).sort({ paymentDate: -1 }).lean();

        const installment = await FeeInstallment.findOne({
            school: secureSchoolId,
            studentId: new mongoose.Types.ObjectId(studentId)
        }).lean();

        return res.status(200).json({
            success: true,
            data: {
                studentName: student.name,
                totalFee: installment?.netAmount || 0,
                totalPaid: installment?.totalPaid || 0,
                totalDue: installment?.totalDue || 0,
                payments: payments.map(p => ({
                    date: p.paymentDate,
                    amount: p.amountPaid,
                    mode: p.paymentMode,
                    receiptNumber: p.receiptNumber
                }))
            }
        });
    } catch (error) {
        console.error('Error in getStudentFeeStatement:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/principal/fees/collection
 * Get all students with fee collection details
 */
export const getFeeCollections = async (req, res) => {
    try {
        const secureSchoolId = getSecureSchoolId(req);
        const { search, class: classFilter, section, status, page = 1, limit = 50 } = req.query;

        // Get all fee installments for the school
        const query = {
            school: secureSchoolId
        };

        let installments = await FeeInstallment.find(query)
            .populate({
                path: 'studentId',
                model: 'User',
                select: 'name email phone'
            })
            .populate('feeStructureId')
            .lean();

        // Fetch StudentProfiles for all students to get class and section
        const userIds = installments.map(inst => inst.studentId?._id || inst.studentId).filter(id => id);
        const studentProfiles = await StudentProfile.find({ user: { $in: userIds } })
            .populate('class', 'name')
            .populate('section', 'name')
            .populate('parent', 'fatherName')
            .lean();

        // Create a map of userId -> profile
        const profileMap = {};
        studentProfiles.forEach(profile => {
            if (profile.user) {
                profileMap[profile.user.toString()] = profile;
            }
        });

        // Transform data
        let students = installments.map(installment => {
            const student = installment.studentId;
            if (!student) return null;

            const profile = profileMap[student._id.toString()];
            const className = profile?.class?.name || 'N/A';
            const sectionName = profile?.section?.name || 'N/A';
            const fatherName = profile?.parent?.fatherName || 'N/A';

            const balanceDue = installment.totalDue;
            let paymentStatus = 'Pending';
            
            if (installment.totalPaid >= installment.netAmount) {
                paymentStatus = 'Paid';
            } else if (installment.totalPaid > 0) {
                paymentStatus = 'Partial';
            }

            // Get last payment date
            const lastPaymentSlot = [...installment.installments]
                .reverse()
                .find(slot => slot.paidOn);
            
            const lastPaymentDate = lastPaymentSlot?.paidOn || null;

            return {
                id: student._id,
                admissionNo: profile?.enrollmentNo || `ADM${String(student._id).slice(-5)}`,
                name: student.name,
                class: className,
                section: sectionName,
                totalFee: installment.netAmount,
                amountPaid: installment.totalPaid,
                balanceDue,
                status: paymentStatus,
                lastPaymentDate: lastPaymentDate ? new Date(lastPaymentDate).toISOString().split('T')[0] : null,
                installmentId: installment._id,
                email: student.email,
                fatherName: fatherName,
                motherName: profile?.parent?.motherName || 'N/A'
            };
        });

        students = students.filter(s => s !== null);

        // Apply filters
        if (search) {
            students = students.filter(s => 
                (s.name && s.name.toLowerCase().includes(search.toLowerCase())) ||
                (s.admissionNo && s.admissionNo.toLowerCase().includes(search.toLowerCase()))
            );
        }

        if (classFilter) {
            students = students.filter(s => String(s.class) === String(classFilter));
        }

        if (section) {
            students = students.filter(s => String(s.section) === String(section));
        }

        if (status && status !== 'All') {
            students = students.filter(s => s.status === status);
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedStudents = students.slice(skip, skip + parseInt(limit));

        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const todayStart = new Date(today);
        const todayEnd = new Date(today);
        todayEnd.setDate(todayEnd.getDate() + 1);

        const todayCollections = await FeePayment.aggregate([
            {
                $match: {
                    school: secureSchoolId,
                    paymentDate: {
                        $gte: todayStart,
                        $lt: todayEnd
                    },
                    paymentStatus: 'success'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalCollected' }
                }
            }
        ]);

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

        const monthlyCollections = await FeePayment.aggregate([
            {
                $match: {
                    school: secureSchoolId,
                    paymentDate: { $gte: startOfMonth, $lte: endOfMonth },
                    paymentStatus: 'success'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalCollected' }
                }
            }
        ]);

        const totalPendingDues = students.reduce((sum, s) => sum + s.balanceDue, 0);
        const studentsWithDues = students.filter(s => s.balanceDue > 0).length;

        return res.status(200).json({
            success: true,
            data: {
                students: paginatedStudents,
                summary: {
                    totalCollectedToday: todayCollections[0]?.total || 0,
                    totalCollectedThisMonth: monthlyCollections[0]?.total || 0,
                    totalPendingDues,
                    studentsWithDues
                },
                pagination: {
                    total: students.length,
                    page: parseInt(page),
                    pages: Math.ceil(students.length / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error in getFeeCollections:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/principal/fees/collect
 * Collect fee payment from student
 */
export const collectFeePayment = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const secureSchoolId = getSecureSchoolId(req);
        const {
            studentId,
            installmentId,
            amountPaid,
            paymentMode,
            paymentDate,
            transactionId,
            remarks,
            collectedBy
        } = req.body;

        if (!studentId || !installmentId || !amountPaid || amountPaid <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Get the fee installment
        const installment = await FeeInstallment.findById(installmentId).session(session);
        
        if (!installment) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Fee installment not found' });
        }

        // Find the first pending installment slot
        let targetSlot = installment.installments.find(slot => 
            slot.status === 'due' || slot.status === 'upcoming' || slot.status === 'overdue'
        );

        if (!targetSlot) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'No pending installments found' });
        }

        // Calculate late fee if any
        let lateFeePaid = 0;
        const dueDate = new Date(targetSlot.dueDate);
        const paymentDateObj = new Date(paymentDate);

        if (paymentDateObj > dueDate) {
            const daysLate = Math.ceil((paymentDateObj - dueDate) / (1000 * 60 * 60 * 24));
            lateFeePaid = daysLate * 10; // Example: ₹10 per day late fee
        }

        // Calculate amount to allocate to this slot
        const remainingForSlot = targetSlot.amountDue - targetSlot.amountPaid;
        let amountAllocated = Math.min(amountPaid, remainingForSlot);
        let advanceAmount = amountPaid - amountAllocated;

        // Update the installment slot
        targetSlot.amountPaid += amountAllocated;
        targetSlot.paidOn = paymentDateObj;
        targetSlot.lateFeeCharged = lateFeePaid;
        
        if (targetSlot.amountPaid >= targetSlot.amountDue) {
            targetSlot.status = 'paid';
        } else if (targetSlot.amountPaid > 0) {
            targetSlot.status = 'partially_paid';
        }

        targetSlot.paymentRefs = targetSlot.paymentRefs || [];

        // Create payment record
        const receiptNumber = `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`;
        
        const payment = new FeePayment({
            organization: installment.organization,
            school: secureSchoolId,
            studentId: new mongoose.Types.ObjectId(studentId),
            feeInstallmentId: installment._id,
            installmentSlotId: targetSlot._id,
            academicYear: installment.academicYear,
            amountPaid: amountAllocated,
            lateFeePaid,
            advanceAdjusted: 0,
            totalCollected: amountAllocated + lateFeePaid,
            paymentMode,
            paymentStatus: 'success',
            paymentGateway: 'none',
            receiptNumber,
            collectedBy: collectedBy ? new mongoose.Types.ObjectId(collectedBy) : null,
            paymentDate: paymentDateObj,
            remarks: remarks || '',
            gstApplicable: false,
            gstPercentage: 0,
            gstAmount: 0
        });

        await payment.save({ session });
        targetSlot.paymentRefs.push(payment._id);

        // Update installment totals
        installment.totalPaid += amountAllocated;
        installment.totalDue = Math.max(0, installment.netAmount - installment.totalPaid);

        if (installment.totalPaid >= installment.netAmount) {
            installment.status = 'completed';
        }

        await installment.save({ session });

        // Handle advance payment for future installments
        if (advanceAmount > 0) {
            installment.advanceBalance += advanceAmount;
            
            let remainingAdvance = advanceAmount;
            for (const slot of installment.installments) {
                if (slot.status !== 'paid' && remainingAdvance > 0) {
                    const slotRemaining = slot.amountDue - slot.amountPaid;
                    const advanceToApply = Math.min(remainingAdvance, slotRemaining);
                    
                    slot.amountPaid += advanceToApply;
                    slot.advanceAdjusted = (slot.advanceAdjusted || 0) + advanceToApply;
                    remainingAdvance -= advanceToApply;
                    
                    if (slot.amountPaid >= slot.amountDue) {
                        slot.status = 'paid';
                    }
                    
                    installment.totalPaid += advanceToApply;
                    installment.advanceBalance -= advanceToApply;
                }
            }
            
            await installment.save({ session });
        }

        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: 'Payment collected successfully',
            data: {
                paymentId: payment._id,
                receiptNumber,
                amountCollected: amountAllocated + lateFeePaid,
                lateFeePaid,
                balanceDue: installment.totalDue,
                receiptUrl: `/api/principal/fees/receipt/${payment._id}`
            }
        });

    } catch (error) {
        await session.abortTransaction();
        console.error('Error in collectFeePayment:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

/**
 * GET /api/principal/fees/receipt/:paymentId
 * Get payment receipt
 */
export const getPaymentReceipt = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await FeePayment.findById(paymentId)
            .populate({
                path: 'studentId',
                model: 'User',
                select: 'name class section admissionNo'
            })
            .populate('feeInstallmentId')
            .lean();

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        const installment = payment.feeInstallmentId;
        
        const receiptData = {
            receiptNumber: payment.receiptNumber,
            receiptDate: payment.paymentDate,
            studentName: payment.studentId?.name || 'N/A',
            class: payment.studentId?.class || 'N/A',
            section: payment.studentId?.section || 'N/A',
            admissionNo: payment.studentId?.admissionNo || 'N/A',
            amount: payment.amountPaid,
            lateFee: payment.lateFeePaid,
            totalAmount: payment.totalCollected,
            paymentMode: payment.paymentMode,
            transactionId: payment.gatewayPaymentId || 'N/A',
            academicYear: payment.academicYear
        };

        return res.status(200).json({
            success: true,
            data: receiptData
        });

    } catch (error) {
        console.error('Error in getPaymentReceipt:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/principal/fees/payment-history/:studentId
 * Get payment history for a student
 */
export const getStudentPaymentHistory = async (req, res) => {
    try {
        const { studentId } = req.params;
        const secureSchoolId = getSecureSchoolId(req);

        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const payments = await FeePayment.find({
            school: secureSchoolId,
            studentId: new mongoose.Types.ObjectId(studentId),
            paymentStatus: 'success'
        })
        .sort({ paymentDate: -1 })
        .populate({
            path: 'collectedBy',
            model: 'User',
            select: 'name'
        })
        .lean();

        const installment = await FeeInstallment.findOne({
            school: secureSchoolId,
            studentId: new mongoose.Types.ObjectId(studentId),
            status: 'active'
        }).lean();

        const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);
        const totalDue = installment?.totalDue || 0;

        return res.status(200).json({
            success: true,
            data: {
                payments: payments.map(p => ({
                    id: p._id,
                    date: p.paymentDate,
                    amount: p.amountPaid,
                    lateFee: p.lateFeePaid,
                    mode: p.paymentMode,
                    receiptNumber: p.receiptNumber,
                    collectedBy: p.collectedBy?.name || 'System',
                    remarks: p.remarks || ''
                })),
                summary: {
                    totalPaid,
                    totalDue,
                    totalPayments: payments.length
                }
            }
        });

    } catch (error) {
        console.error('Error in getStudentPaymentHistory:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== TRANSACTIONS ====================

/**
 * GET /api/principal/fees/transactions
 * Get all fee transactions
 */
export const getTransactions = async (req, res) => {
    try {
        const secureSchoolId = getSecureSchoolId(req);
        const {
            search,
            mode,
            status,
            dateFrom,
            dateTo,
            class: classFilter,
            page = 1,
            limit = 50
        } = req.query;

        // Build query
        const query = {
            school: secureSchoolId,
            paymentStatus: { $ne: 'pending' }
        };

        if (dateFrom || dateTo) {
            query.paymentDate = {};
            if (dateFrom) query.paymentDate.$gte = new Date(dateFrom);
            if (dateTo) query.paymentDate.$lte = new Date(new Date(dateTo).setHours(23, 59, 59));
        }

        if (mode && mode !== 'All') {
            query.paymentMode = mode.toLowerCase();
        }

        if (status && status !== 'All') {
            query.paymentStatus = status.toLowerCase();
        }

        // Get payments with student details
        let payments = await FeePayment.find(query)
            .populate({
                path: 'studentId',
                model: 'User',
                select: 'name class section admissionNo'
            })
            .populate('feeInstallmentId')
            .sort({ paymentDate: -1 })
            .lean();

        // Transform and filter by class
        let transactions = payments.map(payment => {
            const student = payment.studentId;
            if (!student) return null;

            // Get fee head/category
            let category = 'Fee Payment';
            const installment = payment.feeInstallmentId;
            if (installment?.feeStructureId) {
                category = 'Tuition Fee';
            }

            return {
                id: payment._id,
                transactionId: payment.receiptNumber || payment.gatewayPaymentId || `TXN${payment._id.toString().slice(-8)}`,
                date: payment.paymentDate.toISOString().split('T')[0],
                time: payment.paymentDate.toLocaleTimeString(),
                studentName: student.name,
                class: student.class,
                section: student.section,
                category,
                amount: payment.amountPaid,
                mode: payment.paymentMode.charAt(0).toUpperCase() + payment.paymentMode.slice(1),
                status: payment.paymentStatus.charAt(0).toUpperCase() + payment.paymentStatus.slice(1),
                receipt: payment.receiptNumber
            };
        });

        transactions = transactions.filter(t => t !== null);

        // Apply filters
        if (search) {
            transactions = transactions.filter(t =>
                t.studentName.toLowerCase().includes(search.toLowerCase()) ||
                t.transactionId.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (classFilter) {
            transactions = transactions.filter(t => String(t.class) === String(classFilter));
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const paginatedTransactions = transactions.slice(skip, skip + parseInt(limit));

        // Calculate stats
        const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
        const onlinePayments = transactions.filter(t => 
            t.mode === 'Online' || t.mode === 'Upi'
        ).length;
        const cashPayments = transactions.filter(t => t.mode === 'Cash').length;

        return res.status(200).json({
            success: true,
            data: {
                transactions: paginatedTransactions,
                summary: {
                    totalTransactions: transactions.length,
                    totalAmount,
                    onlinePayments,
                    cashPayments
                },
                pagination: {
                    total: transactions.length,
                    page: parseInt(page),
                    pages: Math.ceil(transactions.length / parseInt(limit))
                }
            }
        });

    } catch (error) {
        console.error('Error in getTransactions:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== FEE STRUCTURE ====================

/**
 * GET /api/principal/fees/structure
 * Get all fee structures for the school
 */
export const getFeeStructures = async (req, res) => {
    try {
        const secureSchoolId = getSecureSchoolId(req);
        const { academicYear } = req.query;

        const currentYear = academicYear || getCurrentAcademicYear();

        const feeStructures = await FeeStructure.find({
            school: secureSchoolId,
            academicYear: currentYear
        })
        .populate('classId', 'name')
        .populate('feeLines.feeHeadId', 'name description feeType')
        .lean();

        const transformedStructures = feeStructures.map(structure => {
            const feeLines = structure.feeLines.map(line => ({
                name: line.feeHeadId?.name || 'Fee',
                type: line.feeHeadId?.feeType || 'annual',
                amount: line.amount,
                dueDate: line.dueDate ? new Date(line.dueDate).getDate() + getOrdinalSuffix(new Date(line.dueDate).getDate()) : '10th',
                description: line.feeHeadId?.description || ''
            }));

            // Format type correctly for frontend
            const rawType = feeLines[0]?.type || 'Annual';
            const formattedType = rawType.charAt(0).toUpperCase() + rawType.slice(1);

            return {
                id: structure._id,
                name: feeLines[0]?.name || 'Fee Structure',
                type: formattedType,
                classes: [structure.classId?.name || 'All Classes'],
                amount: structure.feeLines[0]?.amount || structure.totalAmount,
                dueDate: feeLines[0]?.dueDate || '10th',
                lateFee: structure.lateFee !== undefined ? structure.lateFee : 0,
                gst: structure.gst !== undefined ? structure.gst : false,
                gstPercent: structure.gstPercent !== undefined ? structure.gstPercent : 0,
                status: structure.isActive ? 'Active' : 'Inactive',
                description: feeLines[0]?.description || '',
                feeLines
            };
        });

        return res.status(200).json({
            success: true,
            data: transformedStructures
        });

    } catch (error) {
        console.error('Error in getFeeStructures:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/principal/fees/structure
 * Create new fee structure
 */
export const createFeeStructure = async (req, res) => {
    try {
        const secureSchoolId = getSecureSchoolId(req);
        
        let orgId = req.user?.organization || req.user?.school?.organization;
        if (!orgId) {
            const schoolDoc = await School.findById(secureSchoolId).lean();
            orgId = schoolDoc?.organization;
        }

        const {
            name, type, classes, amount, dueDate, lateFee, gst, gstPercent, description, status, academicYear
        } = req.body;

        if (!name || !amount || !classes || classes.length === 0) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const mappedType = mapFeeType(type);

        let feeHead = await FeeHead.findOne({ organization: orgId, name: name });

        if (!feeHead) {
            feeHead = new FeeHead({
                organization: orgId,
                name,
                description,
                feeType: mappedType,
                isActive: status === 'Active',
                createdBy: req.user?._id
            });
            await feeHead.save();
        }

        const feeLines = [{
            feeHeadId: feeHead._id,
            amount: parseFloat(amount),
            dueDate: dueDate ? new Date(new Date().getFullYear(), new Date().getMonth(), parseInt(dueDate)) : null,
            overrideReason: description
        }];

        // Smart Class Lookup & Auto-Create
        for (const className of classes) {
            let matchedClass = await Class.findOne({ organization: orgId, name: className });
            
            if (!matchedClass) {
                const classNum = className.replace(/class/i, '').trim();
                matchedClass = await Class.findOne({ organization: orgId, name: classNum });
            }

            if (!matchedClass) {
                const extractedNumber = parseInt(className.replace(/[^0-9]/g, '')) || 1;
                matchedClass = new Class({
                    organization: orgId,
                    name: className,
                    numericLevel: extractedNumber,
                    isActive: true
                });
                await matchedClass.save();
            }

            const feeStructure = new FeeStructure({
                organization: orgId,
                school: secureSchoolId,
                academicYear: academicYear || getCurrentAcademicYear(),
                classId: matchedClass._id,
                feeLines,
                lateFee: lateFee ? Number(lateFee) : 0,
                gst: Boolean(gst),
                gstPercent: gstPercent ? Number(gstPercent) : 0,
                isActive: status === 'Active',
                createdBy: req.user?._id
            });
            await feeStructure.save();
        }

        return res.status(201).json({
            success: true,
            message: 'Fee structure created successfully'
        });

    } catch (error) {
        console.error('Error in createFeeStructure:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/principal/fees/structure/:id
 * Update fee structure
 */
export const updateFeeStructure = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const secureSchoolId = getSecureSchoolId(req);

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'A valid fee structure ID is required' });
        }

        const feeStructure = await FeeStructure.findById(id).populate('feeLines.feeHeadId');
        
        if (!feeStructure) {
            return res.status(404).json({ success: false, message: 'Fee structure not found' });
        }

        if (updateData.amount !== undefined) {
            feeStructure.feeLines[0].amount = Number(updateData.amount);
            feeStructure.totalAmount = Number(updateData.amount);
        }

        if (updateData.dueDate) {
            const newDate = new Date(new Date().getFullYear(), new Date().getMonth(), parseInt(updateData.dueDate));
            feeStructure.feeLines[0].dueDate = newDate;
        }

        if (updateData.description !== undefined) {
            feeStructure.feeLines[0].overrideReason = updateData.description;
        }

        const feeHead = await FeeHead.findById(feeStructure.feeLines[0].feeHeadId?._id || feeStructure.feeLines[0].feeHeadId);
        if (feeHead) {
            if (updateData.name) feeHead.name = updateData.name;
            if (updateData.type) feeHead.feeType = mapFeeType(updateData.type);
            if (updateData.description !== undefined) feeHead.description = updateData.description;
            await feeHead.save();
        }

        // Update the Class if changed
        if (updateData.classes && updateData.classes.length > 0) {
            let className = updateData.classes[0];
            
            let orgId = req.user?.organization || req.user?.school?.organization;
            if (!orgId) {
                const schoolDoc = await School.findById(secureSchoolId).lean();
                orgId = schoolDoc?.organization;
            }

            let matchedClass = await Class.findOne({ organization: orgId, name: className });
            
            if (!matchedClass) {
                const classNum = className.replace(/class/i, '').trim();
                matchedClass = await Class.findOne({ organization: orgId, name: classNum });
            }

            if (!matchedClass) {
                const extractedNumber = parseInt(className.replace(/[^0-9]/g, '')) || 1;
                matchedClass = new Class({
                    organization: orgId,
                    name: className,
                    numericLevel: extractedNumber,
                    isActive: true
                });
                await matchedClass.save();
            }

            feeStructure.classId = matchedClass._id;
        }

        if (updateData.status) feeStructure.isActive = updateData.status === 'Active';
        if (updateData.lateFee !== undefined) feeStructure.lateFee = Number(updateData.lateFee);
        if (updateData.gst !== undefined) feeStructure.gst = Boolean(updateData.gst);
        if (updateData.gstPercent !== undefined) feeStructure.gstPercent = Number(updateData.gstPercent);
        
        feeStructure.lastModifiedBy = req.user?._id;
        await feeStructure.save();

        return res.status(200).json({
            success: true,
            message: 'Fee structure updated successfully',
            data: feeStructure
        });

    } catch (error) {
        console.error('Error in updateFeeStructure:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/principal/fees/structure/:id
 * Delete fee structure
 */
export const deleteFeeStructure = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'A valid fee structure ID is required' });
        }

        const feeStructure = await FeeStructure.findById(id);
        
        if (!feeStructure) {
            return res.status(404).json({ success: false, message: 'Fee structure not found' });
        }

        // Soft delete - set inactive
        feeStructure.isActive = false;
        await feeStructure.save();

        return res.status(200).json({
            success: true,
            message: 'Fee structure deleted successfully'
        });

    } catch (error) {
        console.error('Error in deleteFeeStructure:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== ROUTE EXPORTS ====================

export default {
    // Due Reports
    getDueReports,
    sendFeeReminder,
    sendBulkReminder,
    
    // Fee Collections
    getFeeCollections,
    collectFeePayment,
    getPaymentReceipt,
    getStudentPaymentHistory,
    
    // Transactions
    getTransactions,
    
    // Fee Structure
    getFeeStructures,
    createFeeStructure,
    updateFeeStructure,
    deleteFeeStructure
};