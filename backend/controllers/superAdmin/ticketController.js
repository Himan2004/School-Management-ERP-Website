import mongoose from "mongoose";
import Ticket from "../../models/common/Ticket.js";
import Student from "../../models/users/student.model.js";
import Parent from "../../models/users/parent.model.js";
import School from "../../models/school/School.js";
import Class from "../../models/organization/organizationClass.js";
import Section from "../../models/school/Section.model.js";
import User from "../../models/users/user.model.js";

const allowedStatus = [
  "open",
  "in_progress",
  "escalated",
  "resolved",
  "closed",
];
const allowedPriority = ["low", "medium", "high", "critical"];

const toUiTicket = (ticket) => ({
  _id: ticket._id,
  id: `TKT-${ticket._id.toString().slice(-6).toUpperCase()}`,
  branch: ticket.school?.schoolName || "Unknown Branch",
  subject: ticket.title,
  description: ticket.description,
  priority: ticket.priority?.toUpperCase(),
  status: ticket.status?.toUpperCase(),
  category: ticket.category,
  time: getTimeAgo(ticket.updatedAt || ticket.createdAt),
  raisedBy: ticket.raisedBy?.name || "Unknown",
  raisedByRole: ticket.raisedByRole,
  escalationLevel: ticket.escalationLevel || 0,
  escalationLog: ticket.escalationLog || [],
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
});

