import mongoose from "mongoose";
import StudentProfile from "../../models/users/student.model.js";
import User from "../../models/users/user.model.js";
import Class from "../../models/organization/organizationClass.js";
import School from "../../models/school/School.js";
import Marksheet from "../../models/academic/marksheet.model.js";
import Attendance from "../../models/academic/attendance.model.js";
import ReportCard from "../../models/academic/reportCard.model.js";
import Notice from "../../models/common/Notice.js";
import AuditLog from "../../models/common/AuditLog.js";
import Section from "../../models/school/Section.model.js";
// import Student from "../../models/users/student.model.js";

// Helper to get school context safely
const getSchoolContext = async (req) => {
    try {
        // First try to get from populated user
        if (req.user?.school) {
            return req.user.school._id || req.user.school;
        }
        
        // Fetch user from DB
        const user = await User.findById(req.user?._id || req.user?.id).populate("school");
        
        if (user && user.school) {
            return user.school._id || user.school;
        }
        
        console.error("School Context Error: Could not determine school ID");
        return null;
    } catch (error) {
        console.error('Error in getSchoolContext:', error);
        return null;
    }
};
// @desc    Get all students with advanced filtering
// @route   GET /api/principal/students/all
// @access  Private (Principal)
export const getAllStudents = async (req, res) => {
    try {
        // Get school ID from user
        const user = await User.findById(req.user?._id || req.user?.id).populate("school");
        
        if (!user || !user.school) {
            return res.status(200).json({ 
                success: true, 
                data: [],
                pagination: { total: 0, page: 1, pages: 0 },
                message: "No school found for this user"
            });
        }

        const schoolId = user.school._id || user.school;
        
        const { 
            page = 1, 
            limit = 10, 
            classId, 
            section, 
            gender, 
            status, 
            bloodGroup,
            academicYear,
            search
        } = req.query;

        // Build query
        let query = { school: schoolId };

        if (classId && classId !== 'all' && classId !== 'undefined') query.class = classId;
        if (section && section !== 'all' && section !== 'undefined') query.section = section;
        if (gender && gender !== 'all' && gender !== 'undefined') query.gender = gender;
        if (status && status !== 'all' && status !== 'undefined') query.status = status;
        if (bloodGroup && bloodGroup !== 'all' && bloodGroup !== 'undefined') query.bloodGroup = bloodGroup;
        if (academicYear && academicYear !== 'all' && academicYear !== 'undefined') query.academicYear = academicYear;

        // Search functionality
        if (search && search !== 'undefined') {
            const users = await User.find({
                school: schoolId,
                role: 'student',
                name: { $regex: search, $options: 'i' }
            }).select('_id');
            
            const userIds = users.map(u => u._id);
            
            if (userIds.length > 0) {
                query.user = { $in: userIds };
            } else {
                query.$or = [
                    { rollNo: { $regex: search, $options: 'i' } },
                    { enrollmentNo: { $regex: search, $options: 'i' } }
                ];
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitNum = parseInt(limit);

        // Get students
        let students = [];
        let total = 0;

        try {
            students = await StudentProfile.find(query)
                .populate("user", "name email loginId photo phone")
                .populate("class", "name")
                .populate("section", "name")
                .populate("parent", "fatherName motherName primaryContact")
                .populate("section","name classId")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean();

            total = await StudentProfile.countDocuments(query);
        } catch (dbError) {
            console.error("Database error:", dbError);
            students = [];
            total = 0;
        }

        // Ensure we always return an array
        const safeStudents = Array.isArray(students) ? students : [];

        res.status(200).json({
            success: true,
            data: safeStudents,
            pagination: {
                total: total || 0,
                page: parseInt(page),
                limit: limitNum,
                pages: Math.ceil((total || 0) / limitNum)
            }
        });
        
    } catch (error) {
        console.error('Error in getAllStudents:', error);
        // Always return a valid response even on error
        res.status(200).json({ 
            success: true, 
            data: [],
            pagination: { total: 0, page: 1, pages: 0 },
            message: error.message
        });
    }
};
// @desc    Get students statistics dashboard
// @route   GET /api/principal/students/stats
// @access  Private (Principal)
export const getStudentStats = async (req, res) => {
    try {
        const user = await User.findById(req.user?._id || req.user?.id).populate("school");
        
        if (!user || !user.school) {
            return res.status(404).json({ success: false, message: "School context not found" });
        }

        const schoolId = user.school._id || user.school;

        // Using StudentProfile
        const stats = await StudentProfile.aggregate([
            { $match: { school: schoolId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
                    inactive: { $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] } },
                    transferred: { $sum: { $cond: [{ $eq: ["$status", "transferred"] }, 1, 0] } },
                    male: { $sum: { $cond: [{ $eq: ["$gender", "male"] }, 1, 0] } },
                    female: { $sum: { $cond: [{ $eq: ["$gender", "female"] }, 1, 0] } },
                    other: { $sum: { $cond: [{ $eq: ["$gender", "other"] }, 1, 0] } }
                }
            }
        ]);

        // Class-wise distribution - using StudentProfile
        const classWise = await StudentProfile.aggregate([
            { $match: { school: schoolId } },
            {
                $group: {
                    _id: "$class",
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "classes",
                    localField: "_id",
                    foreignField: "_id",
                    as: "classInfo"
                }
            },
            { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    className: { $ifNull: ["$classInfo.name", "Unknown"] },
                    count: 1
                }
            },
            { $sort: { className: 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                summary: stats[0] || { total: 0, active: 0, inactive: 0, transferred: 0, male: 0, female: 0, other: 0 },
                classWise
            }
        });
    } catch (error) {
        console.error('Error in getStudentStats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
// @desc    Advanced search functionality (Name or Admission No)
// @route   GET /api/principal/students/search
// @access  Private (Principal)
export const searchStudents = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ success: false, message: "Search query is required" });
        }

        // Search by name (in User) or rollNo/enrollmentNo (in StudentProfile)
        const userMatches = await User.find({
            school: schoolId,
            role: "student",
            name: { $regex: query, $options: "i" }
        }).select("_id");

        const userIds = userMatches.map(u => u._id);

        const students = await StudentProfile.find({
            school: schoolId,
            $or: [
                { user: { $in: userIds } },
                { rollNo: { $regex: query, $options: "i" } },
                { enrollmentNo: { $regex: query, $options: "i" } }
            ]
        })
        .populate("user", "name email loginId photo")
        .populate("class", "name")
        .limit(20)
        .lean();

        // Also search AdmissionRequests for approved/pending applicants not yet in StudentProfile
        const admissionMatches = await mongoose.model('AdmissionRequest').find({
            branch: schoolId,
            status: { $in: ['approved', 'pending', 'under_review'] },
            'students.fullName': { $regex: query, $options: 'i' }
        }).populate('students.class', 'name').lean();

        // Convert AdmissionRequest matches to a similar format for the frontend
        const pendingAdmissions = [];
        admissionMatches.forEach(adm => {
            adm.students.forEach(s => {
                if (new RegExp(query, 'i').test(s.fullName)) {
                    pendingAdmissions.push({
                        _id: adm._id,
                        isAdmissionRequest: true,
                        studentIdInRequest: s._id,
                        user: {
                            name: s.fullName,
                            photo: s.photo
                        },
                        rollNo: s.rollNumber || "PENDING",
                        enrollmentNo: s.enrollmentNumber || "PENDING",
                        class: s.class,
                        section: { name: s.section || "N/A" },
                        parent: {
                            user: {
                                name: adm.parent.fullName,
                                phone: adm.parent.primaryContact
                            }
                        },
                        status: adm.status,
                        bloodGroup: s.bloodGroup
                    });
                }
            });
        });

        res.status(200).json({
            success: true,
            data: [...students, ...pendingAdmissions]
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single student complete profile
// @route   GET /api/principal/students/:id
// @access  Private (Principal)
export const getStudentProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await StudentProfile.findById(id)
            .populate("user", "-password")
            .populate("class", "name")
            .populate("section", "name")
            .populate({
                path: "parent",
                populate: { path: "user", select: "name email loginId phone" }
            })
            .lean();

        if (!student) {
            return res.status(404).json({ success: false, message: "Student not found" });
        }

        res.status(200).json({
            success: true,
            data: student
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get students by class
// @route   GET /api/principal/students/class/:classId
// @access  Private (Principal)
export const getStudentsByClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const { sectionId } = req.query;
        const schoolId = await getSchoolContext(req);

        const query = { school: schoolId, class: classId };
        if (sectionId) query.section = sectionId;

        const students = await StudentProfile.find(query)
            .populate("user", "name photo loginId")
            .populate("section", "name")
            .sort({ rollNo: 1 })
            .lean();

        res.status(200).json({
            success: true,
            data: students
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Multi-filter search (class, section, gender, category, blood group, etc.)
// @route   GET /api/principal/students/search/filters
// @access  Private (Principal)
export const getStudentsByMultiFilter = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        const filters = req.query;
        
        const query = { school: schoolId };
        
        // Dynamic filter building
        const allowedFilters = ['class', 'section', 'gender', 'status', 'bloodGroup', 'academicYear', 'admissionFeeStatus'];
        
        Object.keys(filters).forEach(key => {
            if (allowedFilters.includes(key) && filters[key]) {
                query[key] = filters[key];
            }
        });

        const students = await StudentProfile.find(query)
            .populate("user", "name email loginId photo")
            .populate("class", "name")
            .populate("section", "name")
            .limit(50)
            .lean();

        res.status(200).json({
            success: true,
            data: students
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- PHASE 2: STUDENT DETAILS ---

// @desc    Get student attendance records (daily, monthly breakdown)
// @route   GET /api/principal/students/:id/attendance
// @access  Private (Principal)
export const getStudentAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { month, year } = req.query;
        const schoolId = await getSchoolContext(req);

        const studentProfile = await StudentProfile.findById(id).populate("user", "_id");
        if (!studentProfile) return res.status(404).json({ success: false, message: "Student not found" });

        const studentUserId = studentProfile.user?._id || studentProfile.user;
        if (!studentUserId) {
            return res.status(400).json({ success: false, message: "Associated student user account not found" });
        }

        const query = { 
            school: schoolId, 
            "entries.student": studentUserId 
        };

        if (month && year) {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            query.date = { $gte: startDate, $lte: endDate };
        }

        const attendanceRecords = await mongoose.model("Attendance").find(query)
            .select("date entries.status entries.remarks attendanceType")
            .sort({ date: -1 })
            .lean();

        // Extract only the relevant entry for this student
        const formattedAttendance = attendanceRecords.map(record => {
            const entry = record.entries.find(e => e.student.toString() === studentUserId.toString());
            return {
                date: record.date,
                status: entry?.status,
                remarks: entry?.remarks,
                type: record.attendanceType
            };
        });

        res.status(200).json({
            success: true,
            data: formattedAttendance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get academic performance & marksheet history
// @route   GET /api/principal/students/:id/performance
// @access  Private (Principal)
export const getStudentPerformance = async (req, res) => {
    try {
        const { id } = req.params;
        const studentProfile = await StudentProfile.findById(id).populate("user", "_id");
        if (!studentProfile) return res.status(404).json({ success: false, message: "Student not found" });

        const studentUserId = studentProfile.user?._id || studentProfile.user;
        if (!studentUserId) {
            return res.status(400).json({ success: false, message: "Associated student user account not found" });
        }

        const marksheets = await mongoose.model("Marksheet").find({ student: studentUserId })
            .populate("examStructure", "examName examType")
            .populate("examSchedule", "academicYear")
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: marksheets
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get student documents management
// @route   GET /api/principal/students/:id/documents
// @access  Private (Principal)
export const getStudentDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await StudentProfile.findById(id).select("documents enrollmentNo").lean();
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        res.status(200).json({
            success: true,
            data: student.documents
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get guardian/parent contact information
// @route   GET /api/principal/students/:id/guardian
// @access  Private (Principal)
export const getGuardianInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await StudentProfile.findById(id)
            .populate({
                path: "parent",
                populate: { path: "user", select: "name email loginId phone photo" }
            })
            .select("parent")
            .lean();

        if (!student || !student.parent) {
            return res.status(404).json({ success: false, message: "Guardian info not found" });
        }

        res.status(200).json({
            success: true,
            data: student.parent
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get edit history (audit trail)
// @route   GET /api/principal/students/:id/edit-history
// @access  Private (Principal)
export const getEditHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const history = await mongoose.model("AuditLog").find({
            targetId: id
        })
        .populate("performedBy", "name role")
        .sort({ createdAt: -1 })
        .lean();

        res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get promotion/demotion history
// @route   GET /api/principal/students/:id/promotion-history
// @access  Private (Principal)
export const getPromotionHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await StudentProfile.findById(id).select("academicYear class").populate("class", "name").lean();
        
        res.status(200).json({
            success: true,
            data: {
                current: {
                    academicYear: student.academicYear,
                    class: student.class?.name
                },
                history: []
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get report card access
// @route   GET /api/principal/students/:id/report-cards
// @access  Private (Principal)
export const getReportCards = async (req, res) => {
    try {
        const { id } = req.params;
        const studentProfile = await StudentProfile.findById(id).populate("user", "_id");
        if (!studentProfile) return res.status(404).json({ success: false, message: "Student not found" });

        const reportCards = await mongoose.model("ReportCard").find({
            student: studentProfile.user._id
        })
        .sort({ academicYear: -1, createdAt: -1 })
        .lean();

        res.status(200).json({
            success: true,
            data: reportCards
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get communication history (emails, notices sent)
// @route   GET /api/principal/students/:id/communication
// @access  Private (Principal)
export const getCommunicationHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const studentProfile = await StudentProfile.findById(id).populate("user", "_id");
        if (!studentProfile) return res.status(404).json({ success: false, message: "Student not found" });

        const studentUserId = studentProfile.user?._id || studentProfile.user;
        if (!studentUserId) {
            return res.status(400).json({ success: false, message: "Associated student user account not found" });
        }

        const notices = await Notice.find({
            $or: [
                { targetUsers: studentUserId },
                { targetAudience: "student" },
                { targetClass: studentProfile.class }
            ]
        })
        .sort({ createdAt: -1 })
        .lean();

        res.status(200).json({
            success: true,
            data: notices
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- PHASE 3: ANALYTICS & REPORTS ---

// @desc    Class-wise performance reports
// @route   GET /api/principal/students/analytics/class-performance
// @access  Private (Principal)
export const getClassPerformance = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        const { academicYear } = req.query;

        const year = academicYear || "2024-25";
        let yearQuery = year;
        if (/^\d{4}-\d{2}$/.test(year)) {
            const parts = year.split("-");
            const expandedYear = `${parts[0]}-20${parts[1]}`;
            yearQuery = { $in: [year, expandedYear] };
        } else if (/^\d{4}-\d{4}$/.test(year)) {
            const parts = year.split("-");
            const contractedYear = `${parts[0]}-${parts[1].substring(2, 4)}`;
            yearQuery = { $in: [year, contractedYear] };
        }

        const performance = await mongoose.model("Marksheet").aggregate([
            { $match: { school: schoolId, academicYear: yearQuery, status: "published" } },
            {
                $group: {
                    _id: "$class",
                    avgPercentage: { $avg: "$percentage" },
                    passCount: { $sum: { $cond: ["$isPass", 1, 0] } },
                    totalStudents: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "classes",
                    localField: "_id",
                    foreignField: "_id",
                    as: "classInfo"
                }
            },
            { $unwind: "$classInfo" },
            {
                $project: {
                    className: "$classInfo.name",
                    avgPercentage: { $round: ["$avgPercentage", 2] },
                    passRate: { 
                        $round: [{ $multiply: [{ $divide: ["$passCount", "$totalStudents"] }, 100] }, 2] 
                    },
                    totalStudents: 1
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: performance
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Low performance students alert (threshold < 40%)
// @route   GET /api/principal/students/analytics/low-performers
// @access  Private (Principal)
export const getLowPerformers = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        const { threshold = 40, academicYear } = req.query;

        const year = academicYear || "2024-25";
        let yearQuery = year;
        if (/^\d{4}-\d{2}$/.test(year)) {
            const parts = year.split("-");
            const expandedYear = `${parts[0]}-20${parts[1]}`;
            yearQuery = { $in: [year, expandedYear] };
        } else if (/^\d{4}-\d{4}$/.test(year)) {
            const parts = year.split("-");
            const contractedYear = `${parts[0]}-${parts[1].substring(2, 4)}`;
            yearQuery = { $in: [year, contractedYear] };
        }

        const lowPerformers = await mongoose.model("Marksheet").find({
            school: schoolId,
            academicYear: yearQuery,
            percentage: { $lt: parseFloat(threshold) },
            status: "published"
        })
        .populate("student", "name email")
        .populate("class", "name")
        .select("student class percentage overallGrade")
        .sort({ percentage: 1 })
        .lean();

        res.status(200).json({
            success: true,
            data: lowPerformers
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Identify students ready for promotion
// @route   GET /api/principal/students/analytics/promotion-ready
// @access  Private (Principal)
export const getPromotionReadiness = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        const { academicYear } = req.query;

        const year = academicYear || "2024-25";
        let yearQuery = year;
        if (/^\d{4}-\d{2}$/.test(year)) {
            const parts = year.split("-");
            const expandedYear = `${parts[0]}-20${parts[1]}`;
            yearQuery = { $in: [year, expandedYear] };
        } else if (/^\d{4}-\d{4}$/.test(year)) {
            const parts = year.split("-");
            const contractedYear = `${parts[0]}-${parts[1].substring(2, 4)}`;
            yearQuery = { $in: [year, contractedYear] };
        }

        // Logic: Students who passed all exams and have percentage > threshold
        const readyStudents = await mongoose.model("Marksheet").find({
            school: schoolId,
            academicYear: yearQuery,
            isPass: true,
            percentage: { $gte: 40 },
            status: "published"
        })
        .populate("student", "name loginId")
        .populate("class", "name")
        .select("student class percentage academicYear")
        .lean();

        res.status(200).json({
            success: true,
            data: readyStudents
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- PHASE 4: MANAGEMENT OPERATIONS ---

// @desc    Export students list (CSV)
// @route   GET /api/principal/students/operations/export
// @access  Private (Principal)
export const exportStudentList = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        const { classId } = req.query;

        const query = { school: schoolId };
        if (classId) query.class = classId;

        const students = await StudentProfile.find(query)
            .populate("user", "name email loginId")
            .populate("class", "name")
            .populate("section", "name")
            .lean();

        // Simple CSV generation
        let csv = "AdmissionNo,Name,Email,Class,Section,Status\n";
        students.forEach(s => {
            csv += `${s.enrollmentNo || s.rollNo},${s.user?.name},${s.user?.email},${s.class?.name || ""},${s.section?.name || ""},${s.status}\n`;
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=students_list.csv");
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    View transfer/migration requests
// @route   GET /api/principal/students/operations/transfer-requests
// @access  Private (Principal)
export const getTransferRequests = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);

        // Fetching students with status "transferred" as a proxy for transfer history
        // In a real system, there would be a TransferRequest model
        const transfers = await StudentProfile.find({
            school: schoolId,
            status: "transferred"
        })
        .populate("user", "name")
        .populate("class", "name")
        .populate("section", "name")
        .select("user class section admissionDate updatedat")
        .sort({ updatedAt: -1 })
        .lean();

        res.status(200).json({
            success: true,
            data: transfers
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Send notices/messages to students
// @route   POST /api/principal/students/operations/send-notice
// @access  Private (Principal)
export const sendStudentNotice = async (req, res) => {
    try {
        const { studentIds, studentProfileIds, classId, title, content, type = "general" } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ success: false, message: "Title and content are required" });
        }

        const userId = req.user?._id || req.user?.id;
        const user = await User.findById(userId).populate("school");
        
        if (!user || !user.school) {
             return res.status(400).json({ success: false, message: "User school context missing" });
        }
        
        const schoolId = user.school._id || user.school;
        const organizationId = user.school.organization?._id || user.school.organization || user.organization;

        // Resolve User IDs from StudentProfile IDs if provided
        let resolvedUserIds = [];
        if (studentProfileIds && studentProfileIds.length > 0) {
            const profiles = await StudentProfile.find({ _id: { $in: studentProfileIds } }).select("user").lean();
            resolvedUserIds = profiles.map(p => p.user).filter(Boolean);
        } else if (studentIds && studentIds.length > 0) {
            // Fallback: if raw user IDs were passed directly
            resolvedUserIds = studentIds;
        }

        // Map frontend type to valid Notice schema category enum
        const validCategories = ['academic', 'finance', 'events', 'holiday', 'general', 'emergency', 'exam', 'urgent'];
        const category = validCategories.includes(type) ? type : 'general';

        const notice = await Notice.create({
            title,
            content,
            category,
            targetAudience: ["student", "parent"],
            targetUsers: resolvedUserIds,
            targetClass: classId || 'All Classes',
            school: schoolId,
            organization: organizationId,
            createdBy: userId,
            status: "published"
        });

        res.status(201).json({
            success: true,
            message: "Notice sent successfully",
            data: notice
        });
    } catch (error) {
        console.error("sendStudentNotice Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get low attendance alerts (below threshold)
// @route   GET /api/principal/students/analytics/low-attendance
// @access  Private (Principal)
export const getLowAttendanceStudents = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        const threshold = parseFloat(req.query.threshold) || 75;

        // 1. Aggregate attendance to get actual percentages
        const attendanceStats = await Attendance.aggregate([
            { $match: { school: new mongoose.Types.ObjectId(schoolId.toString()) } },
            { $unwind: "$entries" },
            { $group: {
                _id: "$entries.student",
                totalDays: { $sum: 1 },
                presentDays: {
                    $sum: {
                        $cond: [{ $in: ["$entries.status", ["present", "late", "half_day"]] }, 1, 0]
                    }
                }
            }}
        ]);

        // Create a map for quick lookup: userId -> attendance percentage
        const attendanceMap = {};
        attendanceStats.forEach(stat => {
            const percentage = Math.round((stat.presentDays / stat.totalDays) * 100);
            attendanceMap[stat._id.toString()] = percentage;
        });

        // 2. Fetch students
        const students = await StudentProfile.find({ school: schoolId })
            .populate("user", "name")
            .populate("class", "name")
            .lean();

        // 3. Map students and filter by actual attendance
        const alerts = students
            .map(s => {
                const userIdStr = s.user?._id?.toString() || s.user?.toString();
                const attendance = attendanceMap[userIdStr] !== undefined ? attendanceMap[userIdStr] : 100; // default 100% if no records
                
                return {
                    ...s, 
                    id: s._id,
                    studentName: s.user?.name,
                    admissionNo: s.enrollmentNo || s.rollNo,
                    class: s.class?.name,
                    className: s.class?.name,
                    attendance: attendance
                };
            })
            .filter(a => a.attendance < threshold)
            .sort((a, b) => a.attendance - b.attendance); // Lowest first

        res.status(200).json({
            success: true,
            data: alerts.slice(0, 10) // Return top 10 lowest
        });
    } catch (error) {
        console.error("getLowAttendanceStudents Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all classes for filtering
// @route   GET /api/principal/students/classes
// @access  Private (Principal)
export const getClasses = async (req, res) => {
    try {
        const user = await User.findById(req.user?._id || req.user?.id).populate("school");
        
        if (!user || !user.school) {
            return res.status(404).json({ success: false, message: "School context not found" });
        }

        const schoolId = user.school._id || user.school;
        const school = await School.findById(schoolId);
        
        if (!school) {
            return res.status(404).json({ success: false, message: "School not found" });
        }

        const classes = await Class.find({ 
            organization: school.organization,
            isActive: true 
        }).sort({ numericLevel: 1 }).lean();

        // Get unique section IDs from existing students
        let sections = [];
        let classesWithSections = [];
        try {
            const sectionIds = await StudentProfile.distinct("section", { school: schoolId });
            
            // Filter out any null or invalid IDs
            const validSectionIds = sectionIds.filter(id => id && id !== 'null');

            // 1. Fetch the actual Section documents using the IDs
            const sectionDocs = await Section.find({
                _id: { $in: validSectionIds }
            }).select("name _id classId");

            sections = sectionDocs.map(sec => sec.name);

            // Map sections inside each class
            classesWithSections = classes.map(cls => {
                const clsObj = cls.toObject ? cls.toObject() : cls;
                const clsSections = sectionDocs
                    .filter(sec => String(sec.classId) === String(cls._id))
                    .map(sec => sec.name);
                return {
                    ...clsObj,
                    sections: [...new Set(clsSections)]
                };
            });

        } catch (err) {
            console.error("Error fetching sections:", err.message);
            sections = [];
            classesWithSections = classes.map(cls => ({
                ...(cls.toObject ? cls.toObject() : cls),
                sections: ["A"]
            }));
        }

        res.status(200).json({
            success: true,
            data: {
                classes: classesWithSections,
                // Ensure we return a clean array of unique section names
                sections: [...new Set(sections)] 
            }
        });
    } catch (error) {
        console.error('Error in getClasses:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};


// TEMPORARY DEBUG ENDPOINT - Add this to your controller
export const debugStudents = async (req, res) => {
    try {
        const schoolId = await getSchoolContext(req);
        
        // Check if school exists
        const school = await School.findById(schoolId);
        
        // Count students
        const totalStudents = await Student.countDocuments({ school: schoolId });
        
        // Get first 2 students to see structure
        const sampleStudents = await Student.find({ school: schoolId }).limit(2).lean();
        
        res.json({
            success: true,
            debug: {
                schoolId,
                schoolExists: !!school,
                totalStudents,
                sampleStudents
            }
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.json({ success: false, error: error.message });
    }
};
