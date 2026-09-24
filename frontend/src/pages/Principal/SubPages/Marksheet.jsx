import React, { useEffect, useState, useMemo } from "react";
import {
  Download,
  Printer,
  FileText,
  BookOpen,
  CheckCircle,
  Clock,
  Award,
} from "lucide-react";
import api from "../../../services/api";
import {
  Grid,
  Heading,
  DashGrid,
  EnhancedDashCard,
  SelectField,
  Option,
  Button,
  DataTable,
} from "../../../components/shared/Common_Components";

// ── GRADE CONFIG ──────────────────────────────────────────────────────────────
const GRADE_SCALE = [
  { range: [90, 100], grade: "A+" },
  { range: [80, 89], grade: "A" },
  { range: [70, 79], grade: "B+" },
  { range: [60, 69], grade: "B" },
  { range: [50, 59], grade: "C" },
  { range: [40, 49], grade: "D" },
  { range: [0, 39], grade: "F" },
];

const getGrade = (pct) =>
  (
    GRADE_SCALE.find((e) => pct >= e.range[0] && pct <= e.range[1]) ?? {
      grade: "F",
    }
  ).grade;

const Marksheet = () => {
  const [marksheets, setMarksheets] = useState([]);
  const [availableExams, setAvailableExams] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);

  const [selectedExam, setSelectedExam] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingMarksheets, setLoadingMarksheets] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    pending: 0,
    avgGrade: "—",
  });
  const [rawSchedules, setRawSchedules] = useState([]);

  useEffect(() => {
    const loadFiltersAndStats = async () => {
      try {
        const [statsRes, examsRes] = await Promise.all([
          api.get("/principal/exams/marksheets/stats"),
          api.get("/principal/exams/schedules"),
        ]);

        if (statsRes.data?.success) {
          setStats(statsRes.data.data);
        }

        if (examsRes.data?.success) {
          const schedules = examsRes.data?.data || [];
          setRawSchedules(schedules);

          // 🌟 STEP 1: Group schedules by broad Exam Structure (e.g., "Mid Term", "End Term")
          const examMap = new Map();
          schedules.forEach((sch) => {
            if (sch.examStructure) {
              examMap.set(sch.examStructure._id, sch.examStructure.examName);
            } else {
              // Fallback for standalone schedules
              examMap.set(
                sch._id,
                `Standalone Exam - ${sch.class?.name || "Class"}`,
              );
            }
          });

          const uniqueExams = Array.from(examMap.entries()).map(
            ([id, name]) => ({ id, name }),
          );
          setAvailableExams(uniqueExams);
        }
      } catch (err) {
        console.error("Error loading marksheet filter data or stats:", err);
        setError("Failed to load filters or stats from the backend.");
      }
    };

    loadFiltersAndStats();
  }, []);

  // 🌟 STEP 2: Update Classes dropdown when an Exam is selected
  useEffect(() => {
    if (!selectedExam) {
      setAvailableClasses([]);
      setSelectedClass("");
      return;
    }

    // Find all schedules that belong to this selected exam structure
    const matchingSchedules = rawSchedules.filter(
      (sch) =>
        sch.examStructure?._id === selectedExam || sch._id === selectedExam,
    );

    const classMap = new Map();
    matchingSchedules.forEach((sch) => {
      if (sch.class) {
        const classId = String(sch.class._id || sch.class);
        const className = sch.class.name || "Class";
        if (!classMap.has(classId))
          classMap.set(classId, { id: classId, name: className });
      }
    });

    const classesArray = Array.from(classMap.values());
    setAvailableClasses(classesArray);

    // Auto-select class if there's only one
    if (classesArray.length === 1) setSelectedClass(classesArray[0].id);
    else setSelectedClass("");
  }, [selectedExam, rawSchedules]);

  // 🌟 STEP 3: Update Sections dropdown when a Class is selected
  useEffect(() => {
    if (!selectedClass || !selectedExam) {
      setAvailableSections([]);
      setSelectedSection("");
      return;
    }

    const matchingSections = rawSchedules
      .filter(
        (sch) =>
          (sch.examStructure?._id === selectedExam ||
            sch._id === selectedExam) &&
          String(sch.class?._id || sch.class) === String(selectedClass),
      )
      .map((sch) => sch.section)
      .filter(Boolean);

    const uniqueSections = [...new Set(matchingSections)];
    setAvailableSections(uniqueSections.length > 0 ? uniqueSections : ["A"]);

    // Auto-select section if there's only one
    if (uniqueSections.length === 1) setSelectedSection(uniqueSections[0]);
    else setSelectedSection("");
  }, [selectedClass, selectedExam, rawSchedules]);

  // ── processed + filtered rows ────────────────────────────────────────────
  const processedMarksheets = useMemo(
    () =>
      marksheets
        .filter((m) => {
          const classId = String(m.class?._id || m.class || "");
          const section = m.section || "";
          if (selectedClass && classId !== selectedClass) return false;
          if (selectedSection && section !== selectedSection) return false;
          return true;
        })
        .map((m, i) => {
          const total = m.totalMarksObtained ?? 0;
          const maxMarks = m.totalMaxMarks ?? 500;
          const pct = maxMarks > 0 ? (total / maxMarks) * 100 : 0;
          return {
            ...m,
            rollNo: m.student?.rollNumber || i + 1,
            studentName: m.student?.name || "—",
            classSection: `${m.class?.name || "—"} - ${m.section || "A"}`,
            marksDisplay: `${total} / ${maxMarks}`,
            percentage: pct.toFixed(1),
            grade: m.overallGrade || getGrade(pct),
            status: m.status || "Draft",
          };
        }),
    [marksheets, selectedClass, selectedSection],
  );

  // ── table config ─────────────────────────────────────────────────────────
  const columns = [
    { key: "rollNo", label: "Roll No", width: "80px" },
    { key: "studentName", label: "Student Name" },
    { key: "classSection", label: "Class" },
    { key: "marksDisplay", label: "Total Marks", align: "center" },
    {
      key: "percentage",
      label: "Percentage",
      align: "center",
      render: (v) => (
        <span style={{ color: "#223F74", fontWeight: 700 }}>{v}%</span>
      ),
    },
    {
      key: "grade",
      label: "Grade",
      align: "center",
      render: (v) => (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F4F7FB] text-[#223F74]">
          {v}
        </span>
      ),
    },
    { key: "status", label: "Status", align: "center" },
  ];

  const actions = [
    {
      icon: <FileText size={14} />,
      tooltip: "View Marksheet",
      variant: "ghost",
      onClick: (row) => alert(`Viewing marksheet for ${row.studentName}`),
    },
    {
      icon: <Download size={14} />,
      tooltip: "Download PDF",
      variant: "ghost",
      onClick: (row) => alert(`Downloading PDF for ${row.studentName}`),
    },
  ];

  const handleLoadMarksheets = async () => {
    if (!selectedExam || !selectedClass) {
      setError("Please select both Exam and Class.");
      return;
    }

    // 🌟 STEP 4: Find the exact underlying Schedule ID to send to the backend
    const targetSchedule = rawSchedules.find(
      (sch) =>
        (sch.examStructure?._id === selectedExam || sch._id === selectedExam) &&
        String(sch.class?._id || sch.class) === String(selectedClass) &&
        (!selectedSection || sch.section === selectedSection),
    );

    if (!targetSchedule) {
      setError("Could not find an exam schedule matching these filters.");
      return;
    }

    const scheduleIdToSend = targetSchedule._id;

    setLoadingMarksheets(true);
    setError("");

    try {
      // ✅ Corrected Console Log
      console.log("Selected Exam Structure ID: ", selectedExam);
      console.log("Selected Class ID: ", selectedClass);
      console.log("Selected Section: ", selectedSection);
      console.log("Resolved Schedule ID sent to Backend: ", scheduleIdToSend);

      const [dataRes, statsRes] = await Promise.all([
        api.get("/principal/exams/marksheets", {
          params: {
            examScheduleId: scheduleIdToSend,
            classId: selectedClass,
            section: selectedSection,
          },
        }),
        api.get("/principal/exams/marksheets/stats", {
          params: {
            examScheduleId: scheduleIdToSend,
            classId: selectedClass,
            section: selectedSection,
          },
        }),
      ]);

      if (dataRes.data?.success) {
        setMarksheets(dataRes.data.data);
      }
      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
      setIsLoaded(true);
    } catch (err) {
      setError(
        "Failed to load marksheets: " +
          (err.response?.data?.message || err.message),
      );
    } finally {
      setLoadingMarksheets(false);
    }
  };

  return (
    <div className="w-full space-y-5 text-left">
      {/* ── Page heading ── */}
      <Grid cols={12} gap={4}>
        <Heading
          primaryText="Marksheet"
          secondaryText="Generation"
          size={12}
          showAnimations={true}
        />
      </Grid>

      {/* ── Stat cards ── */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Marksheets"
          value={String(stats.total)}
          icon={<BookOpen size={22} />}
          accentColor="#F59B87"
          size={3}
        />
        <EnhancedDashCard
          title="Published"
          value={String(stats.published)}
          icon={<CheckCircle size={22} />}
          accentColor="#5B9A6A"
          size={3}
        />
        <EnhancedDashCard
          title="Pending"
          value={String(stats.pending)}
          icon={<Clock size={22} />}
          accentColor="#E0A04B"
          size={3}
        />
        <EnhancedDashCard
          title="Avg Grade"
          value={stats.avgGrade}
          icon={<Award size={22} />}
          accentColor="#7A8FC6"
          size={3}
        />
      </DashGrid>

      {/* ── Cascading Filter Card ── */}
      <div className="bg-white border border-[#E7E2DB] rounded-[24px] p-5 shadow-[0_6px_20px_rgba(0,0,0,.06)]">
        <div className="grid grid-cols-12 gap-4 items-end">
          <div className="col-span-12 sm:col-span-4">
            <SelectField
              label="Select Exam"
              id="exam"
              size={12}
              value={selectedExam}
              onChange={(e) => {
                setSelectedExam(e.target.value);
                setIsLoaded(false);
              }}
              placeholder="Select an Exam"
            >
              {availableExams.map((exam) => (
                <Option key={exam.id} value={exam.id} label={exam.name} />
              ))}
            </SelectField>
          </div>

          <div className="col-span-12 sm:col-span-3">
            <SelectField
              label="Select Class"
              id="class"
              size={12}
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setIsLoaded(false);
              }}
              placeholder="Select Class"
              disabled={!selectedExam || availableClasses.length === 0}
            >
              {availableClasses.map((cls) => (
                <Option key={cls.id} value={cls.id} label={cls.name} />
              ))}
            </SelectField>
          </div>

          <div className="col-span-12 sm:col-span-3">
            <SelectField
              label="Select Section"
              id="section"
              size={12}
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setIsLoaded(false);
              }}
              placeholder="Select Section"
              disabled={!selectedClass || availableSections.length === 0}
            >
              {availableSections.map((sec) => (
                <Option key={sec} value={sec} label={`Section ${sec}`} />
              ))}
            </SelectField>
          </div>

          <div className="col-span-12 sm:col-span-2 flex items-end">
            <Button
              text={loadingMarksheets ? "Loading…" : "Load Marksheets"}
              variant="primary"
              size={12}
              loading={loadingMarksheets}
              disabled={!selectedExam || !selectedClass || loadingMarksheets}
              onClick={handleLoadMarksheets}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* ── Marksheets table ── */}
      {isLoaded ? (
        <Grid cols={12} gap={4}>
          <DataTable
            title="Student Marksheets"
            columns={columns}
            rows={processedMarksheets}
            actions={actions}
            size={12}
            pageSize={10}
            pageSizeOptions={[10, 20, 50]}
            searchable={true}
            exportable={true}
            exportFileName="marksheets"
            userProfile="studentName"
          />
        </Grid>
      ) : (
        !error && (
          <div className="bg-white border border-[#E7E2DB] rounded-[24px] p-12 text-center shadow-[0_6px_20px_rgba(0,0,0,.06)]">
            <div className="w-16 h-16 rounded-2xl bg-[#F4F7FB] flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-[#223F74] opacity-50" />
            </div>
            <p className="text-[#223F74] font-bold text-base">
              No marksheets loaded
            </p>
            <p className="text-[#6B7280] text-sm mt-1">
              Select an exam, class &amp; section above, then click{" "}
              <strong>Load Marksheets</strong>
            </p>
          </div>
        )
      )}
    </div>
  );
};

export default Marksheet;
