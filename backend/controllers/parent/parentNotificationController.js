import mongoose from "mongoose";
import Notification from "../../models/common/Notification.js";
import Notice from "../../models/common/Notice.js";
import Event from "../../models/common/Event.js";
import StaffMeeting from "../../models/HRM/StaffMeeting.model.js";
import FeePayment from "../../models/finance/FeePayment.model.js";
import Parent from "../../models/users/parent.model.js";
import Announcement from "../../models/academic/Announcement.model.js";

/**
 * Helper to generate random IDs for aggregated items if they don't have a clean string ID
 */
const generateId = (prefix, id) => `${prefix}_${id}`;

/**
 * @desc    Get parent notifications
 * @route   GET /api/parent/notifications
 * @access  Private (Parent)
 */
export const getParentNotifications = async (req, res) => {
  try {
    const parentUserId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Extract the School ID and Org ID
    const schoolObj = req.user.school;
    const schoolId = schoolObj?._id || schoolObj;

    const rawSchoolId = req.user.school_id || req.user.school?._id || req.user.school;

    // 1. Fetch parent's children to get their classes and sections
    const parentProfile = await Parent.findOne({ user: parentUserId }).populate({
        path: "students",
        populate: [
            { path: "class", select: "name" },
            { path: "section", select: "name" }
        ]
    });
    const childIds = [];
    
    // Arrays for persistence tracking
    const readIds = parentProfile?.readNotifications || [];
    const clearedIds = parentProfile?.clearedNotifications || [];

    const schoolIds = new Set();
    if (schoolId) schoolIds.add(schoolId.toString());
    if (rawSchoolId) schoolIds.add(rawSchoolId.toString());

    if (parentProfile && parentProfile.students) {
        parentProfile.students.forEach(s => {
            childIds.push(s._id);
            if (s.school) schoolIds.add(s.school.toString());
        });
    }

    const schoolObjIds = Array.from(schoolIds).map(id => new mongoose.Types.ObjectId(id));
    const schoolStrIds = Array.from(schoolIds);

    // Prepare queries
    const noticeConditions = [
        { school: { $in: schoolObjIds } },
        { school: { $in: schoolStrIds } },
        { branch: { $in: schoolObjIds } }
    ];

    const eventConditions = [
        { school: { $in: schoolObjIds } },
        { school: { $in: schoolStrIds } }
    ];

    // 2. Fetch all data in parallel
    const [
      systemNotifications,
      rawNotices,
      rawEvents,
      rawMeetings,
      rawFees,
      rawAnnouncements
    ] = await Promise.all([
      // A. System Notifications
      Notification.find({ user: parentUserId }).sort({ createdAt: -1 }).limit(20).lean(),
      
      // B. Notices
      Notice.find({ $or: noticeConditions }).sort({ createdAt: -1 }).limit(50).lean(),
      
      // C. Events
      Event.find({ $or: eventConditions }).sort({ createdAt: -1 }).limit(50).lean(),
      
      // D. Parent Meetings (PTM)
      StaffMeeting.find({
          school: { $in: schoolObjIds },
          meetingType: "general",
          status: { $in: ["scheduled", "ongoing"] }
      }).populate("createdBy", "name").lean(),
      
      // E. Fees Paid
      FeePayment.find({ student: { $in: childIds } }).populate('student', 'name').sort({ paymentDate: -1 }).limit(20).lean(),

      // F. Announcements
      Announcement.find({ school: { $in: schoolObjIds }, isActive: true }).populate('author', 'name').sort({ createdAt: -1 }).limit(30).lean()
    ]);

    // 3. Process and format the data
    const aggregatedFeed = [];

    // --- Process System Notifications ---
    systemNotifications.forEach(sys => {
      const stringId = sys._id.toString();
      if (clearedIds.includes(stringId)) return;
      const isRead = sys.read || readIds.includes(stringId);

      aggregatedFeed.push({
        id: stringId,
        title: sys.title || "System Notification",
        category: "System Alert",
        priority: "Medium",
        date: sys.createdAt,
        timestamp: new Date(sys.createdAt).getTime(),
        status: isRead ? "Read" : "Unread",
        receivedFrom: sys.senderName || "System Administration",
        // Additional payload
        content: sys.message,
      });
    });

    // --- Process Notices ---
    rawNotices.forEach(notice => {
        const stringId = notice._id.toString();
        if (clearedIds.includes(stringId)) return;

        const statusStr = String(notice.status || "").toLowerCase();
        if (!['published', 'active', 'scheduled'].includes(statusStr)) return;

        // EXPIRY CHECK: if expiryDate is set and is in the past, skip
        if (notice.expiryDate) {
            const expiry = new Date(notice.expiryDate);
            expiry.setHours(0,0,0,0);
            if (expiry < today) return;
        }

        const audRaw = notice.audience || notice.targetAudience || notice.target || notice.roles || notice.visibleTo;
        const audStr = JSON.stringify(audRaw || "").toLowerCase();
        const isForParents = audStr.includes('parent') || audStr.includes('everyone') || audStr.includes('all') || !audRaw || audStr === '""' || audStr === 'null' || audStr === '[]' || audStr === '{}';
        
        if (isForParents) {
            const hasRead = notice.viewedBy?.some(view => view.user?.toString() === parentUserId.toString()) || readIds.includes(stringId);
            const displayDate = notice.createdAt || notice.date || notice.publishDate;
            
            // Format received from logic
            let sender = "Administration";
            if (notice.createdBy === 'Principal') sender = 'Principal';
            if (notice.createdBy === 'Teacher' || notice.teacher) sender = 'Teacher';
            if (notice.senderName) sender = notice.senderName;
            if (sender === "System") sender = "Administration"; // Default

            aggregatedFeed.push({
                id: stringId,
                title: notice.title || notice.noticeTitle || "School Notice",
                category: "Notice",
                priority: notice.priority === "High" || notice.priority === "Emergency" ? "High" : "Medium",
                date: displayDate,
                timestamp: new Date(displayDate).getTime(),
                status: hasRead ? "Read" : "Unread",
                receivedFrom: sender,
                // Payload
                content: notice.content || notice.description
            });
        }
    });

    // --- Process Events ---
    rawEvents.forEach(event => {
        const stringId = generateId("evt", event._id);
        if (clearedIds.includes(stringId)) return;
        // EXPIRY CHECK: skip if eventDate or endDate is in the past
        const eventDateToCheck = new Date(event.endDate || event.eventDate || event.startDate);
        eventDateToCheck.setHours(0,0,0,0);
        if (eventDateToCheck < today) return; // Expired event

        const statusStr = String(event.status || "").toLowerCase();
        if (statusStr && !['published', 'upcoming', 'ongoing', 'scheduled'].includes(statusStr) && statusStr !== 'undefined') return;

        const audRaw = event.participants || event.audience || event.targetAudience;
        const audStr = JSON.stringify(audRaw || "").toLowerCase();
        const isForParents = audStr.includes('parent') || audStr.includes('everyone') || audStr.includes('all') || !audRaw || audStr === '""' || audStr === 'null';

        if (isForParents) {
            
            let sender = "Administration";
            if (event.createdBy === 'Principal') sender = 'Principal';
            if (event.createdBy === 'Teacher') sender = 'Teacher';

            const displayDate = event.createdAt || event.startDate;
            const isRead = readIds.includes(stringId);

            aggregatedFeed.push({
                id: stringId,
                title: event.title || event.eventName || "Upcoming Event",
                category: "Event",
                priority: event.priority === "High" || event.priority === "Urgent" ? "High" : "Medium",
                date: displayDate,
                timestamp: new Date(displayDate).getTime(),
                status: isRead ? "Read" : "Unread",
                receivedFrom: sender,
                // Payload
                startDate: event.startDate,
                endDate: event.endDate,
                venue: event.venue || event.location || "School Campus",
                content: event.description
            });
        }
    });

    // --- Process PTMs ---
    rawMeetings.forEach(meeting => {
        const stringId = generateId("ptm", meeting._id);
        if (clearedIds.includes(stringId)) return;
        
        const targetCls = meeting.className;
        const targetSec = meeting.sectionName;

        let matchedChild = null;
        if (targetCls && targetCls !== "All Classes") {
            matchedChild = parentProfile?.students?.find(student => {
                const studentClassName = student.class?.name;
                if (!studentClassName || studentClassName.toLowerCase() !== targetCls.toLowerCase()) {
                    return false;
                }
                if (targetSec && targetSec !== "All Sections") {
                    const studentSectionName = student.section?.name;
                    return studentSectionName && studentSectionName.toLowerCase() === targetSec.toLowerCase();
                }
                return true;
            });
            if (!matchedChild) return; // Hide if parent has no child matching target class/section
        }

        const displayDate = meeting.createdAt || meeting.scheduledAt;
        const isRead = meeting.status === 'completed' || readIds.includes(stringId);

        // Format times
        const scheduled = new Date(meeting.scheduledAt);
        const startTimeStr = meeting.startTime || scheduled.toTimeString().slice(0, 5);
        const duration = meeting.durationMinutes || 60;
        const [sh, sm] = startTimeStr.split(":").map(Number);
        
        const formatTimeAmPm = (h, m) => {
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayHour = h % 12 === 0 ? 12 : h % 12;
            const displayMin = m < 10 ? '0' + m : m;
            return `${displayHour}:${displayMin} ${ampm}`;
        };
        const startTimeLabel = formatTimeAmPm(sh, sm);
        const endTimeLabel = formatTimeAmPm(Math.floor((sh * 60 + sm + duration) / 60) % 24, (sh * 60 + sm + duration) % 60);

        aggregatedFeed.push({
            id: stringId,
            title: `Parent Teacher Meeting Scheduled`,
            category: "PTM",
            priority: "High",
            date: displayDate,
            timestamp: new Date(displayDate).getTime(),
            status: isRead ? "Read" : "Unread",
            receivedFrom: meeting.createdBy?.name || "School Administration",
            // Payload
            studentName: matchedChild?.name || "Your Child",
            meetingDate: meeting.scheduledAt,
            startTime: startTimeLabel,
            endTime: endTimeLabel,
            venue: meeting.isOnline ? (meeting.meetingLink || meeting.venue || "Online") : (meeting.venue || "School premises"),
            agenda: meeting.agenda || ""
        });
    });

    // --- Process Announcements ---
    rawAnnouncements.forEach(ann => {
        const stringId = generateId("ann", ann._id);
        if (clearedIds.includes(stringId)) return;

        const targetAud = ann.targetAudience;

        let matchedChild = null;
        if (targetAud && targetAud !== "All Classes") {
            matchedChild = parentProfile?.students?.find(student => {
                const studentClassName = student.class?.name;
                return studentClassName && targetAud.toLowerCase().includes(studentClassName.toLowerCase());
            });
            if (!matchedChild) return; // Hide if parent has no child matching target class
        }

        const displayDate = ann.createdAt;
        const isRead = readIds.includes(stringId);

        aggregatedFeed.push({
            id: stringId,
            title: ann.title || "Class Announcement",
            category: "Notice",
            priority: ann.priority === "high" ? "High" : "Medium",
            date: displayDate,
            timestamp: new Date(displayDate).getTime(),
            status: isRead ? "Read" : "Unread",
            receivedFrom: ann.authorNameLabel || ann.author?.name || "Teacher",
            content: ann.description
        });
    });

    // --- Process Fees ---
    rawFees.forEach(fee => {
        const stringId = generateId("fee", fee._id);
        if (clearedIds.includes(stringId)) return;
        
        const displayDate = fee.paymentDate || fee.createdAt;
        const isRead = readIds.includes(stringId);

        aggregatedFeed.push({
            id: stringId,
            title: `Fee Payment Successful (Receipt: ${fee.receiptNumber || 'N/A'})`,
            category: "Fee",
            priority: "Medium",
            date: displayDate,
            timestamp: new Date(displayDate).getTime(),
            status: isRead ? "Read" : "Unread",
            receivedFrom: "Accountant",
            // Payload
            studentName: fee.student?.name || "Your Child",
            amount: fee.paidAmount || fee.amount,
            receiptNumber: fee.receiptNumber,
            paymentMethod: fee.paymentMethod || fee.paymentMode
        });
    });

    // 4. Deduplicate (just in case) and Sort by Date (descending)
    const seen = new Set();
    const uniqueFeed = aggregatedFeed.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });

    uniqueFeed.sort((a, b) => {
        return b.timestamp - a.timestamp; // Newest first
    });

    // Format dates for the UI here
    const finalFeed = uniqueFeed.slice(0, 100).map(item => {
        return {
            ...item,
            // Fallback string if it's an invalid date
            date: item.date ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'
        };
    });

    return res.status(200).json({
      success: true,
      data: finalFeed,
    });
  } catch (error) {
    console.error("Error in getParentNotifications:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/parent/notifications/read
 * @access  Private (Parent)
 */
export const markNotificationRead = async (req, res) => {
    try {
        const { notificationId, notificationIds } = req.body;
        
        let idsToAdd = [];
        if (notificationIds && Array.isArray(notificationIds)) {
             idsToAdd = notificationIds.map(String);
        } else if (notificationId) {
             idsToAdd = [String(notificationId)];
        } else {
             return res.status(400).json({ success: false, message: "ID(s) required" });
        }
        
        await Parent.updateOne(
            { user: req.user._id },
            { $addToSet: { readNotifications: { $each: idsToAdd } } }
        );

        res.status(200).json({ success: true, message: "Marked as read" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Clear all currently read notifications
 * @route   POST /api/parent/notifications/clear-read
 * @access  Private (Parent)
 */
export const clearReadNotifications = async (req, res) => {
    try {
        const { notificationIds } = req.body; // Array of IDs to clear
        if (!notificationIds || !Array.isArray(notificationIds)) {
            return res.status(400).json({ success: false, message: "Array of IDs required" });
        }

        await Parent.updateOne(
            { user: req.user._id },
            { $addToSet: { clearedNotifications: { $each: notificationIds.map(String) } } }
        );

        res.status(200).json({ success: true, message: "Notifications cleared successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
