import mongoose from 'mongoose';
import FeeStructure from '../../models/finance/FeeStructure.model.js';
import FeeHead from '../../models/finance/FeeHead.model.js';
import ClassModel from '../../models/organization/organizationClass.js';
import { 
    syncAllStudentsFeeStructures, 
    normalizeAcademicYear, 
    getAcademicYearQuery, 
    normalizeClassDisplay 
} from '../../utils/autoAssignFeeStructure.js';

// ── shared populate spec ──────────────────────────────────────
const STRUCTURE_POPULATE = [
    { path: 'classId',            select: 'name numericLevel description isActive' },
    { path: 'feeLines.feeHeadId', select: 'name description feeType' },
];

// ── shared formatter ──────────────────────────────────────────
const formatStructure = (s) => {
    const derivedFeeType =
        (s.feeLines && s.feeLines.length > 0 && s.feeLines[0].feeType)
            ? s.feeLines[0].feeType
            : 'quarterly';

    const className = s.classId
        ? normalizeClassDisplay(s.classId.name)
        : 'All Classes';

    return {
        id          : String(s._id),
        className   : className,
        gradeLevel  : s.classId?.name  || '',
        section     : '',
        periodName  : '',
        periodId    : s.classId ? String(s.classId._id) : null,
        academicYear: s.academicYear,
        totalAmount : s.totalAmount || 0,
        isActive    : s.isActive,
        createdAt   : s.createdAt,
        feeType     : derivedFeeType,
        feeLines    : (s.feeLines || []).map((line) => ({
            id      : String(line._id),
            headName: line.feeHeadId?.name || line.headName || '',
            feeType : line.feeType || line.feeHeadId?.feeType || derivedFeeType,
            amount  : line.amount,
            dueDate : line.dueDate,
        })),
    };
};

