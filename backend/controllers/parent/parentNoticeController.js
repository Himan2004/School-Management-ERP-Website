import Notice from "../../models/common/Notice.js";
import Parent from "../../models/users/parent.model.js";
import mongoose from "mongoose";

// @desc    Get all notices for parent dashboard
// @route   GET /api/parent/notices
export const getNotices = async (req, res) => {
    try {
        const parentUserId = req.user._id;

        // 1. Fetch parent's children to get their classes and sections
        const parentProfile = await Parent.findOne({ user: parentUserId }).populate('students');

        const schoolIds = new Set();
        const rawSchoolId = req.user.school_id || req.user.school?._id || req.user.school;
        if (rawSchoolId) schoolIds.add(rawSchoolId.toString());

        const childClassIds = [];
        const childSectionIds = [];
        const childClassNames = [];

        if (parentProfile && parentProfile.students) {
            parentProfile.students.forEach(s => {
                if (s.school) schoolIds.add(s.school.toString());
                if (s.class) {
                    childClassIds.push(String(s.class._id || s.class));
                    if (s.class.name) childClassNames.push(String(s.class.name).toLowerCase());
                }
                if (s.section) {
                    childSectionIds.push(String(s.section._id || s.section));
                }
            });
        }

        const schoolObjIds = Array.from(schoolIds).map(id => new mongoose.Types.ObjectId(id));
        const schoolStrIds = Array.from(schoolIds);

        // 2. Fetch notices for all associated schools
        const records = await Notice.find({
            $or: [
                { school: { $in: schoolObjIds } },
                { school: { $in: schoolStrIds } },
                { branch: { $in: schoolObjIds } }
            ]
        }).lean();

        // 3. Bulletproof JavaScript Filtering
        const validNotices = records.filter(item => {
            // --- A. Status Check ---
            const statusStr = String(item.status || "").toLowerCase();
            if (!['published', 'active', 'scheduled'].includes(statusStr)) {
                return false;
            }

            // --- B. Audience Check ---
            const audRaw = item.audience || item.targetAudience || item.target || item.roles || item.visibleTo;
            const audStr = JSON.stringify(audRaw || "").toLowerCase();

            const isForParents = audStr.includes('parent') ||
                audStr.includes('everyone') ||
                audStr.includes('all') ||
                audStr === '""' ||
                audStr === 'null' ||
                audStr === '[]' ||
                audStr === '{}' ||
                !audRaw;

            if (!isForParents) return false;

            // --- C. Class Check ---
            const clsRaw = item.class || item.targetClass || item.classes || item.classId;
            const clsStr = JSON.stringify(clsRaw || "").toLowerCase();
            const isAllClasses = clsStr.includes('all') ||
                clsStr === '""' ||
                clsStr === 'null' ||
                clsStr === '[]' ||
                clsStr === '{}' ||
                !clsRaw;

            let isForMyChildsClass = false;
            if (isAllClasses) {
                isForMyChildsClass = true;
            } else {
                isForMyChildsClass = childClassIds.some(id => clsStr.includes(id.toLowerCase())) ||
                    childClassNames.some(name => clsStr.includes(name));
            }

            if (!isForMyChildsClass) return false;

            // --- D. Section Check ---
            const secRaw = item.section || item.targetSection || item.sections || item.sectionId;
            const secStr = JSON.stringify(secRaw || "").toLowerCase();
            const isAllSections = secStr.includes('all') ||
                secStr === '""' ||
                secStr === 'null' ||
                secStr === '[]' ||
                secStr === '{}' ||
                !secRaw;

            let isForMyChildsSection = false;
            if (isAllSections) {
                isForMyChildsSection = true;
            } else {
                isForMyChildsSection = childSectionIds.some(id => secStr.includes(id.toLowerCase()));
            }

            return isForMyChildsSection;
        });

        // 4. Sort strictly by Creation Date in JavaScript (fixes the Principal's expiry date bug)
        validNotices.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.date || 0).getTime();
            const dateB = new Date(b.createdAt || b.date || 0).getTime();
            return dateB - dateA; // Newest first
        });

        // 5. Map to UI format exactly as React expects
        const formattedNotices = validNotices.map(notice => {
            const hasRead = notice.viewedBy?.some(
                view => view.user?.toString() === parentUserId.toString()
            );

            // Normalize category string for UI tabs
            let uiCategory = notice.category || notice.type || 'General';
            uiCategory = uiCategory.charAt(0).toUpperCase() + uiCategory.slice(1);
            if (uiCategory === 'Urgent') uiCategory = 'Emergency';

            // Safe display date (Ignores scheduledPublishAt because Principal uses it for Expiry)
            const displayDate = notice.createdAt || notice.date || notice.publishDate;

            return {
                id: notice._id,
                title: notice.title || notice.noticeTitle || "School Notice",
                category: uiCategory,
                content: notice.content || notice.description || "",
                date: new Date(displayDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                unread: !hasRead,
                attachment: notice.attachments && notice.attachments.length > 0,
                attachmentName: notice.attachments?.length > 0 ? notice.attachments[0].name : null
            };
        });

        res.status(200).json({ success: true, data: formattedNotices });
    } catch (error) {
        console.error("Error fetching parent notices:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mark a notice as read
// @route   PUT /api/parent/notices/:id/read
export const markNoticeAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const parentId = req.user._id;

        await Notice.findByIdAndUpdate(id, {
            $addToSet: { viewedBy: { user: parentId, viewedAt: new Date() } }
        });

        res.status(200).json({ success: true, message: "Notice marked as read" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};