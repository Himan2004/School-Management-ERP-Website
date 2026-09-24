// backend/routes/admin/classRoutes.js

import express from 'express';
const router = express.Router();

import {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
  associateSubjectsWithClass,
  getClassesByYear,
  getAcademicYears
} from '../../controllers/admin/periodController.js';

import { protect, authorize } from '../../middleware/authMiddleware.js';

// All routes require authentication and admin authorization
router.use(protect, authorize('admin'));

// @route   POST /api/admin/classes
// @desc    Create a new class
// @access  Private (Admin)
router.post('/', createClass);

// @route   GET /api/admin/classes
// @desc    Get all classes with optional filtering
// @access  Private (Admin)
router.get('/', getAllClasses);

// @route   GET /api/admin/classes/academic-years
// @desc    Get all available academic years
// @access  Private (Admin)
router.get('/academic-years', getAcademicYears);

// @route   GET /api/admin/classes/by-year/:academicYear
// @desc    Get classes by academic year
// @access  Private (Admin)
router.get('/by-year/:academicYear', getClassesByYear);

// @route   GET /api/admin/classes/:id
// @desc    Get a single class by ID
// @access  Private (Admin)
router.get('/:id', getClassById);

// @route   PUT /api/admin/classes/:id
// @desc    Update class information
// @access  Private (Admin)
router.put('/:id', updateClass);

// @route   DELETE /api/admin/classes/:id
// @desc    Delete a class
// @access  Private (Admin)
router.delete('/:id', deleteClass);

// @route   POST /api/admin/classes/:id/subjects
// @desc    Associate subjects with a class
// @access  Private (Admin)
router.post('/:id/subjects', associateSubjectsWithClass);

// @route   GET /api/admin/classes/:classId/subjects
// @desc    Get subjects associated with a specific class
// @access  Private (Admin)

export default router;
