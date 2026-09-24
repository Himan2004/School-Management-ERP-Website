import mongoose from "mongoose";
import StaffMeeting from "../../models/HRM/StaffMeeting.model.js";
import Teacher from "../../models/users/teacher.model.js";
import Section from "../../models/school/Section.model.js";
import Timetable from "../../models/academic/timetable.model.js";
import Class from "../../models/organization/organizationClass.js";
import SubjectAssignment from "../../models/principal/SubjectAssignment.model.js";

import Subject from "../../models/modules/Subject.js";

import Student from "../../models/users/student.model.js";
import Parent from "../../models/users/parent.model.js";
import Notification from "../../models/common/Notification.js";
import { sendRealTimeNotification } from "../../utils/sseManager.js";


const getTeacherAssignments = async (teacherUserId, schoolId) => {
    const teacherProfile = await Teacher.findOne({ user: teacherUserId, school: schoolId })
        .populate("assignedClasses")
        .lean();

    const assignedClassNames = [];
    if (teacherProfile && Array.isArray(teacherProfile.assignedClasses)) {
        teacherProfile.assignedClasses.forEach(c => {
            if (c.name) assignedClassNames.push(c.name);
        });
    }

    const homeroomSections = await Section.find({ homeroomTeacher: teacherUserId, school: schoolId })
        .populate("classId")
        .lean();

    const homeroomClassSectionNames = [];
    homeroomSections.forEach(sec => {
        const clsName = sec.className || sec.classId?.name;
        if (clsName && sec.name) {
            homeroomClassSectionNames.push({
                className: clsName,
                sectionName: sec.name
            });
            assignedClassNames.push(clsName);
        }
    });

    const timetables = await Timetable.find({
        school: schoolId,
        isActive: true,
        "schedule.periods.teacher": teacherUserId
    })
    .populate("class")
    .lean();

    const timetableClassSectionNames = [];
    timetables.forEach(tt => {
        const clsName = tt.class?.name;
        if (clsName && tt.section) {
            timetableClassSectionNames.push({
                className: clsName,
                sectionName: tt.section
            });
            assignedClassNames.push(clsName);
        }
    });

    const uniqueClassNames = Array.from(new Set(assignedClassNames));

    return {
        classNames: uniqueClassNames,
        homeroomAssignments: homeroomClassSectionNames,
        timetableAssignments: timetableClassSectionNames
    };
};

const getPtmType = (title = '', meetingType = '') => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('open house')) return 'open_house';
    if (lowerTitle.includes('sports')) return 'sports_day';
    if (lowerTitle.includes('orientation')) return 'orientation';
    if (lowerTitle.includes('workshop')) return 'workshop';
    if (lowerTitle.includes('seminar')) return 'seminar';
    if (lowerTitle.includes('exhibition')) return 'exhibition';
    if (lowerTitle.includes('cultural')) return 'cultural';
    if (lowerTitle.includes('academic')) return 'academic';
    return 'parent_teacher';
};

const getClassIdsForName = (classNameStr, classes) => {
    if (!classNameStr) return [];
    const lowerName = classNameStr.toLowerCase();
    const cleanName = lowerName.startsWith("class ") ? lowerName.substring(6).trim() : lowerName;
    const matchingIds = [];
    classes.forEach(c => {
        const cLower = c.name.toLowerCase();
        const cClean = cLower.startsWith("class ") ? cLower.substring(6).trim() : cLower;
        if (cLower === lowerName || cClean === cleanName) {
            matchingIds.push(c._id);
        }
    });
    return matchingIds;
};

