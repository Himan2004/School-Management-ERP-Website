import express from 'express';
import {
  getAcademicConfig,
  updateAcademicConfig,
  updateAcademicYear,
  addHoliday,
  updateHoliday,
  deleteHoliday,
  addExamPattern,
  updateExamPattern,
  deleteExamPattern,
  updateGradingSystem,
  updateRules,
  assignClasses,
  assignSubjects
} from '../../controllers/superAdmin/academicConfigController.js';
import { protect, authorize } from '../../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('superadmin'));

router.route('/')
  .get(getAcademicConfig)
  // .put(updateAcademicConfig);
  router.put('/:id' ,updateAcademicConfig )

router.put('/:id/academic-year', updateAcademicYear);

router.post('/:id/holidays', addHoliday);
router.put('/:id/holidays/:holidayId', updateHoliday);
router.delete('/:id/holidays/:holidayId', deleteHoliday);

router.post('/:id/exam-patterns', addExamPattern);
router.put('/:id/exam-patterns/:patternId', updateExamPattern);
router.delete('/:id/exam-patterns/:patternId', deleteExamPattern);

router.put('/:id/grading-system', updateGradingSystem);
router.put('/:id/rules', updateRules);
router.put('/:id/assign-classes', assignClasses);
router.put('/:id/assign-subjects', assignSubjects);

export default router;