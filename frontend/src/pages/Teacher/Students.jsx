import React, { useState, useMemo, useEffect } from "react";
import {
  Grid,
  DashGrid,
  Heading,
  DashCard,
  DataTable,
  Modal,
  openModal,
  closeModal,
  ModalData,
  ModalProfile,
  ModalGrid,
  Button,
  DataField,
  SelectField,
  Select,
  Option,
  GLineChart,
  GColumnChart,
  GDoughnutChart,
  GAreaChart,
  ToggleButton,
  P
} from "../../components/shared/Common_Components";
import {
  Users, UserCheck, UserX, TrendingUp, AlertTriangle, UserPlus,
  Eye, Pencil, CalendarDays, FileBarChart, ShieldAlert, MessageSquare,
  FileText, Upload, Download, Bell, Send, Phone, Mail, Calendar,
  CheckCircle2, XCircle, Clock, Award, Star, BookOpen, Clipboard,
  Filter, Search, ChevronDown, Plus, Printer, FileSpreadsheet,
  GraduationCap, Heart, Bus, CreditCard, FolderOpen, Camera,
  AlertCircle, ThumbsUp, ThumbsDown, MessageCircle, RefreshCw
} from "lucide-react";
import {
  getStudentStats,
  getStudents,
  getStudentById,
  getStudentAttendance,
  getStudentPerformance,
  getTeacherAttendanceClasses,
  getTeacherAttendanceStudents,
  markTeacherAttendance,
  updateTeacherAttendance,
  getTeacherAttendanceStats,
  getTeacherAttendanceReport,
  getTeacherLeaveRequests,
  updateTeacherLeaveRequest,
  getTeacherResults,
  getTeacherStudentMarksheets,
  getTeacherDashboardPerformance,
  getStudentBehaviourLogs,
  createStudentBehaviourLog,
  getCommunicationLogs,
  sendParentMessage,
  scheduleParentMeeting,
  getStudentDocuments,
  uploadStudentDocument,
  getTeacherNotifications
} from "../../services/teacherStudentsApi";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─────────────────────────────────────────────────────────────────────────
   DESIGN THEME TOKENS
   ───────────────────────────────────────────────────────────────────────── */
const T = {
  navy: "#223F74",
  peach: "#F59B87",
  peachDark: "#EC856D",
  cream: "#F4F7FB",
  warmCream: "#F8EEE9",
  border: "#E2E8F0",
  cardBorder: "#E7E2DB",
  textPrimary: "#1D1D1F",
  textSecondary: "#6B7280",
  rose: "#D66B5F",
  amber: "#E0A04B",
  green: "#5B9A6A",
  blue: "#7A8FC6",
};

/* ─────────────────────────────────────────────────────────────────────────
   MOCK DATA SETS (Will be replaced with API data)
   ───────────────────────────────────────────────────────────────────────── */
const INITIAL_STUDENTS = [];
const MOCK_ATTENDANCE_LOG = [];
const MOCK_EXAM_DATA = [];
const MOCK_BEHAVIOUR_DATA = [];
const MOCK_PERFORMANCE_TREND = [];
const MOCK_LEAVE_REQUESTS = [];
const MOCK_DOCUMENTS = [];
const MOCK_NOTIFICATIONS = [];
const MOCK_MESSAGES = [];

/* ─────────────────────────────────────────────────────────────────────────
   MAIN CLASS
   ───────────────────────────────────────────────────────────────────────── */