const getBulkDetails = async (organizationId, schoolId) => {
    const classes = await Class.find({ organization: organizationId }).lean();
    const sections = await Section.find({ school: schoolId })
        .populate("homeroomTeacher", "name email role")
        .lean();
    const rawAssignments = await SubjectAssignment.find({ school: schoolId })
        .populate("teacherUser", "name email role")
        .lean();

    const subjectIds = [...new Set(rawAssignments.map(a => a.subject).filter(Boolean))];
    const validSubjectIds = subjectIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    const stringSubjectNames = subjectIds.filter(id => !mongoose.Types.ObjectId.isValid(id));

    const subjectQueries = [];
    if (validSubjectIds.length > 0) {
        subjectQueries.push({ _id: { $in: validSubjectIds } });
    }
    if (stringSubjectNames.length > 0) {
        subjectQueries.push({ $or: [{ name: { $in: stringSubjectNames } }, { subjectName: { $in: stringSubjectNames } }] });
    }

    let subjectsList = [];
    if (subjectQueries.length > 0) {
        subjectsList = await mongoose.model("Subject").find({ $or: subjectQueries }).select("subjectName name").lean();
    }

    const subjectMap = new Map();
    subjectsList.forEach(s => {
        if (s._id) subjectMap.set(s._id.toString(), s);
        const nameKey = (s.subjectName || s.name || "").toLowerCase();
        if (nameKey) subjectMap.set(nameKey, s);
    });

    const assignments = rawAssignments.map(a => {
        let matchedSub = null;
        if (a.subject) {
            const subStr = a.subject.toString();
            matchedSub = subjectMap.get(subStr) || subjectMap.get(subStr.toLowerCase()) || null;
            if (!matchedSub) {
                matchedSub = { subjectName: subStr };
            }
        }
        return {
            ...a,
            subject: matchedSub
        };
    });

    return { classes, sections, assignments };
};

const resolveMeetingDetails = (meeting, classes, sections, assignments) => {
    const targetClass = meeting.className;
    const targetSection = meeting.sectionName || "All Sections";

    let matchedTeachers = [];
    let capacity = 0;

    if (targetClass === "All Classes") {
        const classTeacherIds = new Set();
        sections.forEach(sec => {
            if (sec.homeroomTeacher) {
                const teacherUser = sec.homeroomTeacher;
                const teacherIdStr = teacherUser._id.toString();
                if (!classTeacherIds.has(teacherIdStr)) {
                    classTeacherIds.add(teacherIdStr);
                    matchedTeachers.push({
                        name: teacherUser.name,
                        subject: "Class Teacher",
                        role: "Class Teacher"
                    });
                }
            }
        });

        const subjectTeacherIds = new Set();
        assignments.forEach(assign => {
            if (assign.teacherUser) {
                const teacherUser = assign.teacherUser;
                const teacherIdStr = teacherUser._id.toString();
                const subjName = assign.subject?.subjectName || "Subject";
                
                const key = `${teacherIdStr}-${subjName}`;
                if (!subjectTeacherIds.has(key)) {
                    subjectTeacherIds.add(key);
                    matchedTeachers.push({
                        name: teacherUser.name,
                        subject: subjName,
                        role: "Subject Teacher"
                    });
                }
            }
        });

        sections.forEach(sec => {
            if (sec.status === "active") {
                capacity += (sec.capacity || 40);
            }
        });
    } else {
        const targetClassIds = getClassIdsForName(targetClass, classes);

        const matchedSections = sections.filter(sec => {
            const matchesClass = targetClassIds.some(cid => cid.toString() === sec.classId?.toString());
            if (!matchesClass) return false;
            if (targetSection !== "All Sections" && targetSection !== "all" && sec.name !== targetSection) {
                return false;
            }
            return true;
        });

        const matchedAssignments = assignments.filter(assign => {
            const matchesClass = targetClassIds.some(cid => cid.toString() === assign.class?.toString());
            if (!matchesClass) return false;
            if (targetSection !== "All Sections" && targetSection !== "all" && assign.section !== targetSection) {
                return false;
            }
            return true;
        });

        const classTeacherIds = new Set();
        matchedSections.forEach(sec => {
            if (sec.homeroomTeacher) {
                const teacherUser = sec.homeroomTeacher;
                const teacherIdStr = teacherUser._id.toString();
                if (!classTeacherIds.has(teacherIdStr)) {
                    classTeacherIds.add(teacherIdStr);
                    matchedTeachers.push({
                        name: teacherUser.name,
                        subject: "Class Teacher",
                        role: "Class Teacher"
                    });
                }
            }
        });

        const subjectTeacherIds = new Set();
        matchedAssignments.forEach(assign => {
            if (assign.teacherUser) {
                const teacherUser = assign.teacherUser;
                const teacherIdStr = teacherUser._id.toString();
                const subjName = assign.subject?.subjectName || "Subject";
                
                const key = `${teacherIdStr}-${subjName}`;
                if (!subjectTeacherIds.has(key)) {
                    subjectTeacherIds.add(key);
                    matchedTeachers.push({
                        name: teacherUser.name,
                        subject: subjName,
                        role: "Subject Teacher"
                    });
                }
            }
        });

        matchedSections.forEach(sec => {
            capacity += (sec.capacity || 40);
        });
    }

    return {
        teachers: matchedTeachers,
        capacity: capacity || 40
    };
};

