import mongoose from "mongoose";
import User from "../../models/users/user.model.js";
import Teacher from "../../models/users/teacher.model.js";
import School from "../../models/school/School.js";
import AcademicYear from "../../models/principal/AcademicYear.model.js";
import PromotionHistory from "../../models/PromotionHistory.js";

const getSchoolContext = async (req) => {
    let schoolId = req.user?.schoolId || req.user?.school?._id || req.user?.school;
    if (!schoolId && req.user?.id) {
        const user = await User.findById(req.user.id);
        schoolId = user?.school;
    }
    return schoolId ? schoolId.toString() : null;
};

const designationHierarchy = [
  "Assistant Teacher",
  "Teacher",
  "Senior Teacher",
  "Head Teacher",
  "Academic Coordinator",
  "Vice Principal"
];

const getDesignationIndex = (designation) => {
  if (!designation) return 1; // Default to "Teacher"
  const index = designationHierarchy.findIndex(
    d => d.toLowerCase() === designation.trim().toLowerCase()
  );
  return index !== -1 ? index : 1; 
};

/**
 * @desc    Fetch all staff eligible for promotion/demotion
 * @route   GET /api/principal/promotions/staff
 */
export const getPromotionStaff = async (req, res) => {
  try {
    const schoolId = await getSchoolContext(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School context not found" });
    }
    const { search, department, designation, status } = req.query;

    const userQuery = { school: schoolId, role: "teacher", status: { $ne: "archived" } };
    if (status && status !== "All") {
      userQuery.status = status.toLowerCase() === "inactive" ? "inactive" : "active";
    }
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { loginId: { $regex: search, $options: "i" } }
      ];
    }

    const users = await User.find(userQuery).lean();
    const userIds = users.map(u => u._id);

    const teacherQuery = { user: { $in: userIds }, school: schoolId };
    if (department && department !== "All") {
      teacherQuery.department = { $regex: new RegExp("^" + department + "$", "i") };
    }
    if (designation && designation !== "All") {
      teacherQuery.designation = { $regex: new RegExp("^" + designation + "$", "i") };
    }

    const teachers = await Teacher.find(teacherQuery).lean();
    const teacherMap = new Map(teachers.map(t => [String(t.user), t]));

    const data = users
      .map(u => {
        const t = teacherMap.get(String(u._id));
        if (!t && (department || designation)) return null;
        return {
          teacherId: u._id,
          teacherName: u.name,
          employeeId: t?.staffId || u.loginId,
          department: t?.department || "N/A",
          currentDesignation: t?.designation || "Teacher",
          joiningDate: t?.joiningDate || null,
          status: u.status === "inactive" ? "Inactive" : "Active"
        };
      })
      .filter(Boolean);

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Promotion/Demotion history
 * @route   GET /api/principal/promotions/history
 */