export default function ManageStudentsPage() {
  const [students, setStudents] = useState(INITIAL_STUDENTS);
  const [activeTab, setActiveTab] = useState("list");
  const [search, setSearch] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);

  // Tab State variables
  const [attendanceClass, setAttendanceClass] = useState("");
  const [attendanceLog, setAttendanceLog] = useState(MOCK_ATTENDANCE_LOG);
  const [bulkList, setBulkList] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [attendanceConfig, setAttendanceConfig] = useState(() => {
    const saved = localStorage.getItem("teacher_attendance_config");
    return saved ? JSON.parse(saved) : {
      threshold: 75,
      notifyParent: true,
      notifyStudent: false,
      showWarning: true,
      autoReport: true
    };
  });

  const [behaviourLogs, setBehaviourLogs] = useState(MOCK_BEHAVIOUR_DATA);
  const [newBehaviour, setNewBehaviour] = useState({ student: "", type: "Warning", description: "", actionTaken: "", reportedBy: "Mrs. Kavita Rao" });

  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState({ recipient: "", subject: "", body: "" });
  const [newMeeting, setNewMeeting] = useState({ student: "", date: "", time: "", agenda: "" });

  const [documents, setDocuments] = useState(MOCK_DOCUMENTS);
  const [uploadCategory, setUploadCategory] = useState("Report Card");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadStudentId, setUploadStudentId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);

  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  // Modals controlled states
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [complaintForm, setComplaintForm] = useState({ category: "Misbehaviour", description: "", severity: "Medium", notifyParent: true, notifyAdmin: false });

  // Sub-tabs in Attendance Module
  const [attSubTab, setAttSubTab] = useState("daily");

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  const [examData, setExamData] = useState([]);
  const [performanceTrend, setPerformanceTrend] = useState([]);

  // Performance Tracker states
  const [performanceClass, setPerformanceClass] = useState("");
  const [performanceTrendList, setPerformanceTrendList] = useState([]);
  const [subjectAveragesData, setSubjectAveragesData] = useState([]);
  const [examLedgerRows, setExamLedgerRows] = useState([]);

  const loadStudentDetailsAndOpen = async (studentId, modalId) => {
    // 1. Find basic data we already have
    const basicStudent = students.find(s => s.id === studentId);
    
    // 2. Open modal immediately with basic info
    if (basicStudent) {
      setSelectedStudent({
        ...basicStudent,
        dob: "Loading...",
        gender: "Loading...",
        bloodGroup: "Loading...",
        address: "Loading...",
        joiningDate: "Loading...",
        medicalInfo: "Loading...",
        emergencyContact: { name: "Loading...", relation: "Loading...", phone: "Loading..." },
        transport: { mode: "Loading...", route: "Loading...", busNo: "Loading..." },
        isLoadingDetails: true
      });
      openModal(modalId);
    }

    // 3. Fetch detailed info in background
    try {
      const response = await getStudentById(studentId);
      if (response.success && response.data) {
        const parent = response.data.parent || {};
        setSelectedStudent(prev => {
          if (prev && prev.id === studentId) {
            return {
              ...prev,
              ...response.data,
              dob: response.data.dateOfBirth ? new Date(response.data.dateOfBirth).toISOString().slice(0, 10) : "N/A",
              joiningDate: response.data.joiningDate || "N/A",
              parentName: parent.name || response.data.fatherName || prev.parentName || "N/A",
              parentPhone: parent.phone || prev.parentPhone || "N/A",
              parentEmail: parent.email || prev.parentEmail || "N/A",
              address: response.data.address || "N/A",
              emergencyContact: response.data.emergencyContact || {
                name: parent.name || "N/A",
                relation: "Parent",
                phone: parent.phone || "N/A"
              },
              transport: response.data.transport || {
                mode: "N/A",
                route: "N/A",
                busNo: "N/A"
              },
              isLoadingDetails: false
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error(err);
      setSelectedStudent(prev => prev && prev.id === studentId ? { ...prev, isLoadingDetails: false } : prev);
    }
  };

  const loadStudentDetailsForEdit = async (studentId) => {
    // 1. Open immediately with basic data
    const basicStudent = students.find(s => s.id === studentId);
    if (basicStudent) {
      setEditStudent({
        ...basicStudent,
        address: "Loading..."
      });
      openModal("edit-student-modal");
    }

    // 2. Fetch full details in background
    try {
      const response = await getStudentById(studentId);
      if (response.success && response.data) {
        const parent = response.data.parent || {};
        setEditStudent(prev => {
          if (prev && prev.id === studentId) {
            return {
              ...prev,
              ...response.data,
              parentName: parent.name || response.data.fatherName || prev.parentName || "",
              parentPhone: parent.phone || prev.parentPhone || "",
              parentEmail: parent.email || prev.parentEmail || "",
              address: response.data.address || ""
            };
          }
          return prev;
        });
      }
    } catch (err) {
      console.error(err);
      setEditStudent(prev => prev && prev.id === studentId ? { ...prev, address: "" } : prev);
    }
  };

  const handleOpenAttendanceModal = async (student) => {
    // 1. Open immediately with basic info
    setSelectedStudent({
      ...student,
      attendancePct: student.attendancePct || 0
    });
    setAttendanceLog([]); // Clear logs or set loading
    openModal("attendance-modal");

    // 2. Fetch attendance logs in background
    try {
      const response = await getStudentAttendance(student.id);
      if (response.success && response.data) {
        const cal = response.data.calendar || {};
        const mappedLog = Object.entries(cal).map(([dateStr, status]) => ({
          date: dateStr,
          status: status.charAt(0).toUpperCase() + status.slice(1),
          time: status === "present" || status === "late" ? "08:14 AM" : "—",
          remark: status === "late" ? "Arrived 14m late" : status === "absent" ? "Uninformed absence" : "On Time"
        }));
        mappedLog.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAttendanceLog(mappedLog);

        // Fetch detailed profile info in background too
        const profileRes = await getStudentById(student.id);
        if (profileRes.success && profileRes.data) {
          setSelectedStudent(prev => prev && prev.id === student.id ? {
            ...prev,
            ...profileRes.data,
            attendancePct: profileRes.data.attendance?.percentage || prev.attendancePct
          } : prev);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAcademicModal = async (student) => {
    // 1. Open immediately with basic info
    setSelectedStudent({
      ...student,
      overallGrade: student.overallGrade || "N/A",
      admNo: student.rollNo || ""
    });
    setExamData([]);
    setPerformanceTrend([]);
    openModal("academic-modal");

    // 2. Fetch performance data in background
    try {
      const response = await getStudentPerformance(student.id);
      if (response.success && response.data) {
        const mappedExams = (response.data.examSubjectHistory || []).map(exam => ({
          exam: exam.examName,
          subject: exam.subject,
          maxMarks: exam.totalMarks,
          obtained: exam.marksObtained,
          grade: exam.grade,
          rank: response.data.classRank ? `${response.data.classRank} / ${response.data.totalStudents}` : "—"
        }));
        
        const trend = (response.data.examHistory || []).map(item => ({
          month: item.examName,
          gpa: Number((item.percentage / 25).toFixed(2))
        })).reverse();
        
        setExamData(mappedExams);
        setPerformanceTrend(trend);

        // Fetch detailed profile info in background too
        const profileRes = await getStudentById(student.id);
        if (profileRes.success && profileRes.data) {
          setSelectedStudent(prev => prev && prev.id === student.id ? {
            ...prev,
            ...profileRes.data,
            overallGrade: profileRes.data.performance?.latestGrade || prev.overallGrade,
            admNo: profileRes.data.enrollmentNo || profileRes.data.rollNo || prev.admNo
          } : prev);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [assignedClasses, setAssignedClasses] = useState([]);
  const [attendanceStudents, setAttendanceStudents] = useState([]);
  const [alreadyMarkedToday, setAlreadyMarkedToday] = useState(false);
  const [calendarMonthReport, setCalendarMonthReport] = useState([]);

  const fetchAttendanceClasses = async () => {
    try {
      const response = await getTeacherAttendanceClasses();
      if (response.success && response.data.length > 0) {
        setAssignedClasses(response.data);
        // Default to first class if not set or invalid
        const firstKey = `${response.data[0].classId}_${response.data[0].section}`;
        if (!attendanceClass || !response.data.some(c => `${c.classId}_${c.section}` === attendanceClass)) {
          setAttendanceClass(firstKey);
        }
        if (!performanceClass || !response.data.some(c => `${c.classId}_${c.section}` === performanceClass)) {
          setPerformanceClass(firstKey);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendanceStudents = async (classKey) => {
    if (!classKey) return;
    const [classId, section] = classKey.split("_");
    try {
      const response = await getTeacherAttendanceStudents({ classId, section });
      if (response.success && response.data) {
        setAttendanceStudents(response.data.students || []);
        setAlreadyMarkedToday(response.data.alreadyMarked || false);
        
        // Map to bulkList
        const mappedBulk = (response.data.students || []).map(s => ({
          id: s.id,
          userId: s.userId,
          name: s.name,
          rollNo: s.rollNo,
          present: s.status === "present" || s.status === null
        }));
        setBulkList(mappedBulk);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMonthlyCalendarData = async (classKey) => {
    if (!classKey) return;
    const [classId, section] = classKey.split("_");
    const now = new Date();
    try {
      const response = await getTeacherAttendanceReport({
        classId,
        section,
        month: now.getMonth() + 1,
        year: now.getFullYear()
      });
      if (response.success && response.data) {
        setCalendarMonthReport(response.data.dayWise || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeaves = async () => {
    try {
      const response = await getTeacherLeaveRequests();
      if (response.success && response.data) {
        const mapped = response.data.map(item => ({
          id: item.rawId,
          displayId: item.id,
          student: item.studentName,
          class: `${item.className} (Roll ${item.rollNo})`,
          from: item.range.split(" - ")[0],
          to: item.range.split(" - ")[1],
          reason: item.reason,
          status: item.status
        }));
        setLeaveRequests(mapped);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBehaviourLogs = async () => {
    try {
      const response = await getStudentBehaviourLogs();
      if (response.success && response.data) {
        setBehaviourLogs(response.data);
      }
    } catch (err) {
      console.error("Error fetching behaviour logs:", err);
    }
  };

  const fetchCommunicationLogs = async () => {
    try {
      const response = await getCommunicationLogs();
      if (response.success && response.data) {
        setMessages(response.data);
      }
    } catch (err) {
      console.error("Error fetching communication logs:", err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await getStudentDocuments();
      if (response.success && response.data) {
        setDocuments(response.data);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    }
  };

  const fetchSystemNotifications = async () => {
    try {
      const response = await getTeacherNotifications();
      if (response.success && response.data) {
        const mapped = response.data.map(notif => ({
          id: notif._id,
          type: notif.type ? (notif.type.charAt(0).toUpperCase() + notif.type.slice(1)) : "System",
          message: notif.message || notif.title || "",
          student: notif.metadata?.studentName || "Class General",
          date: new Date(notif.createdAt).toLocaleString(),
          priority: notif.type === "leave" || notif.type === "ticket" ? "High" : "Normal",
          status: notif.read ? "Read" : "Unread"
        }));
        setNotifications(mapped);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleMarkSingleStudent = async (studentId, status) => {
    if (!attendanceClass) return;
    const [classId, section] = attendanceClass.split("_");
    
    setAttendanceStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s));
    setBulkList(prev => prev.map(s => s.id === studentId ? { ...s, present: status === "present" } : s));
    
    try {
      const targetStudent = attendanceStudents.find(s => s.id === studentId);
      const studentIdPayload = targetStudent?.userId || studentId;
      const payload = {
        classId,
        section,
        date: new Date().toISOString().slice(0, 10),
        attendance: [{ studentId: studentIdPayload, status }]
      };
      
      let response;
      if (alreadyMarkedToday) {
        response = await updateTeacherAttendance(payload);
      } else {
        response = await markTeacherAttendance(payload);
        setAlreadyMarkedToday(true);
      }
      
      if (response.success) {
        showToast(`Marked ${targetStudent?.name} as ${status}`);
        fetchAttendanceStudents(attendanceClass);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to save attendance entry");
    }
  };

  // Sync config to localStorage
  useEffect(() => {
    localStorage.setItem("teacher_attendance_config", JSON.stringify(attendanceConfig));
  }, [attendanceConfig]);

  // Fetch classes list on mount
  useEffect(() => {
    fetchAttendanceClasses();
  }, []);

  // Load subtab data dynamically
  useEffect(() => {
    if (attendanceClass) {
      if (attSubTab === "daily" || attSubTab === "bulk") {
        fetchAttendanceStudents(attendanceClass);
      } else if (attSubTab === "calendar") {
        fetchMonthlyCalendarData(attendanceClass);
      } else if (attSubTab === "leave") {
        fetchLeaves();
      }
    }
  }, [attendanceClass, attSubTab]);

  const fetchPerformanceData = async (classKey) => {
    try {
      const response = await getTeacherDashboardPerformance();
      if (response.success && response.data) {
        const mappedTrend = (response.data || []).map(pm => ({
          month: pm.month,
          gpa: Number((pm.avgScore / 25).toFixed(2))
        }));
        setPerformanceTrendList(mappedTrend);
      }
    } catch (err) {
      console.error("Error fetching dashboard performance metrics:", err);
    }

    if (!classKey) return;
    const targetClass = assignedClasses.find(c => `${c.classId}_${c.section}` === classKey);
    const className = targetClass?.className || "";
    const sectionName = targetClass?.section || "";

    try {
      const response = await getTeacherStudentMarksheets({ class: className, section: sectionName });
      if (response.success && response.data) {
        const marksheets = response.data || [];

        const subjectTotals = {};
        marksheets.forEach(sheet => {
          (sheet.results || []).forEach(sub => {
            const subName = sub.subjectName || sub.subject?.subjectName || sub.subject?.name || sub.subject || "Subject";
            if (!subjectTotals[subName]) {
              subjectTotals[subName] = { total: 0, count: 0 };
            }
            subjectTotals[subName].total += sub.percentage || 0;
            subjectTotals[subName].count += 1;
          });
        });

        const subjectAverages = Object.entries(subjectTotals).map(([name, val]) => ({
          name,
          value: val.count ? Math.round(val.total / val.count) : 0
        }));

        setSubjectAveragesData(subjectAverages.length ? subjectAverages : [
          { name: "English", value: 0 },
          { name: "Maths", value: 0 },
          { name: "Science", value: 0 },
          { name: "Social Sci", value: 0 },
          { name: "Hindi", value: 0 }
        ]);

        const mappedLedger = marksheets.map(m => ({
          name: m.student?.name || "Unknown",
          rollNo: m.student?.rollNo || "—",
          totalObtained: m.totalObtained || 0,
          totalMarks: m.totalMarks || 100,
          percentage: `${m.percentage || 0}%`,
          grade: m.grade || "N/A",
          rank: m.rank || "—"
        }));
        setExamLedgerRows(mappedLedger);
      }
    } catch (err) {
      console.error("Error fetching class marksheets:", err);
    }
  };

  useEffect(() => {
    if (performanceClass) {
      fetchPerformanceData(performanceClass);
    }
  }, [performanceClass]);

  // Fetch student stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const response = await getStudentStats();
        if (response.success) {
          setStatsData(response.data);
        }
      } catch (err) {
        console.error('Error fetching student stats:', err);
        // Don't set error for stats - it's not critical, just log it
        console.warn('Stats unavailable, using fallback calculation');
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Fetch students on mount
  useEffect(() => {
    const fetchStudentsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getStudents({ limit: 100 });
        if (response.success) {
          // Map API response to component data structure
          const mappedStudents = response.data.students.map(student => ({
            id: student.id,
            name: student.name,
            email: student.email,
            photo: student.photo,
            admNo: student.rollNo,
            rollNo: student.rollNo,
            class: student.class,
            section: student.section,
            parentName: student.parentContact || 'N/A',
            parentPhone: student.parentContact || 'N/A',
            attendancePct: student.attendance || 0,
            overallGrade: student.performance || 'N/A',
            behaviourRating: student.performance === 'A' ? 'Excellent' :
                            student.performance === 'B' ? 'Good' :
                            student.performance === 'C' ? 'Fair' : 'Needs Improvement',
            status: student.status || 'Active'
          }));
          setStudents(mappedStudents);
        } else {
          console.error('API returned unsuccessful response:', response);
          setError(response.message || 'Failed to load students data');
        }
      } catch (err) {
        console.error('Error fetching students:', err);
        setError(`Failed to load students data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentsData();
  }, []);

  // Fetch student leaves, behaviour, communication, documents, and notifications on mount
  useEffect(() => {
    fetchLeaves();
    fetchBehaviourLogs();
    fetchCommunicationLogs();
    fetchDocuments();
    fetchSystemNotifications();
  }, []);

  // Calculations - use API stats if available, otherwise calculate from local data
  const stats = useMemo(() => {
    if (statsData) {
      return {
        total: statsData.totalStudents || 0,
        present: statsData.activeStudents || 0,
        absent: statsData.inactiveStudents || 0,
        avg: 0, // Will be calculated from attendance data
        lowAttendance: statsData.lowAttendanceStudents || 0,
        newAdmissions: 0 // Will be added to backend if needed
      };
    }

    // Fallback to local calculation
    const total = students.length;
    const avg = total > 0 ? Math.round(students.reduce((acc, s) => acc + s.attendancePct, 0) / total) : 0;
    const lowAttendance = students.filter(s => s.attendancePct < attendanceConfig.threshold).length;
    const absentCount = students.filter(s => s.attendancePct < 70).length;
    const presentCount = total - absentCount;
    return {
      total,
      present: presentCount,
      absent: absentCount,
      avg,
      lowAttendance,
      newAdmissions: 0
    };
  }, [students, attendanceConfig.threshold, statsData]);

  // Handle Edit Save
  const handleSaveEdit = () => {
    if (!editStudent) return;
    setStudents(prev => prev.map(s => s.id === editStudent.id ? editStudent : s));
    showToast(`Successfully updated details for ${editStudent.name}`);
    closeModal("edit-student-modal");
  };

  // Refresh data function
  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getStudents({ limit: 100 });
      if (response.success) {
        const mappedStudents = response.data.students.map(student => ({
          id: student.id,
          name: student.name,
          email: student.email,
          photo: student.photo,
          admNo: student.rollNo,
          rollNo: student.rollNo,
          class: student.class,
          section: student.section,
          parentName: student.parentContact || 'N/A',
          parentPhone: student.parentContact || 'N/A',
          attendancePct: student.attendance || 0,
          overallGrade: student.performance || 'N/A',
          behaviourRating: student.performance === 'A' ? 'Excellent' :
                          student.performance === 'B' ? 'Good' :
                          student.performance === 'C' ? 'Fair' : 'Needs Improvement',
          status: student.status || 'Active'
        }));
        setStudents(mappedStudents);
        showToast('Data refreshed successfully');
      }
    } catch (err) {
      console.error('Error refreshing students:', err);
      setError('Failed to refresh students data');
      showToast('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  // Raise Complaint
  const handleRaiseComplaintSubmit = () => {
    if (!selectedStudent || !complaintForm.description.trim()) return;
    const newIncident = {
      date: new Date().toISOString().slice(0, 10),
      student: selectedStudent.name,
      type: "Complaint",
      description: `[Category: ${complaintForm.category}] Severity: ${complaintForm.severity}. Description: ${complaintForm.description}`,
      actionTaken: "Escalated for review",
      reportedBy: "Mrs. Kavita Rao"
    };
    setBehaviourLogs(prev => [newIncident, ...prev]);
    showToast(`Incident report successfully logged for ${selectedStudent.name}. Notifications sent.`);
    closeModal("complaint-modal");
    setComplaintForm({ category: "Misbehaviour", description: "", severity: "Medium", notifyParent: true, notifyAdmin: false });
  };

  // Mark Daily Sheet Submission
  const handleBulkSubmit = async () => {
    if (!attendanceClass) return;
    const [classId, section] = attendanceClass.split("_");
    
    const attendanceEntries = bulkList.map(item => {
      const target = attendanceStudents.find(s => s.id === item.id);
      return {
        studentId: target?.userId || item.id,
        status: item.present ? "present" : "absent"
      };
    });
    
    const payload = {
      classId,
      section,
      date: new Date().toISOString().slice(0, 10),
      attendance: attendanceEntries
    };
    
    try {
      showToast("Submitting attendance sheet...");
      let response;
      if (alreadyMarkedToday) {
        response = await updateTeacherAttendance(payload);
      } else {
        response = await markTeacherAttendance(payload);
        setAlreadyMarkedToday(true);
      }
      
      if (response.success) {
        showToast("Bulk Attendance Sheet submitted successfully to backend!");
        fetchAttendanceStudents(attendanceClass);
      } else {
        showToast(response.message || "Failed to submit attendance sheet");
      }
    } catch (err) {
      console.error(err);
      showToast("Error submitting attendance sheet");
    }
  };

  // Leave approval
  const handleLeaveAction = async (id, newStatus) => {
    try {
      showToast("Submitting leave decision...");
      const statusValue = newStatus === "Approved" ? "approved" : "rejected";
      const response = await updateTeacherLeaveRequest(id, { status: statusValue });
      if (response.success) {
        showToast(`Leave request ${newStatus.toLowerCase()} successfully.`);
        fetchLeaves();
      } else {
        showToast(response.message || "Failed to update leave status");
      }
    } catch (err) {
      console.error(err);
      showToast("Error updating leave request");
    }
  };

  // Add Behaviour entry
  const handleAddBehaviourLog = async () => {
    if (!newBehaviour.student || !newBehaviour.description.trim()) return;
    try {
      showToast("Submitting behaviour log...");
      const response = await createStudentBehaviourLog({
        studentId: newBehaviour.student,
        type: newBehaviour.type,
        description: newBehaviour.description,
        actionTaken: newBehaviour.actionTaken || "Recorded in file"
      });
      if (response.success) {
        showToast(`Incident/Behaviour log logged successfully.`);
        fetchBehaviourLogs();
        closeModal("add-behaviour-modal");
        setNewBehaviour({ student: "", type: "Warning", description: "", actionTaken: "", reportedBy: "Mrs. Kavita Rao" });
      } else {
        showToast(response.message || "Failed to log behaviour incident.");
      }
    } catch (err) {
      console.error(err);
      showToast("Error logging behaviour incident.");
    }
  };

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.recipient || !newMessage.body.trim()) return;
    try {
      showToast("Sending message to parent...");
      const response = await sendParentMessage({
        studentId: newMessage.recipient,
        subject: newMessage.subject || "Message from Class Teacher",
        body: newMessage.body
      });
      if (response.success) {
        showToast(`Message successfully sent to parent.`);
        fetchCommunicationLogs();
        setNewMessage({ recipient: "", subject: "", body: "" });
      } else {
        showToast(response.message || "Failed to send message.");
      }
    } catch (err) {
      console.error(err);
      showToast("Error sending message.");
    }
  };

  // Schedule meeting
  const handleScheduleMeeting = async () => {
    if (!newMeeting.student || !newMeeting.date) return;
    try {
      showToast("Scheduling PTM meeting...");
      const response = await scheduleParentMeeting({
        studentId: newMeeting.student,
        date: newMeeting.date,
        time: newMeeting.time,
        agenda: newMeeting.agenda
      });
      if (response.success) {
        showToast(`PTM meeting successfully scheduled.`);
        fetchCommunicationLogs();
        setNewMeeting({ student: "", date: "", time: "", agenda: "" });
      } else {
        showToast(response.message || "Failed to schedule PTM.");
      }
    } catch (err) {
      console.error(err);
      showToast("Error scheduling PTM.");
    }
  };

  // Document upload
  const handleUploadDoc = async () => {
    if (!uploadFileName.trim() || !uploadStudentId || !uploadFile) {
      showToast("Please choose a student, a file, and a file name.");
      return;
    }
    try {
      showToast("Uploading document...");
      const formData = new FormData();
      formData.append("studentId", uploadStudentId);
      formData.append("category", uploadCategory);
      formData.append("customFileName", uploadFileName);
      formData.append("file", uploadFile);

      const response = await uploadStudentDocument(formData);
      if (response.success) {
        showToast(`${uploadCategory} uploaded successfully.`);
        fetchDocuments();
        setUploadFileName("");
        setUploadStudentId("");
        setUploadFile(null);
      } else {
        showToast(response.message || "Failed to upload document.");
      }
    } catch (err) {
      console.error(err);
      showToast("Error uploading document.");
    }
  };

  const handleExportStudentList = () => {
    const headers = [["Roll No", "Student Name", "Class", "Section", "Parent Name", "Parent Phone", "Attendance %", "Overall Grade", "Status"]];
    const data = students.map(s => [
      s.rollNo, s.name, s.class, s.section, s.parentName, s.parentPhone, `${s.attendancePct}%`, s.overallGrade, s.status
    ]);
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "Student_List.xlsx");
  };

  const handleExportAttendanceSheet = () => {
    if (!bulkList.length) {
      showToast("No attendance data to export.");
      return;
    }
    const headers = [["Roll No", "Student Name", "Status Today"]];
    const data = bulkList.map(s => [
      s.rollNo, s.name, s.present ? "Present" : "Absent"
    ]);
    const ws = XLSX.utils.aoa_to_sheet([...headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "Attendance_Sheet.xlsx");
  };

  const handleExportAcademicSummary = () => {
    if (!examLedgerRows.length) {
      showToast("No academic data to export.");
      return;
    }
    const doc = new jsPDF();
    doc.setFillColor(34, 63, 116);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("GRAPHURA SCHOOL SYSTEM", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Class Academic Performance Summary Ledger", 105, 30, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Overall Exam Ledger", 20, 55);

    const tableBody = examLedgerRows.map(row => [
      row.rollNo, row.name, row.totalObtained, row.totalMarks, row.percentage, row.grade, row.rank
    ]);

    autoTable(doc, {
      startY: 65,
      head: [["Roll No", "Student Name", "Marks Obtained", "Total Marks", "Percentage", "Grade", "Rank"]],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [34, 63, 116] }
    });
    doc.save("Academic_Summary.pdf");
  };

  const handleExportBehaviourReports = () => {
    if (!behaviourLogs.length) {
      showToast("No behaviour logs to export.");
      return;
    }
    const doc = new jsPDF();
    doc.setFillColor(34, 63, 116);
    doc.rect(0, 0, 210, 40, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("GRAPHURA SCHOOL SYSTEM", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Student Behaviour & Incident logs", 105, 30, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("Behaviour Log Ledger", 20, 55);

    const tableBody = behaviourLogs.map(row => [
      row.date, row.student, row.type, row.description, row.actionTaken, row.reportedBy
    ]);

    autoTable(doc, {
      startY: 65,
      head: [["Date", "Student Name", "Category", "Incident Description", "Action Taken", "Reported By"]],
      body: tableBody,
      theme: "grid",
      headStyles: { fillColor: [34, 63, 116] }
    });
    doc.save("Behaviour_Incident_Reports.pdf");
  };

  // Exports triggered
  const handleReportExport = (reportType, format) => {
    if (reportType === "Student List") {
      handleExportStudentList();
    } else if (reportType === "Attendance Sheet") {
      handleExportAttendanceSheet();
    } else if (reportType === "Academic Summary") {
      handleExportAcademicSummary();
    } else if (reportType === "Behaviour Logs") {
      handleExportBehaviourReports();
    } else {
      showToast(`Downloading ${reportType} as ${format}...`);
    }
  };

  // Selected student sub logs
  const studentLogs = useMemo(() => {
    if (!selectedStudent) return { attendance: [], exams: [], behaviour: [], documents: [] };
    const name = selectedStudent.name;
    return {
      attendance: MOCK_ATTENDANCE_LOG,
      exams: MOCK_EXAM_DATA,
      behaviour: behaviourLogs.filter(b => b.student === name),
      documents: documents
    };
  }, [selectedStudent, behaviourLogs, documents]);

  // Bulk actions handlers
  const handleBulkMessage = (selectedRows) => {
    showToast(`Drafted parent message broadcast for ${selectedRows.length} students.`);
  };

  return (
    <div className="min-h-screen w-full p-4 sm:p-6 flex flex-col gap-6" style={{ background: T.cream, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Heading
        primaryText="Manage"
        secondaryText="Students"
        action={
          <button
            onClick={refreshData}
            disabled={loading}
            className="bg-white text-[#223F74] px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-gray-50 transition-all shadow border border-transparent hover:border-gray-200 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 border-b pb-2" style={{ borderColor: T.border }}>
        {[
          { key: "list", label: "Student List", icon: Users },
          { key: "attendance", label: "Attendance Module", icon: Clipboard },
          { key: "performance", label: "Performance Tracker", icon: FileBarChart },
          { key: "behaviour", label: "Behaviour Logs", icon: ShieldAlert },
          { key: "communication", label: "Communication Hub", icon: MessageSquare },
          { key: "documents", label: "Documents Center", icon: FolderOpen },
          { key: "alerts", label: "Alerts Panel", icon: Bell }
        ].map(t => {
          const active = activeTab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200"
              style={active ? { background: T.navy, color: "#fff", boxShadow: "0 6px 16px rgba(34,63,116,0.25)" } : { background: "#fff", color: T.textSecondary, border: `1px solid ${T.border}` }}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Real-time Toast Alerts Banner */}
      {toastMessage && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold text-white shadow-lg w-fit transition-all bg-[#223F74] border border-[#1a3360]">
          <Bell size={13} className="text-amber-300 animate-bounce" /> {toastMessage}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold text-white shadow-lg w-fit transition-all bg-rose-600 border border-rose-700">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
         TABS CONTENT PANELS
         ───────────────────────────────────────────────────────────────────────── */}

      {/* 1. STUDENT LIST TAB */}
      {activeTab === "list" && (
        <div className="flex flex-col gap-6">
          {/* Top Summary Cards */}
          <DashGrid cols={12} gap={4}>
            <DashCard
              title="Total Students"
              value={statsLoading ? "..." : String(stats.total)}
              icon={<Users size={20} />}
              accentColor={T.navy}
              size={2}
            />
            <DashCard
              title="Present Today"
              value={statsLoading ? "..." : String(stats.present)}
              icon={<UserCheck size={20} />}
              accentColor={T.green}
              size={2}
            />
            <DashCard
              title="Absent Today"
              value={statsLoading ? "..." : String(stats.absent)}
              icon={<UserX size={20} />}
              accentColor={T.rose}
              size={2}
            />
            <DashCard
              title="Avg Attendance"
              value={statsLoading ? "..." : `${stats.avg}%`}
              icon={<TrendingUp size={20} />}
              accentColor={T.blue}
              size={2}
            />
            <DashCard
              title="Low Attendance"
              value={statsLoading ? "..." : String(stats.lowAttendance)}
              icon={<AlertTriangle size={20} />}
              accentColor={T.amber}
              size={2}
            />
            <DashCard
              title="New Admissions"
              value={statsLoading ? "..." : String(stats.newAdmissions)}
              icon={<UserPlus size={20} />}
              accentColor={T.peach}
              size={2}
            />
          </DashGrid>

          {/* Student Table */}
          <div className="bg-white rounded-3xl border border-[#E7E2DB] p-5 flex flex-col gap-4 shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw size={32} className="text-[#223F74] animate-spin" />
                  <p className="text-sm text-[#6B7280]">Loading students data...</p>
                </div>
              </div>
            ) : (
              <DataTable
                title="Students Directory"
                rows={students}
                userProfile="name"
                columns={[
                  { key: "name", label: "Student Name" },
                  { key: "admNo", label: "Adm No." },
                  { key: "rollNo", label: "Roll No." },
                  { key: "class", label: "Class" },
                  { key: "parentName", label: "Parent Name" },
                  { key: "parentPhone", label: "Phone" },
                  {
                    key: "attendancePct",
                    label: "Attendance %",
                    render: (val) => (
                      <span className={`text-xs font-black ${val >= 90 ? "text-[#5B9A6A]" : val >= 75 ? "text-[#E0A04B]" : "text-[#D66B5F]"}`}>
                        {val}%
                      </span>
                    )
                  },
                  { key: "overallGrade", label: "Grade" },
                  {
                    key: "behaviourRating",
                    label: "Behaviour",
                    render: (val) => {
                      const styleMap = {
                        Excellent: "bg-emerald-100 text-emerald-700",
                        Good: "bg-blue-100 text-blue-700",
                        Fair: "bg-amber-100 text-amber-700",
                        "Needs Improvement": "bg-rose-100 text-rose-700"
                      };
                      return (
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${styleMap[val] ?? "bg-slate-100 text-slate-600"}`}>
                          {val}
                        </span>
                      );
                    }
                  },
                  { key: "status", label: "Status" }
                ]}
                filters={[
                  { title: "Class", type: "toggle", key: "class", options: ["7th", "8th", "9th", "10th", "11th", "12th"] },
                  { title: "Section", type: "toggle", key: "section", options: ["A", "B", "C", "D"] },
                  { title: "Gender", type: "toggle", key: "gender", options: ["Male", "Female"] },
                  { title: "Status", type: "toggle", key: "status", options: ["Active", "Inactive"] }
                ]}
                actions={[
                  {
                    icon: <Eye size={14} />,
                    tooltip: "View Profile",
                    variant: "ghost",
                    onClick: (row) => loadStudentDetailsAndOpen(row.id, "student-profile-modal")
                  },
                  {
                    icon: <Pencil size={14} />,
                    tooltip: "Edit details",
                    variant: "ghost",
                    onClick: (row) => loadStudentDetailsForEdit(row.id)
                  },
                  {
                    icon: <CalendarDays size={14} />,
                    tooltip: "Attendance Log",
                    variant: "ghost",
                    onClick: (row) => handleOpenAttendanceModal(row)
                  },
                  {
                    icon: <FileBarChart size={14} />,
                    tooltip: "Academic Report",
                    variant: "ghost",
                    onClick: (row) => handleOpenAcademicModal(row)
                  },
                  {
                    icon: <ShieldAlert size={14} />,
                    tooltip: "Behaviour file",
                    variant: "ghost",
                    onClick: (row) => loadStudentDetailsAndOpen(row.id, "behaviour-modal")
                  },
                  {
                    icon: <MessageSquare size={14} />,
                    tooltip: "Message parent",
                    variant: "ghost",
                    onClick: (row) => loadStudentDetailsAndOpen(row.id, "message-modal")
                  },
                  {
                    icon: <AlertTriangle size={14} />,
                    tooltip: "Raise complaint",
                    variant: "ghost",
                    onClick: (row) => loadStudentDetailsAndOpen(row.id, "complaint-modal")
                  },
                  {
                    icon: <FolderOpen size={14} />,
                    tooltip: "Documents",
                    variant: "ghost",
                    onClick: (row) => loadStudentDetailsAndOpen(row.id, "documents-modal")
                  }
                ]}
                bulkAction={true}
                bulkActions={[
                  { title: "Export list", icon: <Download size={13} />, onClick: () => handleReportExport("Student List", "CSV") },
                  { title: "Email Parents", icon: <Send size={13} />, onClick: handleBulkMessage }
                ]}
                exportable={true}
                exportFileName="Students_List"
              />
            )}
          </div>
        </div>
      )}

      {/* 2. ATTENDANCE MODULE TAB */}
      {activeTab === "attendance" && (
        <div className="bg-white rounded-3xl border border-[#E7E2DB] p-5 flex flex-col gap-5 shadow-sm">
          {/* Sub menu tabs */}
          <div className="flex flex-wrap gap-1.5 border-b pb-2">
            {[
              { key: "daily", label: "Daily Attendance Checklist" },
              { key: "bulk", label: "Bulk Marking Sheet" },
              { key: "calendar", label: "Monthly Calendar" },
              { key: "leave", label: "Leave Requests" },
              { key: "config", label: "Alert Config" }
            ].map(sub => (
              <button
                key={sub.key}
                onClick={() => setAttSubTab(sub.key)}
                className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-all ${attSubTab === sub.key ? "bg-[#223F74] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Sub panels */}
          {attSubTab === "daily" && (
            <div className="flex flex-col gap-4 text-left">
              <div className="w-56">
                <SelectField label="Select Class" value={attendanceClass} onChange={(e) => setAttendanceClass(e.target.value)}>
                  {assignedClasses.map(c => {
                    const key = `${c.classId}_${c.section}`;
                    return <Option key={key} value={key} label={`${c.className} - Section ${c.section}`} />;
                  })}
                </SelectField>
              </div>

              <DataTable
                title={`Daily Checklist : Class ${assignedClasses.find(c => `${c.classId}_${c.section}` === attendanceClass)?.className || ""} (${assignedClasses.find(c => `${c.classId}_${c.section}` === attendanceClass)?.section || ""})`}
                rows={attendanceStudents}
                columns={[
                  { key: "rollNo", label: "Roll" },
                  { key: "name", label: "Student Name" },
                  {
                    key: "status",
                    label: "Status",
                    render: (val, row) => {
                      const statusLabel = row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : "Unmarked";
                      const statusColor = row.status === "present" ? "bg-emerald-100 text-emerald-700" :
                                          row.status === "absent" ? "bg-rose-100 text-rose-700" :
                                          row.status === "late" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700";
                      return (
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${statusColor}`}>
                          {statusLabel}
                        </span>
                      );
                    }
                  },
                  {
                    key: "time",
                    label: "Clocked Time",
                    render: (val, row) => (
                      <span className="text-xs font-semibold text-slate-500">
                        {row.status === "present" || row.status === "late" ? "08:14 AM" : "—"}
                      </span>
                    )
                  },
                  {
                    key: "action",
                    label: "Action",
                    render: (val, row) => (
                      <div className="flex gap-1.5">
                        <button onClick={() => handleMarkSingleStudent(row.id, "present")} className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 text-[10px] font-bold hover:bg-emerald-100">Present</button>
                        <button onClick={() => handleMarkSingleStudent(row.id, "absent")} className="px-2 py-1 rounded bg-rose-50 text-rose-600 text-[10px] font-bold hover:bg-rose-100">Absent</button>
                        <button onClick={() => handleMarkSingleStudent(row.id, "late")} className="px-2 py-1 rounded bg-amber-50 text-amber-600 text-[10px] font-bold hover:bg-amber-100">Late</button>
                      </div>
                    )
                  }
                ]}
                pageSize={10}
                searchable={false}
              />
            </div>
          )}

          {attSubTab === "bulk" && (
            <div className="flex flex-col gap-4 text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Quick Switch Board (Today's Sheet)</span>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {bulkList.map((item, idx) => (
                  <div key={item.id} className="border p-3 rounded-2xl flex flex-col gap-2 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-400">Roll {item.rollNo}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${item.present ? "bg-emerald-500" : "bg-rose-500"}`} />
                    </div>
                    <p className="text-xs font-black text-slate-700 truncate">{item.name}</p>
                    <ToggleButton
                      checked={item.present}
                      onChange={(val) => {
                        const updated = [...bulkList];
                        updated[idx].present = val;
                        setBulkList(updated);
                      }}
                      label="Present"
                      labelOff="Absent"
                      size="sm"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button text="Mark All Present" variant="secondary" onClick={() => setBulkList(bulkList.map(b => ({ ...b, present: true })))} />
                <Button text="Submit Daily Sheet" onClick={handleBulkSubmit} />
              </div>
            </div>
          )}

          {attSubTab === "calendar" && (() => {
            const calendarYear = new Date().getFullYear();
            const calendarMonth = new Date().getMonth();
            const calendarMonthName = new Date().toLocaleString('default', { month: 'long' });
            const calendarFirstDay = new Date(calendarYear, calendarMonth, 1);
            const calendarStartDayOfWeek = calendarFirstDay.getDay();
            const calendarTotalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
            
            return (
              <div className="flex flex-col gap-4 text-left">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="text-sm font-black text-[#223F74]">
                    Attendance Heatmap Calendar ({calendarMonthName} {calendarYear}) — Class {assignedClasses.find(c => `${c.classId}_${c.section}` === attendanceClass)?.className || ""}
                  </h4>
                  <div className="flex gap-4 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Absent</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late/Half</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-200" /> Unmarked / Weekend</span>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2 max-w-xl text-center">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                    <span key={day} className="text-[10px] font-black uppercase text-slate-400 py-1">{day}</span>
                  ))}
                  
                  {/* Empty slots for month padding */}
                  {Array.from({ length: calendarStartDayOfWeek }).map((_, i) => <div key={`p-${i}`} />)}
                  
                  {/* Actual days */}
                  {Array.from({ length: calendarTotalDays }).map((_, idx) => {
                    const day = idx + 1;
                    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const dayRecord = calendarMonthReport.find(r => r.date === dateStr);
                    const isWeekend = new Date(calendarYear, calendarMonth, day).getDay() === 0 || new Date(calendarYear, calendarMonth, day).getDay() === 6;
                    
                    let dotColor = "bg-slate-200"; // Default: Unmarked
                    if (isWeekend) {
                      dotColor = "bg-slate-200 opacity-60";
                    } else if (dayRecord) {
                      if (dayRecord.absent > 0 && dayRecord.present === 0) {
                        dotColor = "bg-rose-500";
                      } else if (dayRecord.late > 0 && dayRecord.present === 0) {
                        dotColor = "bg-amber-500";
                      } else if (dayRecord.present > 0) {
                        dotColor = "bg-emerald-500";
                      }
                    }
                    
                    return (
                      <div key={day} className="border p-2 rounded-xl flex flex-col items-center justify-between min-h-[50px] bg-slate-50/50">
                        <span className="text-[10px] font-black text-slate-600">{day}</span>
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {attSubTab === "leave" && (
            <div className="text-left">
              <DataTable
                title="Leave Application Queue"
                rows={leaveRequests}
                columns={[
                  { key: "student", label: "Student" },
                  { key: "class", label: "Class Group" },
                  { key: "from", label: "From Date" },
                  { key: "to", label: "To Date" },
                  { key: "reason", label: "Reason description" },
                  { key: "status", label: "Approval Status" }
                ]}
                actions={[
                  {
                    icon: <CheckCircle2 size={13} className="text-emerald-600" />,
                    tooltip: "Approve",
                    show: (row) => row.status === "Pending",
                    onClick: (row) => handleLeaveAction(row.id, "Approved")
                  },
                  {
                    icon: <XCircle size={13} className="text-rose-600" />,
                    tooltip: "Decline",
                    show: (row) => row.status === "Pending",
                    onClick: (row) => handleLeaveAction(row.id, "Rejected")
                  }
                ]}
                pageSize={5}
                searchable={false}
              />
            </div>
          )}

          {attSubTab === "config" && (
            <div className="flex flex-col gap-5 text-left max-w-md">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Configure Auto-Alert Thresholds</span>
              <DataField
                label="Low Attendance Limit (%)"
                type="number"
                value={attendanceConfig.threshold}
                onChange={(e) => setAttendanceConfig({ ...attendanceConfig, threshold: Number(e.target.value) })}
              />
              <div className="flex flex-col gap-3 py-2">
                <ToggleButton
                  checked={attendanceConfig.notifyParent}
                  onChange={(val) => setAttendanceConfig({ ...attendanceConfig, notifyParent: val })}
                  label="Notify Parent automatically via Email/SMS"
                />
                <ToggleButton
                  checked={attendanceConfig.notifyStudent}
                  onChange={(val) => setAttendanceConfig({ ...attendanceConfig, notifyStudent: val })}
                  label="Notify Student automatically in Portal"
                />
                <ToggleButton
                  checked={attendanceConfig.showWarning}
                  onChange={(val) => setAttendanceConfig({ ...attendanceConfig, showWarning: val })}
                  label="Show Red Warning badge for low attendance"
                />
                <ToggleButton
                  checked={attendanceConfig.autoReport}
                  onChange={(val) => setAttendanceConfig({ ...attendanceConfig, autoReport: val })}
                  label="Auto-generate monthly Low Attendance lists"
                />
              </div>
              <div className="w-fit">
                <Button text="Save Configuration" onClick={() => showToast("Attendance Alert rules updated successfully.")} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. PERFORMANCE TRACKER TAB */}
      {activeTab === "performance" && (
        <div className="bg-white rounded-3xl border border-[#E7E2DB] p-5 flex flex-col gap-6 shadow-sm">
          {/* Class selector */}
          <div className="w-56 text-left">
            <SelectField label="Select Class" value={performanceClass} onChange={(e) => setPerformanceClass(e.target.value)}>
              {assignedClasses.map(c => {
                const key = `${c.classId}_${c.section}`;
                return <Option key={key} value={key} label={`${c.className} - Section ${c.section}`} />;
              })}
            </SelectField>
          </div>

          {/* Charts grid */}
          <DashGrid cols={12} gap={4}>
            <GColumnChart
              title="Class Average Marks by Subject"
              subtitle={`Class: ${assignedClasses.find(c => `${c.classId}_${c.section}` === performanceClass)?.className || ""} (${assignedClasses.find(c => `${c.classId}_${c.section}` === performanceClass)?.section || ""})`}
              data={subjectAveragesData}
              bars={[{ key: "value", color: T.navy }]}
              size={6}
              height={220}
            />

            <GLineChart
              title="Class Grade Point Average (GPA) Progression"
              subtitle="Academic Year 2026 Trend"
              data={performanceTrendList}
              lines={[{ key: "gpa", color: T.peach }]}
              size={6}
              height={220}
            />
          </DashGrid>

          {/* Table */}
          <div className="text-left mt-2">
            <DataTable
              title={`Overall Exam Ledger — Class ${assignedClasses.find(c => `${c.classId}_${c.section}` === performanceClass)?.className || ""} (${assignedClasses.find(c => `${c.classId}_${c.section}` === performanceClass)?.section || ""})`}
              rows={examLedgerRows}
              columns={[
                { key: "name", label: "Student Name" },
                { key: "rollNo", label: "Roll Number" },
                { key: "totalObtained", label: "Marks Obtained" },
                { key: "totalMarks", label: "Max Marks" },
                { key: "percentage", label: "Percentage" },
                { key: "grade", label: "Grade" },
                { key: "rank", label: "Class Rank" }
              ]}
              pageSize={10}
              searchable={true}
            />
          </div>
        </div>
      )}

      {/* 4. BEHAVIOUR LOGS TAB */}
      {activeTab === "behaviour" && (
        <div className="bg-white rounded-3xl border border-[#E7E2DB] p-5 flex flex-col gap-5 shadow-sm text-left">
          {/* Stat panel */}
          <DashGrid cols={12} gap={4}>
            <DashCard title="Positive Behaviours" value="14" icon={<ThumbsUp size={20} />} accentColor={T.green} size={3} />
            <DashCard title="Active Warnings" value="5" icon={<AlertCircle size={20} />} accentColor={T.amber} size={3} />
            <DashCard title="Complaints Registered" value="3" icon={<ThumbsDown size={20} />} accentColor={T.rose} size={3} />
            <DashCard title="Counselling Files" value="2" icon={<MessageCircle size={20} />} accentColor={T.blue} size={3} />
          </DashGrid>

          <div className="flex justify-end pt-2">
            <Button text="Add Behaviour incident Log" icon={<Plus size={14} />} onClick={() => openModal("add-behaviour-modal")} />
          </div>

          <DataTable
            title="Student Behaviour Incident Logs"
            rows={behaviourLogs}
            columns={[
              { key: "date", label: "Incident Date" },
              { key: "student", label: "Student" },
              { key: "type", label: "Type Log" },
              { key: "description", label: "Incident Details" },
              { key: "actionTaken", label: "Action Taken" },
              { key: "reportedBy", label: "Reported By" }
            ]}
            pageSize={5}
            searchable={true}
          />
        </div>
      )}

      {/* 5. COMMUNICATION HUB TAB */}
      {activeTab === "communication" && (
        <div className="bg-white rounded-3xl border border-[#E7E2DB] p-5 flex flex-col gap-6 shadow-sm text-left">
          <Grid cols={12} gap={5}>
            {/* Message compose form */}
            <div className="col-span-12 lg:col-span-6 border p-4 rounded-2xl flex flex-col gap-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Send Message to Parents</span>
              <div className="flex flex-col gap-3">
                <SelectField label="Select Recipient Student" value={newMessage.recipient} onChange={(e) => setNewMessage({ ...newMessage, recipient: e.target.value })}>
                  <Option value="" label="Select student parent..." />
                  {students.map(s => (
                    <Option key={s.id} value={s.id} label={`${s.name} (${s.parentName})`} />
                  ))}
                </SelectField>
                <DataField
                  label="Subject Title"
                  placeholder="Subject of message..."
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">Message Body</label>
                  <textarea
                    rows={3}
                    placeholder="Type details of update here..."
                    className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold focus:outline-none"
                    value={newMessage.body}
                    onChange={(e) => setNewMessage({ ...newMessage, body: e.target.value })}
                  />
                </div>
                <div className="w-fit">
                  <Button text="Send Mail / SMS" icon={<Send size={13} />} onClick={handleSendMessage} disabled={!newMessage.recipient || !newMessage.body.trim()} />
                </div>
              </div>
            </div>

            {/* PTM Scheduler */}
            <div className="col-span-12 lg:col-span-6 border p-4 rounded-2xl flex flex-col gap-4">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Schedule Parent-Teacher Meeting (PTM)</span>
              <div className="flex flex-col gap-3">
                <SelectField label="Student Profile" value={newMeeting.student} onChange={(e) => setNewMeeting({ ...newMeeting, student: e.target.value })}>
                  <Option value="" label="Choose student..." />
                  {students.map(s => (
                    <Option key={s.id} value={s.id} label={`${s.name} · ${s.class}`} />
                  ))}
                </SelectField>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Date</label>
                    <input type="date" className="border rounded-2xl px-3 py-2 text-xs font-semibold focus:outline-none" value={newMeeting.date} onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Time</label>
                    <input type="time" className="border rounded-2xl px-3 py-2 text-xs font-semibold focus:outline-none" value={newMeeting.time} onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">Agenda Brief</label>
                  <textarea
                    rows={2}
                    placeholder="E.g., Discuss academic performance and low attendance..."
                    className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold focus:outline-none"
                    value={newMeeting.agenda}
                    onChange={(e) => setNewMeeting({ ...newMeeting, agenda: e.target.value })}
                  />
                </div>
                <div className="w-fit">
                  <Button text="Schedule Meeting" icon={<Calendar size={13} />} onClick={handleScheduleMeeting} disabled={!newMeeting.student || !newMeeting.date} />
                </div>
              </div>
            </div>
          </Grid>

          {/* Outbox log */}
          <DataTable
            title="Communication Dispatch Logs"
            rows={messages}
            columns={[
              { key: "recipient", label: "Recipient Parent" },
              { key: "subject", label: "Subject" },
              { key: "message", label: "Message Content" },
              { key: "date", label: "Sent Timestamp" },
              { key: "status", label: "Status" }
            ]}
            pageSize={5}
            searchable={true}
          />
        </div>
      )}

      {/* 6. DOCUMENTS CENTER TAB */}
      {activeTab === "documents" && (
        <div className="bg-white rounded-3xl border border-[#E7E2DB] p-5 flex flex-col gap-5 shadow-sm text-left">
          <Grid cols={12} gap={4}>
            {/* Upload Section */}
            <div className="col-span-12 lg:col-span-4 border p-4 rounded-2xl flex flex-col gap-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Upload Student Files</span>
              <SelectField label="Select Recipient Student" value={uploadStudentId} onChange={(e) => setUploadStudentId(e.target.value)}>
                <Option value="" label="Select student..." />
                {students.map(s => <Option key={s.id} value={s.id} label={s.name} />)}
              </SelectField>
              <SelectField label="Document Category" value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                <Option value="Report Card" label="Report Card" />
                <Option value="Medical Certificate" label="Medical Certificate" />
                <Option value="Transfer Certificate" label="Transfer Certificate" />
                <Option value="Bonafide Certificate" label="Bonafide Certificate" />
                <Option value="ID Proof" label="ID Proof" />
              </SelectField>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">Select Document File</label>
                <input
                  type="file"
                  className="w-full text-xs font-semibold"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    setUploadFile(file);
                    if (file && !uploadFileName.trim()) {
                      setUploadFileName(file.name);
                    }
                  }}
                />
              </div>
              <DataField
                label="Custom File Name"
                placeholder="e.g. Yash_ID_Proof.pdf"
                value={uploadFileName}
                onChange={(e) => setUploadFileName(e.target.value)}
              />
              <div className="w-fit mt-1">
                <Button text="Upload Document File" icon={<Upload size={14} />} onClick={handleUploadDoc} disabled={!uploadFileName.trim() || !uploadStudentId || !uploadFile} />
              </div>
            </div>

            {/* Document Listing */}
            <div className="col-span-12 lg:col-span-8">
              <DataTable
                title="Class Document Folders"
                rows={documents}
                columns={[
                  { key: "name", label: "File Name" },
                  { key: "type", label: "Document Type" },
                  { key: "uploadDate", label: "Upload Date" },
                  { key: "size", label: "Size" },
                  { key: "status", label: "Status Verification" }
                ]}
                pageSize={5}
                searchable={true}
              />
            </div>
          </Grid>

          {/* Export Reports actions */}
          <div className="border-t pt-4 mt-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-3">Bulk Sheet Export Center</span>
            <div className="flex flex-wrap gap-2.5">
              <Button text="Export Student List (CSV)" icon={<FileSpreadsheet size={14} />} variant="secondary" onClick={() => handleReportExport("Student List", "CSV")} />
              <Button text="Attendance Sheet (Excel)" icon={<FileSpreadsheet size={14} />} variant="secondary" onClick={() => handleReportExport("Attendance Sheet", "Excel")} />
              <Button text="Academic Summary (PDF)" icon={<FileText size={14} />} variant="secondary" onClick={() => handleReportExport("Academic Summary", "PDF")} />
              <Button text="Behaviour & Incident Reports (PDF)" icon={<Printer size={14} />} variant="secondary" onClick={() => handleReportExport("Behaviour Logs", "PDF")} />
            </div>
          </div>
        </div>
      )}

      {/* 7. ALERTS PANEL TAB */}
      {activeTab === "alerts" && (
        <div className="bg-white rounded-3xl border border-[#E7E2DB] p-5 flex flex-col gap-4 shadow-sm text-left">
          <DataTable
            title="System Alert & Logs"
            rows={notifications}
            columns={[
              { key: "type", label: "Alert Type" },
              { key: "message", label: "Message details" },
              { key: "student", label: "Linked Student" },
              { key: "date", label: "Timestamp" },
              { key: "priority", label: "Priority" },
              { key: "status", label: "Status" }
            ]}
            filters={[
              { title: "Alert Category", type: "toggle", key: "type", options: ["New Complaint", "Complaint Reply", "New Notice", "Low Attendance"] }
            ]}
            pageSize={10}
            searchable={true}
          />
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
         MODALS (using Common Components Modal manager)
         ───────────────────────────────────────────────────────────────────────── */}

      {/* PROFILE VIEW MODAL */}
      <Modal id="student-profile-modal" title="Detailed Student Profile File" size="2xl" onClose={() => setSelectedStudent(null)}>
        {selectedStudent && (
          <div className="flex flex-col gap-6 text-left">
            <ModalProfile
              name={selectedStudent.name}
              subtitle={`Class ${selectedStudent.class} - Section ${selectedStudent.section} · Roll Number ${selectedStudent.rollNo}`}
              meta={`Admission Number: ${selectedStudent.admNo} · Status: ${selectedStudent.status}`}
            />

            <ModalGrid title="Personal Details" cols={3}>
              <ModalData label="Date of Birth" value={selectedStudent.dob} />
              <ModalData label="Gender" value={selectedStudent.gender} />
              <ModalData label="Blood Group" value={selectedStudent.bloodGroup} />
              <ModalData label="Permanent Address" value={selectedStudent.address} />
              <ModalData label="Date of Admission" value={selectedStudent.joiningDate} />
              <ModalData label="Profile Status" value={selectedStudent.status} />
            </ModalGrid>

            <ModalGrid title="Parent / Guardian Info" cols={2}>
              <ModalData label="Guardian Name" value={selectedStudent.parentName} />
              <ModalData label="Contact Phone" value={selectedStudent.parentPhone} />
              <ModalData label="Email Address" value={selectedStudent.parentEmail} />
              <ModalData label="Emergency Alert Relation" value="Father" />
            </ModalGrid>

            <ModalGrid title="Medical Information" cols={2}>
              <ModalData label="Medical History/Conditions" value={selectedStudent.medicalInfo} />
              <ModalData label="Blood Type Verified" value={selectedStudent.bloodGroup} />
            </ModalGrid>

            <ModalGrid title="Emergency Contact" cols={3}>
              <ModalData label="Contact Person" value={selectedStudent.emergencyContact?.name || "N/A"} />
              <ModalData label="Relation" value={selectedStudent.emergencyContact?.relation || "N/A"} />
              <ModalData label="Phone Number" value={selectedStudent.emergencyContact?.phone || "N/A"} />
            </ModalGrid>

            <ModalGrid title="School Transport" cols={3}>
              <ModalData label="Transport Mode" value={selectedStudent.transport?.mode || "N/A"} />
              <ModalData label="Assigned Route" value={selectedStudent.transport?.route || "N/A"} />
              <ModalData label="Bus vehicle Number" value={selectedStudent.transport?.busNo || "N/A"} />
            </ModalGrid>

            <ModalGrid title="Academic Summary" cols={3}>
              <ModalData label="Grade average" value={selectedStudent.overallGrade} />
              <ModalData label="Attendance Ratio" value={`${selectedStudent.attendancePct}%`} />
              <ModalData label="Behaviour Class Rating" value={selectedStudent.behaviourRating} />
            </ModalGrid>

            <ModalGrid title="Fee Ledger" cols={2}>
              <ModalData label="Billing status" value={selectedStudent.feeStatus} />
              <ModalData label="Pending Balance" value={selectedStudent.feeStatus === "Paid" ? "₹0.00" : selectedStudent.feeStatus === "Partial" ? "₹15,000.00" : "₹32,000.00"} />
            </ModalGrid>

            <div className="p-4 border rounded-2xl bg-slate-50 flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400">Verify File Attachments</span>
              <div className="flex gap-2">
                <span className="px-3 py-1.5 bg-white border rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <FileText size={13} /> AadhaarCard_Copy.pdf
                </span>
                <span className="px-3 py-1.5 bg-white border rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <FileText size={13} /> Admission_SignedForm.pdf
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button text="Edit Profile Details" variant="primary" onClick={() => { setEditStudent({ ...selectedStudent }); openModal("edit-student-modal"); }} />
              <Button text="Close Profile File" variant="ghost" onClick={() => closeModal("student-profile-modal")} />
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT STUDENT DETAILS MODAL */}
      <Modal id="edit-student-modal" title="Edit Student Variables" size="lg" onClose={() => setEditStudent(null)}>
        {editStudent && (
          <div className="flex flex-col gap-4 text-left">
            <Grid cols={12} gap={4}>
              <DataField label="Student Full Name" value={editStudent.name} onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })} size={6} />
              <DataField label="Class Group" value={editStudent.class} onChange={(e) => setEditStudent({ ...editStudent, class: e.target.value })} size={3} />
              <DataField label="Section Group" value={editStudent.section} onChange={(e) => setEditStudent({ ...editStudent, section: e.target.value })} size={3} />
              <DataField label="Roll Number" value={editStudent.rollNo} onChange={(e) => setEditStudent({ ...editStudent, rollNo: e.target.value })} size={4} />
              <DataField label="Parent/Guardian Name" value={editStudent.parentName} onChange={(e) => setEditStudent({ ...editStudent, parentName: e.target.value })} size={8} />
              <DataField label="Parent Phone" value={editStudent.parentPhone} onChange={(e) => setEditStudent({ ...editStudent, parentPhone: e.target.value })} size={6} />
              <DataField label="Parent Email Address" value={editStudent.parentEmail} onChange={(e) => setEditStudent({ ...editStudent, parentEmail: e.target.value })} size={6} />
              <div className="col-span-12">
                <DataField label="Home Address" value={editStudent.address} onChange={(e) => setEditStudent({ ...editStudent, address: e.target.value })} />
              </div>
            </Grid>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button text="Cancel" variant="secondary" onClick={() => closeModal("edit-student-modal")} />
              <Button text="Save Details" onClick={handleSaveEdit} />
            </div>
          </div>
        )}
      </Modal>

      {/* ATTENDANCE CALENDAR STATS MODAL */}
      <Modal id="attendance-modal" title="Student Attendance Ledger" size="lg" onClose={() => setSelectedStudent(null)}>
        {selectedStudent && (
          <div className="flex flex-col gap-5 text-left">
            <ModalProfile
              name={selectedStudent.name}
              subtitle={`Current Attendance Rate: ${selectedStudent.attendancePct}%`}
              meta={`Roll Number ${selectedStudent.rollNo} · Class ${selectedStudent.class}-${selectedStudent.section}`}
            />
            {/* KPI log counters */}
            <div className="grid grid-cols-5 gap-2">
              <div className="border p-3 rounded-2xl bg-emerald-50 text-center">
                <span className="block text-[10px] font-black uppercase text-emerald-700">Present</span>
                <span className="text-xl font-black text-emerald-900">17</span>
              </div>
              <div className="border p-3 rounded-2xl bg-rose-50 text-center">
                <span className="block text-[10px] font-black uppercase text-rose-700">Absent</span>
                <span className="text-xl font-black text-rose-900">1</span>
              </div>
              <div className="border p-3 rounded-2xl bg-amber-50 text-center">
                <span className="block text-[10px] font-black uppercase text-amber-700">Late</span>
                <span className="text-xl font-black text-amber-900">1</span>
              </div>
              <div className="border p-3 rounded-2xl bg-blue-50 text-center">
                <span className="block text-[10px] font-black uppercase text-blue-700">Half Day</span>
                <span className="text-xl font-black text-blue-900">1</span>
              </div>
              <div className="border p-3 rounded-2xl bg-slate-50 text-center">
                <span className="block text-[10px] font-black uppercase text-slate-700">Leave</span>
                <span className="text-xl font-black text-slate-900">0</span>
              </div>
            </div>

            <DataTable
              title={`Last 30 Days Clock In Logs — ${selectedStudent.name}`}
              rows={attendanceLog}
              columns={[
                { key: "date", label: "Date" },
                { key: "status", label: "Status" },
                { key: "time", label: "Clock Time" },
                { key: "remark", label: "Remarks log" }
              ]}
              pageSize={5}
              searchable={false}
            />
            <div className="flex justify-end border-t pt-3">
              <Button text="Close Window" variant="ghost" onClick={() => closeModal("attendance-modal")} />
            </div>
          </div>
        )}
      </Modal>

      {/* ACADEMIC MODAL */}
      <Modal id="academic-modal" title="Academic Evaluation Summary" size="xl" onClose={() => setSelectedStudent(null)}>
        {selectedStudent && (
          <div className="flex flex-col gap-6 text-left">
            <ModalProfile
              name={selectedStudent.name}
              subtitle={`Grade Point Average: ${selectedStudent.overallGrade} overall`}
              meta={`Admission No. ${selectedStudent.admNo}`}
            />
            {/* GPA chart */}
            <div className="border p-4 rounded-3xl bg-white shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-3">Academic Performance Progression</span>
              <div className="h-56">
                <GLineChart
                  title="GPA Progression Graph"
                  data={performanceTrend}
                  lines={[{ key: "gpa", color: T.navy }]}
                  size={12}
                  height={200}
                />
              </div>
            </div>

            <DataTable
              title="Academic Scorecard Records"
              rows={examData}
              columns={[
                { key: "exam", label: "Exam Type" },
                { key: "subject", label: "Subject" },
                { key: "maxMarks", label: "Max Marks" },
                { key: "obtained", label: "Marks Obtained" },
                { key: "grade", label: "Grade" },
                { key: "rank", label: "Rank In Class" }
              ]}
              pageSize={5}
              searchable={false}
            />
            <div className="flex justify-end border-t pt-3">
              <Button text="Close Report" variant="ghost" onClick={() => closeModal("academic-modal")} />
            </div>
          </div>
        )}
      </Modal>

      {/* BEHAVIOUR DETAILS MODAL */}
      <Modal id="behaviour-modal" title="Student Behaviour File" size="lg" onClose={() => setSelectedStudent(null)}>
        {selectedStudent && (
          <div className="flex flex-col gap-5 text-left">
            <ModalProfile
              name={selectedStudent.name}
              subtitle={`Incident Index Score: ${selectedStudent.behaviourRating}`}
              meta={`Roll Number ${selectedStudent.rollNo}`}
            />
            <DataTable
              title={`Logged Incident Reports for ${selectedStudent.name}`}
              rows={behaviourLogs.filter(b => b.student === selectedStudent.name)}
              columns={[
                { key: "date", label: "Date" },
                { key: "type", label: "Incident Type" },
                { key: "description", label: "Details" },
                { key: "actionTaken", label: "Actions Enforced" },
                { key: "reportedBy", label: "Reported By" }
              ]}
              pageSize={5}
              searchable={false}
            />
            <div className="flex justify-end border-t pt-3">
              <Button text="Close Incident Logs" variant="ghost" onClick={() => closeModal("behaviour-modal")} />
            </div>
          </div>
        )}
      </Modal>

      {/* MESSAGE PARENT MODAL */}
      <Modal id="message-modal" title="Compose Mail to Parent" size="md" onClose={() => setSelectedStudent(null)}>
        {selectedStudent && (
          <div className="flex flex-col gap-4 text-left">
            <ModalProfile
              name={selectedStudent.parentName}
              subtitle={`Parent / Guardian of ${selectedStudent.name}`}
              meta={`Email: ${selectedStudent.parentEmail} · Phone: ${selectedStudent.parentPhone}`}
            />
            <div className="flex flex-col gap-3">
              <DataField label="Subject Line" placeholder="e.g. Incomplete Classroom assignments..." value={newMessage.subject} onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">Message Body</label>
                <textarea
                  rows={4}
                  placeholder="Type the message body details here..."
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold focus:outline-none"
                  value={newMessage.body}
                  onChange={(e) => setNewMessage({ ...newMessage, body: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button text="Cancel" variant="secondary" onClick={() => { closeModal("message-modal"); setNewMessage({ recipient: "", subject: "", body: "" }); }} />
              <Button text="Send Message Now" onClick={() => {
                handleSendMessage();
                closeModal("message-modal");
              }} disabled={!newMessage.body.trim()} />
            </div>
          </div>
        )}
      </Modal>

      {/* RAISE COMPLAINT AGAINST STUDENT MODAL */}
      <Modal id="complaint-modal" title="Raise Incident File Against Student" size="md" onClose={() => setSelectedStudent(null)}>
        {selectedStudent && (
          <div className="flex flex-col gap-4 text-left">
            <ModalProfile
              name={selectedStudent.name}
              subtitle={`Roll ${selectedStudent.rollNo} · Class ${selectedStudent.class}-${selectedStudent.section}`}
              meta={`Admission No. ${selectedStudent.admNo}`}
            />
            <div className="flex flex-col gap-4">
              <SelectField label="Complaint Category" value={complaintForm.category} onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}>
                {["Misbehaviour", "Attendance", "Discipline", "Homework", "Classroom Behaviour", "Bullying", "Other"].map(opt => (
                  <Option key={opt} value={opt} label={opt} />
                ))}
              </SelectField>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">Description of Incident</label>
                <textarea
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#223F74] resize-none"
                  placeholder="Describe what occurred..."
                  value={complaintForm.description}
                  onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                />
              </div>
              <SelectField label="Incident Severity" value={complaintForm.severity} onChange={(e) => setComplaintForm({ ...complaintForm, severity: e.target.value })}>
                {["Low", "Medium", "High", "Critical"].map(opt => (
                  <Option key={opt} value={opt} label={opt} />
                ))}
              </SelectField>
              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={complaintForm.notifyParent} onChange={(e) => setComplaintForm({ ...complaintForm, notifyParent: e.target.checked })} className="accent-[#223F74]" />
                  Notify Parent
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={complaintForm.notifyAdmin} onChange={(e) => setComplaintForm({ ...complaintForm, notifyAdmin: e.target.checked })} className="accent-[#223F74]" />
                  Notify Admin
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button text="Cancel" variant="secondary" onClick={() => closeModal("complaint-modal")} />
              <Button text="Submit Report" onClick={handleRaiseComplaintSubmit} disabled={!complaintForm.description.trim()} />
            </div>
          </div>
        )}
      </Modal>

      {/* DOCUMENTS LIST MODAL */}
      <Modal id="documents-modal" title="Student Document Folder" size="lg" onClose={() => setSelectedStudent(null)}>
        {selectedStudent && (
          <div className="flex flex-col gap-4 text-left">
            <ModalProfile
              name={selectedStudent.name}
              subtitle={`Roll ${selectedStudent.rollNo} · Folder Category: Archive`}
              meta={`Admission No. ${selectedStudent.admNo}`}
            />
            <DataTable
              title="Verified Files & Certificates"
              rows={documents}
              columns={[
                { key: "name", label: "File Name" },
                { key: "type", label: "Document Type" },
                { key: "uploadDate", label: "Upload Date" },
                { key: "status", label: "Status" }
              ]}
              pageSize={5}
              searchable={false}
            />
            <div className="flex justify-end border-t pt-3">
              <Button text="Close Folder" variant="ghost" onClick={() => closeModal("documents-modal")} />
            </div>
          </div>
        )}
      </Modal>

      {/* ADD BEHAVIOUR LOG MODAL */}
      <Modal id="add-behaviour-modal" title="New Behaviour Incident Entry" size="md" onClose={() => setNewBehaviour({ student: "", type: "Warning", description: "", actionTaken: "", reportedBy: "Mrs. Kavita Rao" })}>
        <div className="flex flex-col gap-4 text-left">
          <SelectField label="Select Student" value={newBehaviour.student} onChange={(e) => setNewBehaviour({ ...newBehaviour, student: e.target.value })}>
            <Option value="" label="Select student..." />
            {students.map(s => <Option key={s.id} value={s.id} label={s.name} />)}
          </SelectField>
          <SelectField label="Log Category" value={newBehaviour.type} onChange={(e) => setNewBehaviour({ ...newBehaviour, type: e.target.value })}>
            {["Positive", "Warning", "Complaint", "Counselling", "Reward"].map(opt => (
              <Option key={opt} value={opt} label={opt} />
            ))}
          </SelectField>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">Incident Description</label>
            <textarea
              rows={3}
              placeholder="Provide details of incident..."
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-semibold focus:outline-none"
              value={newBehaviour.description}
              onChange={(e) => setNewBehaviour({ ...newBehaviour, description: e.target.value })}
            />
          </div>
          <DataField label="Action Enforced" placeholder="e.g. Verbal warning, phone call to parent" value={newBehaviour.actionTaken} onChange={(e) => setNewBehaviour({ ...newBehaviour, actionTaken: e.target.value })} />
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button text="Cancel" variant="secondary" onClick={() => closeModal("add-behaviour-modal")} />
            <Button text="Add Log Entry" onClick={handleAddBehaviourLog} disabled={!newBehaviour.student || !newBehaviour.description.trim()} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