const mapPtmForTeacher = (meetingDoc, resolvedDetails) => {
    const meeting = meetingDoc.toObject ? meetingDoc.toObject() : meetingDoc;
    const scheduled = new Date(meeting.scheduledAt);
    const duration = meeting.durationMinutes || 60;
    const end = new Date(scheduled.getTime() + duration * 60000);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let currentStatus = meeting.status || "scheduled";

    if (currentStatus === "scheduled" || currentStatus === "ongoing") {
        if (end < now) {
            currentStatus = "completed";
        } else if (scheduled >= todayStart && scheduled <= todayEnd) {
            currentStatus = "ongoing";
        }
    }

    const agendaArray = meeting.agenda 
        ? meeting.agenda.split('\n').map(a => a.trim()).filter(Boolean)
        : [];

    return {
        id: meeting._id,
        _id: meeting._id,
        title: meeting.title,
        type: getPtmType(meeting.title, meeting.meetingType),
        date: scheduled.toISOString().split("T")[0],
        startTime: scheduled.toTimeString().slice(0, 5),
        endTime: end.toTimeString().slice(0, 5),
        venue: meeting.venue || "School Campus",
        mode: meeting.isOnline ? "Online" : "In-Person",
        class: meeting.className === "All Classes" ? "all" : meeting.className,
        section: meeting.sectionName === "All Sections" ? "all" : meeting.sectionName,
        status: currentStatus,
        description: meeting.description || meeting.agenda || "Parent-Teacher Meeting scheduled by administration.",
        agenda: agendaArray.length > 0 ? agendaArray : ["Introduction and Welcome", "Discussion on academic progress", "Parent feedback session"],
        teachers: resolvedDetails.teachers,
        participants: Array.isArray(meeting.attendees)
            ? meeting.attendees.filter(a => a.attendanceStatus === 'confirmed' || a.attendanceStatus === 'attended').length
            : 0,
        maxParticipants: resolvedDetails.capacity,
        createdBy: meeting.createdBy?.name || "Admin",
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
    };
};