export const getPromotionHistory = async (req, res) => {
  try {
    const schoolId = await getSchoolContext(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School context not found" });
    }
    const { teacher, startDate, endDate, actionType } = req.query;

    const query = { school: schoolId };

    if (actionType && actionType !== "All") {
      query.actionType = actionType.toLowerCase();
    }

    if (teacher) {
      const matchingUsers = await User.find({
        school: schoolId,
        role: "teacher",
        $or: [
          { name: { $regex: teacher, $options: "i" } },
          { loginId: { $regex: teacher, $options: "i" } }
        ]
      }).select("_id").lean();

      const userIds = matchingUsers.map(u => u._id);
      query.promotedTeacher = { $in: userIds };
    }

    if (startDate || endDate) {
      query.effectiveDate = {};
      if (startDate) {
        query.effectiveDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.effectiveDate.$lte = new Date(endDate);
      }
    }

    const history = await PromotionHistory.find(query)
      .populate("promotedTeacher", "name loginId")
      .sort({ createdAt: -1 })
      .lean();

    const data = history.map(item => ({
      ...item,
      teacherName: item.promotedTeacher?.name || "N/A",
      employeeId: item.promotedTeacher?.loginId || "N/A",
      promotedByName: item.runBy
    }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Promote Teacher
 * @route   POST /api/principal/promotions/promote
 */
export const promoteTeacher = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const schoolId = await getSchoolContext(req);
    if (!schoolId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "School context not found" });
    }

    const { teacherId, newDesignation, reason, effectiveDate } = req.body;

    if (!teacherId || !newDesignation || !reason || !effectiveDate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const schoolDoc = await School.findById(schoolId).session(session);
    if (!schoolDoc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "School not found." });
    }
    const organizationId = schoolDoc.organization;
    if (!organizationId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Organization context not found for this school." });
    }

    const user = await User.findOne({ _id: teacherId, school: schoolId, role: "teacher" }).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Teacher user not found" });
    }

    const teacherProfile = await Teacher.findOne({ user: teacherId, school: schoolId }).session(session);
    if (!teacherProfile) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Teacher profile not found" });
    }

    const previousDesignation = teacherProfile.designation || "Teacher";
    const prevIdx = getDesignationIndex(previousDesignation);
    const newIdx = getDesignationIndex(newDesignation);

    const newIdxInList = designationHierarchy.indexOf(newDesignation);
    if (newIdxInList === -1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: `Designation '${newDesignation}' is not in hierarchy.` });
    }

    if (newIdx <= prevIdx) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "New designation must be higher than current designation." });
    }

    if (newIdx >= designationHierarchy.length) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Cannot promote beyond the highest designation." });
    }

    // 1. Update Teacher Designation
    teacherProfile.designation = newDesignation;
    await teacherProfile.save({ session });

    // Fetch principal name and active academic year
    const principalUser = await User.findById(req.user.id || req.user._id).session(session);
    const principalName = principalUser ? principalUser.name : "Principal";

    const activeYearDoc = await AcademicYear.findOne({ school: schoolId, status: "Active" }).session(session);
    const currentYearName = activeYearDoc ? activeYearDoc.name : `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;

    // 2. Create PromotionHistory record
    const historyDocArray = await PromotionHistory.create([{
      runBy: principalName,
      school: schoolId,
      organization: organizationId,
      fromAcademicYear: currentYearName,
      toAcademicYear: currentYearName,
      promotedTeacher: teacherId,
      previousDesignation,
      newDesignation,
      actionType: "promotion",
      effectiveDate: new Date(effectiveDate),
      remarks: reason
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Map output for frontend compatibility
    const responseData = {
      ...historyDocArray[0].toObject(),
      teacherName: user.name,
      employeeId: teacherProfile.staffId || user.loginId,
      promotedByName: principalName
    };

    res.status(200).json({ success: true, message: "Teacher promoted successfully", data: responseData });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error("Promotion failed:", error);

    let msg = "Failed to promote teacher.";
    if (error.name === "ValidationError") {
      msg = Object.values(error.errors).map(val => val.message).join(", ");
    } else if (error.message) {
      msg = error.message;
    }

    res.status(500).json({ success: false, message: msg });
  }
};

/**
 * @desc    Demote Teacher
 * @route   POST /api/principal/promotions/demote
 */
export const demoteTeacher = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const schoolId = await getSchoolContext(req);
    if (!schoolId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "School context not found" });
    }

    const { teacherId, newDesignation, reason, effectiveDate } = req.body;

    if (!teacherId || !newDesignation || !reason || !effectiveDate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const schoolDoc = await School.findById(schoolId).session(session);
    if (!schoolDoc) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "School not found." });
    }
    const organizationId = schoolDoc.organization;
    if (!organizationId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Organization context not found for this school." });
    }

    const user = await User.findOne({ _id: teacherId, school: schoolId, role: "teacher" }).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Teacher user not found" });
    }

    const teacherProfile = await Teacher.findOne({ user: teacherId, school: schoolId }).session(session);
    if (!teacherProfile) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Teacher profile not found" });
    }

    const previousDesignation = teacherProfile.designation || "Teacher";
    const prevIdx = getDesignationIndex(previousDesignation);
    const newIdx = getDesignationIndex(newDesignation);

    const newIdxInList = designationHierarchy.indexOf(newDesignation);
    if (newIdxInList === -1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: `Designation '${newDesignation}' is not in hierarchy.` });
    }

    if (newIdx >= prevIdx) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "New designation must be lower than current designation." });
    }

    if (newIdx < 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "Cannot demote below the lowest designation." });
    }

    // 1. Update Teacher Designation
    teacherProfile.designation = newDesignation;
    await teacherProfile.save({ session });

    // Fetch principal name and active academic year
    const principalUser = await User.findById(req.user.id || req.user._id).session(session);
    const principalName = principalUser ? principalUser.name : "Principal";

    const activeYearDoc = await AcademicYear.findOne({ school: schoolId, status: "Active" }).session(session);
    const currentYearName = activeYearDoc ? activeYearDoc.name : `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`;

    // 2. Create PromotionHistory record
    const historyDocArray = await PromotionHistory.create([{
      runBy: principalName,
      school: schoolId,
      organization: organizationId,
      fromAcademicYear: currentYearName,
      toAcademicYear: currentYearName,
      promotedTeacher: teacherId,
      previousDesignation,
      newDesignation,
      actionType: "demotion",
      effectiveDate: new Date(effectiveDate),
      remarks: reason
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Map output for frontend compatibility
    const responseData = {
      ...historyDocArray[0].toObject(),
      teacherName: user.name,
      employeeId: teacherProfile.staffId || user.loginId,
      promotedByName: principalName
    };

    res.status(200).json({ success: true, message: "Teacher demoted successfully", data: responseData });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error("Demotion failed:", error);

    let msg = "Failed to demote teacher.";
    if (error.name === "ValidationError") {
      msg = Object.values(error.errors).map(val => val.message).join(", ");
    } else if (error.message) {
      msg = error.message;
    }

    res.status(500).json({ success: false, message: msg });
  }
};

/**
 * @desc    Stats
 * @route   GET /api/principal/promotions/stats
 */
export const getPromotionStats = async (req, res) => {
  try {
    const schoolId = await getSchoolContext(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School context not found" });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalPromotions, totalDemotions, thisMonthPromotions, thisMonthDemotions] = await Promise.all([
      PromotionHistory.countDocuments({ school: schoolId, actionType: "promotion" }),
      PromotionHistory.countDocuments({ school: schoolId, actionType: "demotion" }),
      PromotionHistory.countDocuments({ school: schoolId, actionType: "promotion", effectiveDate: { $gte: startOfMonth } }),
      PromotionHistory.countDocuments({ school: schoolId, actionType: "demotion", effectiveDate: { $gte: startOfMonth } })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalPromotions,
        totalDemotions,
        thisMonthPromotions,
        thisMonthDemotions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Export CSV
 * @route   GET /api/principal/promotions/export
 */
export const exportPromotionHistory = async (req, res) => {
  try {
    const schoolId = await getSchoolContext(req);
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "School context not found" });
    }
    const { teacher, startDate, endDate, actionType } = req.query;

    const query = { school: schoolId };

    if (actionType && actionType !== "All") {
      query.actionType = actionType.toLowerCase();
    }

    if (teacher) {
      const matchingUsers = await User.find({
        school: schoolId,
        role: "teacher",
        $or: [
          { name: { $regex: teacher, $options: "i" } },
          { loginId: { $regex: teacher, $options: "i" } }
        ]
      }).select("_id").lean();

      const userIds = matchingUsers.map(u => u._id);
      query.promotedTeacher = { $in: userIds };
    }

    if (startDate || endDate) {
      query.effectiveDate = {};
      if (startDate) {
        query.effectiveDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.effectiveDate.$lte = new Date(endDate);
      }
    }

    const history = await PromotionHistory.find(query)
      .populate("promotedTeacher", "name loginId")
      .sort({ createdAt: -1 })
      .lean();

    let csv = "Teacher Name,Employee ID,Previous Designation,New Designation,Action Type,Effective Date,Changed By,Created Date\n";
    history.forEach(item => {
      const dateStr = new Date(item.effectiveDate).toLocaleDateString();
      const createdStr = new Date(item.createdAt).toLocaleDateString();
      
      const teacherName = item.promotedTeacher?.name || "N/A";
      const employeeId = item.promotedTeacher?.loginId || "N/A";

      const teacherNameEscaped = `"${teacherName.replace(/"/g, '""')}"`;
      const prevDesignationEscaped = `"${item.previousDesignation.replace(/"/g, '""')}"`;
      const newDesignationEscaped = `"${item.newDesignation.replace(/"/g, '""')}"`;
      const actionTypeStr = item.actionType.charAt(0).toUpperCase() + item.actionType.slice(1);
      const changedByEscaped = `"${item.runBy.replace(/"/g, '""')}"`;

      csv += `${teacherNameEscaped},${employeeId},${prevDesignationEscaped},${newDesignationEscaped},${actionTypeStr},${dateStr},${changedByEscaped},${createdStr}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=promotion_demotion_history.csv");
    return res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
