import mongoose from "mongoose";
import Notice from "../../../models/common/Notice.js";
import Notification from "../../../models/common/Notification.js";
import User from "../../../models/users/user.model.js";
import School from "../../../models/school/School.js";

// Helper to map audience selection to User roles
function mapAudienceToRoles(audiences) {
  if (!audiences || audiences.length === 0) return [];
  const roles = new Set();
  audiences.forEach(aud => {
    const audLower = aud.toLowerCase().trim();
    if (audLower === "all users" || audLower === "all") {
      roles.add("principal");
      roles.add("admin");
      roles.add("teacher");
      roles.add("accountant");
      roles.add("parent");
      roles.add("student");
    } else if (audLower === "parents" || audLower.includes("parent")) {
      roles.add("parent");
    } else if (audLower === "students" || audLower.includes("student")) {
      roles.add("student");
    } else if (audLower === "teachers" || audLower.includes("teacher")) {
      roles.add("teacher");
    } else if (audLower === "branch principals" || audLower.includes("principal")) {
      roles.add("principal");
    } else if (audLower === "accountant" || audLower.includes("accountant")) {
      roles.add("accountant");
    } else if (audLower === "admin" || audLower.includes("admin")) {
      roles.add("admin");
    } else if (audLower.includes("staff")) {
      roles.add("admin");
      roles.add("accountant");
    }
  });
  return Array.from(roles);
}

function formatAudienceDisplay(audiences, visibleToParents) {
  if (!audiences || audiences.length === 0) {
    return visibleToParents ? "Parents" : "Admin, Accountant";
  }
  const cleaned = [];
  audiences.forEach(aud => {
    let clean = aud.replace(/\bOnly\b/gi, "").trim();
    if (clean.toLowerCase() === "staff") {
      cleaned.push("Admin");
      cleaned.push("Accountant");
    } else {
      if (clean.toLowerCase() === "all users") clean = "All Users";
      else if (clean.toLowerCase() === "parents") clean = "Parents";
      else if (clean.toLowerCase() === "students") clean = "Students";
      else if (clean.toLowerCase() === "teachers") clean = "Teachers";
      else if (clean.toLowerCase() === "branch principals") clean = "Branch Principals";
      else if (clean.toLowerCase() === "accountant") clean = "Accountant";
      else if (clean.toLowerCase() === "admin") clean = "Admin";
      cleaned.push(clean);
    }
  });
  const uniqueCleaned = Array.from(new Set(cleaned.filter(Boolean)));
  if (uniqueCleaned.includes("All Users")) {
    return "All Users";
  }
  return uniqueCleaned.join(", ");
}

function cleanAudienceArray(audiences) {
  if (!audiences || audiences.length === 0) return [];
  const cleaned = [];
  audiences.forEach(aud => {
    let clean = aud.replace(/\bOnly\b/gi, "").trim();
    if (clean.toLowerCase() === "staff") {
      cleaned.push("Admin");
      cleaned.push("Accountant");
    } else {
      if (clean.toLowerCase() === "all users") clean = "All Users";
      else if (clean.toLowerCase() === "parents") clean = "Parents";
      else if (clean.toLowerCase() === "students") clean = "Students";
      else if (clean.toLowerCase() === "teachers") clean = "Teachers";
      else if (clean.toLowerCase() === "branch principals") clean = "Branch Principals";
      else if (clean.toLowerCase() === "accountant") clean = "Accountant";
      else if (clean.toLowerCase() === "admin") clean = "Admin";
      cleaned.push(clean);
    }
  });
  const uniqueCleaned = Array.from(new Set(cleaned.filter(Boolean)));
  if (uniqueCleaned.includes("All Users")) {
    return ["All Users"];
  }
  return uniqueCleaned;
}