export const getAllTickets = async (req, res) => {
  try {
    const organizationId = req.user?._id;
    const {
      status,
      priority,
      search,
      page = 1,
      limit = 50,
      school_id,
    } = req.query;

    const query = { organization: organizationId };

    if (school_id && mongoose.Types.ObjectId.isValid(school_id)) {
      query.school = new mongoose.Types.ObjectId(school_id);
    }

    if (status && status !== "all") {
      const normalizedStatus = String(status).toLowerCase();
      if (normalizedStatus === "pending") {
        query.status = "in_progress";
      } else if (allowedStatus.includes(normalizedStatus)) {
        query.status = normalizedStatus;
      }
    }

    if (priority && priority !== "all") {
      const normalizedPriority = String(priority).toLowerCase();
      if (allowedPriority.includes(normalizedPriority)) {
        query.priority = normalizedPriority;
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const tickets = await Ticket.find(query)
      .populate("school", "schoolName")
      .populate("raisedBy", "name role")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Ticket.countDocuments(query);

    const [openCount, inProgressCount, escalatedCount, resolvedCount] =
      await Promise.all([
        Ticket.countDocuments({ organization: organizationId, status: "open" }),
        Ticket.countDocuments({
          organization: organizationId,
          status: "in_progress",
        }),
        Ticket.countDocuments({
          organization: organizationId,
          status: "escalated",
        }),
        Ticket.countDocuments({
          organization: organizationId,
          status: "resolved",
        }),
      ]);

    return res.status(200).json({
      success: true,
      data: {
        tickets: tickets.map(toUiTicket),
        stats: {
          total: openCount + inProgressCount + escalatedCount + resolvedCount,
          open: openCount,
          pending: inProgressCount,
          escalated: escalatedCount,
          resolved: resolvedCount,
          active: openCount + inProgressCount + escalatedCount,
        },
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("Error in getAllTickets:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const organizationId = req.user?._id;
    const { id } = req.params;
    const { status } = req.body;

    const normalizedStatus = String(status || "").toLowerCase();
    if (!allowedStatus.includes(normalizedStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const ticket = await Ticket.findOne({
      _id: id,
      organization: organizationId,
    });
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    ticket.status = normalizedStatus;
    if (normalizedStatus === "resolved") {
      ticket.resolvedBy = req.superAdminProfile?._id || null;
      ticket.resolvedAt = new Date();
    }

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully",
      data: { id: ticket._id, status: ticket.status.toUpperCase() },
    });
  } catch (error) {
    console.error("Error in updateTicketStatus:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTicketPriority = async (req, res) => {
  try {
    const organizationId = req.user?._id;
    const { id } = req.params;
    const { priority } = req.body;

    const normalizedPriority = String(priority || "").toLowerCase();
    if (!allowedPriority.includes(normalizedPriority)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid priority value" });
    }

    const ticket = await Ticket.findOneAndUpdate(
      { _id: id, organization: organizationId },
      { priority: normalizedPriority },
      { new: true },
    );

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Ticket priority updated successfully",
      data: { id: ticket._id, priority: ticket.priority.toUpperCase() },
    });
  } catch (error) {
    console.error("Error in updateTicketPriority:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const escalateTicket = async (req, res) => {
  try {
    const organizationId = req.user?._id;
    const { id } = req.params;
    // ✅ Change default from hq_admin to super_admin so it flows upwards
    const { reason, escalatedToRole = "super_admin" } = req.body;

    const ticket = await Ticket.findOne({
      _id: id,
      organization: organizationId,
    });
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    ticket.status = "escalated";
    ticket.escalationLevel = Math.min((ticket.escalationLevel || 0) + 1, 4);

    // Add the log entry indicating HQ Admin pushed it to Super Admin
    ticket.escalationLog.push({
      escalatedBy: req.user?._id || ticket.raisedBy,
      escalatedByRole: req.user?.role || "hq_admin", // Marks that HQ Admin did it
      escalatedToRole: escalatedToRole, // Targets Super Admin
      escalationLevel: ticket.escalationLevel,
      reason:
        reason ||
        "Escalated to Super Admin due to SLA breach or critical issue",
    });

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket escalated to Super Admin successfully",
      data: { id: ticket._id, escalationLevel: ticket.escalationLevel },
    });
  } catch (error) {
    console.error("Error in escalateTicket:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resolveTicket = async (req, res) => {
  try {
    const organizationId = req.user?._id;
    const { id } = req.params;
    const { resolutionNote } = req.body;

    const ticket = await Ticket.findOne({
      _id: id,
      organization: organizationId,
    });
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    ticket.status = "resolved";
    ticket.resolvedBy = req.superAdminProfile?._id || null;
    ticket.resolvedAt = new Date();
    ticket.resolutionNote = resolutionNote || ticket.resolutionNote;

    await ticket.save();

    return res.status(200).json({
      success: true,
      message: "Ticket resolved successfully",
      data: { id: ticket._id, status: "RESOLVED" },
    });
  } catch (error) {
    console.error("Error in resolveTicket:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTicketDetails = async (req, res) => {
  try {
    const organizationId = req.user?._id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid ticket ID" });
    }

    const ticket = await Ticket.findOne({
      _id: id,
      organization: organizationId,
    })
      .populate("school")
      .populate("raisedBy", "name email role")
      .populate("assignedTo", "name email role")
      .populate("resolvedBy", "name")
      .populate("responses.user", "name role")
      .lean();

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    // Generate formatted ID matching list format
    ticket.id = `TKT-${ticket._id.toString().slice(-6).toUpperCase()}`;

    let studentDetails = null;

    if (ticket.relatedStudent) {
      const studentProfile = await Student.findOne({
        user: ticket.relatedStudent,
      })
        .populate("user", "name email phone")
        .populate("class", "name")
        .populate("section", "name")
        .populate({
          path: "parent",
          populate: {
            path: "user",
            select: "name email",
          },
        })
        .lean();

      if (studentProfile) {
        studentDetails = {
          studentName: studentProfile.user?.name || "N/A",
          studentEmail: studentProfile.user?.email || "N/A",
          studentMobile:
            studentProfile.phone || studentProfile.user?.phone || "N/A",
          rollNumber: studentProfile.rollNo || "N/A",
          admissionNumber: studentProfile.enrollmentNo || "N/A",
          class: studentProfile.class?.name || "N/A",
          section: studentProfile.section?.name || "N/A",
          parentName: studentProfile.parent
            ? studentProfile.parent.fatherName ||
              studentProfile.parent.motherName ||
              studentProfile.parent.user?.name ||
              "N/A"
            : "N/A",
          parentMobile: studentProfile.parent?.primaryContact || "N/A",
          parentEmail:
            studentProfile.parent?.profileExtras?.fatherEmail ||
            studentProfile.parent?.profileExtras?.motherEmail ||
            studentProfile.parent?.user?.email ||
            "N/A",
          fatherName: studentProfile.parent?.fatherName || "N/A",
          motherName: studentProfile.parent?.motherName || "N/A",
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        ticket,
        studentDetails,
      },
    });
  } catch (error) {
    console.error("Error in getTicketDetails:", error);
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

export const addTicketResponse = async (req, res) => {
  try {
    // For super admin, req.user._id typically holds the organization ID
    const organizationId = req.user._id;
    const { id } = req.params;
    const { message, attachments } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    const ticket = await Ticket.findOne({
      _id: id,
      organization: organizationId,
    });

    if (!ticket) {
      console.log("not found")
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (["resolved", "closed"].includes(ticket.status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot reply to a closed or resolved ticket. Please reopen it first." 
      });
    }

    // Add the response
    // Use req.superAdminProfile._id if available, otherwise fallback to req.user._id
    ticket.responses.push({
      user: req.superAdminProfile?._id || req.user?._id, 
      message: message.trim(),
      attachments: attachments || [],
      createdAt: new Date(),
    });

    // Auto-update status from open to in_progress when HQ replies
    if (ticket.status === "open") {
      ticket.status = "in_progress";
    }

    await ticket.save();

    // Populate the newly added response's user details so the frontend chat UI displays the name/role correctly
    await ticket.populate("responses.user", "name role");

    // Extract the latest response to return to the frontend
    const newResponse = ticket.responses[ticket.responses.length - 1];

    return res.status(200).json({
      success: true,
      message: "Response added successfully",
      data: newResponse,
    });

  } catch (error) {
    console.error("Error in addTicketResponse:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};