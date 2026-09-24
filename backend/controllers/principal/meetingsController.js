import mongoose from "mongoose";
import StaffMeeting from "../../models/HRM/StaffMeeting.model.js";
import Student from "../../models/users/student.model.js";
import Parent from "../../models/users/parent.model.js";
import Notification from "../../models/common/Notification.js";
import { sendRealTimeNotification } from "../../utils/sseManager.js";
import { sendPTMInvitationEmail } from "../../services/emailService.js";

const toSchoolId = (user) => user.school?._id || user.school;
const toOrganizationId = (user) => user.school?.organization;

const typeMapToDb = {
  PTM: "general",
  "Staff Meeting": "academic",
  "Parent Meeting": "general",
  "Board Meeting": "disciplinary",
  general: "general",
  academic: "academic",
  disciplinary: "disciplinary",
  emergency: "emergency",
  department: "department",
};

const typeMapToUi = {
  general: "PTM",
  academic: "Staff Meeting",
  disciplinary: "Board Meeting",
  emergency: "Parent Meeting",
  department: "Staff Meeting",
};

const statusMapToDb = {
  Upcoming: "scheduled",
  Ongoing: "ongoing",
  Completed: "completed",
  Cancelled: "cancelled",
  scheduled: "scheduled",
  ongoing: "ongoing",
  completed: "completed",
  cancelled: "cancelled",
};

