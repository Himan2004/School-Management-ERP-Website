import express from "express";
import {
  getAcademicConfigurations,
  createAcademicConfiguration,
  updateAcademicConfiguration,
  deleteAcademicConfiguration,
  getCurrentAcademicConfiguration
} from "../../controllers/admin/schoolAcademicConfigController.js";
import { protect, authorize } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// GET methods accessible to Admin, Principal, and Accountant
router.get("/", authorize("admin", "principal", "accountant"), getAcademicConfigurations);
router.get("/current", authorize("admin", "principal", "accountant"), getCurrentAcademicConfiguration);

// Write methods accessible only to School Admin
router.post("/", authorize("admin"), createAcademicConfiguration);
router.put("/:id", authorize("admin"), updateAcademicConfiguration);
router.delete("/:id", authorize("admin"), deleteAcademicConfiguration);

export default router;
