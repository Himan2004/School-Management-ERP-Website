import Student from "../../models/users/student.model.js";
import Event from "../../models/common/Event.js";

const getStudentContext = async (req) => {
    const studentProfile = await Student.findOne({ user: req.user._id }).select("school");
    const schoolId = studentProfile?.school?._id || studentProfile?.school;
    
    const reqSchool = req.user?.school;
    const organizationId = reqSchool?.organization?._id || reqSchool?.organization || req.user?.organization?._id || req.user?.organization || null;
    
    return { studentProfile, schoolId, organizationId };
};

const buildVisibilityFilter = (schoolId, organizationId) => {
    const cleanSchoolId = schoolId?._id || schoolId;
    const cleanOrgId = organizationId?._id || organizationId;

    const hqFilter = cleanOrgId
        ? { origin: "HQ", organization: cleanOrgId }
        : { origin: "HQ" };

    return {
        $or: [
            { school: cleanSchoolId },
            hqFilter,
        ],
        status: { $ne: "Draft" },
    };
};

const mapEventForStudent = (event, todayStart) => {
    const eventDate = event.eventDate ? new Date(event.eventDate) : null;
    const isUpcoming = eventDate ? eventDate >= todayStart : false;
    const isPast = eventDate ? eventDate < todayStart : false;

    const eventCapacity = typeof event.capacity === 'number' ? event.capacity : (parseInt(event.capacity || event.participants || '0', 10) || null);
    const registeredCount = Array.isArray(event.registrations) ? event.registrations.length : (event.registered || 0);

    return {
        id: event._id,
        title: event.title || "",
        description: event.description || "",
        category: event.category || "General",
        status: event.status || "Scheduled",
        eventDate: event.eventDate || null,
        date: event.eventDate || null,
        
        startTime: event.startTime || "",
        endTime: event.endTime || "",
        time: event.startTime && event.endTime ? `${event.startTime} - ${event.endTime}` : (event.startTime || "TBD"),
        
        venue: event.venue || event.location || "School Campus",
        location: event.venue || event.location || "School Campus",
        
        organizer: event.createdBy || event.organizer || "School",
        contactPerson: event.organizer || event.createdBy || "School",
        
        capacity: eventCapacity,
        registered: registeredCount,
        registeredCount: registeredCount,
        
        tags: Array.isArray(event.tags) ? event.tags : [event.category, event.priority || "Normal"].filter(Boolean),
        priority: event.priority || "Normal",
        photos: Array.isArray(event.photos) ? event.photos : [],
        
        isUpcoming,
        isPast,
        isOngoing: event.status === "Ongoing",
    };
};

