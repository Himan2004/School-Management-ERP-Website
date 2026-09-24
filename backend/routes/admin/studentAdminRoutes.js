import express from "express";
import {
    createStudent,
    getAllStudents,
    getStudentById,
    updateStudentProfile,
    updateStudentStatus,
    transferStudent,
    deleteStudent,
    bulkImportStudents,
    uploadDocument,
    getDocuments,
    deleteDocument,
    getAdmissionDetails,
    getAcademicHistory,
    getAttendanceRecords,
    getProgressReport,
    getClassRanking,
    getEnrollmentStats,
    getClassPerformance,
    getCorrelationAnalysis
} from "../../controllers/admin/studentAdminController.js";
import {
    getEligibleStudents,
    getPromotionStats,
    promoteSingleStudent,
    promoteBulkStudents,
    markPassOut,
    markDropout,
    getPromotionHistory
} from "../../controllers/admin/studentPromotionController.js";

import { protect, authorize } from "../../middleware/authMiddleware.js";
import upload from "../../middleware/upload.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

const studentDocFields = upload.fields([
    { name: 'studentAadhaar', maxCount: 1 },
    { name: 'parentAadhaar', maxCount: 1 },
    { name: 'previousYearMarksheet', maxCount: 1 },
    { name: 'transferCertificate', maxCount: 1 },
    { name: 'birthCertificate', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
]);

// Part 4: Basic CRUD
router.post("/", createStudent);
router.get("/", getAllStudents);
router.get("/stats/enrollment", getEnrollmentStats);
router.get("/stats/correlation", getCorrelationAnalysis);
router.get("/stats/performance/:classId", getClassPerformance);

// Promotion Routes
router.get("/promotion/eligible", getEligibleStudents);
router.get("/promotion/stats", getPromotionStats);
router.post("/promotion/single", promoteSingleStudent);
router.post("/promotion/bulk", promoteBulkStudents);
router.post("/promotion/passout", markPassOut);
router.post("/promotion/dropout", markDropout);
router.get("/promotion/history", getPromotionHistory);

router.get("/:id", getStudentById);

router.put("/:id", (req, res, next) => {
    studentDocFields(req, res, (err) => {
        if (err) {
            console.error("Student Profile Put Upload Error Caught:", err.message);
            let errMsg = err.message;
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                errMsg = `Unexpected upload field: ${err.field || 'unknown'}`;
            }
            return res.status(400).json({ 
                success: false, 
                message: errMsg 
            });
        }
        next();
    });
}, updateStudentProfile);

router.patch("/:id/status", updateStudentStatus);
router.post("/:id/transfer", transferStudent);
router.delete("/:id", deleteStudent);
router.post("/bulk-import", bulkImportStudents);

// Part 5: Documents


router.post("/:id/documents", (req, res, next) => {
    studentDocFields(req, res, (err) => {
        if (err) {
            console.error("Student Upload Error Caught:", err.message);
            let errMsg = err.message;
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                errMsg = `Unexpected upload field: ${err.field || 'unknown'}`;
            }
            return res.status(400).json({ 
                success: false, 
                message: errMsg 
            });
        }
        next();
    });
}, uploadDocument);
router.get("/:id/documents", getDocuments);
router.delete("/:id/documents/:type", deleteDocument);
router.get("/:id/admission", getAdmissionDetails);

// Part 6: Academic & Attendance
router.get("/:id/academic-history", getAcademicHistory);
router.get("/:id/attendance", getAttendanceRecords);
router.get("/:id/progress", getProgressReport);
router.get("/:id/ranking", getClassRanking);

export default router;
