import mongoose from 'mongoose';
import AcademicYear from '../../models/principal/AcademicYear.model.js';
import Holiday from '../../models/principal/Holiday.model.js';
import Term from '../../models/principal/Term.model.js';
import PromotionRule from '../../models/principal/PromotionRule.model.js';
import ClassMapping from '../../models/principal/ClassMapping.model.js';
import PromotionHistory from '../../models/principal/PromotionHistory.model.js';
import User from '../../models/users/user.model.js';
import School from '../../models/school/School.js';

const getOrganizationId = (req) => req.user?.organizationId || req.user?.id;
// NEW HELPER: Reliably get school ID from token
const toSchoolId = (user) => user?.school?._id || user?.school;

// ==================== ACADEMIC YEAR CRUD ====================

export const getAcademicYears = async (req, res) => {
    try {
        // FIXED: Grab school ID from the token, not the frontend query
        const schoolIdRaw = toSchoolId(req.user);
        if (!schoolIdRaw) {
            return res.status(400).json({ success: false, message: 'Authentication Error: School ID missing' });
        }
        const school_id = new mongoose.Types.ObjectId(schoolIdRaw);

        const academicYears = await AcademicYear.find({ school: school_id })
            .sort({ startDate: -1 })
            .lean();

        const academicYearsWithDetails = await Promise.all(academicYears.map(async (year) => {
            const holidays = await Holiday.find({ academicYearId: year._id }).lean();
            const terms = await Term.find({ academicYearId: year._id }).lean();

            return {
                ...year,
                holidays: holidays.map(h => ({ date: h.date, name: h.name, type: h.type })),
                terms: terms.map(t => ({ id: t._id, name: t.name, startDate: t.startDate, endDate: t.endDate })),
            };
        }));

        const currentYear = academicYearsWithDetails.find(y => y.status === 'Active');
        let daysRemaining = 0;
        if (currentYear) {
            const today = new Date();
            const endDate = new Date(currentYear.endDate);
            daysRemaining = Math.max(0, Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)));
        }

        return res.status(200).json({
            success: true,
            data: {
                academicYears: academicYearsWithDetails,
                currentYear: currentYear || null,
                daysRemaining,
            },
        });
    } catch (error) {
        console.error('Error in getAcademicYears:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getAcademicYearById = async (req, res) => {
    try {
        const { id } = req.params;
        const academicYear = await AcademicYear.findById(id).lean();

        if (!academicYear) {
            return res.status(404).json({ success: false, message: 'Academic year not found' });
        }

        const holidays = await Holiday.find({ academicYearId: id }).lean();
        const terms = await Term.find({ academicYearId: id }).lean();

        return res.status(200).json({
            success: true,
            data: {
                ...academicYear,
                holidays: holidays.map(h => ({ date: h.date, name: h.name, type: h.type })),
                terms: terms.map(t => ({ id: t._id, name: t.name, startDate: t.startDate, endDate: t.endDate })),
            },
        });
    } catch (error) {
        console.error('Error in getAcademicYearById:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createAcademicYear = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // FIXED BUG: Use toSchoolId here, NOT getOrganizationId!
        const schoolIdRaw = toSchoolId(req.user);
        if (!schoolIdRaw) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Authentication Error: School ID missing' });
        }
        const school_id = new mongoose.Types.ObjectId(schoolIdRaw);

        const { name, startDate, endDate, workingDays, description, workingDaysConfig, holidays } = req.body;

        if (!name || !startDate || !endDate) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const existingYear = await AcademicYear.findOne({ school: school_id, name });
        if (existingYear) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Academic year already exists' });
        }

        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);
        let calculatedStatus = 'Upcoming';
        if (now >= start && now <= end) {
            calculatedStatus = 'Active';
            // Auto-lock other active years if this one is active
            await AcademicYear.updateMany({ school: school_id, status: 'Active' }, { status: 'Locked' }, { session });
        } else if (now > end) {
            calculatedStatus = 'Archived';
        }

        const academicYear = new AcademicYear({
            organization: getOrganizationId(req),
            school: school_id, // Now correctly assigning the School ID!
            name,
            startDate: start,
            endDate: end,
            status: calculatedStatus,
            workingDays: workingDays || 0,
            workingDaysConfig: workingDaysConfig || {
                Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: false, Sunday: false,
            },
            description: description || '',
            createdBy: req.user._id,
        });

        await academicYear.save({ session });

        if (holidays && holidays.length > 0) {
            const holidayDocs = holidays.map(h => ({
                organization: getOrganizationId(req),
                school: school_id,
                academicYearId: academicYear._id,
                name: h.name,
                date: new Date(h.date),
                type: h.type || 'National',
                createdBy: req.user._id,
            }));
            await Holiday.insertMany(holidayDocs, { session });
        }

        await session.commitTransaction();
        return res.status(201).json({ success: true, message: 'Created successfully', data: academicYear });
    } catch (error) {
        await session.abortTransaction();
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

export const updateAcademicYear = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const updates = req.body;
        
        delete updates.holidays;

        const existingYear = await AcademicYear.findById(id).session(session);
        if (!existingYear) {
            await session.abortTransaction();
            return res.status(404).json({ success: false, message: 'Academic year not found' });
        }

        const start = updates.startDate ? new Date(updates.startDate) : existingYear.startDate;
        const end = updates.endDate ? new Date(updates.endDate) : existingYear.endDate;
        const now = new Date();

        let newStatus = 'Upcoming';
        if (now >= start && now <= end) {
            newStatus = 'Active';
            
            await AcademicYear.updateMany(
                { school: existingYear.school, _id: { $ne: id }, status: 'Active' },
                { status: 'Locked' },
                { session }
            );
        } else if (now > end) {
            newStatus = 'Archived';
        }

        updates.status = newStatus;

        const updatedYear = await AcademicYear.findByIdAndUpdate(id, updates, { new: true, session });
        
        await session.commitTransaction();
        return res.status(200).json({ success: true, data: updatedYear });
    } catch (error) {
        await session.abortTransaction();
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

// NEW: Delete Academic Year
export const deleteAcademicYear = async (req, res) => {
    try {
        const { id } = req.params;
        await AcademicYear.findByIdAndDelete(id);
        // Also clean up related holidays
        await Holiday.deleteMany({ academicYearId: id });
        return res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};



/**
 * @desc    Update academic year status (Lock/Archive)
 * @route   PATCH /api/principal/settings/academic-years/:id/status
 * @access  Private (Principal)
 */
export const updateAcademicYearStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['Locked', 'Archived', 'Active'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Valid status is required' });
        }

        const academicYear = await AcademicYear.findById(id);

        if (!academicYear) {
            return res.status(404).json({ success: false, message: 'Academic year not found' });
        }

        // If activating a year, deactivate others
        if (status === 'Active') {
            await AcademicYear.updateMany(
                { school: academicYear.school, status: 'Active' },
                { status: 'Locked' }
            );
        }

        academicYear.status = status;
        await academicYear.save();

        return res.status(200).json({
            success: true,
            message: `Academic year ${status.toLowerCase()} successfully`,
            data: academicYear,
        });
    } catch (error) {
        console.error('Error in updateAcademicYearStatus:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Add holiday to academic year
 * @route   POST /api/principal/settings/academic-years/:id/holidays
 * @access  Private (Principal)
 */
export const addHoliday = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, date, type } = req.body;

        if (!name || !date) {
            return res.status(400).json({ success: false, message: 'Holiday name and date are required' });
        }

        const academicYear = await AcademicYear.findById(id);
        if (!academicYear) {
            return res.status(404).json({ success: false, message: 'Academic year not found' });
        }

        const holiday = new Holiday({
            organization: getOrganizationId(req),
            school: academicYear.school,
            academicYearId: id,
            name,
            date: new Date(date),
            type: type || 'National',
            createdBy: req.user._id,
        });

        await holiday.save();

        return res.status(201).json({
            success: true,
            message: 'Holiday added successfully',
            data: holiday,
        });
    } catch (error) {
        console.error('Error in addHoliday:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Remove holiday
 * @route   DELETE /api/principal/settings/holidays/:id
 * @access  Private (Principal)
 */
export const deleteHoliday = async (req, res) => {
    try {
        const { id } = req.params;

        const holiday = await Holiday.findByIdAndDelete(id);

        if (!holiday) {
            return res.status(404).json({ success: false, message: 'Holiday not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Holiday deleted successfully',
        });
    } catch (error) {
        console.error('Error in deleteHoliday:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Add term to academic year
 * @route   POST /api/principal/settings/academic-years/:id/terms
 * @access  Private (Principal)
 */
export const addTerm = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, startDate, endDate, description } = req.body;

        if (!name || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: 'Term name, start date, and end date are required' });
        }

        const academicYear = await AcademicYear.findById(id);
        if (!academicYear) {
            return res.status(404).json({ success: false, message: 'Academic year not found' });
        }

        const term = new Term({
            organization: getOrganizationId(req),
            school: academicYear.school,
            academicYearId: id,
            name,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            description: description || '',
            createdBy: req.user._id,
        });

        await term.save();

        return res.status(201).json({
            success: true,
            message: 'Term added successfully',
            data: term,
        });
    } catch (error) {
        console.error('Error in addTerm:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Delete term
 * @route   DELETE /api/principal/settings/terms/:id
 * @access  Private (Principal)
 */
export const deleteTerm = async (req, res) => {
    try {
        const { id } = req.params;

        const term = await Term.findByIdAndDelete(id);

        if (!term) {
            return res.status(404).json({ success: false, message: 'Term not found' });
        }

        return res.status(200).json({
            success: true,
            message: 'Term deleted successfully',
        });
    } catch (error) {
        console.error('Error in deleteTerm:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== PROMOTION SETTINGS ====================

export const getPromotionRules = async (req, res) => {
    try {
        const schoolIdRaw = toSchoolId(req.user);
        if (!schoolIdRaw) return res.status(400).json({ success: false, message: 'Authentication Error' });
        const school_id = new mongoose.Types.ObjectId(schoolIdRaw);

        let { academicYearId } = req.query;

        // Auto-detect the Active Year if the frontend doesn't specify one
        if (!academicYearId || academicYearId === 'undefined' || academicYearId === 'null') {
            const activeYear = await AcademicYear.findOne({ school: school_id, status: 'Active' });
            if (activeYear) {
                academicYearId = activeYear._id.toString();
            }
        }

        let rules = null;
        if (academicYearId) {
            rules = await PromotionRule.findOne({ school: school_id, academicYearId });
        }

        return res.status(200).json({
            success: true,
            data: rules || {
                minAttendance: 75,
                strictAttendance: false,
                minPassingMarks: 33,
                minSubjectsToPass: 5,
                allowGraceMarks: false,
                graceMarksLimit: 5,
                compartmentAllowed: true,
                maxCompartmentSubjects: 1,
                failIfAbsentInExam: false,
            },
        });
    } catch (error) {
        console.error('Error in getPromotionRules:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePromotionRules = async (req, res) => {
    try {
        const schoolIdRaw = toSchoolId(req.user);
        if (!schoolIdRaw) return res.status(400).json({ success: false, message: 'Authentication Error' });
        const school_id = new mongoose.Types.ObjectId(schoolIdRaw);

        let { academicYearId } = req.query;

        // Auto-detect the Active Year if the frontend doesn't specify one
        if (!academicYearId || academicYearId === 'undefined' || academicYearId === 'null') {
            const activeYear = await AcademicYear.findOne({ school: school_id, status: 'Active' });
            if (!activeYear) {
                return res.status(400).json({ success: false, message: 'Please activate an Academic Year before saving rules.' });
            }
            academicYearId = activeYear._id.toString();
        }

        const rulesData = req.body;
        const orgId = getOrganizationId(req);

        // FIXED: Added organization ID to the upsert payload so MongoDB doesn't crash!
        const rules = await PromotionRule.findOneAndUpdate(
            { school: school_id, academicYearId },
            { 
                ...rulesData, 
                organization: orgId, 
                updatedBy: req.user._id, 
                updatedAt: new Date() 
            },
            { upsert: true, new: true, runValidators: true }
        );

        return res.status(200).json({ success: true, message: 'Promotion rules saved successfully', data: rules });
    } catch (error) {
        console.error('Error in updatePromotionRules:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getClassMapping = async (req, res) => {
    try {
        const schoolIdRaw = toSchoolId(req.user);
        if (!schoolIdRaw) return res.status(400).json({ success: false, message: 'Authentication Error' });
        const school_id = new mongoose.Types.ObjectId(schoolIdRaw);

        const mappings = await ClassMapping.find({ school: school_id }).sort({ currentClass: 1 });

        if (mappings.length === 0) {
            const defaultMappings = [
                { currentClass: 'Class 1', promotesTo: 'Class 2', sectionMapping: '1A→2A, 1B→2B' },
                { currentClass: 'Class 2', promotesTo: 'Class 3', sectionMapping: '2A→3A, 2B→3B' },
                { currentClass: 'Class 3', promotesTo: 'Class 4', sectionMapping: '3A→4A, 3B→4B' },
                { currentClass: 'Class 4', promotesTo: 'Class 5', sectionMapping: '4A→5A, 4B→5B' },
                { currentClass: 'Class 5', promotesTo: 'Class 6', sectionMapping: '5A→6A, 5B→6B' },
                { currentClass: 'Class 6', promotesTo: 'Class 7', sectionMapping: '6A→7A, 6B→7B' },
                { currentClass: 'Class 7', promotesTo: 'Class 8', sectionMapping: '7A→8A, 7B→8B' },
                { currentClass: 'Class 8', promotesTo: 'Class 9', sectionMapping: '8A→9A, 8B→9B' },
                { currentClass: 'Class 9', promotesTo: 'Class 10', sectionMapping: '9A→10A, 9B→10B' },
                { currentClass: 'Class 10', promotesTo: 'Pass Out', sectionMapping: 'Alumni' },
            ];
            return res.status(200).json({ success: true, data: defaultMappings });
        }

        return res.status(200).json({ success: true, data: mappings });
    } catch (error) {
        console.error('Error in getClassMapping:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateClassMapping = async (req, res) => {
    try {
        const schoolIdRaw = toSchoolId(req.user);
        if (!schoolIdRaw) return res.status(400).json({ success: false, message: 'Authentication Error' });
        const school_id = new mongoose.Types.ObjectId(schoolIdRaw);

        const { mappings } = req.body;
        if (!mappings || !Array.isArray(mappings)) {
            return res.status(400).json({ success: false, message: 'Invalid request data' });
        }

        await ClassMapping.deleteMany({ school: school_id });

        const orgId = getOrganizationId(req);
        const newMappings = mappings.map(m => ({
            organization: orgId,
            school: school_id,
            ...m,
            createdBy: req.user._id,
        }));

        const insertedMappings = await ClassMapping.insertMany(newMappings);
        return res.status(200).json({ success: true, message: 'Class mapping updated successfully', data: insertedMappings });
    } catch (error) {
        console.error('Error in updateClassMapping:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const runPromotion = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const schoolIdRaw = toSchoolId(req.user);
        if (!schoolIdRaw) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Authentication Error' });
        }
        const school_id = new mongoose.Types.ObjectId(schoolIdRaw);

        const { fromAcademicYear, toAcademicYear, currentClass, section, overrides } = req.body;

        if (!fromAcademicYear || !toAcademicYear) {
            await session.abortTransaction();
            return res.status(400).json({ success: false, message: 'Missing required academic years' });
        }

        // Build search query exactly like the preview
        const query = { school: school_id, role: 'student' };
        if (currentClass) query.class = currentClass;
        if (section) query.section = section;

        const students = await User.find(query).lean();
        const totalStudents = students.length; 
        
        let promoted = 0, heldBack = 0, passOut = 0, compartment = 0;
        
        // Count the final tally based on the manual overrides from frontend
        Object.values(overrides).forEach(status => {
            if (status === 'Promote') promoted++;
            if (status === 'Hold') heldBack++;
            if (status === 'Pass Out') passOut++;
            if (status === 'Compartment') compartment++;
        });

        // If no overrides were set, calculate based on default system rules
        if (Object.keys(overrides).length === 0) {
            students.forEach(s => {
                const isPassOut = s.class?.includes('10') || s.class?.includes('12');
                if (isPassOut) passOut++;
                else promoted++;
            });
        }

        const promotionHistory = new PromotionHistory({
            organization: getOrganizationId(req),
            school: school_id,
            fromAcademicYear,
            toAcademicYear,
            dateRun: new Date(),
            runBy: req.user.name,
            runById: req.user._id,
            totalStudents,
            promoted,
            heldBack,
            passOut,
            compartment,
            status: 'Completed',
        });

        await promotionHistory.save({ session });
        await session.commitTransaction();

        return res.status(200).json({
            success: true,
            message: 'Promotion completed successfully',
            data: {
                totalStudents, promoted, heldBack, passOut, compartment, historyId: promotionHistory._id,
            },
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Error in runPromotion:', error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        session.endSession();
    }
};

export const getPromotionHistory = async (req, res) => {
    try {
        const schoolIdRaw = toSchoolId(req.user);
        if (!schoolIdRaw) return res.status(400).json({ success: false, message: 'Authentication Error' });
        const school_id = new mongoose.Types.ObjectId(schoolIdRaw);

        const history = await PromotionHistory.find({ school: school_id })
            .sort({ dateRun: -1 })
            .lean();

        return res.status(200).json({ success: true, data: history });
    } catch (error) {
        console.error('Error in getPromotionHistory:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getPromotionPreview = async (req, res) => {
    try {
        const authId = toSchoolId(req.user);
        if (!authId) return res.status(400).json({ success: false, message: 'Authentication Error' });
        
        const schoolObjId = new mongoose.Types.ObjectId(authId);
        const { currentClass, section, academicYearId } = req.query;

        const searchQuery = { school: schoolObjId, role: 'student' };
        if (currentClass) searchQuery.class = currentClass;
        if (section) searchQuery.section = section;

        const users = await User.find(searchQuery).select('name class section attendance').lean();

        if (users.length === 0) {
            return res.status(200).json({ success: true, data: [] });
        }

        let savedRules = await PromotionRule.findOne({ school: schoolObjId, academicYearId: academicYearId });
        if (!savedRules) {
            savedRules = { minAttendance: 75, strictAttendance: false };
        }

        const formattedData = users.map(user => {
            const currentAtt = user.attendance || 0;
            let calcResult = 'Pass';
            let calcStatus = 'Promote';

            if (savedRules.strictAttendance && currentAtt < savedRules.minAttendance) {
                calcResult = 'Fail';
                calcStatus = 'Hold';
            }

            if (calcStatus === 'Promote' && (user.class?.includes('10') || user.class?.includes('12'))) {
                calcStatus = 'Pass Out';
            }

            return {
                id: user._id,
                name: user.name,
                class: user.class || 'N/A',
                section: user.section || 'N/A',
                attendance: currentAtt,
                result: calcResult,
                status: calcStatus,
            };
        });

        return res.status(200).json({ success: true, data: formattedData });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};