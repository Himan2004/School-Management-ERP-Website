import express from "express";
import { 
    getAnnouncements, 
    createAnnouncement, 
    updateAnnouncement, 
    deleteAnnouncement,
    getTeacherClasses,
    getOfficialNotices,
    markNoticeAsRead
} from "../../controllers/teacher/teacherAnnouncementController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize('teacher', 'principal', 'admin')); // Multiple roles can post announcements

router.get("/official-notices", getOfficialNotices);
router.put("/official-notices/:id/read", markNoticeAsRead);

router.get("/classes", getTeacherClasses);

router.route("/")
    .get(getAnnouncements)
    .post(createAnnouncement);

router.route("/:id")
    .put(updateAnnouncement)
    .delete(deleteAnnouncement);

export default router;