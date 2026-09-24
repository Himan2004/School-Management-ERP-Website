import Announcement from "../../models/academic/Announcement.model.js";
import Notification from "../../models/common/Notification.js"; 
import Student from "../../models/users/student.model.js";
import Teacher from "../../models/users/teacher.model.js"; // Verify this path matches your folder structure!
import Notice from "../../models/common/Notice.js"; // Adjust path if needed
import Parent from "../../models/users/parent.model.js";
import SubjectAssignment from "../../models/principal/SubjectAssignment.model.js";
import { sendRealTimeNotification } from "../../utils/sseManager.js";

// @desc    Get announcements with Search & Filters
// @route   GET /api/teacher/announcements
export const getAnnouncements = async (req, res) => {
    try {
        const { search, target, sortDate, priorityFilter } = req.query;
        
        // Build the query object dynamically based on frontend filters
        let query = { school: req.user.school, isActive: true };

        // 1. Search Bar Logic
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // 2. Dropdown Filter Logic
        if (target && target !== 'All Classes') {
            query.targetAudience = { $in: [target, 'All Classes'] };
        }

        // 3. Priority Exact Filter (e.g., "Show me ONLY High priority")
        if (priorityFilter && priorityFilter !== 'all') {
            query.priority = priorityFilter.toLowerCase();
        }

        // 4. Date Sorting Logic
        let sortOptions = { isPinned: -1 }; // Always keep pinned at top
        if (sortDate === 'earliest') {
            sortOptions.createdAt = 1; // Ascending (Oldest first)
        } else {
            sortOptions.createdAt = -1; // Descending (Newest first)
        }

        // Fetch and sort
        const announcements = await Announcement.find(query).sort(sortOptions);

        // Map to exact frontend UI format
        const formattedData = announcements.map(a => ({
            id: a._id,
            title: a.title,
            description: a.description,
            createdDate: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : "",
            date: a.createdAt,
            target: a.targetAudience,
            classId: a.targetAudience === "All Classes" ? "All Classes" : (a.targetClassId ? a.targetAudience : "All Classes"),
            section: a.section || "A",
            type: a.type || "General",
            expiryDate: a.expiryDate ? new Date(a.expiryDate).toISOString().slice(0, 10) : "",
            status: a.status || "Active",
            priority: a.priority ? (a.priority.charAt(0).toUpperCase() + a.priority.slice(1)) : "Medium",
            pinned: a.isPinned || false,
            archived: a.isArchived || false,
            teacherName: a.authorNameLabel || "Teacher",
            author: a.authorNameLabel,
            studentsReached: a.studentsReached || 0,
            attachments: a.attachments || []
        }));

        res.status(200).json({ success: true, data: formattedData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a new announcement
// @route   POST /api/teacher/announcements
export const createAnnouncement = async (req, res) => {
    try {
        const { 
            title, 
            description, 
            targetAudience, 
            targetClassId, 
            section,
            type,
            expiryDate,
            status,
            priority, 
            attachments, 
            isPinned, 
            isArchived,
            sendNotification 
        } = req.body;

        // --- THE FIX ---
        // Safely extract the organization ID. If it's not directly on req.user, check inside req.user.school.
        // If it's completely missing (like on a test user), fallback to the school ID to pass validation.
        let orgId = req.user.organization;
        if (!orgId && req.user.school && req.user.school.organization) {
            orgId = req.user.school.organization;
        }
        if (!orgId) {
            orgId = req.user.school?._id || req.user.school; 
        }

        // 1. Calculate studentsReached dynamically based on target audience
        let targetUserIds = [];
        if (targetAudience === 'All Classes') {
            // Find ALL active students in the school
            const allStudents = await Student.find({ school: req.user.school, status: 'active' }).select('user');
            targetUserIds = allStudents.map(student => student.user?._id || student.user).filter(Boolean);
        } 
        else if (targetClassId) {
            // Find students ONLY in the specific class selected from the dropdown
            const classStudents = await Student.find({ 
                school: req.user.school, 
                class: targetClassId, 
                status: 'active' 
            }).select('user');
            targetUserIds = classStudents.map(student => student.user?._id || student.user).filter(Boolean);
        }

        // 2. Save the Announcement
        const newAnnouncement = new Announcement({
            organization: orgId,
            school: req.user.school?._id || req.user.school,
            title,
            description,
            targetAudience, // E.g., "All Classes" or "Grade 10-A"
            targetClassId: targetClassId || null,
            section: section || "A",
            type: type || "General",
            expiryDate: expiryDate || null,
            status: status || "Active",
            priority: priority ? priority.toLowerCase() : "medium",
            attachments: attachments || [],
            isPinned: isPinned || false,
            isArchived: isArchived || false,
            studentsReached: targetUserIds.length,
            author: req.user._id,
            authorNameLabel: req.user.name || "Teacher"
        });

        await newAnnouncement.save();

        // 3. The Dynamic Push Notification Mapping
        if (sendNotification) {
            // Find parents of these students
            let parentUserIds = [];
            try {
                const studentsInClass = await Student.find({ school: req.user.school, user: { $in: targetUserIds } }).select('_id');
                const studentIds = studentsInClass.map(s => s._id);
                const parents = await Parent.find({ students: { $in: studentIds } }).populate('user').lean();
                parentUserIds = parents.map(p => p.user?._id || p.user).filter(id => id);
            } catch (err) {
                console.error("Error finding parents for announcement notifications:", err);
            }

            // Find subject teachers assigned to this class
            let teacherUserIds = [];
            try {
                let teacherQuery = { school: req.user.school };
                if (targetClassId) {
                    teacherQuery.class = targetClassId;
                }
                const assignments = await SubjectAssignment.find(teacherQuery).populate('teacher').lean();
                teacherUserIds = assignments.map(a => a.teacher?.user).filter(id => id);
            } catch (err) {
                console.error("Error finding teachers for announcement notifications:", err);
            }

            // Collect all unique user IDs to notify
            const finalUserIdsToNotify = new Set([
                ...targetUserIds.map(id => id.toString()),
                ...parentUserIds.map(id => id.toString()),
                ...teacherUserIds.map(id => id.toString())
            ]);

            const cleanDescription = (description || "").replace(/<[^>]+>/g, " ").trim();
            const displayMsg = cleanDescription.length > 80 ? cleanDescription.substring(0, 80) + "..." : cleanDescription;

            if (finalUserIdsToNotify.size > 0) {
                const notificationsToInsert = Array.from(finalUserIdsToNotify).map(userId => ({
                    user: userId,
                    school: req.user.school,
                    title: `New Announcement: ${title}`,
                    message: displayMsg || "New notice published by teacher.",
                    type: "notice"
                }));

                // 4. Bulk insert into the database
                const createdNotifs = await Notification.insertMany(notificationsToInsert);

                // Trigger real-time SSE notifications
                for (const notif of createdNotifs) {
                    try {
                        sendRealTimeNotification(notif.user, notif);
                    } catch (e) {
                        // ignore sse errors
                    }
                }
            }
        }

        res.status(201).json({ success: true, message: "Announcement posted!", data: newAnnouncement });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update an announcement (Edit Button)
// @route   PUT /api/teacher/announcements/:id
export const updateAnnouncement = async (req, res) => {
    try {
        const updatedAnnouncement = await Announcement.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true }
        );
        res.status(200).json({ success: true, message: "Updated successfully", data: updatedAnnouncement });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete an announcement (Trash Button)
// @route   DELETE /api/teacher/announcements/:id
export const deleteAnnouncement = async (req, res) => {
    try {
        await Announcement.findByIdAndUpdate(req.params.id, { isActive: false });
        res.status(200).json({ success: true, message: "Announcement deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get classes specifically assigned to the logged-in teacher
// @route   GET /api/teacher/announcements/classes
export const getTeacherClasses = async (req, res) => {
    try {
        // Find the Teacher document linked to the currently logged-in User
        const teacherProfile = await Teacher.findOne({ user: req.user._id })
            .populate('assignedClasses', 'name'); // Populate the actual class data, not just IDs

        if (!teacherProfile) {
            return res.status(404).json({ success: false, message: "Teacher profile not found" });
        }

        // Return only the assigned classes array
        res.status(200).json({ success: true, data: teacherProfile.assignedClasses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// @desc    Get official notices from Principal/Admin
// @route   GET /api/teacher/official-notices
export const getOfficialNotices = async (req, res) => {
    try {
        // 1. Safely extract school ID (Handles cases where req.user.school is an object or string)
        const schoolId = req.user.school?._id || req.user.school;

        // 2. Fetch all published notices (Checking BOTH 'school' and 'branch' fields just in case)
        const notices = await Notice.find({
            $or: [
                { school: schoolId }, 
                { branch: schoolId }
            ],
            // Catch 'Published', 'published', 'Active', 'active'
            status: { $regex: /^(published|active)$/i } 
        }).sort({ createdAt: -1 }).lean();

        // 3. Filter the Audience in JavaScript (This prevents MongoDB Array/String crashing errors)
        const teacherNotices = notices.filter(notice => {
            // Get whatever audience field the Principal schema actually uses
            const aud = notice.audience || notice.targetAudience || notice.target || [];
            
            // Convert it to a single lowercase string (Safely handles both Arrays and pure Strings)
            const audString = (Array.isArray(aud) ? aud.join(',') : String(aud)).toLowerCase();
            
            // If it mentions teachers, everyone, all, staff, or is completely global (blank), include it!
            return audString.includes('teacher') || 
                   audString.includes('everyone') || 
                   audString.includes('all') || 
                   audString.includes('staff') ||
                   audString === '' || 
                   audString === 'undefined';
        });

        // Map notices to include viewed / unread status
        const mappedNotices = teacherNotices.map(notice => {
            const isViewed = notice.viewedBy && notice.viewedBy.some(
                v => v.user && v.user.toString() === req.user._id.toString()
            );
            return {
                ...notice,
                unread: !isViewed
            };
        });

        res.status(200).json({ success: true, data: mappedNotices });
    } catch (error) {
        console.error("Error fetching official notices:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark official notice as read
// @route   PUT /api/teacher/announcements/official-notices/:id/read
export const markNoticeAsRead = async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);
        if (!notice) {
            return res.status(404).json({ success: false, message: "Notice not found" });
        }

        // Check if already viewed
        const alreadyViewed = notice.viewedBy && notice.viewedBy.some(
            v => v.user && v.user.toString() === req.user._id.toString()
        );

        if (!alreadyViewed) {
            if (!notice.viewedBy) {
                notice.viewedBy = [];
            }
            notice.viewedBy.push({ user: req.user._id, viewedAt: new Date() });
            await notice.save();
        }

        res.status(200).json({ success: true, message: "Notice marked as read" });
    } catch (error) {
        console.error("Error marking notice as read:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};