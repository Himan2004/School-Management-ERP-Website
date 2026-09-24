import express from "express"
const router = express.Router();
import {
    syncAndGetAdminNotifications,
    markAdminNotificationRead,
    markAllAdminNotificationsRead
} from "../../controllers/admin/adminNotificationController.js"
import {
    getDashboardStats,
    addStudent,
    addSubject,
    addStaff,
    updatePreviousStats,
    updateAdminProfile,
    changeAdminPassword,
    getAdminSettings,
    updateAdminSettings,
    getAllTeachers,
    createTeacher,
    assignTeacher,
    updateTeacher,
    deleteTeacher,
    addAccountant,
    getDashboardActivities
} from "../../controllers/admin/adminController.js"
import { protect, authorize } from "../../middleware/authMiddleware.js"
import upload from "../../middleware/upload.js";

router.use(protect, authorize("admin"));

router.get("/teachers", getAllTeachers);
router.post("/teachers/", createTeacher);
router.patch("/teachers/:id/assign", assignTeacher);
router.patch("/teachers/:id", updateTeacher);
router.delete("/teachers/:id", deleteTeacher);

router.get("/dashboard-stats", getDashboardStats);
router.get("/dashboard/activities", getDashboardActivities);
router.post("/students", addStudent);
router.post("/subjects", addSubject);
router.post("/staff", addStaff);
router.put("/previous-stats", updatePreviousStats);

router.put("/profile/update", upload.single("avatar"), updateAdminProfile);
router.put("/change-password", changeAdminPassword);

router.get("/settings", getAdminSettings);
router.put("/settings/update", updateAdminSettings);

router.post("/add-accountant", upload.single("photo"), addAccountant);

// Notifications Routes
router.get("/notifications", syncAndGetAdminNotifications);
router.patch("/notifications/:id/read", markAdminNotificationRead);
router.post("/notifications/mark-all-read", markAllAdminNotificationsRead);

export default router;