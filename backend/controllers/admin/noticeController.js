import Notice from "../../models/common/Notice.js";
import Notification from "../../models/common/Notification.js";
import User from "../../models/users/user.model.js";
import mongoose from "mongoose";

const normalizeAudience = (audience) => {
    if (!audience) return ['all'];
    const audArray = Array.isArray(audience) ? audience : [audience];
    return audArray.map(aud => {
        const lower = String(aud).toLowerCase().trim();
        if (lower === 'teacher') return 'teachers';
        if (lower === 'student') return 'students';
        if (lower === 'parent') return 'parents';
        if (lower === 'accountant') return 'accountants';
        return lower;
    });
};

const mapAudienceToRoles = (audiences) => {
    if (!audiences || audiences.length === 0) return [];
    const roles = new Set();
    audiences.forEach(aud => {
        const lower = String(aud).toLowerCase().trim();
        if (lower === 'all' || lower === 'everyone' || lower === 'all users') {
            roles.add('principal'); roles.add('admin'); roles.add('teacher'); 
            roles.add('accountant'); roles.add('parent'); roles.add('student');
        } else if (lower.includes('parent')) {
            roles.add('parent');
        } else if (lower.includes('student')) {
            roles.add('student');
        } else if (lower.includes('teacher')) {
            roles.add('teacher');
        } else if (lower.includes('accountant')) {
            roles.add('accountant');
        } else if (lower.includes('principal')) {
            roles.add('principal');
        } else if (lower.includes('admin')) {
            roles.add('admin');
        }
    });
    return Array.from(roles);
};