// ─────────────────────────────────────────────────────────────
// GET /api/accountant/fee-structure
// Lists active AND inactive structures (so the toggle has both states
// to show), but NEVER lists permanently-deleted ones.
// ─────────────────────────────────────────────────────────────
export const getAccountantFeeStructures = async (req, res) => {
    try {
        const school = req.user.school;
        const { periodId, academicYear } = req.query;

        const query = { school, isDeleted: { $ne: true } };
        if (periodId && mongoose.Types.ObjectId.isValid(periodId)) {
            query.classId = new mongoose.Types.ObjectId(periodId);
        }
        if (academicYear) {
            query.academicYear = getAcademicYearQuery(academicYear);
        }

        const structures = await FeeStructure.find(query)
            .populate(STRUCTURE_POPULATE)
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            data   : structures.map(formatStructure),
        });
    } catch (error) {
        console.error('getAccountantFeeStructures:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/accountant/fee-structure
//
// Upsert filter now excludes isDeleted:true documents.
// Uses academicYear normalization.
// ─────────────────────────────────────────────────────────────
export const createAccountantFeeStructure = async (req, res) => {
    try {
        const school       = req.user.school;
        const organization = req.user.organization
            || req.user.school?.organization?._id
            || req.user.school?.organization;

        const { periodId, academicYear, feeLines, feeType, isActive } = req.body;

        if (!academicYear) {
            return res.status(400).json({ success: false, message: 'academicYear is required' });
        }
        if (!feeLines || feeLines.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one feeLine is required' });
        }
        if (!periodId || !mongoose.Types.ObjectId.isValid(periodId)) {
            return res.status(400).json({ success: false, message: 'A valid periodId (class) is required' });
        }

        const normalizedYear = normalizeAcademicYear(academicYear);
        const yearQuery = getAcademicYearQuery(normalizedYear);

        if (isActive !== false) {
            // Automatically deactivate any other active structure for this class and year
            await FeeStructure.updateMany(
                {
                    organization,
                    academicYear: yearQuery,
                    classId  : new mongoose.Types.ObjectId(periodId),
                    isActive : true,
                    isDeleted: { $ne: true }
                },
                {
                    $set: { isActive: false }
                }
            );
        }

        const processedFeeLines = [];
        for (const line of feeLines) {
            let feeHeadId = line.feeHeadId
                ? new mongoose.Types.ObjectId(line.feeHeadId)
                : null;

            if (!feeHeadId && line.headName) {
                let head = await FeeHead.findOne({ organization, name: line.headName });
                if (!head) {
                    head = await FeeHead.create({
                        organization,
                        name             : line.headName,
                        description      : line.description || '',
                        feeType          : line.feeType || feeType || 'quarterly',
                        isInstallmentable: true,
                        isActive         : true,
                        createdBy        : req.user._id,
                    });
                }
                feeHeadId = head._id;
            }

            processedFeeLines.push({
                feeHeadId,
                headName: line.headName || '',
                feeType : line.feeType  || feeType || 'quarterly',
                amount  : Number(line.amount) || 0,
                dueDate : line.dueDate ? new Date(line.dueDate) : null,
                overrideReason: line.overrideReason || null,
            });
        }

        const totalAmount = processedFeeLines.reduce((s, l) => s + l.amount, 0);

        const filter = {
            organization,
            academicYear: normalizedYear,
            classId  : new mongoose.Types.ObjectId(periodId),
            isDeleted: { $ne: true },
        };

        const feeStructure = await FeeStructure.findOneAndUpdate(
            filter,
            {
                $set: {
                    organization,
                    school,
                    feeLines      : processedFeeLines,
                    totalAmount,
                    isActive      : isActive !== undefined ? isActive : true,
                    isDeleted     : false,
                    lastModifiedBy: req.user._id,
                    updatedAt     : new Date(),
                },
                $setOnInsert: {
                    createdBy: req.user._id,
                    createdAt: new Date(),
                },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).populate(STRUCTURE_POPULATE);

        const plain = feeStructure.toObject ? feeStructure.toObject() : feeStructure;

        // Trigger background sync for students in this class/academic year
        syncAllStudentsFeeStructures(
            school,
            normalizedYear,
            organization,
            new mongoose.Types.ObjectId(periodId),
            req.user._id
        ).catch(err => console.error('[backgroundSync] Create Error:', err));

        return res.status(200).json({
            success: true,
            message: 'Fee structure saved successfully',
            data   : formatStructure(plain),
        });
    } catch (error) {
        console.error('createAccountantFeeStructure:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/accountant/fee-structure/:id
// ─────────────────────────────────────────────────────────────
export const updateAccountantFeeStructure = async (req, res) => {
    try {
        const school = req.user.school;
        const { id }  = req.params;
        const { feeLines, academicYear, feeType, isActive, periodId } = req.body;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'A valid fee structure ID is required' });
        }
        if (periodId && !mongoose.Types.ObjectId.isValid(periodId)) {
            return res.status(400).json({ success: false, message: 'A valid class/period ID is required' });
        }

        const existing = await FeeStructure.findOne({ _id: id, school, isDeleted: { $ne: true } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Fee structure not found' });
        }

        const newClassId      = periodId     ? new mongoose.Types.ObjectId(periodId)     : existing.classId;
        const normalizedYear = academicYear ? normalizeAcademicYear(academicYear) : normalizeAcademicYear(existing.academicYear);
        const yearQuery = getAcademicYearQuery(normalizedYear);

        if (isActive === true || (isActive !== false && existing.isActive)) {
            // Automatically deactivate any other active structure for this class and year
            await FeeStructure.updateMany(
                {
                    organization: existing.organization,
                    classId     : newClassId,
                    academicYear: yearQuery,
                    isActive    : true,
                    isDeleted   : { $ne: true },
                    _id         : { $ne: new mongoose.Types.ObjectId(id) }
                },
                {
                    $set: { isActive: false }
                }
            );
        }

        const updates = {
            lastModifiedBy: req.user._id,
            updatedAt     : new Date(),
        };

        if (academicYear) updates.academicYear = normalizedYear;
        if (isActive !== undefined) updates.isActive = isActive;
        if (periodId) updates.classId = newClassId;

        if (feeLines && feeLines.length > 0) {
            const processedLines = [];
            for (const line of feeLines) {
                let feeHeadId = line.feeHeadId
                    ? new mongoose.Types.ObjectId(line.feeHeadId)
                    : null;

                if (!feeHeadId && line.headName) {
                    let head = await FeeHead.findOne({ organization: existing.organization, name: line.headName });
                    if (!head) {
                        head = await FeeHead.create({
                            organization: existing.organization,
                            name             : line.headName,
                            description      : line.description || '',
                            feeType          : line.feeType || feeType || 'quarterly',
                            isInstallmentable: true,
                            isActive         : true,
                            createdBy        : req.user._id,
                        });
                    }
                    feeHeadId = head._id;
                }

                processedLines.push({
                    feeHeadId,
                    headName: line.headName || '',
                    feeType : line.feeType  || feeType || 'quarterly',
                    amount  : Number(line.amount) || 0,
                    dueDate : line.dueDate ? new Date(line.dueDate) : null,
                    overrideReason: line.overrideReason || null,
                });
            }
            updates.feeLines    = processedLines;
            updates.totalAmount = processedLines.reduce((s, l) => s + l.amount, 0);
        }

        const updated = await FeeStructure.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        ).populate(STRUCTURE_POPULATE).lean();

        // Trigger background sync for students in this class/academic year
        syncAllStudentsFeeStructures(
            school,
            normalizedYear,
            existing.organization,
            newClassId,
            req.user._id
        ).catch(err => console.error('[backgroundSync] Update Error:', err));

        return res.status(200).json({
            success: true,
            message: 'Fee structure updated successfully',
            data   : formatStructure(updated),
        });
    } catch (error) {
        console.error('updateAccountantFeeStructure:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/accountant/fee-structure/:id/toggle
// Activate/deactivate — this is the ONLY action that flips isActive.
// Does not touch isDeleted, so toggled-off structures still show in
// the list as "Inactive" and can be turned back on.
// ─────────────────────────────────────────────────────────────
export const toggleAccountantFeeStructureStatus = async (req, res) => {
    try {
        const school = req.user.school;
        const { id } = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'A valid fee structure ID is required' });
        }

        const existing = await FeeStructure.findOne({ _id: id, school, isDeleted: { $ne: true } });
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Fee structure not found' });
        }

        const nextStatus = !existing.isActive;

        const normalizedYear = normalizeAcademicYear(existing.academicYear);
        const yearQuery = getAcademicYearQuery(normalizedYear);

        if (nextStatus) {
            // Automatically deactivate any other active structure for this class and year
            await FeeStructure.updateMany(
                {
                    organization: existing.organization,
                    classId     : existing.classId,
                    academicYear: yearQuery,
                    isActive    : true,
                    isDeleted   : { $ne: true },
                    _id         : { $ne: existing._id }
                },
                {
                    $set: { isActive: false }
                }
            );
        }

        existing.isActive = nextStatus;
        existing.lastModifiedBy = req.user._id;
        await existing.save();

        // Trigger background sync for students in this class/academic year
        syncAllStudentsFeeStructures(
            school,
            normalizedYear,
            existing.organization,
            existing.classId,
            req.user._id
        ).catch(err => console.error('[backgroundSync] Toggle Error:', err));

        const populated = await FeeStructure.findById(existing._id)
            .populate(STRUCTURE_POPULATE)
            .lean();

        return res.status(200).json({
            success: true,
            message: nextStatus ? 'Fee structure activated' : 'Fee structure deactivated',
            data: formatStructure(populated),
        });
    } catch (error) {
        console.error('toggleAccountantFeeStructureStatus:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/accountant/fee-structure/:id
//
// REAL permanent delete from the UI's perspective: sets isDeleted:true
// (and isActive:false). getAccountantFeeStructures filters isDeleted:
// false, so this document will never appear again after reload — that
// was the actual bug (delete and deactivate were sharing one flag).
// We keep the document in Mongo (not a hard .deleteOne) so payment
// history tied to it via past receipts/installments doesn't dangle —
// only flag it as gone for every querying purpose.
// ─────────────────────────────────────────────────────────────
export const deleteAccountantFeeStructure = async (req, res) => {
    try {
        const school = req.user.school;
        const { id }  = req.params;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'A valid fee structure ID is required' });
        }

        const fs = await FeeStructure.findOneAndUpdate(
            { _id: id, school, isDeleted: { $ne: true } },
            {
                isDeleted : true,
                isActive  : false,
                deletedAt : new Date(),
                lastModifiedBy: req.user._id,
            },
            { new: true }
        );

        if (!fs) {
            return res.status(404).json({ success: false, message: 'Fee structure not found' });
        }

        // Trigger background sync for students in this class/academic year (since deleting structure clears it)
        const normalizedYear = normalizeAcademicYear(fs.academicYear);
        syncAllStudentsFeeStructures(
            school,
            normalizedYear,
            fs.organization,
            fs.classId,
            req.user._id
        ).catch(err => console.error('[backgroundSync] Delete Error:', err));

        return res.status(200).json({ success: true, message: 'Fee structure removed' });
    } catch (error) {
        console.error('deleteAccountantFeeStructure:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