const statusMapToUi = {
  scheduled: "Upcoming",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const buildScheduledAt = (date, startTime, fallback) => {
  if (date && startTime) return new Date(`${date}T${startTime}:00`);
  if (date) return new Date(`${date}T09:00:00`);
  return fallback || new Date();
};

const durationFromTimes = (startTime, endTime, fallback = 60) => {
  if (!startTime || !endTime) return fallback;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes : fallback;
};

const mapMeetingForUi = (meetingDoc) => {
  const meeting = meetingDoc.toObject ? meetingDoc.toObject() : meetingDoc;
  const scheduled = new Date(meeting.scheduledAt);
  const end = new Date(scheduled.getTime() + (meeting.durationMinutes || 60) * 60000);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let currentStatus = statusMapToUi[meeting.status] || meeting.status || "Upcoming";

  // Auto-update to Completed or Ongoing based on the meeting's date and time
  if (currentStatus === "Upcoming" || currentStatus === "Ongoing") {
    if (end < now) {
      currentStatus = "Completed";
    } else if (scheduled >= todayStart && scheduled <= todayEnd) {
      currentStatus = "Ongoing";
    }
  }

  return {
    ...meeting,
    id: meeting._id,
    type: typeMapToUi[meeting.meetingType] || "Staff Meeting",
    date: scheduled.toISOString().split("T")[0],
    startTime: scheduled.toTimeString().slice(0, 5),
    endTime: end.toTimeString().slice(0, 5),
    participants:
      meeting.targetRoles?.length > 0
        ? meeting.targetRoles.join(", ")
        : `${meeting.attendees?.length || 0} staff`,
    slotDuration: meeting.durationMinutes,
    status: currentStatus, // Use the dynamically calculated status
    slots: (meeting.attendees || []).map((attendee, index) => ({
      time: `Slot ${index + 1}`,
      studentName: attendee.staffId?.name || "Staff Member",
      parentName: "-",
      teacherName: attendee.staffId?.name || "Staff Member",
      status: attendee.hasAcknowledged ? "Confirmed" : "Pending",
      remarks: "",
    })),
  };
};

const notifyParentsOfMeeting = async (meeting, schoolId, organizationId, notifyToggle, reqUser, className, sectionName) => {
  if (!notifyToggle) return;

  try {
    let targetClassName = className;
    if (!targetClassName) {
      const targetRoles = meeting.targetRoles || [];
      const systemRoles = ['all', 'board_members', 'principal', 'admin', 'accountant', 'teacher', 'support_staff', 'parents', 'students'];
      targetClassName = targetRoles.find(r => !systemRoles.includes(r));
    }

    if (!targetClassName) {
      console.log("No class specified in targetRoles or parameters for meeting notifications");
      return;
    }

    let students = [];
    const StudentModel = mongoose.model("Student");

    if (targetClassName === "All Classes") {
      // Fetch all active students in the school
      students = await StudentModel.find({ school: schoolId, status: "active" })
        .populate({
          path: "parent",
          populate: {
            path: "user",
            select: "name email status"
          }
        });
    } else {
      // Find the Class document
      const ClassModel = mongoose.model("Class");
      const classDoc = await ClassModel.findOne({ organization: organizationId, name: targetClassName });
      if (!classDoc) {
        console.log(`Class not found in database: ${targetClassName}`);
        return;
      }

      const studentQuery = { school: schoolId, class: classDoc._id, status: "active" };
      if (sectionName && sectionName !== "All Sections") {
        const SectionModel = mongoose.model("Section");
        const sectionDoc = await SectionModel.findOne({ school: schoolId, class: classDoc._id, name: sectionName });
        if (sectionDoc) {
          studentQuery.section = sectionDoc._id;
        }
      }

      // Find all active students in this specific class
      students = await StudentModel.find(studentQuery)
        .populate({
          path: "parent",
          populate: {
            path: "user",
            select: "name email status"
          }
        });
    }

    if (!students || students.length === 0) {
      console.log(`No active students found for class ${targetClassName}`);
      return;
    }

    // Get unique parents
    const uniqueParentsMap = new Map();
    for (const student of students) {
      if (student.parent && student.parent.user) {
        const parentUser = student.parent.user;
        if (!parentUser.email || parentUser.status === "inactive") {
          console.log(`Skipping parent user ${parentUser._id} due to missing email or inactive status`);
          continue;
        }

        const parentUserId = parentUser._id.toString();
        if (!uniqueParentsMap.has(parentUserId)) {
          uniqueParentsMap.set(parentUserId, {
            user: parentUser,
            parent: student.parent,
            studentName: student.name || student.rollNo || "your child"
          });
        }
      }
    }

    // Fetch School details for the email header
    const SchoolModel = mongoose.model("School");
    const schoolDoc = await SchoolModel.findById(schoolId);
    const schoolName = schoolDoc?.name || "Our School";

    const formattedDate = new Date(meeting.scheduledAt).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const timeString = `${meeting.startTime || ''} - ${meeting.endTime || ''}`.trim() || `${meeting.durationMinutes} minutes`;
    const venue = meeting.venue || "School Campus";
    const meetingMode = meeting.isOnline ? "Online" : "Offline";
    const agenda = meeting.agenda || "";
    const reminderInfo = meeting.reminder || "1 Hour Before";

    // Loop and send notification + email
    for (const [parentUserId, data] of uniqueParentsMap.entries()) {
      const parentUser = data.user;
      const parentDoc = data.parent;

      // 1. Create Dashboard Notification (Restrict only to parents of students in target classes)
      const notificationDoc = await Notification.create({
        user: parentUser._id,
        title: `New Parent Teacher Meeting Scheduled`,
        message: `Meeting Title: ${meeting.title}\nDate: ${formattedDate}\nTime: ${timeString}`,
        type: "event",
        read: false,
        school: schoolId,
        senderName: reqUser.name || "Principal",
        senderRole: reqUser.role || "principal",
        source: "PTM"
      });

      // Send SSE notification in real-time
      sendRealTimeNotification(parentUser._id, notificationDoc);

      // 2. Send Professional Email using Email Infrastructure (with try/catch error handling per recipient)
      try {
        await sendPTMInvitationEmail({
          parentEmail: parentUser.email,
          parentName: parentUser.name || parentDoc.fatherName || "Parent",
          schoolName,
          meetingTitle: meeting.title,
          className: targetClassName,
          date: formattedDate,
          time: timeString,
          venue: meeting.isOnline ? (meeting.meetingLink || venue) : venue,
          meetingMode,
          agenda,
          reminderInfo: `Reminder scheduled for: ${reminderInfo}`,
        });
        // console.log(`PTM invitation email successfully sent to parent: ${parentUser.email}`);
      } catch (emailErr) {
        console.error(`[PTM Email Delivery Failure] Failed to deliver PTM invitation email to parent ${parentUser.email} (Parent User ID: ${parentUser._id}) for meeting "${meeting.title}":`, emailErr.message);
      }
    }
  } catch (err) {
    console.error("Error in notifyParentsOfMeeting:", err);
  }
};

export const createMeeting = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const organizationId = toOrganizationId(req.user);
    const {
      title,
      agenda,
      meetingType,
      type,
      date,
      startTime,
      endTime,
      scheduledAt,
      durationMinutes,
      venue,
      isOnline,
      meetingLink,
      targetRoles,
      attendees,
      className,
      sectionName,
    } = req.body;

    const attendeeDocs = Array.isArray(attendees)
      ? attendees.map((a) => ({
        staffId: a.staffId || a,
        hasAcknowledged: !!a.hasAcknowledged,
        acknowledgedAt: a.acknowledgedAt || null,
        attendanceStatus: a.attendanceStatus || "pending",
      }))
      : [];

    const meeting = await StaffMeeting.create({
      organization: organizationId,
      school: schoolId,
      title,
      agenda: agenda || "",
      meetingType: typeMapToDb[meetingType] || typeMapToDb[type] || "general",
      scheduledAt: scheduledAt ? new Date(scheduledAt) : buildScheduledAt(date, startTime),
      durationMinutes: durationMinutes || durationFromTimes(startTime, endTime, 60),
      venue: venue || "School Campus",
      isOnline: !!isOnline,
      meetingLink: meetingLink || "",
      targetRoles: req.body.participants ? req.body.participants.split(",").map(r => r.trim()) : (targetRoles || []),
      attendees: attendeeDocs,
      createdBy: req.user._id,
      reminder: req.body.reminder || "1 Hour Before",
      notificationSent: !!req.body.notify,
      className: className || "All Classes",
      sectionName: sectionName || "All Sections",
    });

    if (req.body.notify) {
      notifyParentsOfMeeting(meeting, schoolId, organizationId, req.body.notify, req.user, req.body.className, req.body.sectionName);
    }

    return res.status(201).json({
      success: true,
      data: mapMeetingForUi(meeting),
      message: "Meeting created successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllMeetings = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const { meetingType, status, search, dateFrom, dateTo } = req.query;

    const query = { school: schoolId };
    if (meetingType) query.meetingType = typeMapToDb[meetingType] || meetingType;
    if (status) query.status = statusMapToDb[status] || status;
    if (search) query.title = { $regex: search, $options: "i" };
    if (dateFrom || dateTo) {
      query.scheduledAt = {};
      if (dateFrom) query.scheduledAt.$gte = new Date(`${dateFrom}T00:00:00`);
      if (dateTo) query.scheduledAt.$lte = new Date(`${dateTo}T23:59:59`);
    }

    const meetings = await StaffMeeting.find(query)
      .populate("createdBy", "name")
      .sort({ scheduledAt: -1 });

    return res.status(200).json({
      success: true,
      data: meetings.map(mapMeetingForUi),
      message: "Meetings fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMeetingById = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const meeting = await StaffMeeting.findOne({ _id: req.params.id, school: schoolId })
      .populate("createdBy", "name")
      .populate("attendees.staffId", "name role");

    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    return res.status(200).json({
      success: true,
      data: mapMeetingForUi(meeting),
      message: "Meeting fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMeeting = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const payload = { ...req.body };

    if (payload.type && !payload.meetingType) payload.meetingType = payload.type;
    if (payload.meetingType) payload.meetingType = typeMapToDb[payload.meetingType] || payload.meetingType;
    if (payload.participants && typeof payload.participants === "string") {
      payload.targetRoles = payload.participants.split(",").map(role => role.trim());
      delete payload.participants;
    }
    if (payload.status) payload.status = statusMapToDb[payload.status] || payload.status;

    if (payload.date || payload.startTime) {
      payload.scheduledAt = buildScheduledAt(payload.date, payload.startTime, payload.scheduledAt);
    }
    if (!payload.durationMinutes && (payload.startTime || payload.endTime)) {
      payload.durationMinutes = durationFromTimes(payload.startTime, payload.endTime, 60);
    }

    if (Array.isArray(payload.attendees)) {
      payload.attendees = payload.attendees.map((a) => ({
        staffId: a.staffId || a,
        hasAcknowledged: !!a.hasAcknowledged,
        acknowledgedAt: a.acknowledgedAt || null,
        attendanceStatus: a.attendanceStatus || "pending",
      }));
    }

    if (payload.notify !== undefined) {
      payload.notificationSent = !!payload.notify;
    }

    const meeting = await StaffMeeting.findOneAndUpdate(
      { _id: req.params.id, school: schoolId },
      payload,
      { new: true, runValidators: true }
    )
      .populate("createdBy", "name")
      .populate("attendees.staffId", "name role");

    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    if (payload.notify) {
      const organizationId = toOrganizationId(req.user);
      notifyParentsOfMeeting(meeting, schoolId, organizationId, payload.notify, req.user, payload.className, payload.sectionName);
    }

    return res.status(200).json({
      success: true,
      data: mapMeetingForUi(meeting),
      message: "Meeting updated successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelMeeting = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const meeting = await StaffMeeting.findOneAndUpdate(
      { _id: req.params.id, school: schoolId },
      { status: "cancelled" },
      { new: true }
    )
      .populate("createdBy", "name")
      .populate("attendees.staffId", "name role");

    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }

    return res.status(200).json({
      success: true,
      data: mapMeetingForUi(meeting),
      message: "Meeting cancelled successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMeeting = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const meeting = await StaffMeeting.findOneAndDelete({ _id: req.params.id, school: schoolId });
    if (!meeting) {
      return res.status(404).json({ success: false, message: "Meeting not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Meeting deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getMeetingStats = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);
    const now = new Date();

    const meetings = await StaffMeeting.find({ school: schoolObjectId }).select("status scheduledAt attendees");

    const totalMeetings = meetings.length;
    const upcomingMeetings = meetings.filter((m) => m.status === "scheduled" && new Date(m.scheduledAt) >= now).length;
    const totalSlots = meetings.reduce((sum, m) => sum + (m.attendees?.length || 0), 0);
    const confirmedSlots = meetings.reduce(
      (sum, m) => sum + (m.attendees?.filter((a) => a.hasAcknowledged).length || 0),
      0
    );

    return res.status(200).json({
      success: true,
      data: { totalMeetings, upcomingMeetings, totalSlots, confirmedSlots },
      message: "Meeting stats fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
