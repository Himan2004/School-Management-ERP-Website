// routes/superAdmin/organizationSubjectRoutes.js
import express from 'express';
import {
  getSubjects,
  getSubjectById,
  getSubjectsByClass,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectStatistics,
  bulkCreateSubjects,
  bulkDeleteSubjects
} from '../../controllers/superAdmin/subjectController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin'));

router.route('/')
  .get(getSubjects)
  .post(createSubject);

router.route('/bulk')
  .post(bulkCreateSubjects)
  .delete(bulkDeleteSubjects);

router.route('/statistics')
  .get(getSubjectStatistics);

router.route('/class/:classId')
  .get(getSubjectsByClass);

router.route('/:id')
  .get(getSubjectById)
  .put(updateSubject)
  .delete(deleteSubject);

export default router;