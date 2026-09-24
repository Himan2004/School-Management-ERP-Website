import express from 'express';
import { protect, authorize } from '../../middleware/authMiddleware.js';
import upload from '../../middleware/upload.js';
import {
    // Form Submission
    submitAdmission,
    getAllAdmissions,
    getAdmissionById,
    getAdmissionByRef,
    checkDuplicateAdmission,
    getAdmissionTemplate,
    
    // Documents
    uploadDocuments,
    verifyDocument,
    getDocumentStatus,
    updateDocumentDetails,
    deleteDocument,
    getMissingDocuments,

    // Approval Workflow
    approveAdmission,
    rejectAdmission,
    createStudentProfile,
    sendDecisionNotification,
    bulkApproveAdmissions,
    generateCredentialsForAdmission,
    markInReview,

    // Analytics
    getAdmissionStats,
    getAvailableClasses,
    getDuplicateApplicants,
    exportAdmissionReports,

    // Intelligence
    identifyAvailableSeats,
    autoGenerateRef,
    checkDuplicateEmailPhone,
    trackAdmissionRealTime,
    cancelAdmission,
    sendCustomAdmissionEmail,
    processTransfer,
    getTCByStudent,
    getAllTCs,
    getAllTransferRequests
} from '../../controllers/principal/admissionController.js';

const router = express.Router();

// All routes require principal or admin access
router.use(protect);
router.use(authorize('admin', 'principal'));

// ==========================================
// FORM SUBMISSION & RETRIEVAL
// ==========================================
router.post('/', authorize('admin', 'principal'), submitAdmission);
router.get('/', getAllAdmissions);
router.get('/template', getAdmissionTemplate); // Must be before /:id
router.post('/check-duplicate', checkDuplicateAdmission);
router.get('/ref/:refNo', getAdmissionByRef);
router.get('/all-tcs', getAllTCs);
router.get('/transfer-requests', getAllTransferRequests);
router.get('/:id', getAdmissionById);

// Document upload fields config
const admissionDocFields = upload.fields([
    { name: 'studentAadhaar', maxCount: 1 },
    { name: 'parentAadhaar', maxCount: 1 },
    { name: 'previousYearMarksheet', maxCount: 1 },
    { name: 'transferCertificate', maxCount: 1 },
    { name: 'birthCertificate', maxCount: 1 },
    { name: 'photo', maxCount: 1 },
]);

// ==========================================
// DOCUMENT MANAGEMENT
// ==========================================
router.post('/:id/documents', authorize('admin', 'principal'), (req, res, next) => {
    admissionDocFields(req, res, (err) => {
        if (err) {
            console.error("Upload Error Caught:", err.message);
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
}, uploadDocuments);
router.put('/:id/documents/:docType/verify', authorize('admin', 'principal'), verifyDocument);
router.get('/:id/documents/status', getDocumentStatus);
router.put('/:id/documents/:docType', authorize('admin', 'principal'), updateDocumentDetails);
router.delete('/:id/documents/:docType', authorize('admin', 'principal'), deleteDocument);
router.get('/:id/documents/missing', getMissingDocuments);

// ==========================================
// APPROVAL & REJECTION WORKFLOW
// ==========================================
router.post('/bulk-approve', authorize('admin', 'principal'), bulkApproveAdmissions); // Must be before /:id/...
router.post('/:id/approve', authorize('admin', 'principal'), approveAdmission);
router.post('/:id/reject', authorize('admin', 'principal'), rejectAdmission);
router.post('/:id/create-profile', authorize('admin', 'principal'), createStudentProfile);
router.post('/:id/notify', authorize('admin', 'principal'), sendDecisionNotification);
router.post('/:id/generate-credentials', authorize('admin', 'principal'), generateCredentialsForAdmission);
router.post('/:id/send-email', authorize('admin', 'principal'), sendCustomAdmissionEmail);
router.post('/:id/cancel', authorize('admin', 'principal'), cancelAdmission);
router.post('/:id/transfer', authorize('admin', 'principal'), processTransfer);
router.get('/:id/tc', getTCByStudent);
router.post('/:id/review', authorize('admin', 'principal'), markInReview);

// ==========================================
// ANALYTICS & ADMINISTRATION
// ==========================================
router.get('/analytics/stats', getAdmissionStats);
router.get('/analytics/classes', getAvailableClasses);
router.get('/analytics/duplicates', getDuplicateApplicants);
router.get('/analytics/export', exportAdmissionReports);

// ==========================================
// INTELLIGENCE FEATURES
// ==========================================
router.get('/intelligence/seats', identifyAvailableSeats);
router.get('/intelligence/generate-ref', autoGenerateRef);
router.post('/intelligence/check-contact', checkDuplicateEmailPhone);
router.get('/intelligence/track/:id', trackAdmissionRealTime);

export default router;
