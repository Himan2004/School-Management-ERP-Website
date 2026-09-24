import mongoose from 'mongoose';
import 'dotenv/config';
import School from '../models/school/School.js';
import Section from '../models/school/Section.model.js';
import Class from '../models/organization/organizationClass.js';
import Subject from '../models/modules/Subject.js';
import User from '../models/users/user.model.js';
import SubjectAssignment from '../models/principal/SubjectAssignment.model.js';
import StudentProfile from '../models/users/student.model.js';
import Attendance from '../models/academic/attendance.model.js';

// Simulation of normalizeSection, matchSection, resolveClassName, getStudentSectionLabel
const normalizeSection = (section) => (section ?? "").toString().trim();

const getStudentSectionLabel = (student) => {
  if (!student?.section) return "";
  if (typeof student.section === "string") return student.section;
  return student.section?.name || student.section?._id?.toString() || "";
};

const matchSection = (student, sectionValue) => {
  if (!sectionValue) return true;
  const label = getStudentSectionLabel(student);
  return label === sectionValue || label.toString() === sectionValue.toString();
};

const resolveClassName = (classDoc) =>
  classDoc?.name || classDoc?.className || classDoc?.periodName || "";

const getSchoolScope = (user) => {
  const school = user?.school;
  const schoolId = school?._id || school;
  const organizationId = school?.organization?._id || school?.organization;
  return { schoolId, organizationId };
};

const formatDateKey = (dateValue) => {
  if (!dateValue) return "";
  const date = new Date(dateValue);
  return date.toLocaleDateString("en-CA");
};

const formatTimeLabel = (dateValue) => {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const loginId = 'SXP5655';
        const user = await User.findOne({ loginId }).populate('school');
        
        const teacherId = user._id;
        const { schoolId } = getSchoolScope(user);

        const assignments = await SubjectAssignment.find({
            teacherUser: teacherId,
            school: schoolId,
        })
            .populate("class", "name")
            .populate("subject", "subjectName name")
            .lean();

        console.log(`Assignments count: ${assignments.length}`);

        const classIds = [
            ...new Set(
                assignments
                    .map((a) => a.class?._id?.toString() || a.class?.toString())
                    .filter((id) => id && mongoose.Types.ObjectId.isValid(id)),
            ),
        ].map((id) => new mongoose.Types.ObjectId(id));

        console.log(`ClassIds: ${JSON.stringify(classIds)}`);

        const students = await StudentProfile.find({
            school: schoolId,
            class: { $in: classIds },
            status: "active",
        })
            .select("class section")
            .populate("section", "name")
            .lean();

        console.log(`Students count: ${students.length}`);

        const parsedDate = new Date();
        const start = new Date(parsedDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(parsedDate);
        end.setHours(23, 59, 59, 999);

        console.log(`Date range: ${start.toISOString()} to ${end.toISOString()}`);

        const seenKeys = new Set();
        const data = [];

        for (const assignment of assignments) {
            const classId =
                assignment.class?._id?.toString() || assignment.class?.toString();
            if (!classId) continue;
            const section = normalizeSection(assignment.section);
            const key = `${classId}_${section}`;
            if (seenKeys.has(key)) continue;
            seenKeys.add(key);

            const className = resolveClassName(assignment.class);
            const subjectName =
                assignment.subject?.subjectName || assignment.subject?.name || "";

            const totalStudents = students.filter((student) => {
                const studentClassId =
                    student.class?._id?.toString() || student.class?.toString();
                return studentClassId === classId && matchSection(student, section);
            }).length;

            const markedDoc = await Attendance.findOne({
                school: schoolId,
                class: classId,
                section,
                date: { $gte: start, $lt: end },
            }).lean();

            console.log(`Class ${className} ${section}: totalStudents = ${totalStudents}, marked = ${Boolean(markedDoc)}`);

            data.push({
                classId,
                className,
                section,
                subject: subjectName,
                totalStudents,
                todayMarked: Boolean(markedDoc),
                markedAt: markedDoc
                    ? formatTimeLabel(markedDoc.createdAt || markedDoc.date)
                    : null,
            });
        }

        console.log(`Final Response Data: ${JSON.stringify(data, null, 2)}`);

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error.message);
    }
}

test();
