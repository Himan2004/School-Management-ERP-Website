import mongoose from 'mongoose';
import Teacher from '../../models/users/teacher.model.js';
import StudentAttendance from '../../models/academic/attendance.model.js';
import Student from '../../models/users/student.model.js';
import Classes from '../../models/organization/organizationClass.js';
import SubjectAssignment from '../../models/principal/SubjectAssignment.model.js';
import StaffAttendance from '../../models/HRM/Staffattendance.model.js';
import StaffLeave from '../../models/HRM/Staffleave.model.js';
import Section from '../../models/school/Section.model.js';
import Subject from '../../models/modules/Subject.js';

export const getSubjectWiseAttendance = async (req, res) => {
    try {
        const teacherUserId = req.user._id;
        const schoolId = req.user.school;
        const { class: selectedClass, section: selectedSection, date: queryDate } = req.query;
        
        // Target date for attendance
        const targetDate = queryDate ? new Date(queryDate) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const endOfTargetDate = new Date(targetDate);
        endOfTargetDate.setHours(23, 59, 59, 999);

        const assignments = await SubjectAssignment.find({ 
            teacherUser: teacherUserId, 
            school: schoolId 
        }).populate('class subject');

        if (!assignments || assignments.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    students: [],
                    stats: { present: 0, absent: 0, late: 0, total: 0, percentage: 0 },
                    classes: [],
                    sections: [],
                    subjects: [],
                    lowAttendanceAlerts: []
                }
            });
        }

        let classOptionsSet = new Set();
        let sectionOptionsSet = new Set();
        let subjectOptionsSet = new Set();
        
        let targetClassIds = [];
        let targetSectionStrings = [];

        let assignmentsList = [];
        assignments.forEach(a => {
            if (a.class && a.class.name) classOptionsSet.add(a.class.name);
            if (a.section) sectionOptionsSet.add(a.section);
            if (a.subject && a.subject.subjectName) subjectOptionsSet.add(a.subject.subjectName);
            
            assignmentsList.push({
                className: a.class?.name || '',
                section: a.section || '',
                subjectName: a.subject?.subjectName || ''
            });
        });

        // Filter assignments based on query params to find target students
        const matchingAssignments = assignments.filter(a => {
            if (selectedClass && selectedClass !== 'All Classes' && a.class?.name !== selectedClass) return false;
            if (selectedSection && selectedSection !== 'All Sections' && a.section !== selectedSection) return false;
            if (req.query.subject && req.query.subject !== 'All Subjects' && a.subject?.subjectName !== req.query.subject) return false;
            return true;
        });

        if (matchingAssignments.length > 0) {
            targetClassIds = [...new Set(matchingAssignments.map(a => a.class?._id).filter(Boolean))];
            targetSectionStrings = [...new Set(matchingAssignments.map(a => a.section).filter(Boolean))];
        }

        // We must map the string section names from SubjectAssignment to ObjectId references for Student query
        // Use classId in Section model to get precise section per class
        let targetSectionIds = [];
        if (matchingAssignments.length > 0) {
            for (const assignment of matchingAssignments) {
                if (!assignment.class?._id || !assignment.section) continue;
                const section = await Section.findOne({ 
                    school: schoolId, 
                    classId: assignment.class._id, 
                    name: assignment.section 
                });
                if (section) {
                    targetSectionIds.push(section._id);
                }
            }
            // Deduplicate
            targetSectionIds = [...new Set(targetSectionIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
        }

        // If no matching assignments found after filtering, return empty
        if (targetClassIds.length === 0 || targetSectionIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    students: [],
                    stats: { present: 0, absent: 0, late: 0, total: 0, percentage: 0 },
                    classes: Array.from(classOptionsSet).sort(),
                    sections: Array.from(sectionOptionsSet).sort(),
                    subjects: Array.from(subjectOptionsSet).sort(),
                    assignmentsList,
                    lowAttendanceAlerts: []
                }
            });
        }

        // Fetch students in the matched classes and sections (lowercase 'active' to match schema enum)
        const students = await Student.find({
            school: schoolId,
            class: { $in: targetClassIds },
            section: { $in: targetSectionIds },
            status: 'active'
        }).populate('user', 'name email').select('user class section admissionNo rollNo');

        // Fetch existing attendance records for the target date
        const attendanceRecords = await StudentAttendance.find({
            school: schoolId,
            class: { $in: targetClassIds },
            date: { $gte: targetDate, $lte: endOfTargetDate }
        });

        // Map attendance to students
        const attendanceMap = {};
        attendanceRecords.forEach(att => {
            if (att.entries && att.entries.length > 0) {
                att.entries.forEach(entry => {
                    attendanceMap[entry.student.toString()] = entry;
                });
            }
        });

        let present = 0;
        let absent = 0;
        let late = 0;
        let total = students.length;

        const formattedStudents = students.map(student => {
            const studentUserIdStr = student.user?._id.toString() || student._id.toString();
            // The entries in attendance records typically reference the User ID of the student, 
            // but let's check if it matches the User ID or Student ID. 
            // In graphura, attendance entry student is the User reference.
            const attRecord = attendanceMap[studentUserIdStr] || attendanceMap[student._id.toString()];
            
            let status = null;
            let reason = null;

            if (attRecord) {
                if (attRecord.status === 'present') {
                    status = 'present';
                    present++;
                } else if (attRecord.status === 'absent') {
                    status = 'absent';
                    absent++;
                } else if (attRecord.status === 'late') {
                    status = 'late';
                    late++;
                } else if (attRecord.status === 'on_leave') {
                    status = 'holiday';
                } else if (attRecord.status === 'half_day') {
                    status = 'present';
                    present++;
                }
                reason = attRecord.remarks || null;
            }

            return {
                id: student._id.toString(),
                rollNo: student.rollNo || student.admissionNo || '-',
                name: student.user?.name || 'Unknown',
                status: status,
                reason: reason
            };
        });

        const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        res.status(200).json({
            success: true,
            data: {
                students: formattedStudents,
                stats: { present, absent, late, total, percentage },
                classes: Array.from(classOptionsSet).sort(),
                sections: Array.from(sectionOptionsSet).sort(),
                subjects: Array.from(subjectOptionsSet).sort(),
                assignmentsList,
                lowAttendanceAlerts: [] // Could calculate if needed
            }
        });

    } catch (error) {
        console.error('Error fetching subject wise attendance:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAttendance = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;
        const { studentId, status, date, subject: subjectName, class: className, section: sectionName } = req.body;

        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const endOfTargetDate = new Date(targetDate);
        endOfTargetDate.setHours(23, 59, 59, 999);

        // Find the student to get user reference and class/section
        const student = await Student.findById(studentId).populate('user');
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        const studentUserId = student.user._id;
        const classId = student.class;
        const sectionId = student.section;

        // Resolve subject ObjectId if subject name provided
        let subjectId = null;
        if (subjectName && subjectName !== 'All Subjects') {
            const subjectDoc = await Subject.findOne({ subjectName: subjectName, school: schoolId });
            if (subjectDoc) subjectId = subjectDoc._id;
        }

        // Resolve section name for the Attendance record
        const sectionDoc = await Section.findById(sectionId);
        const resolvedSectionName = sectionDoc?.name || sectionName || '';

        // Look for existing attendance record for this class/section/date
        const attendanceType = subjectId ? 'subject' : 'class';
        const query = {
            school: schoolId,
            class: classId,
            section: resolvedSectionName,
            date: { $gte: targetDate, $lte: endOfTargetDate },
            attendanceType
        };
        if (subjectId) query.subject = subjectId;

        let record = await StudentAttendance.findOne(query);

        if (record) {
            // Update existing entry or add new one
            const entryIndex = record.entries.findIndex(e => e.student.toString() === studentUserId.toString());
            if (entryIndex >= 0) {
                record.entries[entryIndex].status = status;
            } else {
                record.entries.push({ student: studentUserId, status });
            }
            record.isEdited = true;
            record.editedBy = req.user._id;
            record.editedAt = new Date();
            await record.save();
        } else {
            // Create new attendance record
            record = new StudentAttendance({
                organization: organizationId,
                school: schoolId,
                academicYear: student.academicYear || new Date().getFullYear().toString(),
                class: classId,
                section: resolvedSectionName,
                subject: subjectId,
                attendanceType,
                date: targetDate,
                markedBy: req.user._id,
                markedByRole: 'teacher',
                entries: [{ student: studentUserId, status }]
            });
            await record.save();
        }

        res.status(200).json({ success: true, data: record });

    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const editAttendance = async (req, res) => {
    try {
        const schoolId = req.user.school;
        const { studentId, status, reason, date } = req.body;

        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const endOfTargetDate = new Date(targetDate);
        endOfTargetDate.setHours(23, 59, 59, 999);

        const student = await Student.findById(studentId).populate('user');
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        const studentUserId = student.user._id;

        // Find attendance record for this class on the date
        const record = await StudentAttendance.findOne({
            school: schoolId,
            class: student.class,
            date: { $gte: targetDate, $lte: endOfTargetDate }
        });

        if (!record) {
            return res.status(404).json({ success: false, message: 'No attendance record found for this date' });
        }

        const entryIndex = record.entries.findIndex(e => e.student.toString() === studentUserId.toString());
        if (entryIndex >= 0) {
            record.entries[entryIndex].status = status;
            record.entries[entryIndex].remarks = reason || '';
        } else {
            record.entries.push({ student: studentUserId, status, remarks: reason || '' });
        }
        
        record.isEdited = true;
        record.editedBy = req.user._id;
        record.editedAt = new Date();
        record.editReason = reason || '';
        await record.save();

        res.status(200).json({ success: true, data: record });

    } catch (error) {
        console.error('Error editing attendance:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const applyLeave = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;
        const { studentId, leaveType, date, reason } = req.body;

        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const endOfTargetDate = new Date(targetDate);
        endOfTargetDate.setHours(23, 59, 59, 999);

        const student = await Student.findById(studentId).populate('user');
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        const studentUserId = student.user._id;
        const sectionDoc = await Section.findById(student.section);
        const resolvedSectionName = sectionDoc?.name || '';

        // Find or create attendance record
        let record = await StudentAttendance.findOne({
            school: schoolId,
            class: student.class,
            date: { $gte: targetDate, $lte: endOfTargetDate }
        });

        const leaveStatus = leaveType === 'half_day' ? 'half_day' : 'on_leave';
        const remarksText = `Leave: ${leaveType} - ${reason}`;

        if (record) {
            const entryIndex = record.entries.findIndex(e => e.student.toString() === studentUserId.toString());
            if (entryIndex >= 0) {
                record.entries[entryIndex].status = leaveStatus;
                record.entries[entryIndex].remarks = remarksText;
            } else {
                record.entries.push({ student: studentUserId, status: leaveStatus, remarks: remarksText });
            }
            record.isEdited = true;
            record.editedBy = req.user._id;
            record.editedAt = new Date();
            await record.save();
        } else {
            record = new StudentAttendance({
                organization: organizationId,
                school: schoolId,
                academicYear: student.academicYear || new Date().getFullYear().toString(),
                class: student.class,
                section: resolvedSectionName,
                attendanceType: 'class',
                date: targetDate,
                markedBy: req.user._id,
                markedByRole: 'teacher',
                entries: [{ student: studentUserId, status: leaveStatus, remarks: remarksText }]
            });
            await record.save();
        }

        res.status(200).json({ success: true, data: record });

    } catch (error) {
        console.error('Error applying leave:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
// New functions for Subject Teacher's own attendance and leaves

export const getMyAttendance = async (req, res) => {
    try {
        const staffId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school;

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setHours(23, 59, 59, 999);

        // Fetch today's record
        const todayAttendance = await StaffAttendance.findOne({
            staffId,
            school: schoolId,
            date: { $gte: startOfToday, $lte: endOfToday }
        });

        // Fetch history
        const history = await StaffAttendance.find({
            staffId,
            school: schoolId
        }).sort({ date: -1 }).limit(100); // latest 100 for now, could be paginated/filtered

        res.status(200).json({
            success: true,
            data: {
                today: todayAttendance,
                history
            }
        });
    } catch (error) {
        console.error('Error fetching my attendance:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const clockIn = async (req, res) => {
    try {
        const staffId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school;
        let organizationId = req.user.organization || req.user.school?.organization?._id || req.user.school?.organization;
        
        if (!organizationId) {
            const School = (await import('../../models/school/School.js')).default;
            const school = await School.findById(schoolId);
            if (school) organizationId = school.organization;
        }
        
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setHours(23, 59, 59, 999);

        const now = new Date();
        
        // Define late threshold (e.g. 9:00 AM)
        const lateThreshold = new Date(startOfToday);
        lateThreshold.setHours(9, 0, 0, 0);
        const isLate = now > lateThreshold;

        // Check if there is an approved leave for today
        const activeLeave = await StaffLeave.findOne({
            staffId,
            school: schoolId,
            status: 'approved',
            fromDate: { $lte: endOfToday },
            toDate: { $gte: startOfToday }
        });

        // Get today's attendance record (if any)
        let record = await StaffAttendance.findOne({
            staffId,
            school: schoolId,
            date: { $gte: startOfToday, $lte: endOfToday }
        });

        if (activeLeave) {
            // Teacher is on an approved leave.
            // If admin explicitly marked "present", allow clock in.
            if (record && record.status === 'present') {
                // Admin overrode the leave
            } else {
                return res.status(400).json({ success: false, message: 'You are on leave. Contact admin if you are not.' });
            }
        }

        if (record) {
            // Record exists (probably created by admin or already clocked in)
            if (record.status === 'on_leave') {
                return res.status(400).json({ success: false, message: 'You are on leave. Contact admin if you are not.' });
            }
            if (record.status === 'absent') {
                return res.status(400).json({ success: false, message: 'You have been marked absent by admin. Contact admin to allow clock-in.' });
            }

            if (!record.clockIn) {
                record.clockIn = now;
                record.isLate = isLate;
                if (record.status === 'present' && isLate) {
                    record.status = 'late';
                }
                await record.save();
            }
        } else {
            // No existing record and no leave, create a new one
            record = await StaffAttendance.create({
                organization: organizationId,
                school: schoolId,
                staffId,
                staffRole: req.user.role || 'teacher',
                date: startOfToday,
                clockIn: now,
                status: isLate ? 'late' : 'present',
                isLate: isLate
            });
        }

        res.status(200).json({ success: true, data: record });
    } catch (error) {
        console.error('Error clocking in:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const clockOut = async (req, res) => {
    try {
        const staffId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school;
        
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setHours(23, 59, 59, 999);

        const now = new Date();

        const record = await StaffAttendance.findOne({
            staffId,
            school: schoolId,
            date: { $gte: startOfToday, $lte: endOfToday }
        });

        if (!record) {
            return res.status(400).json({ success: false, message: 'You have not clocked in today.' });
        }

        if (!record.clockIn) {
            return res.status(400).json({ success: false, message: 'You have not clocked in today.' });
        }

        const clockInTime = new Date(record.clockIn);
        const diffMs = now - clockInTime;
        const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

        record.clockOut = now;
        record.totalHours = parseFloat(totalHours);
        await record.save();

        res.status(200).json({ success: true, data: record });
    } catch (error) {
        console.error('Error clocking out:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMyLeaves = async (req, res) => {
    try {
        const staffId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school;

        const leaves = await StaffLeave.find({
            staffId,
            school: schoolId
        }).sort({ createdAt: -1 });

        let totalApprovedDays = 0;
        let pendingCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;

        leaves.forEach(leave => {
            if (leave.status === 'approved') {
                approvedCount++;
                totalApprovedDays += (leave.totalDays || 1);
            } else if (leave.status === 'pending') {
                pendingCount++;
            } else if (leave.status === 'rejected') {
                rejectedCount++;
            }
        });

        res.status(200).json({
            success: true,
            data: {
                leaves,
                stats: {
                    totalLeaves: totalApprovedDays,
                    pending: pendingCount,
                    approved: approvedCount,
                    rejected: rejectedCount
                }
            }
        });
    } catch (error) {
        console.error('Error fetching my leaves:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const applyMyLeave = async (req, res) => {
    try {
        const staffId = req.user._id;
        const schoolId = req.user.school?._id || req.user.school;
        let organizationId = req.user.organization || req.user.school?.organization?._id || req.user.school?.organization;
        
        if (!organizationId) {
            const School = (await import('../../models/school/School.js')).default;
            const school = await School.findById(schoolId);
            if (school) organizationId = school.organization;
        }

        const { leaveType, fromDate, toDate, totalDays, isHalfDay, halfDaySession, reason } = req.body;

        const StaffLeave = (await import('../../models/HRM/Staffleave.model.js')).default;
        const newLeave = new StaffLeave({
            organization: organizationId,
            school: schoolId,
            staffId,
            staffRole: req.user.role || 'teacher',
            leaveType,
            fromDate: new Date(fromDate),
            toDate: new Date(toDate),
            totalDays: totalDays || 1,
            isHalfDay: isHalfDay || false,
            halfDaySession,
            reason,
            status: 'pending',
            approvalLevel: 'principal'
        });

        await newLeave.save();

        res.status(201).json({ success: true, data: newLeave, message: 'Leave application submitted successfully' });
    } catch (error) {
        console.error('Error applying my leave:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
