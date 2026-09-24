import Timetable from "../../models/academic/timetable.model.js";
import TimetablePeriod from "../../models/academic/period.model.js";
import mongoose from "mongoose";
import Class from "../../models/organization/organizationClass.js";
import Subject from "../../models/modules/Subject.js";
import User from "../../models/users/user.model.js";
import School from "../../models/school/School.js";
import AcademicYear from "../../models/principal/AcademicYear.model.js";
import AcademicConfig from "../../models/organization/AcademicConfig.js";

const getObjectIdStr = (val) => {
    if (!val) return null;
    if (val._id) return val._id.toString();
    return val.toString();
};

/**
 * @desc    Create a new timetable
 * @route   POST /api/admin/timetable
 * @access  Private (Admin)
 */
const validateTimetableConflicts = async (schoolId, classId, section, academicYear, schedule, excludeTimetableId) => {
    const query = { school: schoolId, academicYear, isActive: true };
    if (excludeTimetableId) {
        query._id = { $ne: excludeTimetableId };
    }

    const timetables = await Timetable.find(query)
        .populate("class", "name")
        .populate("schedule.periods.subject", "subjectName")
        .populate("schedule.periods.teacher", "name");

    const toMin = (t) => {
        if (!t) return 0;
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    };
    const overlaps = (s1, e1, s2, e2) => toMin(s1) < toMin(e2) && toMin(e1) > toMin(s2);

    const targetClassId = getObjectIdStr(classId);

    for (const daySched of schedule) {
        if (!daySched.isWorkingDay) continue;
        for (const p of daySched.periods) {
            if (p.isBreak) continue;

            const teacher = p.subject ? getObjectIdStr(p.teacher) : null;
            const room = p.subject ? p.room : null;

            for (const tt of timetables) {
                const ttClassId = getObjectIdStr(tt.class);
                const className = tt.class?.name || "Unknown Class";

                for (const ds of tt.schedule) {
                    if (ds.day && ds.day.toLowerCase() === daySched.day.toLowerCase()) {
                        for (const op of ds.periods) {
                            if (op.isBreak) continue;
                            if (overlaps(p.startTime, p.endTime, op.startTime, op.endTime)) {
                                const opTeacherId = getObjectIdStr(op.teacher);
                                const opTeacherName = op.teacher?.name || "assigned teacher";

                                if (teacher && opTeacherId && opTeacherId === teacher) {
                                    return {
                                        conflict: true,
                                        message: `Teacher ${opTeacherName} is already scheduled in Class ${className} Section ${tt.section || ""} at this time (${p.startTime}-${p.endTime}).`
                                    };
                                }
                                if (room && op.room && String(op.room).trim().toLowerCase() === String(room).trim().toLowerCase()) {
                                    return {
                                        conflict: true,
                                        message: `Room ${room} is already booked for Class ${className} Section ${tt.section || ""} at this time (${p.startTime}-${p.endTime}).`
                                    };
                                }
                                if (targetClassId && section && ttClassId === targetClassId && tt.section === section) {
                                    return {
                                        conflict: true,
                                        message: `Class ${className} Section ${tt.section || ""} already has a period scheduled at this time (${p.startTime}-${p.endTime}).`
                                    };
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return { conflict: false };
};

export const createTimetable = async (req, res) => {
    try {
        const { 
            academicYear, class: classId, section, 
            effectiveFrom, effectiveTo, schedule, isActive
        } = req.body;

        const schoolId = req.user.school._id || req.user.school;
        const organizationId = req.user.school.organization || req.user.organization;

        // Parse dates safely
        let parsedEffectiveFrom = new Date();
        if (effectiveFrom) {
            const d = new Date(effectiveFrom);
            if (!isNaN(d.getTime())) {
                parsedEffectiveFrom = d;
            }
        }

        let parsedEffectiveTo = null;
        if (effectiveTo) {
            const d = new Date(effectiveTo);
            if (!isNaN(d.getTime())) {
                parsedEffectiveTo = d;
            }
        }

        // Log the payload before saving
        console.log("Saving/Publishing Timetable. Payload:", {
            academicYear,
            class: classId,
            section,
            effectiveFrom: parsedEffectiveFrom,
            effectiveTo: parsedEffectiveTo,
            isActive,
            schoolId,
            organizationId,
            createdBy: req.user._id,
            scheduleLength: schedule ? schedule.length : 0
        });

        // Deactivate old active timetable for the same class/section if we are publishing
        if (isActive === true) {
            if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
                return res.status(400).json({ success: false, message: "Cannot publish empty timetable." });
            }
            for (const daySched of schedule) {
                if (!daySched.isWorkingDay) continue;
                for (const p of daySched.periods) {
                    if (!p.isBreak && (!p.subject || !p.teacher)) {
                        return res.status(400).json({
                            success: false,
                            message: "Cannot publish incomplete timetable."
                        });
                    }
                }
            }

            // Check for conflicts
            const conflictCheck = await validateTimetableConflicts(schoolId, classId, section, academicYear, schedule, null);
            if (conflictCheck.conflict) {
                return res.status(409).json({
                    success: false,
                    message: conflictCheck.message
                });
            }

            await Timetable.updateMany(
                { school: schoolId, class: classId, section, academicYear, isActive: true },
                { isActive: false }
            );
        }

        const newTimetable = await Timetable.create({
            organization: organizationId,
            school: schoolId,
            academicYear,
            class: classId,
            section,
            effectiveFrom: parsedEffectiveFrom,
            effectiveTo: parsedEffectiveTo,
            schedule,
            isActive: isActive !== undefined ? isActive : true,
            isPublished: isActive === true,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            message: "Timetable created successfully",
            data: newTimetable
        });
    } catch (error) {
        console.error("Timetable creation failed. Error:", error);
        if (error.name === "ValidationError") {
            const firstField = Object.keys(error.errors)[0];
            return res.status(400).json({
                success: false,
                message: "Timetable validation failed",
                error: error.message,
                field: firstField
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get all timetables
 * @route   GET /api/admin/timetable
 * @access  Private (Admin)
 */
export const getTimetables = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { classId, section, academicYear, isActive } = req.query;

        const query = { school: schoolId };
        if (classId) query.class = classId;
        if (section) query.section = section;
        if (academicYear) query.academicYear = academicYear;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        const timetables = await Timetable.find(query)
            .populate("class", "name")
            .populate("schedule.periods.subject", "subjectName")
            .populate("schedule.periods.teacher", "name")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: timetables
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get timetable by ID
 * @route   GET /api/admin/timetable/:id
 * @access  Private (Admin)
 */
export const getTimetableById = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const timetable = await Timetable.findOne({ _id: req.params.id, school: schoolId })
            .populate("class", "name")
            .populate("schedule.periods.subject", "subjectName")
            .populate("schedule.periods.teacher", "name");

        if (!timetable) return res.status(404).json({ success: false, message: "Timetable not found" });

        res.status(200).json({
            success: true,
            data: timetable
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateTimetable = async (req, res) => {
    try {
        const { id } = req.params;
        const { class: classId, section, academicYear, isActive, effectiveFrom, effectiveTo } = req.body;

        if (isActive === true) {
            req.body.isPublished = true;
        }

        const schoolId = req.user.school._id || req.user.school;
        const existing = await Timetable.findOne({ _id: id, school: schoolId });
        if (!existing) {
            return res.status(404).json({ success: false, message: "Timetable not found" });
        }

        // Parse and validate Date fields if passed in request body
        if (effectiveFrom !== undefined) {
            let parsed = new Date();
            if (effectiveFrom) {
                const d = new Date(effectiveFrom);
                if (!isNaN(d.getTime())) {
                    parsed = d;
                }
            }
            req.body.effectiveFrom = parsed;
        }

        if (effectiveTo !== undefined) {
            let parsed = null;
            if (effectiveTo) {
                const d = new Date(effectiveTo);
                if (!isNaN(d.getTime())) {
                    parsed = d;
                }
            }
            req.body.effectiveTo = parsed;
        }

        // Log the payload before updating
        console.log("Updating Timetable. Payload:", {
            id,
            academicYear: academicYear || existing.academicYear,
            class: classId || existing.class,
            section: section || existing.section,
            effectiveFrom: req.body.effectiveFrom || existing.effectiveFrom,
            effectiveTo: req.body.effectiveTo || existing.effectiveTo,
            isActive
        });

        // If setting this timetable to active (published), deactivate other active timetables for the same class/section
        if (isActive === true) {
            const { schedule } = req.body;
            if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
                return res.status(400).json({ success: false, message: "Cannot publish empty timetable." });
            }
            for (const daySched of schedule) {
                if (!daySched.isWorkingDay) continue;
                for (const p of daySched.periods) {
                    if (!p.isBreak && (!p.subject || !p.teacher)) {
                        return res.status(400).json({
                            success: false,
                            message: "Cannot publish incomplete timetable."
                        });
                    }
                }
            }

            const targetClass = classId || existing?.class;
            const targetSection = section || existing?.section;
            const targetYear = academicYear || existing?.academicYear;

            // Check for conflicts
            const conflictCheck = await validateTimetableConflicts(schoolId, targetClass, targetSection, targetYear, schedule, id);
            if (conflictCheck.conflict) {
                return res.status(409).json({
                    success: false,
                    message: conflictCheck.message
                });
            }

            if (targetClass && targetSection && targetYear) {
                await Timetable.updateMany(
                    { 
                        _id: { $ne: id },
                        school: schoolId, 
                        class: targetClass, 
                        section: targetSection, 
                        academicYear: targetYear, 
                        isActive: true 
                    },
                    { isActive: false }
                );
            }
        }

        const updated = await Timetable.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) return res.status(404).json({ success: false, message: "Timetable not found" });
        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        console.error("Timetable update failed. Error:", error);
        if (error.name === "ValidationError") {
            const firstField = Object.keys(error.errors)[0];
            return res.status(400).json({
                success: false,
                message: "Timetable validation failed",
                error: error.message,
                field: firstField
            });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Delete a timetable
 * @route   DELETE /api/admin/timetable/:id
 * @access  Private (Admin)
 */
export const deleteTimetable = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.school._id || req.user.school;
        const deleted = await Timetable.findOneAndDelete({ _id: id, school: schoolId });
        if (!deleted) return res.status(404).json({ success: false, message: "Timetable not found" });
        res.status(200).json({ success: true, message: "Timetable deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get teacher's timetable
 * @route   GET /api/admin/timetable/teacher/:teacherId
 * @access  Private (Admin)
 */
export const getTeacherTimetable = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const schoolId = req.user.school._id || req.user.school;

        // Find all active timetables in the school that have this teacher, sorted by latest updated
        const timetables = await Timetable.find({ 
            school: schoolId, 
            isActive: true,
            "schedule.periods.teacher": teacherId 
        })
        .populate("class", "name")
        .populate("schedule.periods.subject", "subjectName")
        .sort({ updatedAt: -1 });

        const seen = new Set();
        const filteredTimetables = [];
        for (const tt of timetables) {
            const classIdStr = tt.class?._id ? tt.class._id.toString() : "";
            const sectionStr = (tt.section || "").trim().toLowerCase();
            const yearStr = (tt.academicYear || "").trim().toLowerCase();
            const key = `${classIdStr}_${sectionStr}_${yearStr}`;
            if (!seen.has(key)) {
                seen.add(key);
                filteredTimetables.push(tt);
            }
        }

        const timetableCandidates = timetables;
        const latestPublishedTimetable = filteredTimetables;


        // Filter out periods not belonging to this teacher for each timetable
        const teacherSchedule = latestPublishedTimetable.map(tt => {
            const filteredSchedule = tt.schedule.map(day => ({
                day: day.day,
                isWorkingDay: day.isWorkingDay,
                periods: day.periods.filter(p => p.teacher && (typeof p.teacher === "object" ? p.teacher._id.toString() : p.teacher.toString()) === teacherId)
            })).filter(day => day.periods.length > 0);

            return {
                class: tt.class,
                section: tt.section,
                schedule: filteredSchedule
            };
        });

        res.status(200).json({
            success: true,
            data: teacherSchedule
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTimetableAcademicYears = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const orgId = req.user.school.organization || req.user.organization;

        // 1. Fetch Academic Configuration from DB
        const config = await AcademicConfig.findOne({ organization: orgId }).lean();
        let dbActiveLabel = null;
        if (config?.academicYear?.isActive && config?.academicYear?.label) {
            dbActiveLabel = config.academicYear.label;
        }

        // 2. Fetch AcademicYear records from DB
        const dbYears = await AcademicYear.find({ school: schoolId }).lean();
        const activeDbYear = dbYears.find(y => y.status === 'Active');
        if (activeDbYear) {
            dbActiveLabel = activeDbYear.name;
        }

        // 3. Helper to match year labels (e.g. 2026-27 matches 2026-2027)
        const matchLabels = (l1, l2) => {
            if (!l1 || !l2) return false;
            const clean = (s) => s.replace(/[\u2013\u2014-]/g, "-").trim();
            const c1 = clean(l1);
            const c2 = clean(l2);
            if (c1 === c2) return true;

            const parts1 = c1.split("-");
            const parts2 = c2.split("-");
            if (parts1.length === 2 && parts2.length === 2) {
                const start1 = parts1[0];
                const start2 = parts2[0];
                if (start1 === start2) {
                    const end1 = parts1[1];
                    const end2 = parts2[1];
                    if (end1.slice(-2) === end2.slice(-2)) {
                        return true;
                    }
                }
            }
            return false;
        };

        // 4. Calculate default start year using April-March rule
        const today = new Date();
        const currentYearNum = today.getFullYear();
        const isBeforeApril = today.getMonth() < 3; // Jan, Feb, Mar are 0, 1, 2
        const calculatedStartYear = isBeforeApril ? currentYearNum - 1 : currentYearNum;

        let startYear = calculatedStartYear;

        // If DB has an active year that starts after our calculated year, shift starting year to include it
        if (dbActiveLabel) {
            const match = dbActiveLabel.match(/^(\d{4})/);
            if (match) {
                const dbStartYear = parseInt(match[1], 10);
                if (dbStartYear > startYear) {
                    startYear = dbStartYear;
                }
            }
        }

        const defaultActiveLabel = dbActiveLabel || `${calculatedStartYear}-${calculatedStartYear + 1}`;

        // 5. Generate list of 5 academic years: starting year + previous 4 years
        const years = [];
        for (let i = 0; i < 5; i++) {
            const sY = startYear - i;
            const eY = sY + 1;
            const standardLabel = `${sY}-${eY}`;

            let label = standardLabel;
            let isCurrent = false;
            let id = `generated-${sY}`;

            // Check if there is an existing database record matching this year
            const dbRecord = dbYears.find(y => matchLabels(y.name, standardLabel));
            if (dbRecord) {
                label = dbRecord.name;
                id = dbRecord._id;
                isCurrent = dbRecord.status === 'Active';
            }

            // Enforce defaultActiveLabel matching
            if (matchLabels(label, defaultActiveLabel)) {
                isCurrent = true;
            }

            years.push({
                id,
                label,
                isCurrent,
                isActive: true
            });
        }

        // Ensure the current active academic year is at the top of the array
        const currentIndex = years.findIndex(y => y.isCurrent);
        if (currentIndex > 0) {
            const currentItem = years.splice(currentIndex, 1)[0];
            years.unshift(currentItem);
        }

        res.status(200).json({
            success: true,
            data: years
        });
    } catch (error) {
        console.error("Error loading timetable academic years:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getPublishedTimetables = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;

        const timetables = await Timetable.find({
            school: schoolId,
            $or: [{ isPublished: true }, { isActive: true }]
        })
            .populate("class", "name")
            .populate("schedule.periods.subject", "subjectName")
            .populate("schedule.periods.teacher", "name")
            .populate("createdBy", "name")
            .sort({ updatedAt: -1 });

        const seen = new Set();
        const filteredTimetables = [];

        for (const tt of timetables) {
            const classIdStr = tt.class?._id ? tt.class._id.toString() : "";
            const sectionStr = (tt.section || "").trim().toLowerCase();
            const yearStr = (tt.academicYear || "").trim().toLowerCase();
            const key = `${classIdStr}_${sectionStr}_${yearStr}`;
            if (!seen.has(key)) {
                seen.add(key);
                filteredTimetables.push(tt);
            }
        }

        const timetableCandidates = timetables;
        const latestPublishedTimetable = filteredTimetables;

        console.log("Published timetable candidates:", timetableCandidates);
        console.log("Selected latest timetable:", latestPublishedTimetable);

        const data = latestPublishedTimetable.map(tt => {
            const totalPeriods = tt.schedule && tt.schedule[0] ? tt.schedule[0].periods.length : 0;
            let totalLectures = 0;
            if (tt.schedule) {
                for (const day of tt.schedule) {
                    if (!day.isWorkingDay) continue;
                    for (const p of day.periods) {
                        if (!p.isBreak && p.subject && p.teacher) {
                            totalLectures++;
                        }
                    }
                }
            }

            return {
                _id: tt._id,
                classId: tt.class?._id,
                className: tt.class?.name || "Unknown Class",
                sectionName: tt.section || "",
                academicYear: tt.academicYear,
                totalPeriods,
                totalLectures,
                status: tt.isActive ? "Active" : "Inactive",
                publishedAt: tt.updatedAt || tt.createdAt,
                publishedBy: tt.createdBy?.name || "System",
                isActive: tt.isActive,
                schedule: tt.schedule
            };
        });

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Error loading published timetables:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const toggleTimetableStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const schoolId = req.user.school._id || req.user.school;

        const timetable = await Timetable.findOne({ _id: id, school: schoolId });
        if (!timetable) {
            return res.status(404).json({ success: false, message: "Timetable not found" });
        }

        if (isActive === true) {
            // Activate: Deactivate all other active timetables for same class/section/year
            await Timetable.updateMany(
                {
                    _id: { $ne: id },
                    school: schoolId,
                    class: timetable.class,
                    section: timetable.section,
                    academicYear: timetable.academicYear,
                    isActive: true
                },
                { isActive: false }
            );
            timetable.isActive = true;
        } else {
            // Deactivate
            timetable.isActive = false;
        }

        await timetable.save();

        res.status(200).json({
            success: true,
            message: `Timetable successfully ${isActive ? "activated" : "deactivated"}.`,
            data: timetable
        });
    } catch (error) {
        console.error("Error toggling timetable status:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateTimetableAcademicYear = async (req, res) => {
    try {
        const { id } = req.params;
        const { academicYear } = req.body;

        if (!academicYear) {
            return res.status(400).json({ success: false, message: "Academic Year is required." });
        }

        const schoolId = req.user.school._id || req.user.school;

        const timetable = await Timetable.findOneAndUpdate(
            { _id: id, school: schoolId },
            { $set: { academicYear } },
            { new: true }
        );

        if (!timetable) {
            return res.status(404).json({ success: false, message: "Timetable not found." });
        }

        res.status(200).json({
            success: true,
            message: "Academic Year updated successfully.",
            data: timetable
        });
    } catch (error) {
        console.error("Failed to update timetable academic year:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── PERIOD CRUD ENDPOINTS ───────────────────────────────────────────────────

export const getPeriods = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const periods = await TimetablePeriod.find({ school: schoolId }).sort({ order: 1 });
        res.status(200).json({ success: true, data: periods });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createPeriod = async (req, res) => {
    try {
        const { name, startTime, endTime, isBreak, order } = req.body;
        const schoolId = req.user.school._id || req.user.school;
        const organizationId = req.user.school.organization || req.user.organization;

        const count = await TimetablePeriod.countDocuments({ school: schoolId });

        const period = await TimetablePeriod.create({
            organization: organizationId,
            school: schoolId,
            name,
            startTime,
            endTime,
            isBreak: !!isBreak,
            order: typeof order === 'number' ? order : count + 1
        });

        res.status(201).json({ success: true, data: period });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updatePeriod = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.school._id || req.user.school;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ success: false, message: "Period slot not found." });
        }

        const originalPeriod = await TimetablePeriod.findOne({ _id: id, school: schoolId });
        if (!originalPeriod) return res.status(404).json({ success: false, message: "Period slot not found." });

        const period = await TimetablePeriod.findOneAndUpdate({ _id: id, school: schoolId }, req.body, { new: true });

        // Propagate updates to all timetables matching the old timings
        const timetables = await Timetable.find({ school: schoolId });
        for (const t of timetables) {
            let changed = false;
            for (const day of t.schedule) {
                for (const p of day.periods) {
                    if (p.startTime === originalPeriod.startTime && p.endTime === originalPeriod.endTime) {
                        p.startTime = period.startTime;
                        p.endTime = period.endTime;
                        p.isBreak = period.isBreak;
                        if (period.isBreak) {
                            p.breakLabel = period.name;
                        }
                        changed = true;
                    }
                }
            }
            if (changed) {
                await t.save();
            }
        }

        res.status(200).json({ success: true, data: period });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deletePeriod = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.school._id || req.user.school;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ success: false, message: "Period slot not found." });
        }

        const period = await TimetablePeriod.findOneAndDelete({ _id: id, school: schoolId });
        if (!period) {
            return res.status(404).json({ success: false, message: "Slot already deleted." });
        }

        // Recalculate ordering after delete
        const remainingPeriods = await TimetablePeriod.find({ school: schoolId }).sort({ order: 1 });
        for (let i = 0; i < remainingPeriods.length; i++) {
            remainingPeriods[i].order = i + 1;
            if (!remainingPeriods[i].isBreak) {
                const precedingNonBreaks = remainingPeriods
                    .slice(0, i + 1)
                    .filter(p => !p.isBreak).length;
                remainingPeriods[i].name = `Period ${precedingNonBreaks}`;
            }
            await remainingPeriods[i].save();
        }

        // Update all timetables for this school by filtering out the deleted period slot
        const timetables = await Timetable.find({ school: schoolId });
        for (const t of timetables) {
            let changed = false;
            for (const day of t.schedule) {
                const initialLength = day.periods.length;
                day.periods = day.periods.filter(p => 
                    p.startTime !== period.startTime && 
                    p.endTime !== period.endTime &&
                    p.periodNumber !== period.order
                );
                if (day.periods.length !== initialLength) {
                    changed = true;
                    // Recalculate periodNumbers for remaining periods
                    day.periods.forEach((p, idx) => {
                        p.periodNumber = idx + 1;
                    });
                }
            }
            if (changed) {
                await t.save();
            }
        }

        res.status(200).json({ success: true, message: "Period deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const reorderPeriods = async (req, res) => {
    try {
        const { orders } = req.body; // array of { id, order }
        if (!Array.isArray(orders)) return res.status(400).json({ success: false, message: "Orders list is required" });

        const schoolId = req.user.school._id || req.user.school;
        await Promise.all(
            orders.map(o => TimetablePeriod.findOneAndUpdate({ _id: o.id, school: schoolId }, { order: o.order }))
        );

        res.status(200).json({ success: true, message: "Periods reordered successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GENERATE TEMPLATE DRAFT ───────────────────────────────────────────────

export const generateDraft = async (req, res) => {
    try {
        const { class: classId, section, academicYear } = req.query;
        const schoolId = req.user.school._id || req.user.school;

        // Fetch active periods
        const periods = await TimetablePeriod.find({ school: schoolId, isActive: true }).sort({ order: 1 });

        // Construct default schedule with empty slots
        const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const schedule = days.map(day => ({
            day,
            isWorkingDay: true,
            periods: periods.map(p => ({
                periodNumber: p.order || 0,
                startTime: p.startTime,
                endTime: p.endTime,
                subject: null,
                teacher: null,
                isBreak: p.isBreak,
                breakLabel: p.isBreak ? p.name : "",
                room: "",
                lectureType: "Normal"
            }))
        }));

        res.status(200).json({
            success: true,
            data: {
                academicYear,
                class: classId,
                section,
                schedule
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── COPY TIMETABLE ─────────────────────────────────────────────────────────

export const copyTimetable = async (req, res) => {
    try {
        const { fromClassId, fromSection, toClassId, toSection, academicYear } = req.body;
        const schoolId = req.user.school._id || req.user.school;
        const organizationId = req.user.school.organization || req.user.organization;

        const source = await Timetable.findOne({
            school: schoolId,
            class: fromClassId,
            section: fromSection,
            academicYear,
            isActive: true
        });

        if (!source) {
            return res.status(404).json({ success: false, message: "Source timetable not found" });
        }

        // Deactivate old active timetable for destination
        await Timetable.updateMany(
            { school: schoolId, class: toClassId, section: toSection, academicYear, isActive: true },
            { isActive: false }
        );

        const newTimetable = await Timetable.create({
            organization: organizationId,
            school: schoolId,
            academicYear,
            class: toClassId,
            section: toSection,
            effectiveFrom: new Date(),
            schedule: source.schedule,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            message: "Timetable copied successfully",
            data: newTimetable
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── CONFLICT CHECKER ───────────────────────────────────────────────────────

export const checkConflicts = async (req, res) => {
    try {
        const {
            day, startTime, endTime, teacher, room,
            class: classId, section, timetableId
        } = req.body;

        if (!day || !startTime || !endTime) {
            return res.status(400).json({
                success: false,
                message: "Validation failed: day, startTime, and endTime are required fields."
            });
        }

        const schoolId = req.user.school._id || req.user.school;

        // Find all active timetables for the school in the current academic year (except current one)
        const query = { school: schoolId, isActive: true };
        if (timetableId) {
            query._id = { $ne: timetableId };
        }

        const timetables = await Timetable.find(query)
            .populate("class", "name")
            .populate("schedule.periods.subject", "subjectName")
            .populate("schedule.periods.teacher", "name");

        const toMin = (t) => {
            if (!t) return 0;
            const [h, m] = t.split(":").map(Number);
            return h * 60 + m;
        };
        const overlaps = (s1, e1, s2, e2) => toMin(s1) < toMin(e2) && toMin(e1) > toMin(s2);

        let conflict = false;
        let message = "";

        const targetTeacherId = getObjectIdStr(teacher);
        const targetClassId = getObjectIdStr(classId);

        for (const tt of timetables) {
            const ttClassId = getObjectIdStr(tt.class);
            const className = tt.class?.name || "Unknown Class";

            for (const ds of tt.schedule) {
                if (ds.day && ds.day.toLowerCase() === day.toLowerCase()) {
                    for (const p of ds.periods) {
                        if (p.isBreak) continue;
                        if (overlaps(startTime, endTime, p.startTime, p.endTime)) {
                            const pTeacherId = getObjectIdStr(p.teacher);
                            const pTeacherName = p.teacher?.name || "assigned teacher";

                            // 1. Teacher conflict
                            if (targetTeacherId && pTeacherId && pTeacherId === targetTeacherId) {
                                conflict = true;
                                message = `Teacher ${pTeacherName} is already scheduled in Class ${className} Section ${tt.section || ""} at this time.`;
                                break;
                            }
                            // 2. Room conflict
                            if (room && p.room && String(p.room).trim().toLowerCase() === String(room).trim().toLowerCase()) {
                                conflict = true;
                                message = `Room ${room} is already booked for Class ${className} Section ${tt.section || ""} at this time.`;
                                break;
                            }
                            // 3. Class/Section conflict
                            if (targetClassId && section && ttClassId === targetClassId && tt.section === section) {
                                conflict = true;
                                message = `Class ${className} Section ${tt.section || ""} already has a period scheduled at this time.`;
                                break;
                            }
                        }
                    }
                }
                if (conflict) break;
            }
            if (conflict) break;
        }

        res.status(200).json({ success: true, conflict, message });
    } catch (error) {
        console.error("Conflict checking failed. Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Delete timetable draft template
 * @route   DELETE /api/admin/timetable/template
 * @access  Private (Admin)
 */
export const deleteDraftTemplate = async (req, res) => {
    try {
        const { class: classId, section, academicYear } = req.body || {};
        const cId = classId || req.query.classId || req.query.class;
        const sec = section || req.query.sectionId || req.query.section;
        const year = academicYear || req.query.academicYear;

        const schoolId = req.user.school._id || req.user.school;

        // Find the template
        const timetable = await Timetable.findOne({
            school: schoolId,
            class: cId,
            section: sec,
            academicYear: year
        });

        if (!timetable) {
            return res.status(200).json({ success: false, message: "Template already deleted" });
        }

        // Safety check: Never delete a published timetable
        if (timetable.isActive) {
            return res.status(400).json({
                success: false,
                message: "This timetable has already been published. Unpublish it before deleting."
            });
        }

        await Timetable.findOneAndDelete({ _id: timetable._id, school: schoolId });

        res.status(200).json({
            success: true,
            message: "Timetable template deleted successfully"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const duplicatePeriod = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.school._id || req.user.school;

        const selectedPeriod = await TimetablePeriod.findOne({ _id: id, school: schoolId });
        if (!selectedPeriod) {
            return res.status(404).json({ success: false, message: "Period not found" });
        }

        const periodsList = await TimetablePeriod.find({ school: schoolId }).sort({ order: 1 });

        const parseTimeToMinutes = (timeStr) => {
            const [hours, minutes] = timeStr.split(":").map(Number);
            return hours * 60 + minutes;
        };

        const formatMinutesToTime = (totalMinutes) => {
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
        };

        const startMin = parseTimeToMinutes(selectedPeriod.startTime);
        const endMin = parseTimeToMinutes(selectedPeriod.endTime);
        const duration = (endMin - startMin > 0) ? (endMin - startMin) : 60;

        const dupStartMin = endMin;
        const dupEndMin = dupStartMin + duration;

        if (dupEndMin > 1439) {
            return res.status(400).json({ success: false, message: "Cannot duplicate. Day timing exceeded." });
        }

        const idx = periodsList.findIndex(p => String(p._id) === String(id));

        const newPeriod = new TimetablePeriod({
            organization: selectedPeriod.organization,
            school: selectedPeriod.school,
            name: selectedPeriod.isBreak ? selectedPeriod.name : "Duplicate Period Temp",
            startTime: formatMinutesToTime(dupStartMin),
            endTime: formatMinutesToTime(dupEndMin),
            isBreak: selectedPeriod.isBreak,
            isActive: selectedPeriod.isActive,
            order: selectedPeriod.order + 1
        });

        periodsList.splice(idx + 1, 0, newPeriod);

        let nonBreakCount = 1;
        for (let i = 0; i < periodsList.length; i++) {
            const curr = periodsList[i];
            curr.order = i + 1;

            if (!curr.isBreak) {
                curr.name = `Period ${nonBreakCount}`;
                nonBreakCount++;
            }

            if (i > idx) {
                const prev = periodsList[i - 1];
                const prevEnd = parseTimeToMinutes(prev.endTime);
                const currStart = parseTimeToMinutes(curr.startTime);
                const currEnd = parseTimeToMinutes(curr.endTime);
                const currDuration = (currEnd - currStart > 0) ? (currEnd - currStart) : 60;

                if (currStart < prevEnd) {
                    const newStart = prevEnd;
                    const newEnd = newStart + currDuration;
                    if (newEnd > 1439) {
                        return res.status(400).json({ 
                            success: false, 
                            message: "Cannot duplicate. Day timing exceeded." 
                        });
                    }
                    curr.startTime = formatMinutesToTime(newStart);
                    curr.endTime = formatMinutesToTime(newEnd);
                }
            }
        }

        await newPeriod.save();
        for (const p of periodsList) {
            if (String(p._id) !== String(newPeriod._id)) {
                await p.save();
            }
        }

        res.status(201).json({
            success: true,
            message: "Period duplicated successfully",
            data: periodsList
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
