import mongoose from "mongoose";
import Notice from "../../models/common/Notice.js";
import Notification from "../../models/common/Notification.js";
import School from "../../models/school/School.js";
import User from "../../models/users/user.model.js";

const getOrganizationSchoolIds = async (organizationId) => {
  const schools = await School.find({ organization: organizationId })
    .select("_id schoolName")
    .lean();
  return {
    schoolIds: schools.map((s) => s._id),
    schoolMap: Object.fromEntries(
      schools.map((s) => [String(s._id), s.schoolName]),
    ),
  };
};

export const getGlobalAlerts = async (req, res) => {
  try {
    const { schoolIds, schoolMap } = await getOrganizationSchoolIds(
      req.user._id,
    );
    const { search, status = "All", type } = req.query;

    const query = { school: { $in: schoolIds } };
    if (type && type !== "All") query.type = String(type).toLowerCase();
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ];
    }

    const notices = await Notice.find(query).sort({ createdAt: -1 }).lean();
    const alerts = notices
      .map((n) => {
        const hours =
          (Date.now() - new Date(n.createdAt).getTime()) / (1000 * 60 * 60);
        const computedStatus = hours <= 24 ? "Live" : "Completed";
        return {
          _id: n._id,
          title: n.title,
          type:
            n.type === "emergency"
              ? "Emergency Alert"
              : n.type === "policy"
                ? "Policy Circular"
                : "General Circular",
          target: n.visibleToParents ? "Parents & Staff" : "Staff",
          status: computedStatus,
          priority:
            n.type === "emergency"
              ? "Critical"
              : n.type === "policy"
                ? "High"
                : "Medium",
          date: new Date(n.createdAt).toISOString().split("T")[0],
          time: new Date(n.createdAt).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          reach: "Network",
          category:
            n.type === "emergency"
              ? "Safety"
              : n.type === "policy"
                ? "Compliance"
                : "General",
          message: n.content,
          school: schoolMap[String(n.school)] || "Unknown",
        };
      })
      .filter((a) => status === "All" || a.status === status);

    return res.status(200).json({
      success: true,
      data: {
        alerts,
        stats: {
          live: alerts.filter((a) => a.status === "Live").length,
          completed: alerts.filter((a) => a.status === "Completed").length,
          critical: alerts.filter((a) => a.priority === "Critical").length,
          total: alerts.length,
        },
      },
    });
  } catch (error) {
    console.error("Error in getGlobalAlerts:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createGlobalAlert = async (req, res) => {
  try {
    const {
      title,
      message,
      category = "general",
      visibleToParents = true,
      targetBranchIds = [],
      targetRoles = [],
    } = req.body;

    if (!title || !message) {
      return res
        .status(400)
        .json({ success: false, message: "Title and message are required" });
    }

    // 1. SAFELY RESOLVE ORGANIZATION ID
    const organizationId =
      req.user?.organization?._id || req.user?.organization || req.user?._id;
    if (!organizationId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Valid Organization context not found",
        });
    }

    const { schoolIds } = await getOrganizationSchoolIds(req.user._id);
    if (!schoolIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "No branches found for this organization. Create at least one school branch before sending global alerts.",
      });
    }

    const targetSchools =
      Array.isArray(targetBranchIds) && targetBranchIds.length > 0
        ? targetBranchIds.filter((id) =>
            schoolIds.some((sid) => String(sid) === String(id)),
          )
        : schoolIds;

    if (!targetSchools.length) {
      return res.status(400).json({
        success: false,
        message: "No valid target branches found for this organization.",
      });
    }

    const mappedType = String(category).toLowerCase().includes("emergency")
      ? "emergency"
      : String(category).toLowerCase().includes("policy")
        ? "policy"
        : "general";

    const createdAlerts = [];

    // 2. FIX: Move Notice creation INSIDE the loop so every branch gets the alert
    for (const schoolId of targetSchools) {
      // Create the Notice record
      const alert = await Notice.create({
        organization: organizationId,
        school: schoolId,
        title,
        content: message,
        type: mappedType,
        visibleToParents: !!visibleToParents,
        createdBy: req.user._id, 
      });

      createdAlerts.push(alert);

      // Create the Notifications for users in this branch
      let roleFilter = [];
      if (Array.isArray(targetRoles) && targetRoles.length > 0) {
        roleFilter = targetRoles;
      } else {
        roleFilter = visibleToParents
          ? ["parent", "teacher", "admin", "principal", "accountant", "student"]
          : ["teacher", "admin", "principal", "accountant"];
      }

      const users = await User.find({
        school: schoolId,
        role: { $in: roleFilter },
      }).select("_id");

      if (users.length) {
        await Notification.insertMany(
          users.map((u) => ({
            user: u._id,
            title,
            message,
            type: "notice",
            read: false,
            school: schoolId,
          })),
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: `Global alert created for ${targetSchools.length} branch(es)`,
      data: createdAlerts,
    });
  } catch (error) {
    console.error("Error in createGlobalAlert:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGlobalAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { schoolIds } = await getOrganizationSchoolIds(req.user._id);
    const deleted = await Notice.findOneAndDelete({
      _id: id,
      school: { $in: schoolIds },
    });
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Alert not found" });
    return res.status(200).json({ success: true, message: "Alert deleted" });
  } catch (error) {
    console.error("Error in deleteGlobalAlert:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAcademicAlerts = async (req, res) => {
  try {
    const { schoolIds, schoolMap } = await getOrganizationSchoolIds(
      req.user._id,
    );
    const { search = "" } = req.query;

    const notifications = await Notification.find({
      school: { $in: schoolIds },
      type: { $in: ["attendance", "result", "event", "notice"] },
      title: { $regex: search, $options: "i" },
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const severityRank = { Info: 1, High: 2, Critical: 3 };
    const getSeverity = (type) =>
      type === "result" ? "High" : type === "attendance" ? "Critical" : "Info";
    const grouped = new Map();

    for (const n of notifications) {
      const normalizedTitle = String(n.title || "Academic Alert")
        .trim()
        .toLowerCase();
      const key = `${normalizedTitle}::${n.type}`;
      const severity = getSeverity(n.type);

      if (!grouped.has(key)) {
        grouped.set(key, {
          _id: n._id,
          type: n.title || "Academic Alert",
          student: "N/A",
          class: "N/A",
          severity,
          description: n.message || "No details provided.",
          action: n.read ? "Viewed" : "Pending Review",
          date: getTimeAgo(n.createdAt),
          category: n.type,
          read: !!n.read,
          duplicateCount: 1,
          unreadCount: n.read ? 0 : 1,
          latestCreatedAt: n.createdAt,
          branchIds: new Set([String(n.school)]),
        });
        continue;
      }

      const existing = grouped.get(key);
      existing.duplicateCount += 1;
      existing.unreadCount += n.read ? 0 : 1;
      existing.read = existing.unreadCount === 0;
      existing.branchIds.add(String(n.school));

      if (
        new Date(n.createdAt).getTime() >
        new Date(existing.latestCreatedAt).getTime()
      ) {
        existing._id = n._id;
        existing.latestCreatedAt = n.createdAt;
        existing.date = getTimeAgo(n.createdAt);
        existing.description = n.message || existing.description;
      }

      if (severityRank[severity] > severityRank[existing.severity]) {
        existing.severity = severity;
      }
      existing.action =
        existing.unreadCount > 0
          ? `${existing.unreadCount} pending review`
          : "Viewed";
    }

    const alerts = Array.from(grouped.values())
      .map((item) => {
        const branchNames = Array.from(item.branchIds)
          .map((id) => schoolMap[id])
          .filter(Boolean);
        const branchCount = branchNames.length;
        const duplicateCount = item.duplicateCount;

        return {
          _id: item._id,
          type: item.type,
          student: duplicateCount > 1 ? "Multiple records" : item.student,
          class: duplicateCount > 1 ? `${branchCount} branch(es)` : item.class,
          severity: item.severity,
          description:
            duplicateCount > 1
              ? `${duplicateCount} similar alerts merged across ${branchCount} branch(es). Latest detail: ${item.description}`
              : item.description,
          action: item.action,
          date: item.date,
          category: item.category,
          read: item.read,
          duplicateCount,
          branchCount,
        };
      })
      .sort((a, b) => {
        const severityOrder = { Critical: 3, High: 2, Info: 1 };
        if (severityOrder[b.severity] !== severityOrder[a.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return b.duplicateCount - a.duplicateCount;
      });

    return res.status(200).json({ success: true, data: { alerts } });
  } catch (error) {
    console.error("Error in getAcademicAlerts:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getComplianceAlerts = async (req, res) => {
  try {
    const { schoolIds } = await getOrganizationSchoolIds(req.user._id);
    const { search = "", status = "All" } = req.query;
    const notices = await Notice.find({
      school: { $in: schoolIds },
      type: { $in: ["policy", "emergency"] },
      title: { $regex: search, $options: "i" },
    })
      .sort({ createdAt: -1 })
      .lean();

    const data = notices
      .map((n) => {
        const days = Math.floor(
          (Date.now() - new Date(n.createdAt).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        const computedStatus =
          days > 30 ? "Overdue" : days > 7 ? "Pending" : "Compliant";
        return {
          _id: n._id,
          regulation: n.title,
          authority: n.type === "policy" ? "Policy Board" : "Emergency Control",
          status: computedStatus,
          risk: n.type === "emergency" ? "Critical" : "High",
          deadline: new Date(n.createdAt).toISOString().split("T")[0],
          category: n.type === "policy" ? "Legal" : "Safety",
          description: n.content,
          penalty:
            n.type === "emergency"
              ? "Immediate Action Required"
              : "Policy Violation Risk",
          recurring: "Annually",
          escalation: "Super Admin",
          auditLog: `${getTimeAgo(n.createdAt)}: Record created`,
          docs: [],
        };
      })
      .filter((item) => status === "All" || item.status === status);

    return res
      .status(200)
      .json({ success: true, data: { complianceData: data } });
  } catch (error) {
    console.error("Error in getComplianceAlerts:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