export const getStudentEvents = async (req, res) => {
    try {
        const { category, type = "all", search } = req.query;
        const { studentProfile, schoolId, organizationId } = await getStudentContext(req);

        if (!studentProfile || !schoolId) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const baseQuery = buildVisibilityFilter(schoolId, organizationId);
        const filteredQuery = { ...baseQuery };

        if (category && category !== "all") {
            filteredQuery.category = category;
        }

        if (search) {
            filteredQuery.$and = [
                {
                    $or: [
                        { title: { $regex: search, $options: "i" } },
                        { description: { $regex: search, $options: "i" } },
                    ],
                },
            ];
        }

        const eventsQuery = { ...filteredQuery };
        if (type === "upcoming") {
            eventsQuery.eventDate = { $gte: todayStart };
        } else if (type === "past") {
            eventsQuery.eventDate = { $lt: todayStart };
        }

        const sortOrder = type === "upcoming" ? 1 : -1;
        const [events, upcomingCount, pastCount] = await Promise.all([
            Event.find(eventsQuery).sort({ eventDate: sortOrder }),
            Event.countDocuments({ ...filteredQuery, eventDate: { $gte: todayStart } }),
            Event.countDocuments({ ...filteredQuery, eventDate: { $lt: todayStart } }),
        ]);

        const mappedEvents = events.map((event) => mapEventForStudent(event, todayStart));

        return res.status(200).json({
            success: true,
            data: {
                events: mappedEvents,
                totalEvents: mappedEvents.length,
                upcomingCount,
                pastCount,
            },
            message: "Student events fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getEventById = async (req, res) => {
    try {
        const { studentProfile, schoolId, organizationId } = await getStudentContext(req);

        if (!studentProfile || !schoolId) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const query = {
            _id: req.params.id,
            ...buildVisibilityFilter(schoolId, organizationId),
        };

        const event = await Event.findOne(query);
        if (!event) {
            return res.status(404).json({ success: false, data: null, message: "Event not found" });
        }

        return res.status(200).json({
            success: true,
            data: { event },
            message: "Event fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getEventStats = async (req, res) => {
    try {
        const { studentProfile, schoolId, organizationId } = await getStudentContext(req);

        if (!studentProfile || !schoolId) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
        const monthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1);

        const baseQuery = buildVisibilityFilter(schoolId, organizationId);

        const [totalEvents, upcomingEvents, ongoingEvents, pastEvents, thisMonthEvents] = await Promise.all([
            Event.countDocuments(baseQuery),
            Event.countDocuments({ ...baseQuery, eventDate: { $gte: todayStart } }),
            Event.countDocuments({ ...baseQuery, status: "Ongoing" }),
            Event.countDocuments({ ...baseQuery, eventDate: { $lt: todayStart } }),
            Event.countDocuments({ ...baseQuery, eventDate: { $gte: monthStart, $lt: monthEnd } }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalEvents,
                upcomingEvents,
                ongoingEvents,
                pastEvents,
                thisMonthEvents,
            },
            message: "Event stats fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getUpcomingEvents = async (req, res) => {
    try {
        const { studentProfile, schoolId, organizationId } = await getStudentContext(req);

        if (!studentProfile || !schoolId) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 5;
        const query = {
            ...buildVisibilityFilter(schoolId, organizationId),
            eventDate: { $gte: todayStart },
        };

        const events = await Event.find(query).sort({ eventDate: 1 }).limit(limit);

        return res.status(200).json({
            success: true,
            data: {
                events,
                total: events.length,
            },
            message: "Upcoming events fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const unregisterFromEvent = async (req, res) => {
    try {
        const { studentProfile, schoolId, organizationId } = await getStudentContext(req);

        if (!studentProfile || !schoolId) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const event = await Event.findOne({
            _id: req.params.id,
            ...buildVisibilityFilter(schoolId, organizationId),
        });
        if (!event) {
            return res.status(404).json({ success: false, data: null, message: "Event not found" });
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        if (event.eventDate && new Date(event.eventDate) < todayStart) {
            return res.status(400).json({ success: false, data: null, message: "Cannot unregister from a past event" });
        }

        if (Array.isArray(event.registrations)) {
            event.registrations = event.registrations.filter(
                (registration) => registration?.toString() !== req.user._id.toString()
            );
            await event.save();
        }

        return res.status(200).json({
            success: true,
            data: null,
            message: "Unregistered from event successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const registerForEvent = async (req, res) => {
    try {
        const { studentProfile, schoolId, organizationId } = await getStudentContext(req);

        if (!studentProfile || !schoolId) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const event = await Event.findOne({
            _id: req.params.id,
            ...buildVisibilityFilter(schoolId, organizationId),
        });
        if (!event) {
            return res.status(404).json({ success: false, data: null, message: "Event not found" });
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        if (event.eventDate && new Date(event.eventDate) < todayStart) {
            return res.status(400).json({ success: false, data: null, message: "Cannot register for a past event" });
        }

        if (!Array.isArray(event.registrations)) {
            event.registrations = [];
        }

        if (event.registrations.some((registration) => registration?.toString() === req.user._id.toString())) {
            return res.status(400).json({ success: false, data: null, message: "Already registered for this event" });
        }

        event.registrations.push(req.user._id);
        await event.save();

        return res.status(200).json({
            success: true,
            data: null,
            message: "Registered for event successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};

export const getEventCalendar = async (req, res) => {
    try {
        const { studentProfile, schoolId, organizationId } = await getStudentContext(req);

        if (!studentProfile || !schoolId) {
            return res.status(404).json({ success: false, data: null, message: "Student profile not found" });
        }

        const now = new Date();
        const month = Number(req.query.month) || now.getMonth() + 1;
        const year = Number(req.query.year) || now.getFullYear();

        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 1);

        const query = {
            ...buildVisibilityFilter(schoolId, organizationId),
            eventDate: { $gte: monthStart, $lt: monthEnd },
        };

        const events = await Event.find(query).sort({ eventDate: 1 });
        const calendarMap = events.reduce((acc, event) => {
            const dateKey = new Date(event.eventDate).toISOString().split("T")[0];
            if (!acc[dateKey]) {
                acc[dateKey] = [];
            }
            acc[dateKey].push({
                id: event._id,
                title: event.title,
                category: event.category,
                status: event.status,
            });
            return acc;
        }, {});

        return res.status(200).json({
            success: true,
            data: calendarMap,
            message: "Event calendar fetched successfully",
        });
    } catch (error) {
        return res.status(500).json({ success: false, data: null, message: error.message });
    }
};