const createNotificationsForNotice = async (notice, senderName, senderRole) => {
    try {
        const targetRoles = mapAudienceToRoles(notice.targetAudience);
        if (targetRoles.length === 0) return;

        let query = { school: notice.school, role: { $in: targetRoles } };
        
        const users = await User.find(query).select('_id');
        const notifications = users.map(u => ({
            user: u._id,
            title: `Notice: ${notice.title}`,
            message: notice.content,
            type: 'notice',
            read: false,
            school: notice.school,
            senderName: senderName || 'Admin',
            senderRole: senderRole || 'Admin',
            source: 'Admin'
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications, { ordered: false });
        }
    } catch (error) {
        console.error("Error creating notifications for notice:", error);
    }
};

/**
 * @desc    Create a new notice
 * @route   POST /api/admin/notice
 */
export const createNotice = async (req, res) => {
    try {
        const { title, content, category, targetAudience, targetClass, targetSection, priority, expiryDate, status, scheduledPublishAt, isPinned, attachments } = req.body;
        const schoolId = req.user.school._id || req.user.school;
        const organizationId = req.user.school.organization;

        const notice = await Notice.create({
            organization: organizationId,
            school: schoolId,
            title,
            content,
            category: category || 'general',
            targetAudience: normalizeAudience(targetAudience),
            targetClass: targetClass || 'All Classes',
            targetSection: targetSection || 'All Sections',
            priority: priority || 'Medium',
            expiryDate: expiryDate || null,
            status: scheduledPublishAt ? 'scheduled' : (status || 'published'),
            scheduledPublishAt,
            isPinned: isPinned || false,
            attachments: attachments || [],
            createdBy: req.user._id
        });

        // Create notifications asynchronously for target audience
        createNotificationsForNotice(notice, req.user.name, 'Admin');

        res.status(201).json({
            success: true,
            message: 'Notice created successfully',
            data: notice
        });
    } catch (error) {
        console.error("Error creating notice:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get all notices with filtering and search
 * @route   GET /api/admin/notice
 */
export const getAllNotices = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;
        const { category, status, targetAudience, targetClass, targetSection, search, page = 1, limit = 10 } = req.query;

        const query = { school: schoolId };
        
        if (category) query.category = category;
        if (status) query.status = status;
        if (targetClass && targetClass !== 'All Classes') query.targetClass = { $in: ['All Classes', targetClass] };
        if (targetSection && targetSection !== 'All Sections') query.targetSection = { $in: ['All Sections', targetSection] };
        if (targetAudience) {
            const normalized = normalizeAudience(targetAudience);
            query.targetAudience = { $in: [...normalized, 'all'] };
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        const notices = await Notice.find(query)
            .populate("createdBy", "name role")
            .sort({ isPinned: -1, createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Notice.countDocuments(query);

        res.status(200).json({
            success: true,
            count: notices.length,
            total,
            pages: Math.ceil(total / limit),
            data: notices
        });
    } catch (error) {
        console.error("Error fetching notices:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update a notice
 * @route   PUT /api/admin/notice/:id
 */
export const updateNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.school._id || req.user.school;

        const updateData = { ...req.body };
        if (updateData.targetAudience) {
            updateData.targetAudience = normalizeAudience(updateData.targetAudience);
        }

        const notice = await Notice.findOneAndUpdate(
            { _id: id, school: schoolId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!notice) return res.status(404).json({ success: false, message: "Notice not found" });

        res.status(200).json({ success: true, message: "Notice updated successfully", data: notice });
    } catch (error) {
        console.error("Error updating notice:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Delete a notice
 * @route   DELETE /api/admin/notice/:id
 */
export const deleteNotice = async (req, res) => {
    try {
        const { id } = req.params;
        const schoolId = req.user.school._id || req.user.school;

        const notice = await Notice.findOneAndDelete({ _id: id, school: schoolId });
        if (!notice) return res.status(404).json({ success: false, message: "Notice not found" });

        res.status(200).json({ success: true, message: "Notice deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Track notice view
 * @route   POST /api/admin/notice/:id/view
 */
export const trackNoticeView = async (req, res) => {
    try {
        const { id } = req.params;
        const notice = await Notice.findById(id);
        
        if (!notice) return res.status(404).json({ success: false, message: "Notice not found" });

        // Check if user already viewed
        const alreadyViewed = notice.viewedBy.find(v => v.user.toString() === req.user._id.toString());
        if (!alreadyViewed) {
            notice.viewedBy.push({ user: req.user._id, viewedAt: new Date() });
            await notice.save();
        }

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get notice stats and analytics
 * @route   GET /api/admin/notice/stats
 */
export const getNoticeStats = async (req, res) => {
    try {
        const schoolId = req.user.school._id || req.user.school;

        const stats = await Notice.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const categoryStats = await Notice.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]);

        const priorityStats = await Notice.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
            { $group: { _id: "$priority", count: { $sum: 1 } } }
        ]);

        // Get total views count
        const totalViews = await Notice.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId) } },
            { $project: { viewsCount: { $size: { $ifNull: ["$viewedBy", []] } } } },
            { $group: { _id: null, total: { $sum: "$viewsCount" } } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                statusStats: stats,
                categoryStats,
                priorityStats,
                totalViews: totalViews[0]?.total || 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Bulk notice management
 * @route   POST /api/admin/notice/bulk-action
 */
export const bulkNoticeAction = async (req, res) => {
    try {
        const { ids, action } = req.body; // action: 'delete', 'archive', 'unpin'
        const schoolId = req.user.school._id || req.user.school;

        let result;
        if (action === 'delete') {
            result = await Notice.deleteMany({ _id: { $in: ids }, school: schoolId });
        } else if (action === 'archive') {
            result = await Notice.updateMany({ _id: { $in: ids }, school: schoolId }, { status: 'archived' });
        } else if (action === 'unpin') {
            result = await Notice.updateMany({ _id: { $in: ids }, school: schoolId }, { isPinned: false });
        }

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount || result.deletedCount} notices updated successfully`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Get single notice by ID
 * @route   GET /api/admin/notice/:id
 */
export const getNoticeById = async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id)
            .populate("createdBy", "name role")
            .populate("viewedBy.user", "name role");

        if (!notice) return res.status(404).json({ success: false, message: "Notice not found" });

        res.status(200).json({ success: true, data: notice });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
