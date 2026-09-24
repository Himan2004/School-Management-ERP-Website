import mongoose from "mongoose";
import TransferRequest from "../../models/principal/TransferRequest.model.js";
import TransferCertificate from "../../models/principal/TransferCertificate.model.js";
import User from "../../models/users/user.model.js";
import Class from "../../models/organization/organizationClass.js";
import Section from "../../models/school/Section.model.js";
import School from "../../models/school/School.js";
import Student from "../../models/users/student.model.js";
import AdmissionRequest from "../../models/school/admissionRequest.js";

// ─── Helper ────────────────────────────────────────────────────────────────────
const getSchoolContext = async (req) => {
  // Extract directly from the token payload - no DB query needed!
  const schoolId = req.user?.school?._id || req.user?.school;
  if (!schoolId)
    throw new Error("School context is missing from the user token.");
  return schoolId;
};

const getOrgId = async (req) => {
  const orgId = req.user?.school?.organization?._id || req.user?.organization;
  if (!orgId) throw new Error("Organization context is missing.");
  return orgId;
};

const buildBaseQuery = async (req) => {
  const schoolId = await getSchoolContext(req);
  return {
    branch: schoolId,
    $or: [
      { admissionSource: "ADMIN" },
      { admissionSource: { $ne: "ADMIN" }, reviewedBy: { $ne: null } },
    ],
  };
};

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1: MAIN LIST DISPLAY (6 Endpoints)
// ══════════════════════════════════════════════════════════════════════════════

const attachStudentAdmissionNumbers = async (admissions) => {
  if (!Array.isArray(admissions) || admissions.length === 0) return admissions;
  
  return Promise.all(admissions.map(async (adm) => {
    if (adm.status === "approved" || adm.status === "active") {
      const ParentModel = mongoose.model("Parent");
      const parentDoc = await ParentModel.findOne({
        $or: [
          { email: adm.parent?.email },
          { primaryContact: adm.parent?.primaryContact }
        ]
      }).lean();
      
      if (parentDoc) {
        const StudentModel = mongoose.model("Student");
        const dbStudents = await StudentModel.find({ parent: parentDoc._id }).lean();
        
        const updatedStudents = adm.students.map(s => {
          const matchedDbStudent = dbStudents.find(ds => 
            ds.fullName?.toLowerCase() === s.fullName?.toLowerCase()
          );
          return {
            ...s,
            enrollmentNumber: matchedDbStudent?.admissionNo || matchedDbStudent?.enrollmentNo || s.enrollmentNumber || "PENDING"
          };
        });
        return {
          ...adm,
          students: updatedStudents
        };
      }
    }
    return adm;
  }));
};

