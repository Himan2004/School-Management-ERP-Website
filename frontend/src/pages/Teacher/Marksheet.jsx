import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Copy,
  Calendar,
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  Download,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Settings,
  BarChart,
  PlayCircle,
  PauseCircle,
  Send,
  HelpCircle,
  Upload,
  Link,
  Hash,
  List,
  Grid3x3,
  Menu,
  Zap,
  Award,
  Target,
  Sparkles,
  Crown,
  Star,
  TrendingUp,
  TrendingDown,
  PieChart,
  Activity,
  Award as AwardIcon,
  Medal,
  Star as StarIcon,
  User,
  GraduationCap,
  Clipboard,
  PenTool,
  Save,
  Printer,
  Mail,
  ExternalLink,
  Maximize2,
  Minimize2,
  Check,
  X,
  AlertTriangle,
  UserPlus,
  UserCheck as UserCheckIcon,
  UserX as UserXIcon,
  ArrowLeft,
  ArrowRight,
  ChevronsLeft,
  ChevronsRight,
  FileCheck,
  FileSpreadsheet,
  FileBarChart,
  FileOutput,
  Trophy,
  Medal as MedalIcon,
  Crown as CrownIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Grid,
  Heading,
  Button,
  DataTable,
  DashCard,
  Modal,
  openModal,
  closeModal,
  DataField,
  Select,
  Option,
  P,
  ModalData,
  ModalGrid,
} from "../../components/shared/Common_Components";

const API_BASE_URL = "/api/teacher/exams";

// ── Helpers ───────────────────────────────────────────────────
const formatDateFull = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const getAuthToken = () => localStorage.getItem("token") || "";

// ── Constants ─────────────────────────────────────────────────
const EXAM_TYPES = {
  unit_test: "Unit Test",
  quarterly: "Quarterly Exam",
  half_yearly: "Half Yearly Exam",
  annual: "Annual Exam",
  pre_board: "Pre-Board Exam",
  board_practice: "Board Practice Test",
  weekly_test: "Weekly Test",
  monthly_test: "Monthly Test",
  surprise_test: "Surprise Test",
  revision_test: "Revision Test",
};

const GRADES = [
  {
    value: "A+",
    label: "A+ (90-100%)",
    min: 90,
    max: 100,
    color: "text-emerald-600 bg-emerald-50",
    rank: 1,
  },
  {
    value: "A",
    label: "A (80-89%)",
    min: 80,
    max: 89,
    color: "text-emerald-600 bg-emerald-50",
    rank: 2,
  },
  {
    value: "B+",
    label: "B+ (70-79%)",
    min: 70,
    max: 79,
    color: "text-blue-600 bg-blue-50",
    rank: 3,
  },
  {
    value: "B",
    label: "B (60-69%)",
    min: 60,
    max: 69,
    color: "text-blue-600 bg-blue-50",
    rank: 4,
  },
  {
    value: "C+",
    label: "C+ (50-59%)",
    min: 50,
    max: 59,
    color: "text-amber-600 bg-amber-50",
    rank: 5,
  },
  {
    value: "C",
    label: "C (40-49%)",
    min: 40,
    max: 49,
    color: "text-amber-600 bg-amber-50",
    rank: 6,
  },
  {
    value: "D",
    label: "D (30-39%)",
    min: 30,
    max: 39,
    color: "text-orange-600 bg-orange-50",
    rank: 7,
  },
  {
    value: "E",
    label: "E (Below 30%)",
    min: 0,
    max: 29,
    color: "text-rose-600 bg-rose-50",
    rank: 8,
  },
];

