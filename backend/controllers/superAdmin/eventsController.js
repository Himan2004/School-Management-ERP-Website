import Event from "../../models/common/Event.js";
import School from "../../models/school/School.js";

const formatEvent = (e) => ({
  _id: e._id,
  id: e._id,
  title: e.title,
  scope: e.scopeLabel || "All Schools",
  date: new Date(e.eventDate).toISOString().split("T")[0],
  status: e.status,
  category: e.category,
  description: e.description,
  origin: e.origin,
  branch: e.school?.schoolName || "All Schools",
  targetSchool: e.school ? { _id: e.school._id, name: e.school.schoolName } : null,
});

// GET /events/schools — returns all schools belonging to this organisation (used for dropdown)
export const getSchoolsForDropdown = async (req, res) => {
  try {
    const schools = await School.find({ organization: req.user._id, isActive: true })
      .select("_id schoolName")
      .sort({ schoolName: 1 })
      .lean();
    return res.status(200).json({
      success: true,
      data: {
        schools: schools.map((s) => ({ _id: s._id, name: s.schoolName })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getGlobalEvents = async (req, res) => {
  try {
    const { search = "", category = "All" } = req.query;
    const query = { organization: req.user._id, origin: "HQ" };
    if (category !== "All") query.category = category;
    if (search) query.title = { $regex: search, $options: "i" };

    const events = await Event.find(query).populate("school", "schoolName").sort({ eventDate: 1 }).lean();
    return res.status(200).json({ success: true, data: { events: events.map(formatEvent) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createGlobalEvent = async (req, res) => {
  try {
    const { title, description, category, date, scope, targetSchool } = req.body;
    if (!title || !date) return res.status(400).json({ success: false, message: "Title and date are required" });

    // Validate targetSchool belongs to this organisation if provided
    let schoolRef = null;
    if (targetSchool) {
      const school = await School.findOne({ _id: targetSchool, organization: req.user._id });
      if (!school) return res.status(400).json({ success: false, message: "Invalid school selected" });
      schoolRef = school._id;
    }

    const event = await Event.create({
      organization: req.user._id,
      school: schoolRef,
      title,
      description: description || "",
      category: category || "General",
      eventDate: new Date(date),
      status: "Scheduled",
      origin: "HQ",
      scopeLabel: scope || "All Schools",
      createdBy: req.superAdminProfile?.name || req.user?.organizationName || "System",
    });
    const populated = await Event.findById(event._id).populate("school", "schoolName").lean();
    return res.status(201).json({ success: true, data: { event: formatEvent(populated) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateGlobalEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, date, scope, status, targetSchool } = req.body;

    // Validate targetSchool if being updated
    let schoolRef;
    if (targetSchool !== undefined) {
      if (targetSchool) {
        const school = await School.findOne({ _id: targetSchool, organization: req.user._id });
        if (!school) return res.status(400).json({ success: false, message: "Invalid school selected" });
        schoolRef = school._id;
      } else {
        schoolRef = null;
      }
    }

    const event = await Event.findOneAndUpdate(
      { _id: id, organization: req.user._id, origin: "HQ" },
      {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(category && { category }),
        ...(date && { eventDate: new Date(date) }),
        ...(scope && { scopeLabel: scope }),
        ...(status && { status }),
        ...(schoolRef !== undefined && { school: schoolRef }),
      },
      { new: true }
    ).populate("school", "schoolName");
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    return res.status(200).json({ success: true, data: { event: formatEvent(event) } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteGlobalEvent = async (req, res) => {
  try {
    const deleted = await Event.findOneAndDelete({ _id: req.params.id, organization: req.user._id, origin: "HQ" });
    if (!deleted) return res.status(404).json({ success: false, message: "Event not found" });
    return res.status(200).json({ success: true, message: "Event deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

