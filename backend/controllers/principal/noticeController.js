import mongoose from "mongoose";
import Notice from "../../models/common/Notice.js";

const toSchoolId = (user) => user.school?._id || user.school;
const toOrganizationId = (user) => user.school?.organization;

const categoryToDb = {
  Academic: "academic",
  Administrative: "general",
  Exam: "academic",
  Holiday: "holiday",
  General: "general",
  Urgent: "emergency",
  academic: "academic",
  finance: "finance",
  events: "events",
  holiday: "holiday",
  general: "general",
  emergency: "emergency",
};

const categoryToUi = {
  academic: "Academic",
  finance: "General",
  events: "General",
  holiday: "Holiday",
  general: "General",
  emergency: "Urgent",
};

const audienceToDb = {
  Teachers: "teachers",
  Students: "students",
  Parents: "parents",
  Accountants: "accountants",
  Everyone: "all",
  all: "all",
  teachers: "teachers",
  students: "students",
  parents: "parents",
  accountants: "accountants",
};

const audienceToUi = {
  all: "Everyone",
  teachers: "Teachers",
  students: "Students",
  parents: "Parents",
  accountants: "Accountants",
};

const statusToDb = {
  Published: "published",
  Draft: "draft",
  Scheduled: "scheduled",
  Archived: "archived",
  published: "published",
  draft: "draft",
  scheduled: "scheduled",
  archived: "archived",
  Expired: "archived",
};

const mapNoticeForUi = (notice) => {
  const noticeObj = notice.toObject ? notice.toObject() : notice;
  const expiryDate = noticeObj.scheduledPublishAt
    ? new Date(noticeObj.scheduledPublishAt).toISOString().split("T")[0]
    : null;
  const status =
    noticeObj.status === "archived"
      ? "Expired"
      : noticeObj.status.charAt(0).toUpperCase() + noticeObj.status.slice(1);

  return {
    ...noticeObj,
    id: noticeObj._id,
    category: categoryToUi[noticeObj.category] || "General",
    audience: (noticeObj.targetAudience || []).map((a) => audienceToUi[a] || "Everyone"),
    publishedDate: noticeObj.createdAt ? new Date(noticeObj.createdAt).toISOString().split("T")[0] : null,
    expiryDate,
    pinned: !!noticeObj.isPinned,
    status,
    viewCount: noticeObj.viewedBy?.length || 0,
    publishedBy: noticeObj.createdBy?.name || "Principal",
    description: noticeObj.content ? `${noticeObj.content.slice(0, 90)}...` : "",
    attachments: (noticeObj.attachments || []).map((attachment, index) => {
      if (typeof attachment === "string") {
        return {
          name: `Attachment ${index + 1}`,
          url: attachment,
          type: "",
        };
      }
      return {
        name: attachment?.name || `Attachment ${index + 1}`,
        url: attachment?.url || "",
        type: attachment?.type || "",
      };
    }),
  };
};

