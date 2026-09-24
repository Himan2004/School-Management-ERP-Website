import mongoose from "mongoose";
import Teacher from "../../models/users/teacher.model.js";
import TeacherProfile from "../../models/teacher/TeacherProfile.model.js";
import Timetable from "../../models/academic/timetable.model.js";
import User from "../../models/users/user.model.js";
import Student from "../../models/users/student.model.js";

/**
 * @desc    Get logged-in teacher's profile (Base + Extended + Dynamic Stats)
 * @route   GET /api/teacher/profile
 * @access  Private (Teacher only)
 */
export const getTeacherProfile = async (req, res) => {
  try {
    const teacherUserId = req.user._id;

    // 1. Fetch the Base Profile
    const baseProfile = await Teacher.findOne({ user: teacherUserId })
      .populate("user", "name email avatar")
      .lean();

    if (!baseProfile) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher profile not found" });
    }

    // 2. Fetch the Extended Profile (if it exists)
    const extendedProfile = await TeacherProfile.findOne({
      teacher: baseProfile._id,
    }).lean();

    // 3. --- Calculate Total Students Dynamically ---
    let calculatedTotalStudents = 0;
    if (baseProfile.assignedClasses && baseProfile.assignedClasses.length > 0) {
      calculatedTotalStudents = await Student.countDocuments({
        class: { $in: baseProfile.assignedClasses },
        status:"active", // Only count active students
      });
    }

    // 4. Fetch Timetable Data & Calculate Weekly Rhythm
    const rhythmMap = {
      monday: { load: 0 },
      tuesday: { load: 0 },
      wednesday: { load: 0 },
      thursday: { load: 0 },
      friday: { load: 0 },
    };

    const timetables = await Timetable.find({ isActive: true })
      .populate({
        path: "schedule.periods.teacher",
        select: "_id",
      })
      .lean();

    let totalWeeklyMinutes = 0;

    timetables.forEach((timetable) => {
      timetable.schedule.forEach((daySchedule) => {
        const day = daySchedule.day.toLowerCase();

        if (rhythmMap[day] && daySchedule.isWorkingDay) {
          daySchedule.periods.forEach((period) => {
            if (
              !period.isBreak &&
              period.teacher &&
              period.teacher._id.toString() === teacherUserId.toString()
            ) {
              const [startHour, startMinute] = period.startTime
                .split(":")
                .map(Number);
              const [endHour, endMinute] = period.endTime
                .split(":")
                .map(Number);

              const startTotalMinutes = startHour * 60 + startMinute;
              const endTotalMinutes = endHour * 60 + endMinute;

              const duration = endTotalMinutes - startTotalMinutes;

              if (duration > 0) {
                rhythmMap[day].load += duration;
                totalWeeklyMinutes += duration;
              }
            }
          });
        }
      });
    });

    // Convert Minutes to Percentages for the UI Chart (Assuming max 360 mins / 6 hrs a day)
    const maxMinutesPerDay = 360;
    const dynamicWeeklyRhythm = [
      {
        day: "Mon",
        load: Math.min(
          Math.round((rhythmMap.monday.load / maxMinutesPerDay) * 100),
          100,
        ),
      },
      {
        day: "Tue",
        load: Math.min(
          Math.round((rhythmMap.tuesday.load / maxMinutesPerDay) * 100),
          100,
        ),
      },
      {
        day: "Wed",
        load: Math.min(
          Math.round((rhythmMap.wednesday.load / maxMinutesPerDay) * 100),
          100,
        ),
      },
      {
        day: "Thu",
        load: Math.min(
          Math.round((rhythmMap.thursday.load / maxMinutesPerDay) * 100),
          100,
        ),
      },
      {
        day: "Fri",
        load: Math.min(
          Math.round((rhythmMap.friday.load / maxMinutesPerDay) * 100),
          100,
        ),
      },
    ];

    const calculatedWeeklyHours =
      Math.round((totalWeeklyMinutes / 60) * 10) / 10;
    const courses = extendedProfile?.coursesManaged || [];

    // 5. Send the perfectly combined payload to the React frontend
    res.status(200).json({
      success: true,
      data: {
        id: baseProfile._id,
        name: baseProfile.user.name,
        email: baseProfile.user.email,
        phone: baseProfile.phone || "Not provided",
        avatar: baseProfile.user.avatar,
        department: baseProfile.department || "General Education",
        designation: baseProfile.designation || "Senior Teacher",
        joiningDate: baseProfile.joiningDate,
        qualifications: baseProfile.qualification || [],
        bio:
          baseProfile.bio ||
          "Passionate educator dedicated to student success.",
        stats: {
          totalClasses: baseProfile.assignedClasses?.length || 0,
          totalStudents: calculatedTotalStudents, // <-- Injected dynamic student count here!
          attendanceRate: baseProfile.attendanceRate || "100%",
        },
        achievements: baseProfile.achievements || [],

        teachingFocus: extendedProfile?.teachingFocus || [],
        currentPriorities: extendedProfile?.currentPriorities || [],
        recognitionTimeline: extendedProfile?.recognitionTimeline || [],
        coursesManaged: courses,

        weeklyHours: calculatedWeeklyHours,
        weeklyRhythm: dynamicWeeklyRhythm,
      },
    });
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update teacher profile data (Base + Extended)
 * @route   PUT /api/teacher/profile
 * @access  Private (Teacher only)
 */
export const updateTeacherProfile = async (req, res) => {
  try {
    const {
      phone,
      department,
      designation,
      bio,
      qualifications,
      achievements,
      teachingFocus,
      currentPriorities,
      coursesManaged,
    } = req.body;

    // 1. Update the User document (Phone number)
    if (phone) {
      await User.findByIdAndUpdate(req.user._id, { phone });
    }

    // 2. Update the Base Teacher document
    const updatedTeacher = await Teacher.findOneAndUpdate(
      { user: req.user._id },
      { department, designation, bio, qualifications, achievements },
      { new: true },
    );

    if (!updatedTeacher) {
      return res
        .status(404)
        .json({ success: false, message: "Teacher record not found" });
    }

    // 3. Update OR Create the Extended Profile (Upsert)
    await TeacherProfile.findOneAndUpdate(
      { teacher: updatedTeacher._id },
      { teachingFocus, currentPriorities, coursesManaged },
      { new: true, upsert: true }, // Upsert creates the document if it doesn't exist yet!
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
