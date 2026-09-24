import mongoose from 'mongoose';
import Student from '../../models/users/student.model.js';
// Assume you have a model like this for your uploaded materials
import StudyMaterial from '../../models/academic/studyMaterial.model.js'; 

/**
 * @desc    Get all study materials for the logged-in student's class
 * @route   GET /api/student/study-materials
 * @access  Private (Student)
 */
export const getStudentStudyMaterials = async (req, res) => {
    try {
        const studentId = req.user._id;

        // 1. Fetch student to get their class and school
        const student = await Student.findOne({ user: studentId });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student profile not found' });
        }

        // 2. Fetch materials targeted for this student's class
        const materials = await StudyMaterial.find({
            school: student.school,
            applicableClasses: student.class, 
            status: 'published' // Only show active materials
        })
        .populate('uploadedBy', 'name') // Assuming uploadedBy references the User/Teacher model
        .sort({ createdAt: -1 })
        .lean();

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        // 3. Map DB records to match your React frontend perfectly
        const formattedMaterials = materials.map(mat => {
            // Dynamic flags
            const isNew = new Date(mat.createdAt) > sevenDaysAgo;
            const isPopular = mat.downloadCount > 100 || mat.views > 500;
            const isRecommended = mat.rating >= 4.5;

            return {
                id: mat._id,
                title: mat.title,
                subject: mat.subjectName || 'General',
                type: mat.fileType || 'PDF', // 'PDF', 'Video', 'Interactive', etc.
                format: mat.format || 'Document', 
                size: mat.fileSize || 'Unknown',
                pages: mat.pages || null,
                duration: mat.duration || null,
                downloadCount: mat.downloadCount || 0,
                views: mat.views || 0,
                rating: mat.rating || 4.0,
                uploadedBy: mat.uploadedBy?.name || 'Admin',
                uploadDate: mat.createdAt,
                description: mat.description || 'No description provided.',
                difficulty: mat.difficultyLevel || 'All Levels',
                tags: mat.tags || [],
                thumbnail: mat.thumbnailUrl || `https://via.placeholder.com/400x250?text=${mat.subjectName || 'Study'}`,
                fileUrl: mat.fileUrl || '#',
                previewUrl: mat.previewUrl || '#',
                isNew,
                isPopular,
                isRecommended
            };
        });

        res.status(200).json({
            success: true,
            count: formattedMaterials.length,
            data: formattedMaterials
        });

    } catch (error) {
        console.error('Error in getStudentStudyMaterials:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Increment view or download count
 * @route   PATCH /api/student/study-materials/:id/interact
 * @access  Private (Student)
 */
export const trackMaterialInteraction = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'view' or 'download'

        const updateQuery = action === 'download' 
            ? { $inc: { downloadCount: 1 } } 
            : { $inc: { views: 1 } };

        await StudyMaterial.findByIdAndUpdate(id, updateQuery);

        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};