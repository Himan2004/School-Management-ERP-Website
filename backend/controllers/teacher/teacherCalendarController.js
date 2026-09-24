import TeacherEvent from '../../models/teacher/teacherEvent.model.js'
import  Event from '../../models/common/Event.js';
import Teacher from '../../models/users/teacher.model.js';

/**
 * @desc    Get merged calendar events (Teacher specific + Global School/HQ events)
 * @route   GET /api/teacher/calendar/events
 * @access  Private (Teacher)
 */
export const getTeacherEvents = async (req, res) => {
    try {
        // 1. Find Teacher profile and populate school
        const teacherProfile = await Teacher.findOne({ user: req.user._id }).populate('school');
        
        if (!teacherProfile || !teacherProfile.school) {
            return res.status(404).json({ success: false, message: "Teacher or School profile not found" });
        }

        const orgId = teacherProfile.school.organization;
        const schoolId = teacherProfile.school._id;

        // Fetch range: 1 month ago to 6 months future
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 6);

        // 2. Fetch BOTH collections simultaneously
        const [personalEvents, globalEvents] = await Promise.all([
            // Query 1: Teacher's specific personal classes/meetings
            TeacherEvent.find({
                teacher: teacherProfile._id,
                date: { $gte: startDate, $lte: endDate }
            }).lean(),

            // Query 2: Global events from the Principal
            Event.find({
                school: schoolId,
                // 🚨 THE FIX: Just ignore Drafts and Cancelled events. Grab everything else!
                status: { $nin: ['Draft', 'Cancelled', 'Drafts'] } 
            }).lean()
        ]);

        // 3. Format Personal Events
        const formattedPersonal = personalEvents.map(ev => ({
            id: ev._id,
            title: ev.title,
            type: ev.type,
            date: ev.date ? new Date(ev.date).toISOString().split('T')[0] : '',
            time: ev.endTime ? `${ev.startTime} - ${ev.endTime}` : ev.startTime,
            location: ev.location,
            audience: ev.audience,
            color: ev.color,
            description: '',
            createdBy: 'You',
            source: 'personal',
            sourceLabel: 'My Event',
            canDelete: true
        }));

        // 4. Format Global (Principal) Events 
        const formattedGlobal = globalEvents.map(ev => {
            let uiType = 'meeting'; // default
            if (ev.category === 'Academic') uiType = 'class';
            if (ev.category === 'Holiday' || ev.category === 'Sports') uiType = 'assignment'; 

            // 🚨 THE FIX: Safely fallback just in case the Principal model uses different field names
            const safeDate = ev.eventDate || ev.date || ev.startDate || new Date();

            return {
                id: ev._id,
                title: ev.title,
                type: uiType,
                date: new Date(safeDate).toISOString().split('T')[0],
                time: ev.startTime || ev.time || 'All Day',
                location: ev.venue || ev.location || 'School Campus',
                audience: ev.audience || 'All Staff & Students',
                color: ev.priority === 'High' ? 'rose' : 'violet', // Red for high priority, purple for normal
                description: ev.description || '',
                createdBy: ev.createdBy || 'Principal',
                source: 'global',
                sourceLabel: 'School Event',
                canDelete: false
            };
        });

        // 5. Merge and sort
        const allEvents = [...formattedPersonal, ...formattedGlobal].sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });

        res.status(200).json({
            success: true,
            count: allEvents.length,
            data: allEvents
        });

    } catch (error) {
        console.error('Error fetching unified calendar events:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Create a new calendar event
 * @route   POST /api/teacher/calendar/events
 * @access  Private (Teacher)
 */
export const createTeacherEvent = async (req, res) => {
    try {
        // 1. Get the Teacher profile to securely attach the School ID
        const teacherProfile = await Teacher.findOne({ user: req.user._id });
        
        if (!teacherProfile) {
            return res.status(404).json({ success: false, message: "Teacher profile not found" });
        }

        const { title, type, date, startTime, endTime, location, audience, color } = req.body;

        // 2. Create the event
        const newEvent = await TeacherEvent.create({
            school: teacherProfile.school, 
            teacher: teacherProfile._id,   
            title,
            type,
            date: new Date(date), // Frontend will pass 'YYYY-MM-DD'
            startTime,
            endTime,
            location,
            audience,
            color
        });

        res.status(201).json({
            success: true,
            data: newEvent
        });

    } catch (error) {
        console.error('Error creating calendar event:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Delete a personal teacher event
 * @route   DELETE /api/teacher/calendar/events/:id
 * @access  Private (Teacher)
 */
export const deleteTeacherEvent = async (req, res) => {
    try {
        // 1. Find the teacher profile to get their specific Teacher ID
        const teacherProfile = await Teacher.findOne({ user: req.user._id });
        
        if (!teacherProfile) {
            return res.status(404).json({ success: false, message: 'Teacher profile not found' });
        }

        // 2. Find and delete the event ONLY if it belongs to this specific teacher
        const deletedEvent = await TeacherEvent.findOneAndDelete({
            _id: req.params.id,
            teacher: teacherProfile._id // Security lock!
        });

        if (!deletedEvent) {
            return res.status(403).json({ 
                success: false, 
                message: 'Unauthorized or event not found. You can only delete your own personal events.' 
            });
        }

        res.status(200).json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};