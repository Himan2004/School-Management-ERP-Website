import Ticket from "../../models/common/Ticket.js";
import Notification from "../../models/common/Notification.js";
import { sendRealTimeNotification } from "../../utils/sseManager.js";
import "../../models/organization/organizationClass.js";
import SubjectAssignment from "../../models/principal/SubjectAssignment.model.js";
import Complaint from "../../models/common/Complaint.js";

// Helper function to save to DB and push via SSE
const dispatchNotification = async (notificationPayload) => {
  try {
    const newNotification = await Notification.create(notificationPayload);
    sendRealTimeNotification(notificationPayload.user, newNotification);
  } catch (error) {
    console.error("Failed to dispatch notification", error);
  }
};

// ── 1. Create a New Ticket ───────────────────────────────────────────────
export const createTicket = async (req, res) => {
  try {
    const { title, description, category, priority, assignedToRole } = req.body;
    const userId = req.user._id;
    const schoolId = req.user.school?._id || req.user.school;
    const organizationId =
      req.user.school?.organization?._id || req.user.organization;

    if (!schoolId || !organizationId) {
      return res.status(400).json({
        success: false,
        message: "Missing school or organization context.",
      });
    }

    const targetRole = assignedToRole || "admin";

    const ticket = new Ticket({
      organization: organizationId,
      school: schoolId,
      title,
      description,
      category,
      priority: priority || "medium",
      raisedBy: userId,
      raisedByRole: req.user.role,
      assignedToRole: targetRole,
      status: "open",
    });

    await ticket.save();
    res.status(201).json({
      success: true,
      message: "Ticket raised successfully",
      data: ticket,
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 2. Get "My Tickets" (Tickets I raised) ───────────────────────────────
export const getMyTickets = async (req, res) => {
  try {
    const { status, category } = req.query;
    const query = { raisedBy: req.user._id };

    if (status && status !== "all") query.status = status;
    if (category && category !== "all") query.category = category;

    const tickets = await Ticket.find(query)
      .populate("assignedTo", "name role")
      .sort({ updatedAt: -1 })
      .lean();

    const stats = {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      inProgress: tickets.filter((t) => t.status === "in_progress").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
    };

    res.status(200).json({ success: true, data: { tickets, stats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 3. Get "Help Desk" (Tickets assigned to or escalated by ME) ──────────
export const getHelpDeskTickets = async (req, res) => {
  try {
    const { status, category } = req.query;
    const schoolId = req.user.school?._id || req.user.school;

    let query = { school: schoolId };

    if (req.user.role === 'teacher') {
      const assignments = await SubjectAssignment.find({ teacherUser: req.user._id }).populate('class');
      const classSectionQueries = assignments.map(a => ({
        class: a.class?.name,
        section: a.section
      })).filter(q => q.class && q.section);

      query.$or = [
        {
          assignedToRole: "teacher",
          $or: classSectionQueries.length > 0 ? classSectionQueries : [{ class: "__none__" }]
        },
        { assignedTo: req.user._id },
        { receiverId: req.user._id },
        { "escalationLog.escalatedBy": req.user._id }
      ];
    } else {
      query.$or = [
        { 
          assignedToRole: req.user.role,
          ...(req.user.role === 'admin' ? { $or: [{ assignedTo: req.user._id }, { receiverId: req.user._id }, { receiverId: { $exists: false } }, { receiverId: null }] } : {})
        }, // Tickets currently in my queue
        ...(req.user.role === 'admin' ? [{ assignedToRole: 'teacher', category: 'academic' }] : []),
        { "escalationLog.escalatedBy": req.user._id }, // Tickets I escalated upwards
      ];
    }

    if (status && status !== "all") query.status = status;
    if (category && category !== "all") query.category = category;

    const tickets = await Ticket.find(query)
      .populate("raisedBy", "name role")
      .sort({ updatedAt: -1 })
      .lean();

    // --- INTEGRATE ESCALATED COMPLAINTS FOR ADMIN ---
    let merged = [...tickets];
    if (req.user.role === 'admin') {
      const compQuery = { 
        school: schoolId, 
        $or: [
          { status: "escalated", escalated: true },
          { raisedByType: "parent" }
        ] 
      };
      if (category && category !== "all") compQuery.category = category;
      
      if (status && status !== "all" && status !== "escalated") {
        compQuery.status = status;
      }
      
      const escalatedComplaints = await Complaint.find(compQuery)
        .populate("raisedBy", "name role")
        .populate("student", "name role")
        .populate("parent", "name role")
        .lean();

      const formattedComplaints = escalatedComplaints.map(c => ({
        ...c,
        isComplaint: true,
        ticketType: "complaint",
        responses: (c.conversation || []).map(r => ({
          user: r.sender,
          message: r.message,
          attachments: r.attachments,
          createdAt: r.createdAt
        }))
      }));

      merged = [...merged, ...formattedComplaints];
      merged.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    const stats = {
      total: merged.length,
      open: merged.filter((t) => t.status === "open").length,
      inProgress: merged.filter((t) => t.status === "in_progress" || t.status === "in-progress").length,
      resolved: merged.filter((t) => t.status === "resolved").length,
      escalated: merged.filter((t) => t.status === "escalated").length,
    };

    res.status(200).json({ success: true, data: { tickets: merged, stats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 4. Get Ticket Details (Protects access dynamically) ──────────────────
export const getTicketDetails = async (req, res) => {
  try {
    const schoolId = req.user.school?._id || req.user.school;

    let ticket = await Ticket.findOne({
      _id: req.params.id,
      school: schoolId,
      $or: [
        { raisedBy: req.user._id },
        { assignedToRole: req.user.role },
        { "escalationLog.escalatedBy": req.user._id },
      ],
    })
      .populate("raisedBy", "name role")
      .populate("responses.user", "name role")
      .lean();

    if (!ticket) {
      // Fallback: Check if it is a complaint in the same school
      const complaint = await Complaint.findOne({
        _id: req.params.id,
        school: schoolId
      })
        .populate("raisedBy", "name role")
        .populate("student", "name role")
        .populate("parent", "name role")
        .populate("conversation.sender", "name role")
        .populate("history.performedBy", "name role")
        .lean();

      if (complaint) {
        ticket = {
          ...complaint,
          isComplaint: true,
          ticketType: "complaint",
          responses: (complaint.conversation || []).map(r => ({
            user: r.sender,
            message: r.message,
            attachments: r.attachments,
            createdAt: r.createdAt
          }))
        };
      }
    }

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket/Complaint not found or access denied" });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 5. Escalate Ticket ───────────────────────────────────────────────────
export const escalateUniversalTicket = async (req, res) => {
  try {
    const { reason, escalatedToRole } = req.body;
    const schoolId = req.user.school?._id || req.user.school;

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      school: schoolId,
      assignedToRole: req.user.role,
    });

    if (!ticket)
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found in your queue" });

    ticket.status = "escalated";
    ticket.escalationLevel = (ticket.escalationLevel || 0) + 1;
    ticket.assignedToRole = escalatedToRole;

    ticket.escalationLog.push({
      escalatedBy: req.user._id,
      escalatedByRole: req.user.role,
      escalatedToRole: escalatedToRole,
      escalationLevel: ticket.escalationLevel,
      reason: reason || "Escalated for further review",
    });

    if (!ticket.history) ticket.history = [];
    ticket.history.push({
      status: "escalated",
      updatedBy: req.user._id,
      updatedAt: new Date(),
      comment: `Ticket escalated to ${escalatedToRole} (Level ${ticket.escalationLevel}). Reason: ${reason || 'Not specified'}`
    });

    // SAVE FIRST
    await ticket.save();

    const receiverId =
      req.user._id.toString() === ticket.raisedBy.toString()
        ? ticket.assignedTo
        : ticket.raisedBy;

    // 🌟 THEN DISPATCH USING THE HELPER (so it pushes to SSE)
    if (receiverId) {
      dispatchNotification({
        user: receiverId,
        school: req.user.school?._id || req.user.school,
        title: "Ticket Escalated",
        message: `Your ticket has been escalated to ${escalatedToRole.replace("_", " ")}.`,
        type: "ticket",
        metadata: {
          ticketId: ticket._id,
          senderId: req.user._id,
          link: `?ticketId=${ticket._id}`,
        },
        senderName: req.user.name,
        senderRole: req.user.role,
        source: "Help Desk",
      });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── 6. Add Response & Change Status ──────────────────────────────────────
export const handleTicketAction = async (req, res) => {
  try {
    const { message, status, resolutionNote } = req.body;
    const schoolId = req.user.school?._id || req.user.school;

    // Check if it is a complaint
    let complaint = await Complaint.findOne({ _id: req.params.id, school: schoolId });
    if (complaint) {
      let messageAdded = false;
      let statusChanged = false;

      if (message?.trim()) {
        if (complaint.status === "closed") {
          return res.status(400).json({ success: false, message: "Cannot reply to a closed complaint" });
        }
        complaint.conversation.push({
          sender: req.user._id,
          message: message.trim(),
          createdAt: new Date()
        });
        messageAdded = true;

        if (complaint.status === "open" && req.user.role === "teacher") {
          complaint.status = "in_progress";
        }
        
        let actionStr = "Replied";
        if (req.user.role === "teacher") actionStr = "Teacher Replied";
        else if (req.user.role === "admin") actionStr = "Admin Replied";

        complaint.history.push({
          action: actionStr,
          performedBy: req.user._id,
          timestamp: new Date(),
          remarks: "Reply added via support ticket interface"
        });
      }

      if (status && status !== complaint.status) {
        if (status === "closed" && complaint.status !== "resolved") {
          return res.status(400).json({ success: false, message: "Cannot close an unresolved complaint." });
        }

        const oldStatus = complaint.status;
        complaint.status = status;
        statusChanged = true;

        if (status === "resolved") {
          complaint.resolvedBy = req.user._id;
          complaint.resolvedAt = new Date();
        } else if (status === "closed") {
          complaint.closedAt = new Date();
        }

        complaint.history.push({
          action: "Status Changed",
          performedBy: req.user._id,
          timestamp: new Date(),
          remarks: `Status updated from ${oldStatus} to ${status}`
        });
      }

      await complaint.save();

      const populatedComp = await Complaint.findById(complaint._id)
        .populate("raisedBy", "name role")
        .populate("student", "name role")
        .populate("parent", "name role")
        .populate("conversation.sender", "name role")
        .populate("history.performedBy", "name role")
        .lean();

      const formattedTicket = {
        ...populatedComp,
        isComplaint: true,
        ticketType: "complaint",
        responses: (populatedComp.conversation || []).map(r => ({
          user: r.sender,
          message: r.message,
          attachments: r.attachments,
          createdAt: r.createdAt
        }))
      };

      const participants = [complaint.raisedBy, complaint.student, complaint.parent].filter(
        uid => uid && uid.toString() !== req.user._id.toString()
      );

      for (const uid of participants) {
        if (messageAdded) {
          await dispatchNotification({
            user: uid,
            school: schoolId,
            title: "New Message on Complaint",
            message: `You have a new reply on complaint: "${complaint.title}"`,
            type: "ticket",
            metadata: {
              link: `?complaintId=${complaint._id}`,
            },
            senderName: req.user.name,
            senderRole: req.user.role,
            source: "Complaints",
          });
        }
        if (statusChanged) {
          await dispatchNotification({
            user: uid,
            school: schoolId,
            title: "Complaint Status Updated",
            message: `Your complaint "${complaint.title}" status has been updated to ${status}.`,
            type: "ticket",
            metadata: {
              link: `?complaintId=${complaint._id}`,
            },
            senderName: req.user.name,
            senderRole: req.user.role,
            source: "Complaints",
          });
        }
      }

      return res.status(200).json({ success: true, data: formattedTicket });
    }

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      school: schoolId,
      $or: [
        { raisedBy: req.user._id },
        { assignedToRole: req.user.role },
        { "escalationLog.escalatedBy": req.user._id },
      ],
    });

    if (!ticket)
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found or access denied" });

    let messageAdded = false;
    let statusChanged = false;
    if (!ticket.history) ticket.history = [];

    // 1. Process Messages
    if (message?.trim()) {
      if (["resolved", "closed"].includes(ticket.status)) {
        return res
          .status(400)
          .json({ success: false, message: "Cannot reply to a closed ticket" });
      }
      ticket.responses.push({
        user: req.user._id,
        message: message.trim(),
        createdAt: new Date(),
      });

      messageAdded = true; // Flag for notification

      const oldStatus = ticket.status;
      // Auto-update status based on who replied
      if (
        ticket.status === "open" &&
        req.user._id.toString() !== ticket.raisedBy.toString()
      ) {
        ticket.status = "in_progress";
      } else if (
        ticket.status !== "in_progress" &&
        req.user._id.toString() === ticket.raisedBy.toString()
      ) {
        ticket.status = "open";
      }

      if (ticket.status !== oldStatus) {
        ticket.history.push({
          status: ticket.status,
          updatedBy: req.user._id,
          updatedAt: new Date(),
          comment: `Status auto-updated to ${ticket.status} on reply`
        });
      } else {
        ticket.history.push({
          status: ticket.status,
          updatedBy: req.user._id,
          updatedAt: new Date(),
          comment: "Response added"
        });
      }
    }

    // 2. Process Status Updates
    if (status && status !== ticket.status) {
      ticket.status = status;
      statusChanged = true; // Flag for notification

      if (status === "resolved") {
        ticket.resolvedBy = req.user._id;
        ticket.resolvedAt = new Date();
        if (resolutionNote) ticket.resolutionNote = resolutionNote;
      } else if (status === "closed") {
        ticket.closedAt = new Date();
      }

      ticket.history.push({
        status: status,
        updatedBy: req.user._id,
        updatedAt: new Date(),
        comment: `Status updated to ${status}`
      });
    }

    // 3. SAVE FIRST
    await ticket.save();
    await ticket.populate("responses.user", "name role");

    // 4. THEN SEND NOTIFICATIONS
    const isCreator = req.user._id.toString() === ticket.raisedBy.toString();
    const receiverId = isCreator ? ticket.assignedTo : ticket.raisedBy;

    if (receiverId) {
      if (messageAdded) {
        dispatchNotification({
          user: receiverId,
          school: req.user.school?._id || req.user.school,
          title: "New Message on Ticket",
          message: `You have a new reply on ticket: "${ticket.title}"`,
          type: "ticket",
          metadata: {
            ticketId: ticket._id,
            senderId: req.user._id,
            link: `?ticketId=${ticket._id}`,
          },
          senderName: req.user.name,
          senderRole: req.user.role,
          source: "Support Desk",
        });
      }

      if (statusChanged) {
        dispatchNotification({
          user: receiverId,
          school: req.user.school?._id || req.user.school,
          title: "Ticket Status Updated",
          message: `Your ticket "${ticket.title}" is now ${status.replace("_", " ")}.`,
          type: "ticket",
          metadata: {
            ticketId: ticket._id,
            senderId: req.user._id,
            link: `?ticketId=${ticket._id}`,
          },
          senderName: req.user.name,
          senderRole: req.user.role,
          source: "Support Desk",
        });
      }
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
