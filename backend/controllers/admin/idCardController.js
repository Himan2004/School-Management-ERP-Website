import Student from '../../models/users/student.model.js';
import IDCardRecord from '../../models/principal/IDCardRecord.model.js';
import User from '../../models/users/user.model.js';
import Teacher from '../../models/users/teacher.model.js';
import AccountantProfile from '../../models/users/accountant.model.js';
import StaffProfile from '../../models/users/staffProfile.model.js';
import mongoose from 'mongoose';
import Organization from '../../models/organization/Organization.js';
import School from '../../models/school/School.js';
import Principal from '../../models/users/principal.model.js';
import Admin from '../../models/users/admin.model.js';

/**
 * @desc    Get all students for ID card management with their ID card status
 * @route   GET /api/admin/id-cards/students
 * @access  Private (Admin)
 */
export const getStudentsForIDCard = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { classId, section, academicYear, status, search, page = 1, limit = 100 } = req.query;

        // Build student query - STRICTLY filtered by school and status active
        const query = { school: schoolId, status: 'active' };
        if (classId && classId !== 'all') query.class = classId;
        if (section && section !== 'all') query.section = section;
        if (academicYear && academicYear !== 'all') query.academicYear = academicYear;

        // Text search
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            const matchingUsers = await User.find({
                role: 'student',
                school: schoolId,
                name: searchRegex
            }).select('_id');
            const userIds = matchingUsers.map(u => u._id);
            query.$or = [
                { user: { $in: userIds } },
                { rollNo: searchRegex },
                { enrollmentNo: searchRegex }
            ];
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        // Fetch students for this school
        const students = await Student.find(query)
            .populate('user', 'name email photo loginId')
            .populate('class', 'name numericLevel')
            .populate('section', 'name sectionName')
            .populate('parent')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Fetch IDCardRecords for all these students
        const studentIds = students.map(s => s._id);
        const idCardRecords = await IDCardRecord.find({
            school: schoolId,
            entityId: { $in: studentIds },
            entityType: 'Student'
        }).lean();

        // Build a map for quick lookup
        const recordMap = new Map(idCardRecords.map(r => [String(r.entityId), r]));

        // Merge student data with ID card status
        const result = students.map(s => {
            const record = recordMap.get(String(s._id));
            const father = s.parent?.fatherName || s.parent?.fullName || s.parent?.name || s.fatherName || '-';
            const mother = s.parent?.motherName || s.motherName || '-';
            const contact = s.parent?.primaryContact || s.parent?.phone || s.parent?.mobile || s.parentContact || s.phone || '-';
            const sAddress = s.address || s.parent?.address || '-';
            const sDob = s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().split('T')[0] : (s.dob || '-');

            return {
                _id: s._id,
                name: s.user?.name || 'N/A',
                photo: s.photo || s.user?.photo || null,
                user: s.user || null,
                rollNo: s.rollNo || '-',
                enrollmentNo: s.enrollmentNo || '-',
                admissionNo: s.admissionNo || s.enrollmentNo || '-',
                class: s.class || null,
                className: s.class?.name || '-',
                section: s.section || null,
                sectionName: typeof s.section === 'string' ? s.section : (s.section?.name || s.section?.sectionName || s.sectionDetails?.name || '-'),
                academicYear: s.academicYear || '-',
                bloodGroup: s.bloodGroup || '-',
                gender: s.gender || '-',
                dob: sDob,
                fatherName: father,
                motherName: mother,
                parentContact: contact,
                address: sAddress,
                // ID Card fields
                idCardRecordId: record?._id || null,
                serialNumber: record?.serialNumber || `STU-${s._id.toString().substring(18).toUpperCase()}`,
                idCardStatus: (record?.status === 'Printed' || record?.status === 'Distributed' || record?.status === 'Active') ? 'Active' : 'Pending',
                generatedDate: record?.generationDate || null,
                lastPrintedDate: record?.printedDate || null,
                printCount: record?.history?.filter(h => h.status === 'Printed').length || 0,
                auditTrail: (record?.history || []).map(h => ({
                    date: h.date,
                    action: (h.status === 'Printed' || h.status === 'Distributed' || h.status === 'Active') ? 'Active' : 'Pending',
                    note: h.note || '',
                    user: 'Admin'
                }))
            };
        });

        // Apply status filter after join
        const filtered = status && status !== 'all'
            ? result.filter(s => s.idCardStatus === status)
            : result;

        const total = await Student.countDocuments(query);

        // Stats for the school - count only active students
        const allStudentIds = (await Student.find({ school: schoolId, status: 'active' }).select('_id').lean()).map(s => s._id);
        const allRecords = await IDCardRecord.find({
            school: schoolId,
            entityType: 'Student',
            entityId: { $in: allStudentIds }
        }).lean();

        const generatedCount = allRecords.filter(r => r.status === 'Printed' || r.status === 'Distributed' || r.status === 'Active').length;
        const printedCount = allRecords.filter(r => r.history?.some(h => h.status === 'Printed' || h.status === 'Active')).length;
        const pendingCount = allStudentIds.length - generatedCount;

        res.status(200).json({
            success: true,
            total,
            page: pageNum,
            pages: Math.ceil(total / limitNum),
            count: filtered.length,
            stats: {
                totalStudents: allStudentIds.length,
                cardsGenerated: generatedCount,
                pendingCards: pendingCount < 0 ? 0 : pendingCount,
                cardsPrinted: printedCount
            },
            data: filtered
        });
    } catch (error) {
        console.error('Admin ID Card fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Generate ID card for a student (creates or updates record)
 * @route   POST /api/admin/id-cards/generate
 * @access  Private (Admin)
 */
export const generateIDCard = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const organizationId = req.user.school.organization;
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ success: false, message: 'studentId is required' });
        }

        // Verify student belongs to this school
        const student = await Student.findOne({ _id: studentId, school: schoolId });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found or access denied' });
        }

        // Upsert ID card record
        const qrData = Buffer.from(`${schoolId}:${studentId}:${Date.now()}`).toString('base64');

        let record = await IDCardRecord.findOne({ entityId: studentId, school: schoolId, entityType: 'Student' });
        if (record) {
            record.status = 'Active';
            record.generationDate = new Date();
            if (!record.serialNumber) {
                record.serialNumber = `STU-${studentId.toString().substring(18).toUpperCase()}`;
            }
            record.history.push({ status: 'Active', updatedBy: req.user._id, note: 'Re-generated card', date: new Date() });
            await record.save();
            return res.status(200).json({ success: true, message: 'ID Card is already active', data: record });
        } else {
            record = await IDCardRecord.create({
                organization: organizationId,
                school: schoolId,
                entityType: 'Student',
                entityId: studentId,
                entityTypeModel: 'Student',
                serialNumber: `STU-${studentId.toString().substring(18).toUpperCase()}`,
                template: new mongoose.Types.ObjectId('000000000000000000000001'), // Placeholder template
                qrCodeData: qrData,
                status: 'Active',
                generationDate: new Date(),
                history: [{ status: 'Active', updatedBy: req.user._id, note: 'Generated by Admin', date: new Date() }]
            });
        }

        res.status(200).json({ success: true, message: 'ID Card generated successfully', data: record });
    } catch (error) {
        console.error('Admin generate ID card error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Mark ID card as printed
 * @route   PATCH /api/admin/id-cards/print
 * @access  Private (Admin)
 */
export const markAsPrinted = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ success: false, message: 'studentId is required' });
        }

        const record = await IDCardRecord.findOne({ entityId: studentId, school: schoolId, entityType: 'Student' });
        if (!record) {
            return res.status(404).json({ success: false, message: 'ID card record not found. Generate card first.' });
        }

        record.status = 'Printed';
        record.printedDate = new Date();
        record.history.push({ status: 'Printed', updatedBy: req.user._id, note: 'Printed by Admin', date: new Date() });
        await record.save();

        res.status(200).json({ success: true, message: 'ID Card marked as printed', data: record });
    } catch (error) {
        console.error('Admin mark printed error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Bulk print (mark multiple students' cards as printed)
 * @route   PATCH /api/admin/id-cards/bulk-print
 * @access  Private (Admin)
 */
export const bulkMarkPrinted = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { studentIds } = req.body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ success: false, message: 'studentIds array is required' });
        }

        const now = new Date();
        const result = await IDCardRecord.updateMany(
            {
                entityId: { $in: studentIds },
                school: schoolId,
                entityType: 'Student',
                status: { $in: ['Generated', 'Printed', 'Distributed'] }
            },
            {
                $set: { status: 'Printed', printedDate: now },
                $push: { history: { status: 'Printed', updatedBy: req.user._id, note: 'Bulk printed by Admin', date: now } }
            }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} ID cards marked as printed`,
            data: { modifiedCount: result.modifiedCount }
        });
    } catch (error) {
        console.error('Admin bulk print error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get all staff (teachers, accountants, support staff) for ID card management
 * @route   GET /api/admin/id-cards/staff
 * @access  Private (Admin)
 */
export const getStaffForIDCard = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { department, role, status, search } = req.query;

        // Query all staff users including teachers, accountants, support staff, principal, admin
        const query = { school: schoolId, role: { $in: ["teacher", "accountant", "support_staff", "principal", "admin"] } };
        if (role && role !== 'all') {
            query.role = role.toLowerCase() === 'administrator' ? 'admin' : role.toLowerCase();
        }
        if (status && status !== 'all') {
            query.status = status.toLowerCase();
        }
        if (search && search.trim()) {
            query.name = { $regex: search.trim(), $options: "i" };
        }

        const users = await User.find(query)
            .populate({
                path: "school",
                populate: {
                    path: "organization",
                    select: "organizationName organizationLogo"
                }
            })
            .populate("profileId");

        // Fetch IDCardRecords for all these users
        const userIds = users.map(u => u._id);
        const idCardRecords = await IDCardRecord.find({
            school: schoolId,
            entityId: { $in: userIds },
            entityType: { $in: ['Teacher', 'Staff'] }
        }).lean();

        // Build lookup map
        const recordMap = new Map(idCardRecords.map(r => [String(r.entityId), r]));

        // Format for frontend
        const result = users.map(u => {
            const record = recordMap.get(String(u._id));
            const profile = u.profileId || {};
            
            // Format address
            let fullAddress = '-';
            if (profile.address) {
                if (typeof profile.address === 'string') {
                    fullAddress = profile.address;
                } else {
                    fullAddress = `${profile.address.street || ''}, ${profile.address.city || ''}, ${profile.address.state || ''} ${profile.address.pincode || ''}`.replace(/^,\s*|,\s*$/g, '').trim() || '-';
                }
            } else if (u.address) {
                fullAddress = u.address;
            }

            // Map role key to capitalized role
            let displayRole = 'Staff';
            if (u.role === 'teacher') displayRole = 'Teacher';
            else if (u.role === 'accountant') displayRole = 'Accountant';
            else if (u.role === 'support_staff') displayRole = 'Support Staff';
            else if (u.role === 'principal') displayRole = 'Principal';
            else if (u.role === 'admin') displayRole = 'Administrator';

            // Designation and Department default mapping
            let designation = profile.designation || 'Staff';
            let departmentValue = profile.department || 'Operations';
            if (u.role === 'principal') {
                designation = 'Principal';
                departmentValue = 'Administration';
            } else if (u.role === 'admin') {
                designation = 'Administrator';
                departmentValue = 'Administration';
            } else if (u.role === 'accountant') {
                designation = 'Accountant';
                departmentValue = 'Finance';
            }

            const phone = profile.phone || profile.phoneNumber || u.phone || 'N/A';
            const joiningDateRaw = profile.joiningDate || profile.createdAt || u.createdAt || new Date();

            return {
                id: String(u._id),
                employeeId: u.loginId || 'N/A',
                name: u.name || 'N/A',
                photo: profile.photo || u.photo || null,
                schoolLogo: u.school?.settings?.school?.logoUrl || u.school?.logo || null,
                department: departmentValue,
                designation: designation,
                school: u.school?.schoolName || 'N/A',
                role: displayRole,
                email: u.email || 'N/A',
                phone: phone,
                joiningDate: new Date(joiningDateRaw).toISOString().split('T')[0],
                bloodGroup: profile.bloodGroup || '-',
                address: fullAddress,
                emergencyContact: profile.emergencyContact || '-',
                gender: profile.gender || 'Male',
                employmentType: profile.employmentType || 'Full-time',
                status: u.status === 'active' ? 'Active' : 'Inactive',
                cardStatus: record?.status || 'Pending',
                printCount: record?.history?.filter(h => h.status === 'Printed').length || 0,
                generatedDate: record?.generationDate || null,
                lastPrintedDate: record?.printedDate || null,
                auditTrail: (record?.history || []).map(h => ({
                    date: h.date,
                    action: h.status,
                    user: 'Admin',
                    note: h.note || ''
                }))
            };
        });

        // Apply department filter after populate if needed
        let filtered = result;
        if (department && department !== 'all') {
            filtered = result.filter(s => s.department === department);
        }

        // Ensure at most one Principal is returned per school
        let principalCount = 0;
        const finalResult = [];
        for (const item of filtered) {
            if (item.role === 'Principal') {
                if (principalCount === 0) {
                    finalResult.push(item);
                    principalCount++;
                }
            } else {
                finalResult.push(item);
            }
        }

        res.status(200).json({
            success: true,
            data: finalResult
        });
    } catch (error) {
        console.error('Admin Staff ID Card fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Generate ID card for a staff member (creates or updates record)
 * @route   POST /api/admin/id-cards/staff/generate
 * @access  Private (Admin)
 */
export const generateStaffIDCard = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const organizationId = req.user.school.organization;
        const { staffId } = req.body;

        if (!staffId) {
            return res.status(400).json({ success: false, message: 'staffId is required' });
        }

        // Verify staff belongs to this school
        const user = await User.findOne({ _id: staffId, school: schoolId });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Staff member not found or access denied' });
        }

        const entityType = user.role === 'teacher' ? 'Teacher' : 'Staff';
        
        // Match actual model name in db for entityTypeModel
        let entityTypeModel = 'StaffProfile';
        if (user.role === 'teacher') entityTypeModel = 'Teacher';
        else if (user.role === 'accountant') entityTypeModel = 'Accountant';
        else if (user.role === 'principal') entityTypeModel = 'Principal';
        else if (user.role === 'admin') entityTypeModel = 'Admin';

        const qrData = Buffer.from(`${schoolId}:${staffId}:${Date.now()}`).toString('base64');

        let record = await IDCardRecord.findOne({ entityId: staffId, school: schoolId, entityType });
        if (record) {
            record.status = 'Generated';
            record.generationDate = new Date();
            record.history.push({ status: 'Generated', updatedBy: req.user._id, note: 'Generated by Admin', date: new Date() });
            await record.save();
        } else {
            record = await IDCardRecord.create({
                organization: organizationId,
                school: schoolId,
                entityType,
                entityId: staffId,
                entityTypeModel,
                template: new mongoose.Types.ObjectId('000000000000000000000001'), // Placeholder template
                qrCodeData: qrData,
                status: 'Generated',
                generationDate: new Date(),
                history: [{ status: 'Generated', updatedBy: req.user._id, note: 'Generated by Admin', date: new Date() }]
            });
        }

        res.status(200).json({ success: true, message: 'Staff ID Card generated successfully', data: record });
    } catch (error) {
        console.error('Admin generate staff ID card error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Mark staff ID card as printed
 * @route   PATCH /api/admin/id-cards/staff/print
 * @access  Private (Admin)
 */
export const markStaffAsPrinted = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { staffId } = req.body;

        if (!staffId) {
            return res.status(400).json({ success: false, message: 'staffId is required' });
        }

        const user = await User.findOne({ _id: staffId, school: schoolId });
        if (!user) {
            return res.status(404).json({ success: false, message: 'Staff member not found' });
        }

        const entityType = user.role === 'teacher' ? 'Teacher' : 'Staff';

        const record = await IDCardRecord.findOne({ entityId: staffId, school: schoolId, entityType });
        if (!record) {
            return res.status(404).json({ success: false, message: 'ID card record not found. Generate card first.' });
        }

        record.status = 'Printed';
        record.printedDate = new Date();
        record.history.push({ status: 'Printed', updatedBy: req.user._id, note: 'Printed by Admin', date: new Date() });
        await record.save();

        res.status(200).json({ success: true, message: 'Staff ID Card marked as printed', data: record });
    } catch (error) {
        console.error('Admin mark staff printed error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Bulk print staff ID cards
 * @route   PATCH /api/admin/id-cards/staff/bulk-print
 * @access  Private (Admin)
 */
export const bulkMarkStaffPrinted = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { staffIds } = req.body;

        if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
            return res.status(400).json({ success: false, message: 'staffIds array is required' });
        }

        const now = new Date();
        const result = await IDCardRecord.updateMany(
            {
                entityId: { $in: staffIds },
                school: schoolId,
                entityType: { $in: ['Teacher', 'Staff'] },
                status: { $in: ['Generated', 'Printed', 'Distributed'] }
            },
            {
                $set: { status: 'Printed', printedDate: now },
                $push: { history: { status: 'Printed', updatedBy: req.user._id, note: 'Bulk printed by Admin', date: now } }
            }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} ID cards marked as printed`,
            data: { modifiedCount: result.modifiedCount }
        });
    } catch (error) {
        console.error('Admin bulk print staff error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Deactivate student ID card (changes status back to Pending)
 * @route   PATCH /api/admin/id-cards/deactivate
 * @access  Private (Admin)
 */
export const deactivateIDCard = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ success: false, message: 'studentId is required' });
        }

        const record = await IDCardRecord.findOne({ entityId: studentId, school: schoolId, entityType: 'Student' });
        if (!record) {
            return res.status(404).json({ success: false, message: 'ID Card record not found' });
        }

        // Change status back to Pending
        record.status = 'Pending';
        record.history.push({ status: 'Pending', updatedBy: req.user._id, note: 'Deactivated by Admin', date: new Date() });
        await record.save();

        res.status(200).json({ success: true, message: 'ID Card deactivated successfully', data: record });
    } catch (error) {
        console.error('Deactivate student ID card error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