// ── Badges ──────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    generated: "bg-blue-100 text-blue-700 border-blue-200",
    published: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-100 text-rose-700 border-rose-200",
  };
  const icons = {
    pending: <Clock size={10} />,
    generated: <FileText size={10} />,
    published: <CheckCircle size={10} />,
    rejected: <XCircle size={10} />,
  };
  const labels = {
    pending: "Pending",
    generated: "Generated",
    published: "Published",
    rejected: "Rejected",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${map[status] || map.pending}`}
    >
      {icons[status]} {labels[status] || status}
    </span>
  );
};

const GradeBadge = ({ grade }) => {
  const gradeData = GRADES.find((g) => g.value === grade);
  if (!gradeData) return <span className="text-sm text-[#6B7280]">—</span>;
  return (
    <span
      className={`px-3 py-1 rounded-xl text-sm font-bold ${gradeData.color}`}
    >
      {gradeData.value}
    </span>
  );
};

// ── Main Component ────────────────────────────────────────────
const ResultsAndMarksheet = () => {
  const [activeTab, setActiveTab] = useState("results");
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    generated: 0,
    published: 0,
    totalStudents: 0,
    averagePercentage: 0,
    passPercentage: 0,
    totalToppers: 0,
  });

  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]); // Used for Marksheet list view

  const [resultForm, setResultForm] = useState({
    examId: "",
    academicYear: new Date().getFullYear(),
    term: "annual",
  });

  const [marksheetData, setMarksheetData] = useState({
    student: null,
    results: [],
    totalMarks: 0,
    totalObtained: 0,
    percentage: 0,
    grade: "",
    rank: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSection, setFilterSection] = useState("");

  // ── Fetch Data ─────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${getAuthToken()}` };

      // 1. Fetch Stats
      const statsRes = await fetch(`${API_BASE_URL}/stats`, { headers });
      const statsJson = await statsRes.json();
      if (statsJson.success) setStats(statsJson.data);

      // 2. Fetch Results List
      const listRes = await fetch(`${API_BASE_URL}/result`, { headers });
      const listJson = await listRes.json();
      if (listJson.success) setResults(listJson.data);
    } catch (err) {
      toast.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const fetchStudentMarksheets = async (examId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${examId}/marksheets`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        setStudents(json.data);
        return json.data;
      }
    } catch (error) {
      toast.error("Failed to load marksheets");
    }
    return [];
  };

  // ── Download Helpers ────────────────────────────────────
  const generateCSV = (data, headers, filename) => {
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => `"${row[h] || ""}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generatePDF = (content, filename) => {
    const win = window.open("", "_blank");
    win.document.write(`
            <html>
                <head>
                    <title>${filename}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
                        th { background: #223F74; color: white; }
                        tr:nth-child(even) { background: #f9f9f9; }
                        h2 { color: #223F74; }
                        .header { text-align: center; margin-bottom: 24px; }
                        .header h1 { color: #223F74; margin: 0; }
                        .header p { color: #666; margin: 4px 0; }
                    </style>
                </head>
                <body>${content}</body>
            </html>
        `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const handleDownloadResults = () => {
    if (results.length === 0) return toast.error("No results to download");
    const headers = [
      "Class",
      "Section",
      "Exam Type",
      "Term",
      "Academic Year",
      "Students",
      "Pass Count",
      "Average %",
      "Status",
    ];
    const data = results.map((r) => ({
      Class: r.class,
      Section: r.section,
      "Exam Type": EXAM_TYPES[r.examType] || r.examType,
      Term: r.term,
      "Academic Year": `${r.academicYear}-${r.academicYear + 1}`,
      Students: r.students || 0,
      "Pass Count": r.passCount || 0,
      "Average %": r.averagePercentage > 0 ? `${r.averagePercentage}%` : "—",
      Status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    }));
    generateCSV(data, headers, "results_report");
    toast.success("Results downloaded successfully!");
  };

  const handleDownloadMarksheet = (studentData = null) => {
    const targetStudent = studentData || marksheetData.student;
    if (!targetStudent) return toast.error("No student data to download");

    const content = `
            <div class="header">
                <h1>Student Marksheet</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            <div style="margin-bottom: 20px;">
                <h2>Student Information</h2>
                <table>
                    <tr><th>Name</th><td>${targetStudent.name}</td></tr>
                    <tr><th>Roll No</th><td>${targetStudent.rollNo}</td></tr>
                    <tr><th>Class</th><td>${targetStudent.class}-${targetStudent.section}</td></tr>
                </table>
            </div>
            <div style="margin-bottom: 20px;">
                <h2>Subject-wise Marks</h2>
                <table>
                    <thead>
                        <tr><th>Subject</th><th>Marks Obtained</th><th>Total Marks</th><th>Grade</th></tr>
                    </thead>
                    <tbody>
                        ${targetStudent.results
                          .map(
                            (sub) => `
                            <tr>
                                <td>${sub.subject}</td>
                                <td>${sub.marks}</td>
                                <td>${sub.total}</td>
                                <td>${sub.grade || "—"}</td>
                            </tr>
                        `,
                          )
                          .join("")}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th>Total</th>
                            <th>${targetStudent.totalObtained}</th>
                            <th>${targetStudent.totalMarks}</th>
                            <th>${targetStudent.percentage}%</th>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div style="margin-top: 20px; text-align: center;">
                <p><strong>Overall Grade: ${targetStudent.grade}</strong></p>
                <p><strong>Rank: #${targetStudent.rank}</strong></p>
            </div>
        `;
    generatePDF(
      content,
      `marksheet_${targetStudent.name}_${targetStudent.rollNo}`,
    );
    toast.success("Marksheet downloaded successfully!");
  };

  const handleDownloadAllMarksheets = () => {
    if (students.length === 0) return toast.error("No students found");
    let content = `
            <div class="header">
                <h1>All Student Marksheets</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <p>Total Students: ${students.length}</p>
            </div>
        `;

    students.forEach((student) => {
      content += `
                <div style="page-break-after: always; margin-bottom: 40px;">
                    <h2>Student Rank #${student.rank}: ${student.name}</h2>
                    <table>
                        <tr><th>Roll No</th><td>${student.rollNo}</td></tr>
                        <tr><th>Class</th><td>${student.class}-${student.section}</td></tr>
                    </table>
                    <table>
                        <thead>
                            <tr><th>Subject</th><th>Marks Obtained</th><th>Total Marks</th><th>Grade</th></tr>
                        </thead>
                        <tbody>
                            ${student.results
                              .map(
                                (sub) => `
                                <tr>
                                    <td>${sub.subject}</td>
                                    <td>${sub.marks}</td>
                                    <td>${sub.total}</td>
                                    <td>${sub.grade}</td>
                                </tr>
                            `,
                              )
                              .join("")}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th>Total</th>
                                <th>${student.totalObtained}</th>
                                <th>${student.totalMarks}</th>
                                <th>${student.percentage}%</th>
                            </tr>
                        </tfoot>
                    </table>
                    <div style="text-align: center; margin-top: 10px;">
                        <p><strong>Grade: ${student.grade}</strong> | <strong>Rank: #${student.rank}</strong></p>
                    </div>
                </div>
            `;
    });
    generatePDF(content, "all_student_marksheets");
    toast.success("All marksheets downloaded successfully!");
  };

  // ── Actions ─────────────────────────────────────
  const handleGenerateResult = async () => {
    if (!resultForm.examId) return toast.error("Please select an Exam ID");

    try {
      const res = await fetch(`${API_BASE_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({ examId: resultForm.examId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Result generated successfully!");
        closeModal("generate-result-modal");
        fetchDashboardData();
      } else toast.error(json.message);
    } catch (err) {
      toast.error("Failed to generate result");
    }
  };

  const handlePublishResult = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${id}/publish`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Result published successfully!");
        fetchDashboardData();
      } else toast.error(json.message);
    } catch (err) {
      toast.error("Failed to publish result");
    }
  };

  const handleViewResult = async (result) => {
    setSelectedResult(result);
    const marksData = await fetchStudentMarksheets(result.id);

    // Find top student for preview
    if (marksData.length > 0) {
      setMarksheetData({ student: marksData[0], ...marksData[0] });
    }
    openModal("view-result-modal");
  };

  const handleViewMarksheet = (student) => {
    setMarksheetData({ student: student, ...student });
    openModal("view-marksheet-modal");
  };

  // ── Table Columns ──────────────────────────────────────────
  const resultColumns = [
    {
      key: "class",
      label: "Class/Section",
      render: (val, row) => `${val} - ${row.section}`,
    },
    {
      key: "examType",
      label: "Exam Type",
      render: (val) => (
        <span className="px-2 py-1 rounded-lg bg-[#F4F7FB] text-[#223F74] text-xs font-semibold">
          {EXAM_TYPES[val] || val}
        </span>
      ),
    },
    {
      key: "term",
      label: "Term",
      render: (val) => (
        <span className="text-sm font-semibold text-[#1D1D1F]">{val}</span>
      ),
    },
    {
      key: "academicYear",
      label: "Academic Year",
      render: (val) => `${val}-${val + 1}`,
    },
    { key: "students", label: "Students", render: (val) => val || 0 },
    {
      key: "averagePercentage",
      label: "Avg %",
      render: (val) => (val > 0 ? `${val}%` : "—"),
    },
    {
      key: "passCount",
      label: "Passed",
      render: (val, row) => `${val || 0}/${row.students || 0}`,
    },
    {
      key: "status",
      label: "Status",
      render: (val) => <StatusBadge status={val} />,
    },
  ];

  const resultActions = [
    {
      icon: <Eye size={14} />,
      tooltip: "View Result",
      variant: "primary",
      onClick: (row) => handleViewResult(row),
    },
    {
      icon: <Send size={14} />,
      tooltip: "Publish",
      variant: "success",
      show: (row) => row.status === "generated",
      onClick: (row) => handlePublishResult(row.id),
    },
    {
      icon: <FileSpreadsheet size={14} />,
      tooltip: "Generate Marksheets",
      variant: "primary",
      onClick: async (row) => {
        setSelectedResult(row);
        await fetchStudentMarksheets(row.id);
        openModal("marksheet-list-modal");
      },
    },
    {
      icon: <Download size={14} />,
      tooltip: "Download Results",
      variant: "success",
      onClick: handleDownloadResults,
    },
  ];

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNo?.includes(searchTerm);
    return matchesSearch;
  });

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <Heading
        primaryText="Class Marksheets"
        secondaryText="Generation"
        size={12}
      />

      <div className="mt-6">
        <Grid cols={12} gap={3}>
          <div className="col-span-12">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-1.5 flex shadow-sm gap-1.5">
              {[
                { key: "results", label: "Results", icon: FileText },
                {
                  key: "marksheets",
                  label: "Marksheets",
                  icon: FileSpreadsheet,
                },
                { key: "analytics", label: "Analytics", icon: BarChart },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                    activeTab === key
                      ? "bg-gradient-to-r from-[#223F74] to-[#2A4A82] text-white shadow-lg shadow-[#223F74]/25"
                      : "text-[#6B7280] hover:bg-[#F4F7FB] hover:text-[#223F74]"
                  }`}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          </div>
        </Grid>
      </div>

      {/* TAB 1 — RESULTS */}
      {activeTab === "results" && (
        <div className="mt-6">
          <Grid cols={12} gap={4}>
            <DashCard
              title="Total Results"
              value={stats.total}
              icon={<FileText size={20} />}
              accentColor="#223F74"
              size={3}
            />
            <DashCard
              title="Published"
              value={stats.published}
              icon={<CheckCircle size={20} />}
              accentColor="#5B9A6A"
              size={3}
            />
            <DashCard
              title="Generated"
              value={stats.generated}
              icon={<FileCheck size={20} />}
              accentColor="#7A8FC6"
              size={3}
            />
            <DashCard
              title="Pending"
              value={stats.pending}
              icon={<Clock size={20} />}
              accentColor="#E0A04B"
              size={3}
            />

            <div className="col-span-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-[#223F74] to-[#2A4A82] rounded-xl p-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                    Average Percentage
                  </p>
                  <p className="text-2xl font-black">
                    {stats.averagePercentage}%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                    Pass Percentage
                  </p>
                  <p className="text-2xl font-black">{stats.passPercentage}%</p>
                </div>
                <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl p-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                    Total Students
                  </p>
                  <p className="text-2xl font-black">{stats.totalStudents}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                    Top Performers
                  </p>
                  <p className="text-2xl font-black">{stats.totalToppers}</p>
                </div>
              </div>
            </div>

            <div className="col-span-12">
              <DataTable
                columns={resultColumns}
                rows={results}
                actions={resultActions}
                title="All Results"
                pageSize={10}
                searchable={true}
                exportable={true}
                loading={loading}
                headerAction={
                  <Button
                    text="Generate New Result"
                    icon={<Plus size={14} />}
                    onClick={() => openModal("generate-result-modal")}
                  />
                }
              />
            </div>
          </Grid>
        </div>
      )}

      {/* TAB 2 — MARKSHEETS */}
      {activeTab === "marksheets" && (
        <Grid cols={12} gap={4}>
          <div className="col-span-12">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black text-[#223F74]">
                    Student Marksheets
                  </h3>
                  <P text="Search and view marksheets across all results" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex-1 min-w-[200px] relative">
                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]"
                  />
                  <input
                    type="text"
                    placeholder="Search student by name or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-11 pr-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] text-[#1D1D1F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-[#6B7280]">
                    Please select "Generate Marksheets" from the Results tab
                    first.
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="bg-white rounded-xl border border-[#E2E8F0] p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewMarksheet(student)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#223F74] to-[#2A4A82] flex items-center justify-center text-white font-bold text-lg">
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#1D1D1F] truncate">
                            {student.name}
                          </p>
                          <p className="text-xs text-[#6B7280]">
                            Class {student.class}-{student.section} • Roll #
                            {student.rollNo}
                          </p>
                        </div>
                        <button className="p-2 rounded-lg bg-[#F4F7FB] text-[#223F74]">
                          <Eye size={16} />
                        </button>
                      </div>
                      <div className="mt-3 pt-3 border-t border-[#E2E8F0] flex justify-between">
                        <div className="flex gap-2">
                          <span className="text-xs text-[#6B7280]">Avg:</span>
                          <span className="text-sm font-bold">
                            {student.percentage}%
                          </span>
                        </div>
                        <GradeBadge grade={student.grade} />
                        <div className="flex gap-2">
                          <span className="text-xs text-[#6B7280]">Rank:</span>
                          <span className="text-sm font-bold text-emerald-600">
                            #{student.rank}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Grid>
      )}

      {/* TAB 3 — ANALYTICS */}
      {activeTab === "analytics" && (
        <Grid cols={12} gap={4}>
          <div className="col-span-12 bg-white rounded-2xl border border-[#E2E8F0] p-6">
            <h3 className="text-lg font-black text-[#223F74] mb-6">
              Results Analytics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[#F8F9FA] rounded-xl p-4 border text-center">
                <p className="text-xs font-bold text-[#6B7280] uppercase">
                  Overall Pass %
                </p>
                <p className="text-2xl font-black text-[#223F74]">
                  {stats.passPercentage}%
                </p>
              </div>
              <div className="bg-[#F8F9FA] rounded-xl p-4 border text-center">
                <p className="text-xs font-bold text-[#6B7280] uppercase">
                  Top Performers
                </p>
                <p className="text-2xl font-black text-[#223F74]">
                  {stats.totalToppers}
                </p>
              </div>
              <div className="bg-[#F8F9FA] rounded-xl p-4 border text-center">
                <p className="text-xs font-bold text-[#6B7280] uppercase">
                  Average Score
                </p>
                <p className="text-2xl font-black text-[#223F74]">
                  {stats.averagePercentage}%
                </p>
              </div>
              <div className="bg-[#F8F9FA] rounded-xl p-4 border text-center">
                <p className="text-xs font-bold text-[#6B7280] uppercase">
                  Total Results
                </p>
                <p className="text-2xl font-black text-[#223F74]">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>
        </Grid>
      )}

      {/* MODALS */}
      <Modal id="generate-result-modal" title="Generate Result" size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleGenerateResult();
          }}
          className="space-y-5"
        >
          <ModalGrid title="Result Details" cols={1}>
            <DataField
              label="Exam Schedule ID *"
              id="examId"
              value={resultForm.examId}
              onChange={(e) =>
                setResultForm({ ...resultForm, examId: e.target.value })
              }
              placeholder="Paste Exam Schedule ID..."
            />
          </ModalGrid>
          <div className="flex gap-3 pt-4 border-t border-[#E2E8F0]">
            <Button
              text="Generate Result"
              variant="primary"
              type="submit"
              size={0}
              icon={<FileCheck size={15} />}
            />
            <Button
              text="Cancel"
              variant="secondary"
              size={0}
              onClick={() => closeModal("generate-result-modal")}
            />
          </div>
        </form>
      </Modal>

      <Modal id="view-result-modal" title="Result Details" size="2xl">
        {selectedResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#223F74] text-white">
              <FileText size={24} />
              <div className="flex-1">
                <p className="text-lg font-bold">
                  {EXAM_TYPES[selectedResult.examType] ||
                    selectedResult.examType}{" "}
                  - Class {selectedResult.class}-{selectedResult.section}
                </p>
              </div>
              <StatusBadge status={selectedResult.status} />
            </div>
            <ModalGrid title="Result Summary" cols={3}>
              <ModalData
                label="Total Students"
                value={selectedResult.students || 0}
              />
              <ModalData
                label="Passed Students"
                value={selectedResult.passCount || 0}
              />
              <ModalData
                label="Average Percentage"
                value={
                  selectedResult.averagePercentage > 0
                    ? `${selectedResult.averagePercentage}%`
                    : "—"
                }
              />
            </ModalGrid>

            {marksheetData && marksheetData.results && (
              <ModalGrid title="Top Student Preview" cols={1}>
                <div className="p-3 bg-[#F8F9FA] rounded-lg border flex justify-between items-center">
                  <p className="font-bold">{marksheetData.student?.name}</p>
                  <p className="font-bold text-[#223F74]">
                    {marksheetData.percentage}%
                  </p>
                  <GradeBadge grade={marksheetData.grade} />
                </div>
              </ModalGrid>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                text="Close"
                variant="secondary"
                size={0}
                onClick={() => closeModal("view-result-modal")}
              />
              {selectedResult.status === "generated" && (
                <Button
                  text="Publish"
                  variant="primary"
                  size={0}
                  onClick={() => {
                    handlePublishResult(selectedResult.id);
                    closeModal("view-result-modal");
                  }}
                />
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal id="view-marksheet-modal" title="Student Marksheet" size="2xl">
        {marksheetData && marksheetData.student && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#223F74] to-[#2A4A82] text-white">
              <div className="flex-1">
                <p className="text-xl font-bold">
                  {marksheetData.student.name}
                </p>
                <p className="text-sm text-slate-300">
                  Class {marksheetData.student.class}-
                  {marksheetData.student.section} • Roll No:{" "}
                  {marksheetData.student.rollNo}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs">Overall Grade</p>
                <GradeBadge grade={marksheetData.grade} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="bg-[#F8F9FA] rounded-xl p-3 border">
                <p className="text-xs text-[#6B7280] font-bold">Total</p>
                <p className="text-lg font-black text-[#223F74]">
                  {marksheetData.totalMarks}
                </p>
              </div>
              <div className="bg-[#F8F9FA] rounded-xl p-3 border">
                <p className="text-xs text-[#6B7280] font-bold">Obtained</p>
                <p className="text-lg font-black text-[#223F74]">
                  {marksheetData.totalObtained}
                </p>
              </div>
              <div className="bg-[#F8F9FA] rounded-xl p-3 border">
                <p className="text-xs text-[#6B7280] font-bold">Percentage</p>
                <p className="text-lg font-black text-[#223F74]">
                  {marksheetData.percentage}%
                </p>
              </div>
              <div className="bg-[#F8F9FA] rounded-xl p-3 border">
                <p className="text-xs text-[#6B7280] font-bold">Rank</p>
                <p className="text-lg font-black text-emerald-600">
                  #{marksheetData.rank}
                </p>
              </div>
            </div>
            <ModalGrid title="Subject-wise Marks" cols={1}>
              <div className="space-y-2">
                {marksheetData.results.map((sub, i) => (
                  <div
                    key={i}
                    className="flex justify-between p-2 bg-[#F8F9FA] rounded border"
                  >
                    <span className="text-sm font-semibold">{sub.subject}</span>
                    <div className="flex gap-4">
                      <span className="font-bold text-[#223F74]">
                        {sub.marks}/{sub.total}
                      </span>
                      <GradeBadge grade={sub.grade} />
                    </div>
                  </div>
                ))}
              </div>
            </ModalGrid>
            <div className="flex justify-between pt-2">
              <div className="flex gap-2">
                <Button
                  text="Print"
                  variant="secondary"
                  size={0}
                  onClick={() => window.print()}
                />
                <Button
                  text="Download"
                  variant="secondary"
                  size={0}
                  onClick={() => handleDownloadMarksheet(marksheetData.student)}
                />
              </div>
              <Button
                text="Close"
                variant="ghost"
                size={0}
                onClick={() => closeModal("view-marksheet-modal")}
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal id="marksheet-list-modal" title="Student Marksheets" size="2xl">
        {selectedResult && (
          <div className="space-y-4">
            <div className="flex justify-between bg-[#223F74] p-4 rounded-2xl text-white">
              <div>
                <p className="text-lg font-bold">
                  {EXAM_TYPES[selectedResult.examType] ||
                    selectedResult.examType}
                </p>
                <p className="text-sm text-slate-300">
                  {selectedResult.students || 0} students
                </p>
              </div>
              <Button
                text="Download All"
                variant="primary"
                size={0}
                onClick={handleDownloadAllMarksheets}
              />
            </div>
            <DataTable
              columns={[
                { key: "rollNo", label: "Roll No", render: (val) => `#${val}` },
                { key: "name", label: "Student Name" },
                {
                  key: "percentage",
                  label: "Percentage",
                  render: (val) => (val ? `${val}%` : "—"),
                },
                {
                  key: "grade",
                  label: "Grade",
                  render: (val) => <GradeBadge grade={val} />,
                },
                {
                  key: "rank",
                  label: "Rank",
                  render: (val) => (val ? `#${val}` : "—"),
                },
              ]}
              rows={students}
              actions={[
                {
                  icon: <Eye size={14} />,
                  tooltip: "View",
                  variant: "primary",
                  onClick: (row) => {
                    closeModal("marksheet-list-modal");
                    handleViewMarksheet(row);
                  },
                },
                {
                  icon: <Download size={14} />,
                  tooltip: "Download",
                  variant: "success",
                  onClick: (row) => handleDownloadMarksheet(row),
                },
              ]}
              title="Student List"
            />
            <div className="flex justify-end pt-2">
              <Button
                text="Close"
                variant="secondary"
                size={0}
                onClick={() => closeModal("marksheet-list-modal")}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ResultsAndMarksheet;
