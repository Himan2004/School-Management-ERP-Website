import express from "express";
import {
    createSchool,
    getAllOrganizations,
    getBranchesByOrganization,
    getOrganizationAddress,
    submitAdmissionApplication,
    getClassesOfOrganization,
    submitContactEnquiry,
    getOrganizationDetailsPublic
} from "../../controllers/school/schoolController.js";
import upload from "../../middleware/upload.js";

const router = express.Router();

router.post("/register", createSchool);
router.get('/organizations', getAllOrganizations);
router.get('/organizations/:organizationId', getOrganizationDetailsPublic);
router.get('/organizations/:organizationId/branches', getBranchesByOrganization);
router.post("/submit-admission", upload.any(), submitAdmissionApplication);
router.get("/organizations/:organizationId/branches/:branchId", getOrganizationAddress);
router.get('/organizations/:organizationId/classes', getClassesOfOrganization);
router.post("/contact", submitContactEnquiry);

export default router;