import mongoose from "mongoose";
import Event from "../../models/common/Event.js";
import Notification from "../../models/common/Notification.js";
import User from "../../models/users/user.model.js";

const createNotificationsForEvent = async (event, senderName) => {
    try {
        let query = { school: event.school };
        const users = await User.find(query).select('_id');
        
        const notifications = users.map(u => ({
            user: u._id,
            title: `Event: ${event.title}`,
            message: `New event scheduled on ${new Date(event.eventDate || event.date).toLocaleDateString()}`,
            type: 'event',
            read: false,
            school: event.school,
            senderName: senderName || 'Principal',
            senderRole: 'Staff',
            source: 'Principal'
        }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications, { ordered: false });
        }
    } catch (error) {
        console.error("Error creating notifications for event:", error);
    }
};
const toSchoolId = (user) => user.school?._id || user.school;
const toOrganizationId = (user) => user.school?.organization;

const statusMapToDb = {
  Upcoming: "Scheduled",
  Ongoing: "Ongoing",
  Completed: "Completed",
  Cancelled: "Draft",
  Draft: "Draft",
  Mandatory: "Mandatory",
  Scheduled: "Scheduled",
};

const statusMapToUi = {
  Draft: "Cancelled",
  Scheduled: "Upcoming",
  Ongoing: "Ongoing",
  Completed: "Completed",
  Mandatory: "Upcoming",
};

const mapEventForUi = (eventDoc) => {
  const event = eventDoc.toObject ? eventDoc.toObject() : eventDoc;
  const eventDate = event.eventDate ? new Date(event.eventDate) : new Date();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let status = statusMapToUi[event.status] || event.status || "Upcoming";
  
  if (status === "Upcoming" || status === "Ongoing") {
    if (eventDate < todayStart) {
        status = "Completed";
    } else if (eventDate >= todayStart && eventDate <= todayEnd) {
        status = "Ongoing";
    }
  }

  return {
    ...event,
    id: event._id,
    name: event.title,
    date: eventDate.toISOString().split("T")[0],
    // FIXED: Directly pulling the exact times, venue, and participants from the database
    startTime: event.startTime || "09:00",
    endTime: event.endTime || "10:00",
    venue: event.venue || "School Campus",
    participants: event.participants || "All Students",
    organizer: event.createdBy || "Principal",
    photos: event.photos || [],
    // FIXED: Directly passing the category without forcing it through a map
    category: event.category || "General", 
    status,
  };
};

export const createEvent = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const organizationId = toOrganizationId(req.user);
    
    // FIXED: Ensure startTime, endTime, venue, and participants are extracted from req.body
    const { title, name, description, category, date, eventDate, status, priority, venue, participants, startTime, endTime } = req.body;

    const event = await Event.create({
      organization: organizationId,
      school: schoolId,
      title: title || name,
      description: description || "",
      // FIXED: Removed the categoryMapToDb so it saves exactly what you select
      category: category || "General",
      eventDate: eventDate ? new Date(eventDate) : new Date(date),
      // FIXED: Saving the exact times and strings you typed into the form
      startTime: startTime || "09:00",
      endTime: endTime || "10:00",
      venue: venue || "School Campus",
      participants: Array.isArray(participants) ? participants.join(', ') : (participants || "All Students"),
      priority: priority || "Normal",
      status: statusMapToDb[status] || "Scheduled",
      origin: "Local",
      createdBy: req.user?.name || "Principal",
    });

    // Generate notifications asynchronously
    createNotificationsForEvent(event, req.user?.name || "Principal");

    return res.status(201).json({
      success: true,
      data: mapEventForUi(event),
      message: "Event created successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllEvents = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const { category, status, search, dateFrom, dateTo } = req.query;

    const query = { school: schoolId, origin: "Local" };
    // FIXED: Removed the map here too so filtering by exact category works
    if (category && category !== "All") query.category = category;
    if (status && status !== "All") query.status = statusMapToDb[status] || status;
    if (search) query.title = { $regex: search, $options: "i" };
    if (dateFrom || dateTo) {
      query.eventDate = {};
      if (dateFrom) query.eventDate.$gte = new Date(dateFrom);
      if (dateTo) query.eventDate.$lte = new Date(dateTo);
    }

    const events = await Event.find(query).sort({ eventDate: -1 });

    return res.status(200).json({
      success: true,
      data: events.map(mapEventForUi),
      message: "Events fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const event = await Event.findOne({ _id: req.params.id, school: schoolId, origin: "Local" });

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    return res.status(200).json({
      success: true,
      data: mapEventForUi(event),
      message: "Event fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    
    // Explicitly grab exactly what the frontend is sending
    const { 
        name, title, category, date, eventDate, status, 
        startTime, endTime, venue, participants, description 
    } = req.body;

    const payload = {
        title: title || name,
        category: category,
        status: statusMapToDb[status] || status,
        startTime: startTime,
        endTime: endTime,
        venue: venue,
        participants: Array.isArray(participants) ? participants.join(', ') : participants,
        description: description
    };

    if (eventDate) {
      payload.eventDate = new Date(eventDate);
    } else if (date) {
      payload.eventDate = new Date(date);
    }

    // Clean up any undefined values so we don't accidentally wipe data
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, school: schoolId, origin: "Local" },
      { $set: payload },
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    return res.status(200).json({
      success: true,
      data: mapEventForUi(event),
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error("Update Event Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const deleted = await Event.findOneAndDelete({ _id: req.params.id, school: schoolId, origin: "Local" });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    return res.status(200).json({
      success: true,
      data: null,
      message: "Event deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getEventStats = async (req, res) => {
  try {
    const schoolId = toSchoolId(req.user);
    const schoolObjectId = new mongoose.Types.ObjectId(schoolId);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [totalEvents, upcomingEvents, ongoingEvents, completedEvents] = await Promise.all([
      Event.countDocuments({ school: schoolObjectId, origin: "Local" }),
      
      Event.countDocuments({
        school: schoolObjectId,
        origin: "Local",
        $or: [{ status: "Scheduled" }, { status: "Upcoming" }],
        eventDate: { $gt: todayEnd },
      }),
      
      Event.countDocuments({
        school: schoolObjectId,
        origin: "Local",
        $or: [
          { status: "Ongoing" },
          { eventDate: { $gte: todayStart, $lte: todayEnd } }
        ]
      }),
      
      Event.countDocuments({
        school: schoolObjectId,
        origin: "Local",
        $or: [
          { status: "Completed" },
          { eventDate: { $lt: todayStart } }
        ]
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: { totalEvents, upcomingEvents, ongoingEvents, completedEvents },
      message: "Event stats fetched successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadEventPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.school._id || req.user.school;

    const event = await Event.findOne({ _id: id, school: schoolId });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const newPhotoUrls = req.files.map((file) => file.path);
    event.photos = [...(event.photos || []), ...newPhotoUrls];
    await event.save();

    res.status(200).json({
      success: true,
      message: "Photos uploaded successfully",
      data: event.photos,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};