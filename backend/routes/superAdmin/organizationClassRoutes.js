import express from 'express';
import {
  getClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getClassStatistics,
  bulkCreateClasses,
  bulkDeleteClasses
} from '../../controllers/superAdmin/classController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication and super admin authorization
router.use(protect);
router.use(authorize('superadmin'));

// Class routes - No organization params needed
router.route('/')
  .get(getClasses)
  .post(createClass);

router.route('/bulk')
  .post(bulkCreateClasses)
  .delete(bulkDeleteClasses);

router.route('/statistics')
  .get(getClassStatistics);

router.route('/:id')
  .get(getClassById)
  .put(updateClass)
  .delete(deleteClass);

export default router;