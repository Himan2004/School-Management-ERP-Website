import Ticket from "../../models/common/Ticket.js";
import mongoose from "mongoose";

// Create a new ticket (Automatically routes to HQ)
export const createTicket = async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;

    // Extract the user ID directly from req.user
    const userId = req.user._id;

    // Extract school ID (it's populated, so we grab the _id)
    const schoolId = req.user.school?._id;

    // Extract organization ID from the populated school object
    const organizationId = req.user.school?.organization?._id;

    if (!schoolId || !organizationId) {
      return res.status(400).json({
        success: false,
        message: "School or Organization data is missing from user profile.",
      });
    }

    const ticket = new Ticket({
      organization: organizationId, // Matches schema 'organization'
      school: schoolId, // Matches schema 'school'
      title,
      description,
      category,
      priority: priority || "medium",
      raisedBy: userId,
      raisedByRole: "principal",
      assignedToRole: "super_admin",
      status: "open",
    });

    await ticket.save();

    res.status(201).json({
      success: true,
      message: "Ticket raised successfully",
      data: ticket,
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all tickets for this specific Principal/School
export const getMyTickets = async (req, res) => {
  try {
    const { status, category } = req.query;
    const schoolId = req.user.school;

    const query = { school: schoolId };

    if (status && status !== "all") query.status = status;
    if (category && category !== "all") query.category = category;

    const tickets = await Ticket.find(query)
      .populate("assignedTo", "name role")
      .populate("raisedBy", "name role")
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

// Get single ticket details with thread
export const getTicketDetails = async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      school: req.user.school,
    })
      .populate("raisedBy", "name role")
      .populate("responses.user", "name role")
      .lean();

    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reply to a ticket
export const addTicketResponse = async (req, res) => {
  try {
    const { message } = req.body;

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      school: req.user.school,
    });

    if (!ticket)
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    if (["resolved", "closed"].includes(ticket.status)) {
      return res
        .status(400)
        .json({ success: false, message: "Ticket is closed or resolved" });
    }

    ticket.responses.push({
      user: req.user._id,
      message: message.trim(),
      createdAt: new Date(),
    });

    // Reopen ticket if it was pending or escalated and the principal replies
    if (ticket.status !== "in_progress") {
      ticket.status = "open";
    }

    await ticket.save();
    await ticket.populate("responses.user", "name role");

    const newResponse = ticket.responses[ticket.responses.length - 1];

    res.status(200).json({ success: true, data: newResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update status (e.g. Principal marks as resolved)
export const updateTicketStatus = async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      school: req.user.school,
    });

    if (!ticket)
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });

    ticket.status = status;
    if (status === "resolved") {
      ticket.resolvedBy = req.user._id;
      ticket.resolvedAt = new Date();
      if (resolutionNote) ticket.resolutionNote = resolutionNote;
    }

    await ticket.save();
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
