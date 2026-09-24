import express from 'express';
import {
    getResults,
    generateResult,
    publishResult,
    getStudentMarksheets
} from '../../controllers/teacher/resultsController.js';

const router = express.Router();

router.get('/', getResults);
router.post('/generate', generateResult);
router.get('/marksheets', getStudentMarksheets);
router.put('/:id/publish', publishResult);

export default router;
