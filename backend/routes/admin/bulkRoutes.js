import express from "express";
import {
    bulkImportMarks,
    promoteStudents
} from "../../controllers/admin/bulkActionController.js";

import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.post("/import-marks", bulkImportMarks);
router.post("/promote-students", promoteStudents);

export default router;
