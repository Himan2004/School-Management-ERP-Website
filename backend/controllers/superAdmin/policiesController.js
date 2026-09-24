import Policy from "../../models/common/Policy.js";
import PolicyAuditLog from "../../models/common/PolicyAuditLog.js";
import Ticket from "../../models/common/Ticket.js";
import cloudinary from "../../config/cloudinary.js";
import { Readable } from "stream";
import axios from "axios";
import jwt from "jsonwebtoken";

// Helper: stream buffer -> Cloudinary
const streamToCloudinary = (buffer, originalname) => {
  return new Promise((resolve, reject) => {
    const baseName = originalname.substring(0, originalname.lastIndexOf(".")) || originalname;
    const cleanBase = baseName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    // CRITICAL: We do NOT append .pdf extension when using resource_type: "raw"
    // to bypass Cloudinary's default 401 block on PDF delivery.
    const publicId = `${Date.now()}_${cleanBase}`;

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "uploads/policies",
        resource_type: "raw",
        public_id: publicId,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

// Create policy (with PDF upload)
export const uploadPolicy = async (req, res) => {
  try {
    const { policyName } = req.body;
    if (!policyName) {
      return res.status(400).json({ success: false, message: "Policy Name is required" });
    }

    // Task 2: Explicitly verify req.file existence
    if (!req.file) {
      console.error("[Upload Verification Failed]: req.file does not exist");
      return res.status(400).json({ success: false, message: "Please select a PDF file to upload" });
    }

    // Task 2: Verify req.file.mimetype is application/pdf
    const mimeType = req.file.mimetype;
    const extension = req.file.originalname.split(".").pop().toLowerCase();
    if (mimeType !== "application/pdf" && extension !== "pdf") {
      console.error(`[Upload Verification Failed]: mimetype is ${mimeType}, expected application/pdf`);
      return res.status(400).json({ success: false, message: "Only PDF files (.pdf) are allowed" });
    }

    // Task 2: Verify req.file.size is correct
    if (!req.file.size || req.file.size <= 0) {
      console.error(`[Upload Verification Failed]: size is invalid: ${req.file.size}`);
      return res.status(400).json({ success: false, message: "Invalid PDF file size" });
    }

    // Task 2: Verify req.file.buffer.length is not 0
    if (!req.file.buffer || req.file.buffer.length === 0) {
      console.error("[Upload Verification Failed]: file buffer is empty (0 bytes)");
      return res.status(400).json({ success: false, message: "PDF file is empty" });
    }

    // Task 3: Add detailed auditing logs
    if (process.env.NODE_ENV === "development") {
      console.log("=== POLICY UPLOAD FILE AUDIT ===");
      console.log("Original File Name:", req.file.originalname);
      console.log("Mimetype:", req.file.mimetype);
      console.log("Size:", req.file.size, "bytes");
      console.log("Buffer Length:", req.file.buffer.length, "bytes");
    }

    // Upload to Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await streamToCloudinary(req.file.buffer, req.file.originalname);
      if (process.env.NODE_ENV === "development") {
        console.log("=== CLOUDINARY UPLOAD RESPONSE ===");
        console.log("Upload response object:", JSON.stringify(cloudinaryResult, null, 2));
        console.log("Result secure_url:", cloudinaryResult.secure_url);
        console.log("Result public_id:", cloudinaryResult.public_id);
        console.log("Result resource_type:", cloudinaryResult.resource_type);
        console.log("Result format:", cloudinaryResult.format || "pdf");
        console.log("Result bytes:", cloudinaryResult.bytes || req.file.size);
      }
    } catch (error) {
      console.error("Cloudinary policy upload failed:", error);
      return res.status(500).json({ success: false, message: "Failed to upload file to Cloudinary" });
    }

    // Task 2: Verify uploaded Cloudinary asset is valid by performing a check
    if (!cloudinaryResult || !cloudinaryResult.secure_url) {
      console.error("[Upload Verification Failed]: Cloudinary response has no secure_url");
      return res.status(500).json({ success: false, message: "Upload failed: Invalid Cloudinary response" });
    }

    try {
      const verifyRes = await axios.head(cloudinaryResult.secure_url);
      if (process.env.NODE_ENV === "development") {
        console.log(`[Upload Verification Success]: Cloudinary asset is reachable. HTTP Status: ${verifyRes.status}`);
      }
    } catch (err) {
      console.error(`[Upload Verification Error]: Cloudinary asset is not reachable: ${err.message}`);
    }

    const uploadedBy = req.superAdminProfile?.name || req.user?.organizationName || req.user?.name || "Super Admin";

    // Task 7: Verify database record URL matches the secure_url from Cloudinary response
    const policy = await Policy.create({
      policyName,
      pdfFile: cloudinaryResult.secure_url,
      status: "Active",
      organizationId: req.user._id,
      uploadedBy,
      publicId: cloudinaryResult.public_id,
      resourceType: cloudinaryResult.resource_type,
      format: "pdf", // Explicitly set format as pdf
      bytes: cloudinaryResult.bytes || req.file.size,
    });

    // Create Audit Log
    await PolicyAuditLog.create({
      organizationId: req.user._id,
      action: `Uploaded PDF Policy: ${policyName}`,
      user: uploadedBy,
      type: "create",
    });

    return res.status(201).json({ success: true, data: policy });
  } catch (error) {
    console.error("Error in uploadPolicy:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get all policies
export const getPolicies = async (req, res) => {
  try {
    const policies = await Policy.find({ organizationId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: policies });
  } catch (error) {
    console.error("Error in getPolicies:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle status of a policy
export const updatePolicyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const policy = await Policy.findOne({ _id: id, organizationId: req.user._id });
    if (!policy) {
      return res.status(404).json({ success: false, message: "Policy not found" });
    }

    policy.status = status;
    await policy.save();

    const username = req.superAdminProfile?.name || req.user?.organizationName || req.user?.name || "Super Admin";

    // Create Audit Log
    await PolicyAuditLog.create({
      organizationId: req.user._id,
      action: `Marked Policy "${policy.policyName}" as ${status}`,
      user: username,
      type: "update",
    });

    return res.status(200).json({ success: true, data: policy });
  } catch (error) {
    console.error("Error in updatePolicyStatus:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a policy
export const deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await Policy.findOne({ _id: id, organizationId: req.user._id });
    if (!policy) {
      return res.status(404).json({ success: false, message: "Policy not found" });
    }

    await Policy.deleteOne({ _id: id });

    const username = req.superAdminProfile?.name || req.user?.organizationName || req.user?.name || "Super Admin";

    // Create Audit Log
    await PolicyAuditLog.create({
      organizationId: req.user._id,
      action: `Deleted PDF Policy: ${policy.policyName}`,
      user: username,
      type: "delete",
    });

    return res.status(200).json({ success: true, message: "Policy deleted successfully" });
  } catch (error) {
    console.error("Error in deletePolicy:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get single policy
export const getPolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const policy = await Policy.findOne({ _id: id, organizationId: req.user._id });
    if (!policy) {
      return res.status(404).json({ success: false, message: "Policy not found" });
    }
    return res.status(200).json({ success: true, data: policy });
  } catch (error) {
    console.error("Error in getPolicy:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Resolve ticket (called from governance)
export const resolveGovernanceTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findOne({ _id: id, organization: req.user._id });
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    ticket.status = "resolved";
    ticket.resolvedBy = req.superAdminProfile?._id || req.user._id;
    ticket.resolvedAt = new Date();
    await ticket.save();

    const username = req.superAdminProfile?.name || req.user?.organizationName || req.user?.name || "Super Admin";

    // Create Audit Log
    await PolicyAuditLog.create({
      organizationId: req.user._id,
      action: `Resolved Escalation ticket: ${ticket._id.toString().slice(-6).toUpperCase()} - ${ticket.title}`,
      user: username,
      type: "resolve",
    });

    return res.status(200).json({ success: true, message: "Ticket resolved successfully" });
  } catch (error) {
    console.error("Error in resolveGovernanceTicket:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get audit logs
export const getAuditLogs = async (req, res) => {
  try {
    const logs = await PolicyAuditLog.find({ organizationId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error("Error in getAuditLogs:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get governance tickets
export const getGovernanceTickets = async (req, res) => {
  try {
    const organizationId = req.user._id;
    const tickets = await Ticket.find({
      organization: organizationId,
    })
      .populate("school", "schoolName")
      .populate("raisedBy", "name")
      .sort({ updatedAt: -1 })
      .lean();

    const formatted = tickets.map((t) => ({
      id: `TKT-${t._id.toString().slice(-6).toUpperCase()}`,
      dbId: t._id,
      student: t.raisedBy?.name || "Student/Staff Member",
      branch: t.school?.schoolName || "HQ",
      issue: t.title,
      priority: t.priority ? (t.priority.charAt(0).toUpperCase() + t.priority.slice(1)) : "High",
      status: t.status,
      timestamp: t.updatedAt || t.createdAt,
      description: t.description
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error in getGovernanceTickets:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get dashboard metrics
export const getDashboardData = async (req, res) => {
  try {
    const organizationId = req.user._id;

    const activePolicies = await Policy.countDocuments({ organizationId, status: "Active" });
    const openEscalations = await Ticket.countDocuments({
      organization: organizationId,
      status: { $in: ["open", "in_progress", "escalated"] }
    });

    // Escalated priority tickets for this organization
    const priorityTickets = await Ticket.find({
      organization: organizationId,
      status: { $in: ["open", "in_progress", "escalated"] }
    })
      .populate("school", "schoolName")
      .populate("raisedBy", "name")
      .sort({ updatedAt: -1 })
      .limit(3)
      .lean();

    const formattedTickets = priorityTickets.map((ticket) => ({
      id: `TKT-${ticket._id.toString().slice(-6).toUpperCase()}`,
      dbId: ticket._id,
      student: ticket.raisedBy?.name || "Student/Staff Member",
      branch: ticket.school?.schoolName || "HQ",
      issue: ticket.title,
      priority: ticket.priority ? (ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)) : "High",
      status: ticket.status,
      timestamp: ticket.updatedAt || ticket.createdAt
    }));

    return res.status(200).json({
      success: true,
      data: {
        activePoliciesCount: activePolicies,
        openEscalationsCount: openEscalations,
        governanceScore: null,
        complianceRate: null,
        priorityEscalations: formattedTickets
      }
    });
  } catch (error) {
    console.error("Error in getDashboardData:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/superadmin/test-policy-pdf/:id
export const testPolicyPdf = async (req, res) => {
  try {
    const { id } = req.params;
    // Task 6: Retrieve policy by ID for inspection (works without req.user)
    const policy = await Policy.findById(id);
    if (!policy) {
      return res.status(404).json({ success: false, message: "Policy not found" });
    }

    // Task 6: Return exact object structure requested at root
    return res.status(200).json({
      cloudinaryUrl: policy.pdfFile,
      publicId: policy.publicId || "N/A",
      resourceType: policy.resourceType || "N/A",
      format: policy.format || "N/A",
      bytes: policy.bytes || 0,
      originalName: policy.policyName,
    });
  } catch (error) {
    console.error("Error in testPolicyPdf:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/superadmin/policies/:id/view or /api/policies/:id/view proxy
export const viewPolicyProxy = async (req, res) => {
  try {
    const { id } = req.params;

    // Get token from cookie, header, or query param
    let token;
    if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).send("Authentication token required");
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).send("Invalid or expired authentication token");
    }

    if (decoded.role !== "superadmin") {
      return res.status(403).send("Access denied");
    }

    const policy = await Policy.findOne({ _id: id, organizationId: decoded.id });
    if (!policy) {
      return res.status(404).send("Policy not found");
    }
    // Fetch the file as stream
    const response = await axios({
      method: "get",
      url: policy.pdfFile,
      responseType: "stream",
    });

    // Set headers to force inline browser PDF display
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=\"" + encodeURIComponent(policy.policyName) + ".pdf\"");

    // Pipe the stream directly to the response
    response.data.pipe(res);
  } catch (error) {
    console.error("Error in viewPolicyProxy:", error.message);
    res.setHeader("Content-Type", "text/html");
    if (error.response && error.response.status === 401) {
      return res.status(401).send("<h3>This policy PDF is stored using restricted Cloudinary settings and cannot be accessed. Please delete and re-upload this policy.</h3>");
    }
    return res.status(500).send(`<h3>Failed to stream PDF document from cloud: ${error.message}</h3>`);
  }
};