// Helper to construct organization-scoped HQ-only notice query
const getOrgNoticeQuery = async (req) => {
  const orgId = req.user?.organization?._id || req.user?.organization || req.user?._id;
  if (!orgId) return null;

  // Find all schools in this organization
  const schools = await School.find({ organization: orgId }).select("_id");
  const schoolIds = schools.map(s => s._id);

  // Find all local users belonging to these schools (Principal, Admin, Teacher, Accountant, Parent, Student, etc.)
  const localUsers = await User.find({ school: { $in: schoolIds } }).select("_id");
  const localUserIds = localUsers.map(u => u._id);

  return {
    organization: orgId,
    createdBy: { $nin: localUserIds }
  };
};

/**
 * GET /api/superadmin/communication/notices
 * Get all broadcast notices belonging to current organization (HQ only)
 */
export const getAllNotices = async (req, res) => {
  try {
    const { school_id, type, search, page = 1, limit = 50 } = req.query;

    const baseQuery = await getOrgNoticeQuery(req);
    if (!baseQuery) {
      return res.status(400).json({ success: false, message: "Valid Organization context not found" });
    }

    const query = { ...baseQuery };

    if (school_id) {
      query.school = new mongoose.Types.ObjectId(school_id);
    }

    if (type && type !== "All") {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notices = await Notice.find(query)
      .populate("school", "schoolName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Notice.countDocuments(query);

    const formattedNotices = notices.map((notice) => {
      let targetText = formatAudienceDisplay(notice.targetAudience, notice.visibleToParents);

      return {
        id: notice._id,
        title: notice.title,
        message: notice.content,
        target: targetText,
        branch: notice.school?.schoolName || "All Branches",
        time: getTimeAgo(notice.createdAt),
        status: "SENT",
        type: notice.type || "general",
        createdAt: notice.createdAt,
        createdBy: notice.createdBy,
      };
    });

    // Get stats for this organization
    const totalNotices = await Notice.countDocuments(query);
    const emergencyNotices = await Notice.countDocuments({
      ...query,
      type: "emergency",
    });
    const policyNotices = await Notice.countDocuments({
      ...query,
      type: "policy",
    });
    const generalNotices = await Notice.countDocuments({
      ...query,
      type: "general",
    });

    return res.status(200).json({
      success: true,
      data: {
        notices: formattedNotices,
        stats: {
          total: totalNotices,
          emergency: emergencyNotices,
          policy: policyNotices,
          general: generalNotices,
        },
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Error in getAllNotices:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/superadmin/communication/notices
 * Create and publish a new notice/broadcast
 */
export const createNotice = async (req, res) => {
  try {
    const { title, content, type, targetAudience, schoolId } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Title and content are required" });
    }

    if (!schoolId) {
      return res
        .status(400)
        .json({ success: false, message: "Target Branch/School is required" });
    }

    if (!targetAudience || !Array.isArray(targetAudience) || targetAudience.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "At least one audience target is required" });
    }

    const orgId = req.user?.organization?._id || req.user?.organization || req.user?._id;
    if (!orgId) {
      return res
        .status(400)
        .json({ success: false, message: "Valid Organization context not found" });
    }

    const cleanedAudience = cleanAudienceArray(targetAudience);
    const noticeType = type || "general";
    const visibleToParentsFlag = cleanedAudience.some(
      (aud) => aud.toLowerCase().includes("parent") || aud.toLowerCase().includes("all")
    );
    const creatorId = req.superAdmin?._id || req.user?._id || orgId;

    if (schoolId === "all") {
      // Get all schools for current organization only
      const organizationSchools = await School.find({ organization: orgId }).select("_id schoolName");

      if (organizationSchools.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No schools found for this organization" });
      }

      for (const school of organizationSchools) {
        const notice = new Notice({
          organization: orgId,
          school: school._id,
          title,
          content,
          type: noticeType,
          targetAudience: cleanedAudience,
          visibleToParents: visibleToParentsFlag,
          createdBy: creatorId,
        });
        await notice.save();

        // Create notifications for targeted users in this school
        await createNotificationsForNotice(notice);
      }

      return res.status(201).json({
        success: true,
        message: `Notice published to all ${organizationSchools.length} branches successfully`,
        data: {
          title,
          target: cleanedAudience.join(", "),
          branch: "All Schools",
          time: "Just Now",
          status: "SENT",
          type: noticeType,
          createdAt: new Date(),
        },
      });
    }

    // Verify school belongs to current organization
    const school = await School.findOne({ _id: schoolId, organization: orgId });
    if (!school) {
      return res
        .status(400)
        .json({ success: false, message: "Branch/School not found or does not belong to this organization" });
    }

    const notice = new Notice({
      organization: orgId,
      school: schoolId,
      title,
      content,
      type: noticeType,
      targetAudience: cleanedAudience,
      visibleToParents: visibleToParentsFlag,
      createdBy: creatorId,
    });

    await notice.save();

    // Create notifications for targeted users in this school
    await createNotificationsForNotice(notice);

    return res.status(201).json({
      success: true,
      message: `Notice published to ${school.schoolName} successfully`,
      data: {
        id: notice._id,
        title: notice.title,
        message: notice.content,
        target: cleanedAudience.join(", "),
        branch: school.schoolName,
        time: "Just Now",
        status: "SENT",
        type: notice.type,
        createdAt: notice.createdAt,
      },
    });
  } catch (error) {
    console.error("Error in createNotice:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/superadmin/communication/notices/bulk
 * Create bulk notice for all branches within the organization
 */
export const createBulkNotice = async (req, res) => {
  try {
    const { title, content, type, targetAudience } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Title and content are required" });
    }

    const orgId = req.user?.organization?._id || req.user?.organization || req.user?._id;
    if (!orgId) {
      return res
        .status(400)
        .json({ success: false, message: "Valid Organization context not found" });
    }

    const audienceList = targetAudience || ["All Users"];

    // Get all schools for current organization only
    const organizationSchools = await School.find({ organization: orgId }).select("_id schoolName");

    const createdNotices = [];
    const visibleToParentsFlag = audienceList.some(
      (aud) => aud.toLowerCase().includes("parent") || aud.toLowerCase().includes("all")
    );

    const creatorId = req.superAdmin?._id || req.user?._id || orgId;

    for (const school of organizationSchools) {
      const notice = new Notice({
        organization: orgId,
        school: school._id,
        title,
        content,
        type: type || "general",
        targetAudience: audienceList,
        visibleToParents: visibleToParentsFlag,
        createdBy: creatorId,
      });
      await notice.save();
      createdNotices.push(notice);

      // Create notifications
      await createNotificationsForNotice(notice);
    }

    return res.status(201).json({
      success: true,
      message: `Bulk notice sent to ${organizationSchools.length} branches`,
      data: {
        title,
        branchesCount: organizationSchools.length,
        recipients: await getRecipientCount(orgId, visibleToParentsFlag),
      },
    });
  } catch (error) {
    console.error("Error in createBulkNotice:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/superadmin/communication/notices/:id
 * Delete a notice belonging to current organization
 */
export const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const baseQuery = await getOrgNoticeQuery(req);
    if (!baseQuery) {
      return res.status(400).json({ success: false, message: "Valid Organization context not found" });
    }

    const notice = await Notice.findOneAndDelete({ _id: id, ...baseQuery });

    if (!notice) {
      return res
        .status(404)
        .json({ success: false, message: "Notice not found or unauthorized" });
    }

    return res.status(200).json({
      success: true,
      message: "Notice deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteNotice:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/communication/notices/:id
 * Get single notice details belonging to current organization with recipient stats
 */
export const getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;
    const baseQuery = await getOrgNoticeQuery(req);
    if (!baseQuery) {
      return res.status(400).json({ success: false, message: "Valid Organization context not found" });
    }

    const notice = await Notice.findOne({ _id: id, ...baseQuery })
      .populate("school", "schoolName")
      .populate("organization", "name")
      .lean();

    if (!notice) {
      return res
        .status(404)
        .json({ success: false, message: "Notice not found or unauthorized" });
    }

    let targetRoles = [];
    if (notice.targetAudience && notice.targetAudience.length > 0) {
      targetRoles = mapAudienceToRoles(notice.targetAudience);
    } else {
      targetRoles = notice.visibleToParents
        ? ["parent"]
        : ["teacher", "admin", "principal", "accountant", "support_staff"];
    }

    const counts = await User.aggregate([
      { $match: { school: notice.school?._id || notice.school, role: { $in: targetRoles } } },
      { $group: { _id: "$role", count: { $sum: 1 } } }
    ]);

    const recipientCounts = {
      students: 0,
      parents: 0,
      teachers: 0,
      principals: 0,
      accountants: 0,
      admins: 0,
      total: 0
    };

    counts.forEach(c => {
      const role = c._id;
      const cnt = c.count;
      recipientCounts.total += cnt;
      if (role === "student") recipientCounts.students = cnt;
      else if (role === "parent") recipientCounts.parents = cnt;
      else if (role === "teacher") recipientCounts.teachers = cnt;
      else if (role === "principal") recipientCounts.principals = cnt;
      else if (role === "accountant") recipientCounts.accountants = cnt;
      else if (role === "admin") recipientCounts.admins = cnt;
    });

    let targetText = formatAudienceDisplay(notice.targetAudience, notice.visibleToParents);
    let targetAudienceClean = cleanAudienceArray(notice.targetAudience);

    return res.status(200).json({
      success: true,
      data: {
        id: notice._id,
        title: notice.title,
        content: notice.content,
        type: notice.type || "general",
        target: targetText,
        targetAudience: targetAudienceClean,
        branch: notice.school?.schoolName || "All Branches",
        organizationName: notice.organization?.name || "N/A",
        createdAt: notice.createdAt,
        recipientCounts,
        status: notice.status || "published"
      },
    });
  } catch (error) {
    console.error("Error in getNoticeById:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/superadmin/communication/notices/stats
 * Get notice statistics belonging to current organization
 */
export const getNoticeStats = async (req, res) => {
  try {
    const { school_id } = req.query;
    const baseQuery = await getOrgNoticeQuery(req);
    if (!baseQuery) {
      return res.status(400).json({ success: false, message: "Valid Organization context not found" });
    }

    const query = { ...baseQuery };
    if (school_id) {
      query.school = new mongoose.Types.ObjectId(school_id);
    }

    const totalNotices = await Notice.countDocuments(query);
    const emergencyNotices = await Notice.countDocuments({
      ...query,
      type: "emergency",
    });
    const policyNotices = await Notice.countDocuments({
      ...query,
      type: "policy",
    });
    const generalNotices = await Notice.countDocuments({
      ...query,
      type: "general",
    });
    const parentNotices = await Notice.countDocuments({
      ...query,
      visibleToParents: true,
    });

    return res.status(200).json({
      success: true,
      data: {
        total: totalNotices,
        emergency: emergencyNotices,
        policy: policyNotices,
        general: generalNotices,
        visibleToParents: parentNotices,
      },
    });
  } catch (error) {
    console.error("Error in getNoticeStats:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper Functions
async function createNotificationsForNotice(notice) {
  // Determine target users based on targetAudience or fallback
  let targetRole = [];
  if (notice.targetAudience && notice.targetAudience.length > 0) {
    targetRole = mapAudienceToRoles(notice.targetAudience);
  } else {
    targetRole = notice.visibleToParents
      ? ["parent"]
      : ["teacher", "admin", "principal", "accountant", "support_staff"];
  }

  // Find users belonging only to this specific school and matching the targeted roles
  const users = await User.find({
    school: notice.school,
    role: { $in: targetRole },
  }).select("_id");

  const notifications = users.map((user) => ({
    user: user._id,
    title: notice.title,
    message: notice.content,
    type: "notice",
    read: false,
    school: notice.school,
  }));

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  return notifications.length;
}

async function getRecipientCount(orgId, visibleToParents) {
  const role = visibleToParents ? "parent" : "teacher";
  const count = await User.countDocuments({ role, organization: orgId });
  return count;
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "Just Now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