// GET /api/principal/admissions-list  — all admissions with advanced filtering & pagination
export const getAllAdmissionsList = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);
    const {
      page = 1,
      limit = 10,
      status,
      search,
      classId,
      section,
      gender,
      fromDate,
      toDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = { ...base };
    if (status && status !== "All") query.status = status.toLowerCase();
    if (classId) query["students.class"] = classId;
    if (section) query["students.section"] = section;
    if (gender) query["students.gender"] = gender;

    if (search) {
      query.$or = [
        { applicationNumber: { $regex: search, $options: "i" } },
        { "parent.fullName": { $regex: search, $options: "i" } },
        { "parent.primaryContact": { $regex: search, $options: "i" } },
        { "parent.email": { $regex: search, $options: "i" } },
        { "students.fullName": { $regex: search, $options: "i" } },
      ];
    }

    if (fromDate || toDate) {
      query.submittedAt = {};
      if (fromDate) query.submittedAt.$gte = new Date(fromDate);
      if (toDate) query.submittedAt.$lte = new Date(toDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [rawAdmissions, total] = await Promise.all([
      AdmissionRequest.find(query)
        .populate("students.class", "name numericLevel")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AdmissionRequest.countDocuments(query),
    ]);

    const admissions = await attachStudentAdmissionNumbers(rawAdmissions);

    res.status(200).json({
      success: true,
      data: admissions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/summary — card view format
export const getAdmissionsSummaryCards = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const admissions = await AdmissionRequest.find(base)
      .select(
        "applicationNumber status submittedAt parent.fullName parent.primaryContact students.fullName students.class students.section students.photo",
      )
      .populate("students.class", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AdmissionRequest.countDocuments(base);

    res.status(200).json({
      success: true,
      data: admissions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/by-status — grouped by status tabs
export const getAdmissionsByStatusTab = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);
    const { status = "pending" } = req.query;

    const admissions = await AdmissionRequest.find({ ...base, status })
      .populate("students.class", "name")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      status,
      count: admissions.length,
      data: admissions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/:id — single detailed view
export const getSingleAdmissionDetail = async (req, res) => {
  try {
    const admission = await AdmissionRequest.findById(req.params.id)
      .populate("students.class", "name numericLevel")
      .populate("reviewedBy", "name email")
      .lean();

    if (!admission)
      return res
        .status(404)
        .json({ success: false, message: "Admission not found" });
    res.status(200).json({ success: true, data: admission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/dashboard-stats — dashboard statistics
export const getAdmissionDashboardStats = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);

    const stats = await AdmissionRequest.aggregate([
      { $match: { branch: base.branch } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const total = await AdmissionRequest.countDocuments(base);

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const trend = await AdmissionRequest.aggregate([
      { $match: { branch: base.branch, createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const statusMap = stats.reduce(
      (acc, s) => ({ ...acc, [s._id]: s.count }),
      {},
    );

    res.status(200).json({
      success: true,
      data: {
        total,
        pending: statusMap.pending || 0,
        under_review: statusMap.under_review || 0,
        approved: statusMap.approved || 0,
        rejected: statusMap.rejected || 0,
        cancelled: statusMap.cancelled || 0,
        trend,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/status-counts — quick counts per status
export const getQuickStatusCounts = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);
    const counts = await AdmissionRequest.aggregate([
      { $match: { branch: base.branch } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const result = counts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {
      total: 0,
    });
    result.total = Object.values(result).reduce((a, b) => a + b, 0);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2: SEARCH & FILTERING (4 Endpoints)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/principal/admissions-list/search?q= — full-text search
export const searchAdmissions = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);
    const { q } = req.query;

    if (!q)
      return res
        .status(400)
        .json({ success: false, message: "Search query required" });

    const results = await AdmissionRequest.find({
      ...base,
      $or: [
        { applicationNumber: { $regex: q, $options: "i" } },
        { "parent.fullName": { $regex: q, $options: "i" } },
        { "parent.email": { $regex: q, $options: "i" } },
        { "parent.primaryContact": { $regex: q, $options: "i" } },
        { "students.fullName": { $regex: q, $options: "i" } },
      ],
    })
      .populate("students.class", "name")
      .limit(20)
      .lean();

    res
      .status(200)
      .json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/filter — multi-criteria filtering
export const filterAdmissions = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);
    const { status, classId, section, gender, category, fromDate, toDate } =
      req.query;

    const query = { ...base };
    if (status) query.status = status;
    if (classId) query["students.class"] = classId;
    if (section) query["students.section"] = section;
    if (gender) query["students.gender"] = gender;
    if (fromDate || toDate) {
      query.submittedAt = {};
      if (fromDate) query.submittedAt.$gte = new Date(fromDate);
      if (toDate) query.submittedAt.$lte = new Date(toDate);
    }

    const results = await AdmissionRequest.find(query)
      .populate("students.class", "name")
      .sort({ createdAt: -1 })
      .lean();

    res
      .status(200)
      .json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/date-range — date-based aggregation
export const getAdmissionsByDateRange = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);
    const { fromDate, toDate, groupBy = "month" } = req.query;

    const matchQuery = { branch: base.branch };
    if (fromDate) matchQuery.createdAt = { $gte: new Date(fromDate) };
    if (toDate)
      matchQuery.createdAt = {
        ...matchQuery.createdAt,
        $lte: new Date(toDate),
      };

    const groupStage =
      groupBy === "day"
        ? {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
          }
        : { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } };

    const data = await AdmissionRequest.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: groupStage,
          count: { $sum: 1 },
          statuses: { $push: "$status" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/filter-metadata — dynamic filter options
export const getFilterMetadata = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);
    const schoolId = await getSchoolContext(req);
    const orgId = await getOrgId(req);

    const school = await School.findById(schoolId).lean();
    if (!school) return res.status(404).json({ success: false, message: "School not found" });

    const allocatedGrades = school.gradesOffered
      ? school.gradesOffered.split(",").map((g) => g.trim().toLowerCase())
      : [];
    const isClassAllowed = (clsName) => {
      let cleanName = clsName.trim().toLowerCase();
      if (cleanName.startsWith("class ")) {
        cleanName = cleanName.substring(6).trim();
      }
      return allocatedGrades.includes(cleanName);
    };

    const [statuses, classesRaw, sections] = await Promise.all([
      AdmissionRequest.distinct("status", base),
      Class.find({ organization: orgId, isActive: true })
        .select("name _id")
        .sort({ name: 1 }), // Sorted alphabetically
      Section.find({ school: schoolId, status: "active" })
        .select("name _id classId")
        .sort({ name: 1 }),
    ]);

    const classes = classesRaw.filter((cls) => isClassAllowed(cls.name));

    res.status(200).json({
      success: true,
      data: {
        statuses,
        classes,
        sections, // Now returning actual section objects linked to classIds
        genders: ["Male", "Female", "Other"],
        sortOptions: ["createdAt", "submittedAt", "applicationNumber"],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3: DETAILS & TIMELINE (4 Endpoints)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/principal/admissions-list/:id/timeline — status change history
export const getAdmissionTimeline = async (req, res) => {
  try {
    const admission = await AdmissionRequest.findById(req.params.id)
      .populate("reviewedBy", "name")
      .lean();

    if (!admission)
      return res.status(404).json({ success: false, message: "Not found" });

    // Build timeline from available fields
    const timeline = [
      {
        event: "Form Submitted",
        date: admission.submittedAt || admission.createdAt,
        actor: "Applicant",
      },
      admission.reviewedAt && admission.status !== "pending"
        ? {
            event: `Status changed to ${admission.status}`,
            date: admission.reviewedAt,
            actor: admission.reviewedBy?.name || "Principal",
            remarks: admission.remarks,
          }
        : null,
    ].filter(Boolean);

    res.status(200).json({ success: true, data: timeline });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/:id/similar — find similar admissions
export const getSimilarAdmissions = async (req, res) => {
  try {
    const admission = await AdmissionRequest.findById(req.params.id).lean();
    if (!admission)
      return res.status(404).json({ success: false, message: "Not found" });

    const classIds = admission.students.map((s) => s.class).filter(Boolean);
    const similar = await AdmissionRequest.find({
      _id: { $ne: admission._id },
      branch: admission.branch,
      $or: [
        { "students.class": { $in: classIds } },
        { "parent.address.city": admission.parent?.address?.city },
        { status: admission.status },
      ],
    })
      .limit(5)
      .populate("students.class", "name")
      .lean();

    res.status(200).json({ success: true, data: similar });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/:id/notes — get internal notes
export const getAdmissionNotes = async (req, res) => {
  try {
    const admission = await AdmissionRequest.findById(req.params.id)
      .select("remarks")
      .lean();
    if (!admission)
      return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, data: { notes: admission.remarks } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/principal/admissions-list/:id/notes — add internal notes
export const addAdmissionNote = async (req, res) => {
  try {
    const { note } = req.body;
    const admission = await AdmissionRequest.findByIdAndUpdate(
      req.params.id,
      { remarks: note },
      { new: true },
    );
    if (!admission)
      return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({
      success: true,
      message: "Note saved",
      data: { notes: admission.remarks },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4: QUICK ACTIONS (2 Endpoints)
// ══════════════════════════════════════════════════════════════════════════════

// PATCH /api/principal/admissions-list/:id/status — quick status change
export const changeAdmissionStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const validStatuses = [
      "pending",
      "under_review",
      "approved",
      "rejected",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const admission = await AdmissionRequest.findByIdAndUpdate(
      req.params.id,
      {
        status,
        remarks: remarks || "",
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
      },
      { new: true },
    );
    if (!admission)
      return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      data: admission,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/principal/admissions-list/:id/flag — flag/unflag important
export const toggleAdmissionFlag = async (req, res) => {
  try {
    const admission = await AdmissionRequest.findById(req.params.id);
    if (!admission)
      return res.status(404).json({ success: false, message: "Not found" });

    // Use remarks field prefix as a flag indicator (lightweight approach)
    const isFlagged = admission.remarks?.startsWith("[FLAGGED]");
    admission.remarks = isFlagged
      ? admission.remarks?.replace("[FLAGGED] ", "") || ""
      : `[FLAGGED] ${admission.remarks || ""}`;

    await admission.save();
    res.status(200).json({
      success: true,
      flagged: !isFlagged,
      message: !isFlagged ? "Admission flagged" : "Flag removed",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 5: BULK OPERATIONS (1 Endpoint)
// ══════════════════════════════════════════════════════════════════════════════

// PATCH /api/principal/admissions-list/bulk — bulk update
export const bulkUpdateAdmissions = async (req, res) => {
  try {
    const { ids, updates } = req.body; // ids: string[], updates: { status?, remarks? }
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "IDs array is required" });
    }

    const updatePayload = { ...updates };
    if (updates.status) {
      updatePayload.reviewedBy = req.user.id;
      updatePayload.reviewedAt = new Date();
    }

    const result = await AdmissionRequest.updateMany(
      { _id: { $in: ids } },
      { $set: updatePayload },
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} admissions updated`,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 6: REPORTS & ANALYTICS (4 Endpoints)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/principal/admissions-list/reports/pending — pending needing action
export const getPendingAdmissions = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);
    const pending = await AdmissionRequest.find({
      ...base,
      status: { $in: ["pending", "under_review"] },
    })
      .populate("students.class", "name")
      .sort({ createdAt: 1 })
      .lean();

    res
      .status(200)
      .json({ success: true, count: pending.length, data: pending });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/reports/metrics — performance metrics
export const getPerformanceMetrics = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);
    const total = await AdmissionRequest.countDocuments(base);
    const approved = await AdmissionRequest.countDocuments({
      ...base,
      status: "approved",
    });
    const rejected = await AdmissionRequest.countDocuments({
      ...base,
      status: "rejected",
    });

    // Average review time (from createdAt to reviewedAt)
    const reviewed = await AdmissionRequest.find({
      ...base,
      reviewedAt: { $exists: true, $ne: null },
    })
      .select("createdAt reviewedAt")
      .lean();

    let avgReviewTimeHrs = 0;
    if (reviewed.length > 0) {
      const totalMs = reviewed.reduce(
        (sum, r) => sum + (new Date(r.reviewedAt) - new Date(r.createdAt)),
        0,
      );
      avgReviewTimeHrs = Math.round(totalMs / reviewed.length / 1000 / 3600);
    }

    res.status(200).json({
      success: true,
      data: {
        total,
        approved,
        rejected,
        conversionRate:
          total > 0 ? `${Math.round((approved / total) * 100)}%` : "0%",
        rejectionRate:
          total > 0 ? `${Math.round((rejected / total) * 100)}%` : "0%",
        avgReviewTimeHrs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/reports/printable — printable format
export const getPrintableReport = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);
    const { status, fromDate, toDate } = req.query;

    const query = { ...base };
    if (status) query.status = status;
    if (fromDate) query.createdAt = { $gte: new Date(fromDate) };
    if (toDate)
      query.createdAt = { ...query.createdAt, $lte: new Date(toDate) };

    const admissions = await AdmissionRequest.find(query)
      .populate("students.class", "name")
      .sort({ applicationNumber: 1 })
      .select(
        "applicationNumber status parent.fullName parent.primaryContact students.fullName students.class students.section submittedAt",
      )
      .lean();

    res.status(200).json({
      success: true,
      generatedAt: new Date(),
      count: admissions.length,
      data: admissions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/reports/export — export CSV/JSON
export const exportAdmissionsReport = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);
    const { format = "json", status, ids } = req.query;

    const query = { ...base };
    if (status) query.status = status;
    if (ids) {
      query._id = { $in: ids.split(",") };
    }

    const rawAdmissions = await AdmissionRequest.find(query)
      .populate("students.class", "name")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    const admissions = await attachStudentAdmissionNumbers(rawAdmissions);

    if (format === "csv") {
      const formatDate = (dateVal) => {
        if (!dateVal) return "";
        try {
          const d = new Date(dateVal);
          if (isNaN(d.getTime())) return "";
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}-${month}-${year}`;
        } catch (_) {
          return "";
        }
      };

      const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).trim();
        if (str === "") return '""';
        const escaped = str.replace(/"/g, '""');
        return `"${escaped}"`;
      };

      const headers = [
        "Student Name", "Application Number", "Roll Number", "Gender", "Date of Birth", "Blood Group", "Student Mobile",
        "Current Class", "Current Section", "Academic Session", "Admission Date", "Admission Status", "Student Status", "Previous School",
        "Father Name", "Father Mobile", "Father Email", "Father Occupation", "Mother Name", "Mother Mobile",
        "Address", "City", "State", "Pincode",
        "Applied Class", "Assigned Section", "Academic Year",
        "Blood Group", "Emergency Contact",
        "Transport Required", "Pickup Point", "Route",
        "Created Date", "Updated Date", "Created By", "Last Updated By"
      ];

      const rows = [];

      for (const a of admissions) {
        for (const s of a.students) {
          const studentStatus = a.status === 'approved' ? 'Active' : 'Inactive';
          const guardianAddress = a.parent?.address
            ? [a.parent.address.street, a.parent.address.city, a.parent.address.state, a.parent.address.pincode].filter(Boolean).join(", ")
            : "";

          const rowData = [
            s.fullName || "",
            a.applicationNumber || "",
            s.rollNumber || "",
            s.gender || "",
            formatDate(s.dob),
            s.bloodGroup || "",
            a.parent?.primaryContact || "",
            s.class?.name || "",
            s.section || "",
            s.academicYear || "",
            formatDate(s.admissionDate),
            a.status || "",
            studentStatus,
            s.previousSchool || "",

            a.parent?.fatherName || "",
            a.parent?.primaryContact || "",
            a.parent?.email || "",
            a.parent?.fatherOccupation || "",
            a.parent?.motherName || "",
            a.parent?.alternateContact || "",

            guardianAddress,
            a.parent?.address?.city || "",
            a.parent?.address?.state || "",
            a.parent?.address?.pincode || "",

            s.class?.name || "",
            s.section || "",
            s.academicYear || "",

            s.bloodGroup || "",
            s.emergencyContact || a.parent?.primaryContact || "",

            s.transport?.required ? "Yes" : "No",
            s.transport?.pickupPoint || "",
            s.transport?.busRoute || "",

            formatDate(a.createdAt),
            formatDate(a.updatedAt),
            a.createdBy || "System",
            a.reviewedBy?.name || a.reviewedBy || ""
          ];

          rows.push(rowData.map(escapeCSV).join(","));
        }
      }

      const csvContent = "\ufeff" + headers.map(escapeCSV).join(",") + "\n" + rows.join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=admissions_export.csv",
      );
      return res.send(csvContent);
    }

    res
      .status(200)
      .json({ success: true, count: admissions.length, data: admissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 7: SUPPORT FEATURES (3 Endpoints)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/principal/admissions-list/charts/comparison — comparison charts
export const getComparisonCharts = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);

    const [byStatus, byClass, byGender] = await Promise.all([
      AdmissionRequest.aggregate([
        { $match: { branch: base.branch } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      AdmissionRequest.aggregate([
        { $match: { branch: base.branch } },
        { $unwind: "$students" },
        {
          $lookup: {
            from: "classes",
            localField: "students.class",
            foreignField: "_id",
            as: "classInfo",
          },
        },
        { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
        { $group: { _id: "$classInfo.name", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      AdmissionRequest.aggregate([
        { $match: { branch: base.branch } },
        { $unwind: "$students" },
        { $group: { _id: "$students.gender", count: { $sum: 1 } } },
      ]),
    ]);

    res
      .status(200)
      .json({ success: true, data: { byStatus, byClass, byGender } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/meta/filter-options — filter options
export const getFilterOptions = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);
    const schoolId = await getSchoolContext(req);
    const orgId = await getOrgId(req);

    const school = await School.findById(schoolId).lean();
    if (!school) return res.status(404).json({ success: false, message: "School not found" });

    const allocatedGrades = school.gradesOffered
      ? school.gradesOffered.split(",").map((g) => g.trim().toLowerCase())
      : [];
    const isClassAllowed = (clsName) => {
      let cleanName = clsName.trim().toLowerCase();
      if (cleanName.startsWith("class ")) {
        cleanName = cleanName.substring(6).trim();
      }
      return allocatedGrades.includes(cleanName);
    };

    const [classesRaw, statusList, sectionDocs] = await Promise.all([
      Class.find({ organization: orgId, isActive: true })
        .select("name _id")
        .sort({ numericLevel: 1 }),
      AdmissionRequest.distinct("status", base),
      Section.find({ school: schoolId, status: "active" }).select("name").lean(),
    ]);

    const classes = classesRaw.filter((cls) => isClassAllowed(cls.name));
    
    // Get unique section names for the school
    const sections = [...new Set(sectionDocs.map(s => s.name))].sort();

    res.status(200).json({
      success: true,
      data: {
        classes,
        statuses: statusList,
        sections: sections.length > 0 ? sections : ["A", "B", "C", "D"],
        genders: ["Male", "Female", "Other"],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/principal/admissions-list/pending-actions — pending actions dashboard
export const getPendingActions = async (req, res) => {
  try {
    const base = await buildBaseQuery(req);

    const [pendingReview, missingDocs, recentlySubmitted] = await Promise.all([
      AdmissionRequest.find({ ...base, status: "pending" }).countDocuments(),
      AdmissionRequest.find({
        ...base,
        status: "under_review",
      }).countDocuments(),
      AdmissionRequest.find({
        ...base,
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }).countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        pendingReview,
        underReview: missingDocs,
        submittedThisWeek: recentlySubmitted,
        urgentActions: pendingReview + missingDocs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Fetch Sister Schools for Transfer Dropdown ──────────────────────────────
export const getOrganizationSchools = async (req, res) => {
  try {
    // ✅ Correctly extracting from the nested structure
    const currentSchoolId = req.user?.school?._id;
    const organizationId = req.user?.school?.organization?._id;

    if (!organizationId || !currentSchoolId) {
      return res.status(400).json({
        success: false,
        message: "Missing organization context in user token.",
      });
    }

    // Fetch all active schools in the same organization, excluding the current one
    const schools = await School.find({
      organization: organizationId,
      _id: { $ne: currentSchoolId },
      isActive: true,
    }).select("schoolName branchName _id");

    // Format for the frontend
    const formattedSchools = schools.map((s) => ({
      _id: s._id,
      name: s.schoolName || s.branchName || "Unnamed Branch",
    }));

    res.status(200).json({
      success: true,
      data: formattedSchools,
    });
  } catch (error) {
    console.error("❌ Error fetching organization schools:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error fetching schools." });
  }
};

// ─── Process Student Transfer (Initiate Request) ─────────────────────────────
export const transferStudent = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Log the exact body we received from the frontend
    console.log("📥 RECEIVED REQUEST BODY:", req.body);

    const { studentId, targetSchoolId, reason } = req.body;

    const currentSchoolId = req.user?.school?._id;
    const organizationId = req.user?.school?.organization?._id;

    // ✅ FIX 1: Define currentUserId right here
    const currentUserId = req.user?._id;

    console.log("🏢 PRINCIPAL'S ORG ID:", organizationId);
    console.log("🎯 REQUESTED TARGET SCHOOL ID:", targetSchoolId);

    if (!organizationId || !currentSchoolId || !currentUserId) {
      throw new Error(
        "Missing organization, school, or user context in token.",
      );
    }

    // 2. Validate Target School Exists
    const targetSchool = await School.findById(targetSchoolId).session(session);

    if (!targetSchool) {
      console.error("❌ ERROR: Target school not found in database!");
      throw new Error("Target school does not exist or invalid ID.");
    }

    console.log("🔗 TARGET SCHOOL'S ORG ID:", targetSchool.organization);

    // 3. Validate Organization Match
    if (targetSchool.organization.toString() !== organizationId.toString()) {
      console.error("❌ ERROR: Organization mismatch!");
      throw new Error(
        "Unauthorized: Target school belongs to a different organization.",
      );
    }

    // 4. Find the Active Student
    const student = await Student.findOne({
      _id: studentId,
      school: currentSchoolId,
    }).session(session);

    if (!student) {
      throw new Error("Student not found in your branch.");
    }

    // Fetch the current school's details so we have its name
    const currentSchool = await School.findById(currentSchoolId)
      .select("schoolName")
      .session(session);

    // 5. Prevent duplicate requests
    const existingRequest = await TransferRequest.findOne({
      student: studentId,
      status: "Pending",
    }).session(session);

    if (existingRequest) {
      throw new Error(
        "A transfer request is already pending for this student.",
      );
    }

    // 6. Generate unique TC Number
    const count = await TransferCertificate.countDocuments().session(session);
    const tcNumber = `TC-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
    const today = new Date();

    // 7. Generate the Official Transfer Certificate Record
    const tcRecord = new TransferCertificate({
      student: studentId,
      school: currentSchoolId, // The school issuing the TC
      tcNumber: tcNumber,
      issueDate: today,
      transferDate: today, // Assuming they are transferring today
      reason: reason,
      destinationSchool: targetSchool.schoolName,
      lastAttendedDate: today,
      conduct: "Good", // Defaulting to Good based on your schema
      issuedBy: currentUserId, // ✅ Now this variable exists!
    });

    await tcRecord.save({ session });

    // 8. Generate the Transfer Request for the receiving school
    const transferReq = new TransferRequest({
      student: studentId,
      school: targetSchoolId, // The destination school receives this request
      requestedBy: "Office",
      reason: reason,
      status: "Pending",
    });

    await transferReq.save({ session });

    // 9. Update the Student Status
    // Mark them as having a TC issued so they don't show up in active reports
    student.status = "tc_issued";

    // Attach the TC details to the student's record for easy access later
    student.previousSchool = {
      name: currentSchool.schoolName, // ✅ FIX 2: Used currentSchool instead of student
      tcNumber: tcNumber,
      tcDate: today,
    };

    await student.save({ session });

    // 10. Commit
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: `Transfer initiated. TC generated and request sent to ${targetSchool.schoolName}.`,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // If it's a MongoDB duplicate key error for TC, handle it gracefully
    if (error.code === 11000) {
      console.error("❌ Duplicate TC Error:", error);
      return res.status(400).json({
        success: false,
        message: "This student already has a Transfer Certificate issued.",
      });
    }

    console.error("❌ Transfer error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to initiate transfer.",
    });
  }
};

// Add this function anywhere in studentController.js
export const getSectionsByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    // Ensure we only fetch active sections for this specific class
    const sections = await Section.find({
      classId: classId,
      status: "active",
    })
      .select("name _id")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: sections, // Sends back [{_id: "...", name: "A"}, ...]
    });
  } catch (error) {
    console.error("Error fetching sections by class:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
