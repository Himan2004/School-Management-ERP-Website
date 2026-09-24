import Event from "../../models/common/Event.js"; 
import Parent from "../../models/users/parent.model.js";
import mongoose from "mongoose";

// @desc    Get all school events separated by upcoming/past
// @route   GET /api/parent/events
export const getEvents = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        
        const parentId = req.user._id;
        const parentProfile = await Parent.findOne({ user: parentId }).populate('students');

        const schoolIds = new Set();
        const rawSchoolId = req.user.school_id || req.user.school?._id || req.user.school;
        if (rawSchoolId) schoolIds.add(rawSchoolId.toString());

        if (parentProfile && parentProfile.students) {
            parentProfile.students.forEach(s => {
                if (s.school) schoolIds.add(s.school.toString());
            });
        }

        const schoolObjIds = Array.from(schoolIds).map(id => new mongoose.Types.ObjectId(id));
        const schoolStrIds = Array.from(schoolIds);

        const allEvents = await Event.find({
            $or: [
                { school: { $in: schoolObjIds } },
                { school: { $in: schoolStrIds } }
            ]
        }).lean();
        
        const upcoming = [];
        const past = [];

        allEvents.forEach(event => {
            // 1. STRICT ALLOWLIST FILTER
            // Convert to lowercase and trim spaces so " Parents " matches "parent"
            const participantsText = (event.participants || "").toLowerCase().trim();

            // Only allow the event if it contains one of our exact approved keywords
            const isAllowed = participantsText.includes("student") || 
                              participantsText.includes("parent") || 
                              participantsText.includes("everyone") ||
                              participantsText.includes("family") ||
                              participantsText === "all" || // Exact match for just "all"
                              participantsText === "";      // Exact match for blank

            // If the text is "all admins", it does NOT contain 'student', 'parent', etc.
            // So isAllowed becomes false, and we immediately skip it!
            if (!isAllowed) {
                return; 
            }

            // 2. Check if the parent has already RSVP'd
            const userRsvp = event.attendees?.find(a => a.userId?.toString() === parentId.toString());

            // 3. Map the exact DB fields
            const formattedEvent = {
                id: event._id,
                name: event.title, 
                category: event.category || "General",
                date: new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                time: `${event.startTime || 'TBA'} - ${event.endTime || 'TBA'}`,
                venue: event.venue || 'School Campus', 
                participants: event.participants || "All Students", 
                myRsvp: userRsvp ? userRsvp.response : null, 
                hasPhotos: event.photos && event.photos.length > 0 
            };

            // 4. Compare dates to sort into Upcoming vs Past
            const eventDate = new Date(event.eventDate);
            eventDate.setHours(0, 0, 0, 0);

            if (eventDate >= today) {
                upcoming.push(formattedEvent);
            } else {
                past.push(formattedEvent);
            }
        });

        // 5. Sort upcoming by soonest first, past by most recent first
        upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
        past.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.status(200).json({
            success: true,
            data: { upcoming, past }
        });
    } catch (error) {
        console.error("Error fetching parent events:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ... keep your rsvpToEvent function exactly as it is!

// @desc    Submit RSVP for an event
// @route   POST /api/parent/events/rsvp
export const rsvpToEvent = async (req, res) => {
    try {
        const { eventId, response } = req.body; 
        const parentId = req.user._id;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ success: false, message: "Event not found" });

        // Safely initialize attendees array if the Event model doesn't strictly define it
        if (!event.attendees) {
            event.attendees = [];
        }

        event.attendees = event.attendees.filter(a => a.userId?.toString() !== parentId.toString());
        event.attendees.push({ userId: parentId, response });

        // Tell Mongoose to save this array even if it's not strictly in the schema
        event.markModified('attendees'); 
        await event.save();

        res.status(200).json({ success: true, message: "RSVP saved successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};