export const getPTMs = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;

        if (!schoolId || !organizationId) {
            return res.status(400).json({ success: false, message: "Invalid user school or organization context." });
        }

        const { classNames, homeroomAssignments, timetableAssignments } = await getTeacherAssignments(req.user._id, schoolId);

        const meetings = await StaffMeeting.find({
            school: schoolId,
            organization: organizationId,
            meetingType: "general"
        })
        .populate("createdBy", "name")
        .sort({ scheduledAt: -1 })
        .lean();

        const filtered = meetings.filter(m => {
            if (m.className === "All Classes") return true;

            const targetClass = m.className;
            const targetSection = m.sectionName || "All Sections";

            if (classNames.includes(targetClass) && targetSection === "All Sections") {
                return true;
            }

            const matchesHomeroom = homeroomAssignments.some(h => 
                h.className === targetClass && 
                (targetSection === "All Sections" || h.sectionName === targetSection)
            );
            if (matchesHomeroom) return true;

            const matchesTimetable = timetableAssignments.some(t => 
                t.className === targetClass && 
                (targetSection === "All Sections" || t.sectionName === targetSection)
            );
            if (matchesTimetable) return true;

            return false;
        });

        const { classes, sections, assignments } = await getBulkDetails(organizationId, schoolId);

        return res.status(200).json({
            success: true,
            data: filtered.map(m => {
                const resolved = resolveMeetingDetails(m, classes, sections, assignments);
                return mapPtmForTeacher(m, resolved);
            })
        });
    } catch (error) {
        console.error("Error fetching subject teacher PTMs:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getPTMDetails = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;

        if (!schoolId || !organizationId) {
            return res.status(400).json({ success: false, message: "Invalid user school or organization context." });
        }

        const meeting = await StaffMeeting.findOne({
            _id: req.params.id,
            school: schoolId,
            organization: organizationId
        })
        .populate("createdBy", "name")
        .lean();

        if (!meeting) {
            return res.status(404).json({ success: false, message: "PTM not found" });
        }

        const { classes, sections, assignments } = await getBulkDetails(organizationId, schoolId);
        const resolved = resolveMeetingDetails(meeting, classes, sections, assignments);

        return res.status(200).json({
            success: true,
            data: mapPtmForTeacher(meeting, resolved)
        });
    } catch (error) {
        console.error("Error fetching PTM details:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getPTMSummary = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;

        if (!schoolId || !organizationId) {
            return res.status(400).json({ success: false, message: "Invalid user school or organization context." });
        }

        const { classNames, homeroomAssignments, timetableAssignments } = await getTeacherAssignments(req.user._id, schoolId);

        const meetings = await StaffMeeting.find({
            school: schoolId,
            organization: organizationId,
            meetingType: "general"
        })
        .populate("createdBy", "name")
        .lean();

        const filtered = meetings.filter(m => {
            if (m.className === "All Classes") return true;

            const targetClass = m.className;
            const targetSection = m.sectionName || "All Sections";

            if (classNames.includes(targetClass) && targetSection === "All Sections") {
                return true;
            }

            const matchesHomeroom = homeroomAssignments.some(h => 
                h.className === targetClass && 
                (targetSection === "All Sections" || h.sectionName === targetSection)
            );
            if (matchesHomeroom) return true;

            const matchesTimetable = timetableAssignments.some(t => 
                t.className === targetClass && 
                (targetSection === "All Sections" || t.sectionName === targetSection)
            );
            if (matchesTimetable) return true;

            return false;
        });

        const { classes, sections, assignments } = await getBulkDetails(organizationId, schoolId);
        const mapped = filtered.map(m => {
            const resolved = resolveMeetingDetails(m, classes, sections, assignments);
            return mapPtmForTeacher(m, resolved);
        });

        const total = mapped.length;
        const scheduled = mapped.filter(p => p.status === 'scheduled').length;
        const ongoing = mapped.filter(p => p.status === 'ongoing').length;
        const completed = mapped.filter(p => p.status === 'completed').length;
        const cancelled = mapped.filter(p => p.status === 'cancelled').length;
        const rescheduled = mapped.filter(p => p.status === 'rescheduled').length;
        
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const upcoming = mapped.filter(p => p.status === 'scheduled' && p.date > todayStr).length;
        const today = mapped.filter(p => p.date === todayStr).length;

        return res.status(200).json({
            success: true,
            data: {
                total,
                scheduled,
                ongoing,
                completed,
                cancelled,
                rescheduled,
                upcoming,
                today
            }
        });
    } catch (error) {
        console.error("Error fetching PTM summary:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getPTMCalendar = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;

        if (!schoolId || !organizationId) {
            return res.status(400).json({ success: false, message: "Invalid user school or organization context." });
        }

        const { classNames, homeroomAssignments, timetableAssignments } = await getTeacherAssignments(req.user._id, schoolId);

        const meetings = await StaffMeeting.find({
            school: schoolId,
            organization: organizationId,
            meetingType: "general"
        })
        .populate("createdBy", "name")
        .lean();

        const filtered = meetings.filter(m => {
            if (m.className === "All Classes") return true;

            const targetClass = m.className;
            const targetSection = m.sectionName || "All Sections";

            if (classNames.includes(targetClass) && targetSection === "All Sections") {
                return true;
            }

            const matchesHomeroom = homeroomAssignments.some(h => 
                h.className === targetClass && 
                (targetSection === "All Sections" || h.sectionName === targetSection)
            );
            if (matchesHomeroom) return true;

            const matchesTimetable = timetableAssignments.some(t => 
                t.className === targetClass && 
                (targetSection === "All Sections" || t.sectionName === targetSection)
            );
            if (matchesTimetable) return true;

            return false;
        });

        const { classes, sections, assignments } = await getBulkDetails(organizationId, schoolId);

        return res.status(200).json({
            success: true,
            data: filtered.map(m => {
                const resolved = resolveMeetingDetails(m, classes, sections, assignments);
                return mapPtmForTeacher(m, resolved);
            })
        });
    } catch (error) {
        console.error("Error fetching PTM calendar:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getTeacherClassesSections = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;

        if (!schoolId || !organizationId) {
            return res.status(400).json({ success: false, message: "Invalid user school or organization context." });
        }

        const { classNames, homeroomAssignments, timetableAssignments } = await getTeacherAssignments(req.user._id, schoolId);

        const TeacherModel = mongoose.model("Teacher");
        const teacherProfile = await TeacherModel.findOne({ user: req.user._id, school: schoolId })
            .populate("assignedClasses")
            .lean();

        const ClassModel = mongoose.model("Class");
        const classes = await ClassModel.find({
            organization: organizationId,
            name: { $in: classNames },
            isActive: true
        }).lean();

        const SectionModel = mongoose.model("Section");
        const sections = await SectionModel.find({
            school: schoolId,
            status: "active"
        }).lean();

        const result = classes.map(cls => {
            const classSections = sections.filter(sec => {
                const secClassName = sec.className || sec.classId?.name;
                const matchesClass = secClassName === cls.name;
                if (!matchesClass) return false;

                const hasGeneralAccess = teacherProfile && Array.isArray(teacherProfile.assignedClasses) && 
                    teacherProfile.assignedClasses.some(ac => ac.name === cls.name);
                if (hasGeneralAccess) return true;

                const matchesHomeroom = homeroomAssignments.some(h => h.className === cls.name && h.sectionName === sec.name);
                const matchesTimetable = timetableAssignments.some(t => t.className === cls.name && t.sectionName === sec.name);

                return matchesHomeroom || matchesTimetable;
            });

            return {
                id: cls._id,
                _id: cls._id,
                name: cls.name,
                sections: classSections.map(sec => ({
                    id: sec._id,
                    _id: sec._id,
                    name: sec.name,
                    capacity: sec.capacity || 40
                }))
            };
        });

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("Error fetching teacher classes and sections:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createPTM = async (req, res) => {
    try {
        const schoolId = req.user.school?._id || req.user.school;
        const organizationId = req.user.school?.organization?._id || req.user.school?.organization;

        if (!schoolId || !organizationId) {
            return res.status(400).json({ success: false, message: "Invalid user school or organization context." });
        }

        const { title, className, sectionName, date, startTime, endTime, mode, venue, description } = req.body;

        if (!title || !date || !startTime || !endTime) {
            return res.status(400).json({ success: false, message: "Title, date, startTime, and endTime are required." });
        }

        // Parse date and startTime into scheduledAt
        const scheduledAt = new Date(`${date}T${startTime}`);
        
        // Calculate duration in minutes
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        let durationMinutes = (end - start) / 60000;
        if (durationMinutes <= 0) {
            durationMinutes = 60; // fallback
        }

        const newMeeting = await StaffMeeting.create({
            organization: organizationId,
            school: schoolId,
            title,
            agenda: description || "",
            meetingType: "general", // PTM is general
            scheduledAt,
            durationMinutes,
            venue: venue || "School Campus",
            isOnline: mode === "Online",
            meetingLink: mode === "Online" ? venue : "",
            targetRoles: ["parents", "students"], // parents and students are invited
            className: className || "All Classes",
            sectionName: sectionName || "All Sections",
            status: "scheduled",
            createdBy: req.user._id
        });

        // --- Trigger Notifications for Students & Parents ---
        try {
            const ClassModel = mongoose.model("Class");
            const SectionModel = mongoose.model("Section");
            const StudentModel = mongoose.model("Student");
            const ParentModel = mongoose.model("Parent");
            const NotificationModel = mongoose.model("Notification");

            // Look up the class ID and section ID in the DB
            let cls = null;
            if (className && className !== "All Classes") {
                cls = await ClassModel.findOne({ name: new RegExp('^' + className + '$', 'i'), organization: organizationId });
            }

            let sec = null;
            if (sectionName && sectionName !== "All Sections" && cls) {
                sec = await SectionModel.findOne({ name: new RegExp('^' + sectionName + '$', 'i'), classId: cls._id, school: schoolId });
            }

            // Find all active students in the class/section
            let studentQuery = { school: schoolId, status: 'active' };
            if (cls) studentQuery.class = cls._id;
            if (sec) studentQuery.section = sec._id;

            const students = await StudentModel.find(studentQuery).populate('user').lean();

            // Create notification format
            const formattedDate = new Date(date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
            const timeString = `${startTime} - ${endTime}`;

            // Send notification to each student
            for (const student of students) {
                if (student.user?._id) {
                    const studentUserId = student.user._id;
                    const studentNotification = await NotificationModel.create({
                        user: studentUserId,
                        title: `New Parent Teacher Meeting Scheduled`,
                        message: `Meeting Title: ${title}\nDate: ${formattedDate}\nTime: ${timeString}\nVenue: ${venue}`,
                        type: "event",
                        read: false,
                        school: schoolId,
                        senderName: req.user.name || "Teacher",
                        senderRole: "teacher",
                        source: "PTM"
                    });
                    try {
                        sendRealTimeNotification(studentUserId, studentNotification);
                    } catch (e) {
                        // ignore sse errors
                    }
                }
            }

            // Find parents of these students
            const studentIds = students.map(s => s._id);
            const parents = await ParentModel.find({ students: { $in: studentIds } }).populate('user').lean();

            // Send notification to each parent
            for (const parent of parents) {
                if (parent.user?._id) {
                    const parentUserId = parent.user._id;
                    const parentNotification = await NotificationModel.create({
                        user: parentUserId,
                        title: `New Parent Teacher Meeting Scheduled`,
                        message: `Meeting Title: ${title}\nDate: ${formattedDate}\nTime: ${timeString}\nVenue: ${venue}`,
                        type: "event",
                        read: false,
                        school: schoolId,
                        senderName: req.user.name || "Teacher",
                        senderRole: "teacher",
                        source: "PTM"
                    });
                    try {
                        sendRealTimeNotification(parentUserId, parentNotification);
                    } catch (e) {
                        // ignore
                    }
                }
            }
        } catch (notifErr) {
            console.error("Error generating PTM notifications:", notifErr);
        }

        return res.status(201).json({ 
            success: true, 
            data: newMeeting, 
            message: "PTM scheduled successfully and notifications sent." 
        });
    } catch (error) {
        console.error("Error creating PTM:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
