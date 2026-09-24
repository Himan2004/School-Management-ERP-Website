import express from 'express';
import {
    getMarksEntries,
    createMarksEntry,
    updateMarksEntry,
    deleteMarksEntry,
    getStudentsForMarks,
    saveMarks,
    publishMarks,
    verifyMarks
} from '../../controllers/teacher/marksEntryController.js';

const router = express.Router();

router.get('/students', getStudentsForMarks);
router.route('/')
    .get(getMarksEntries)
    .post(createMarksEntry);

router.route('/:id')
    .put(updateMarksEntry)
    .delete(deleteMarksEntry);

router.post('/:id/marks', saveMarks);
router.put('/:id/publish', publishMarks);
router.put('/:id/verify', verifyMarks);

export default router;