export const createNotice = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const organizationId = toOrganizationId(req.user);
    
    if (!schoolId || !organizationId) {
         return res.status(400).json({ success: false, message: "Organization or School ID missing" });
    }

    const {
      title,
      content,
      category,
      targetAudience,
      audience,
      status,
      isPinned,
      pinned,
      scheduledPublishAt,
      expiryDate,
      attachments,
    } = req.body;

    // Safely map audience array
    const incomingAudience = Array.isArray(targetAudience) && targetAudience.length > 0 ? targetAudience : 
                             (Array.isArray(audience) && audience.length > 0 ? audience : ["Everyone"]);
    
    const mappedAudience = incomingAudience.map(a => audienceToDb[a] || "all");

    const notice = await Notice.create({
      organization: organizationId,
      school: schoolId,
      title,
      content,
      category: categoryToDb[category] || "general",
      targetAudience: mappedAudience,
      status: statusToDb[status] || "draft", // Default to draft if mapping fails
      isPinned: typeof isPinned === "boolean" ? isPinned : !!pinned,
      scheduledPublishAt: scheduledPublishAt || expiryDate || null,
      attachments: attachments || [],
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      data: mapNoticeForUi(notice),
      message: "Notice created successfully",
    });
  } catch (error) {
    console.error("Create Notice Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllNotices = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    // CHANGE 1: Set default limit to 100 instead of 10
    const { category, status, targetAudience, search, page = 1, limit = 100 } = req.query;

    const query = { school: schoolId };
    if (category) query.category = categoryToDb[category] || category;
    if (status) query.status = statusToDb[status] || status;
    if (targetAudience) query.targetAudience = { $in: [audienceToDb[targetAudience] || targetAudience, "all"] };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    // CHANGE 2: Ensure limitNum defaults to 100
    const limitNum = Number(limit) || 100;
    const pageNum = Number(page) || 1;

    const notices = await Notice.find(query)
      .populate("createdBy", "name role")
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum);

    const total = await Notice.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: notices.map(mapNoticeForUi),
      pagination: {
        total,
        pages: Math.ceil(total / limitNum),
        page: pageNum,
        limit: limitNum,
      },
      message: "Notices fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getNoticeById = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const notice = await Notice.findOne({ _id: req.params.id, school: schoolId })
      .populate("createdBy", "name role")
      .populate("viewedBy.user", "name role");

    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    return res.status(200).json({
      success: true,
      data: mapNoticeForUi(notice),
      message: "Notice fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateNotice = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const { id } = req.params;
    
    if (!schoolId) {
        return res.status(400).json({ success: false, message: "School ID missing" });
    }

    const payload = { ...req.body };

    // Strict mappings for DB enums
    if (payload.category) payload.category = categoryToDb[payload.category] || "general";
    if (payload.status) payload.status = statusToDb[payload.status] || "draft";
    
    if (payload.audience || payload.targetAudience) {
      const incAudience = payload.audience || payload.targetAudience;
      payload.targetAudience = (Array.isArray(incAudience) ? incAudience : [incAudience]).map(a => audienceToDb[a] || "all");
      delete payload.audience;
    }
    
    if (payload.expiryDate) {
      payload.scheduledPublishAt = payload.expiryDate;
      delete payload.expiryDate;
    }
    
    if (payload.pinned !== undefined) {
      payload.isPinned = payload.pinned;
      delete payload.pinned;
    }

    const notice = await Notice.findOneAndUpdate(
      { _id: id, school: schoolId }, 
      { $set: payload }, 
      { new: true, runValidators: true }
    ).populate("createdBy", "name role");

    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    return res.status(200).json({
      success: true,
      data: mapNoticeForUi(notice),
      message: "Notice updated successfully",
    });
  } catch (error) {
    console.error("Update Notice Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteNotice = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const notice = await Notice.findOneAndDelete({ _id: req.params.id, school: schoolId });

    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    return res.status(200).json({
      success: true,
      data: null,
      message: "Notice deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const togglePinNotice = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const notice = await Notice.findOne({ _id: req.params.id, school: schoolId });
    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    notice.isPinned = !notice.isPinned;
    await notice.save();

    return res.status(200).json({
      success: true,
      data: mapNoticeForUi(notice),
      message: `Notice ${notice.isPinned ? "pinned" : "unpinned"} successfully`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getNoticeStats = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    if (!schoolId) {
        return res.status(400).json({ success: false, message: "School ID missing" });
    }
    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const now = new Date();

    const [totalNotices, publishedToday, activeNotices, expiredNotices] = await Promise.all([
      Notice.countDocuments({ school: schoolObjectId }),
      Notice.countDocuments({
        school: schoolObjectId,
        status: "published",
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }),
      Notice.countDocuments({
        school: schoolObjectId,
        status: "published",
        $or: [{ scheduledPublishAt: null }, { scheduledPublishAt: { $gte: now } }],
      }),
      Notice.countDocuments({
        school: schoolObjectId,
        $or: [{ status: "archived" }, { scheduledPublishAt: { $lt: now } }],
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: { totalNotices, publishedToday, activeNotices, expiredNotices },
      message: "Notice stats fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const trackNoticeView = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const notice = await Notice.findOne({ _id: req.params.id, school: schoolId });
    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    const alreadyViewed = notice.viewedBy.find((item) => item.user.toString() === req.user._id.toString());
    if (!alreadyViewed) {
      notice.viewedBy.push({ user: req.user._id, viewedAt: new Date() });
      await notice.save();
    }

    return res.status(200).json({
      success: true,
      data: { viewed: true },
      message: "Notice view tracked successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkNoticeAction = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const { ids = [], action } = req.body;

    if (!Array.isArray(ids) || !ids.length || !action) {
      return res.status(400).json({
        success: false,
        message: "ids and action are required",
      });
    }

    let result = { modifiedCount: 0, deletedCount: 0 };
    if (action === "delete") {
      result = await Notice.deleteMany({ _id: { $in: ids }, school: schoolId });
    } else if (action === "archive") {
      result = await Notice.updateMany({ _id: { $in: ids }, school: schoolId }, { status: "archived" });
    } else if (action === "unpin") {
      result = await Notice.updateMany({ _id: { $in: ids }, school: schoolId }, { isPinned: false });
    } else {
      return res.status(400).json({ success: false, message: "Unsupported action" });
    }

    return res.status(200).json({
      success: true,
      data: result,
      message: "Bulk action completed successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadNoticeAttachments = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school._id || req.user.school;

    const notice = await Notice.findOne({ _id: id, school: schoolId });
    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const newAttachments = req.files.map((file) => ({
      name: file.originalname,
      url: file.path,
      type: file.mimetype,
    }));

    notice.attachments = [...(notice.attachments || []), ...newAttachments];
    await notice.save();

    return res.status(200).json({
      success: true,
      message: "Attachments uploaded successfully",
      data: notice.attachments,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
