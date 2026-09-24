import mongoose from "mongoose";
import "dotenv/config";
import connectDB from "../config/database.js";

// Models
import User from "../models/users/user.model.js";
import Student from "../models/users/student.model.js";
import Parent from "../models/users/parent.model.js";
import Class from "../models/organization/organizationClass.js";
import PTM from "../models/common/PTM.js";
import PTMBooking from "../models/common/PTMBooking.js";
import PTMFeedback from "../models/common/PTMFeedback.js";
import AcademicYear from "../models/principal/AcademicYear.model.js";

const FEEDBACK_TEMPLATES = [
  {
    category: "Academics",
    rating: 5,
    comments: "Very satisfied with the exam structure and detailed marksheet feedback. The progress trend helps us track math performance closely.",
    status: "Resolved",
    principalNotes: "Parent was satisfied. Closed ticket."
  },
  {
    category: "Teachers",
    rating: 2,
    comments: "The class teacher seemed very rushed during our slot. We did not get enough time to discuss the science project performance details.",
    status: "Pending Review",
    principalNotes: ""
  },
  {
    category: "Infrastructure",
    rating: 4,
    comments: "School facilities are good, but the physics lab equipment needs updates. PTM organization was very smooth and well-managed.",
    status: "Contacted Parent",
    principalNotes: "Discussed lab modernization plans. Parent was pleased to hear about the upcoming upgrades."
  },
  {
    category: "Behavior",
    rating: 5,
    comments: "Great discussion about the transition to primary school. Appreciate the counselor's feedback on social adjustment.",
    status: "Resolved",
    principalNotes: "Counselor checked in on the student. Doing well."
  },
  {
    category: "Academics",
    rating: 3,
    comments: "The mock exam schedule was very tight, leaving students with little time to prepare. Suggest keeping a gap of at least 2 days between exams.",
    status: "Pending Review",
    principalNotes: ""
  },
  {
    category: "Activities",
    rating: 5,
    comments: "Excellent sports and extra-curricular choices. Basketball team coaching and matches are highly structured. PTM was informative.",
    status: "Resolved",
    principalNotes: "Informed sports HOD about the positive feedback."
  },
  {
    category: "Infrastructure",
    rating: 3,
    comments: "The bus pick-up is sometimes delayed by 15-20 minutes, causing stress in the morning. PTM was otherwise well-guided.",
    status: "Contacted Parent",
    principalNotes: "Coordinating with transport manager to inspect the route delay."
  },
  {
    category: "Teachers",
    rating: 5,
    comments: "Class teacher is wonderful! She goes out of her way to ensure the homework submissions are handled patiently.",
    status: "Resolved",
    principalNotes: "Passed on appreciation to the teacher."
  },
  {
    category: "Academics",
    rating: 2,
    comments: "Struggling with chemistry equations, but when we requested extra support, we were told no remedial classes are planned. Please support.",
    status: "Pending Review",
    principalNotes: ""
  }
];

async function seed() {
  await connectDB();
  console.log("--- Seeding PTM Feedback ---");

  const schoolId = new mongoose.Types.ObjectId("69fe09eedec901fd9887d235");

  // Clear existing PTM events, bookings, and feedbacks for this school
  await PTMFeedback.deleteMany({ school: schoolId });
  await PTMBooking.deleteMany({ school: schoolId });
  await PTM.deleteMany({ school: schoolId });
  console.log("Deleted old PTM, PTMBooking, and PTMFeedback documents");

  // Fetch Principal
  const principal = await User.findOne({ school: schoolId, role: "principal" });
  if (!principal) {
    console.error("No principal found for school!");
    process.exit(1);
  }

  // Fetch all students for the school
  const students = await Student.find({ school: schoolId }).populate("class");
  if (students.length === 0) {
    console.error("No students found to seed feedback for!");
    process.exit(1);
  }
  console.log(`Fetched ${students.length} students`);

  // Ensure there are Academic Years in the school without violating global uniqueness
  let academicYearsList = [];
  
  const existing26 = await AcademicYear.findOne({ name: "2026-27" });
  const existing24 = await AcademicYear.findOne({ name: "2024-25" });
  
  const orgId = students[0].class?.organization || new mongoose.Types.ObjectId("69fe003e86110688cfd614de");

  if (existing26) {
    academicYearsList.push(existing26);
  } else {
    const ay1 = await AcademicYear.create({
      organization: orgId,
      school: schoolId,
      name: "2026-27",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "Active",
      isActive: true
    });
    academicYearsList.push(ay1);
  }

  if (existing24) {
    academicYearsList.push(existing24);
  } else {
    const ay2 = await AcademicYear.create({
      organization: orgId,
      school: schoolId,
      name: "2024-25",
      startDate: new Date("2024-04-01"),
      endDate: new Date("2025-03-31"),
      status: "Archived",
      isActive: true
    });
    academicYearsList.push(ay2);
  }

  console.log(`Academic years ready: ${academicYearsList.map(y => y.name).join(", ")}`);

  // Create PTM events
  const ptmEventsData = [
    { title: "Mid-Term PTM", date: new Date("2026-10-15") },
    { title: "Term 1 PTM", date: new Date("2026-06-15") },
    { title: "Final PTM", date: new Date("2027-03-10") },
    { title: "Parent Meeting 2024", date: new Date("2024-11-20") }
  ];

  const ptmDocs = [];
  for (const item of ptmEventsData) {
    const ptm = await PTM.create({
      title: item.title,
      date: item.date,
      createdBy: principal._id,
      school: schoolId,
      description: `School-wide parent teacher meeting for ${item.title}`
    });
    ptmDocs.push(ptm);
  }
  console.log(`Created ${ptmDocs.length} PTM Events`);

  // Seed bookings & feedback
  let feedbackCount = 0;
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    
    // Find parent for student
    let parent = null;
    if (student.parent) {
      parent = await Parent.findById(student.parent);
    }
    if (!parent) {
      parent = await Parent.findOne({ students: student._id });
    }

    if (!parent) {
      console.log(`No parent found for student ${student.user?.name || student._id}, skipping feedback seeding`);
      continue;
    }

    // Pick a PTM event and templates
    const ptmEvent = ptmDocs[i % ptmDocs.length];
    const template = FEEDBACK_TEMPLATES[i % FEEDBACK_TEMPLATES.length];

    // Determine academic year string
    let year = student.academicYear || "2026-27";
    if (ptmEvent.title.includes("2024")) {
      year = "2024-25";
    }

    // 1. Seed Booking
    await PTMBooking.create({
      ptm: ptmEvent._id,
      student: student._id,
      parent: parent._id,
      slot: "10:30 AM",
      attended: true,
      remarks: "Attended and discussed details.",
      school: schoolId
    });

    // 2. Seed Feedback
    await PTMFeedback.create({
      school: schoolId,
      ptm: ptmEvent._id,
      ptmEvent: ptmEvent.title,
      parent: parent._id,
      student: student._id,
      class: student.class?._id || new mongoose.Types.ObjectId("6a2aa020edda6eaf320806b9"),
      category: template.category,
      rating: template.rating,
      comments: template.comments,
      status: template.status,
      principalNotes: template.principalNotes,
      academicYear: year
    });

    feedbackCount++;
  }

  console.log(`Successfully seeded ${feedbackCount} PTM Feedback documents!`);
  process.exit(0);
}

seed().catch(console.error);
