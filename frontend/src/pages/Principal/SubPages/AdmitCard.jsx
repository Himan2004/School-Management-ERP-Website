import { useEffect, useState, useCallback } from "react";
import { Eye, X, Check, Clock, Download, FileText } from "lucide-react";
import api from "../../../services/api";
import {
  Heading,
  SelectField,
  Option,
  DataTable,
  DashGrid,
  EnhancedDashCard,
} from "../../../components/shared/Common_Components";

const AdmitCard = () => {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [admitCards, setAdmitCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAdmitCard, setShowAdmitCard] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [stats, setStats] = useState({ totalStudents: 0, generatedCards: 0, pendingCards: 0 });

  const getSchoolId = () => {
    try {
      const directId = localStorage.getItem("schoolId");
      if (directId && directId !== "undefined" && directId !== "null") return directId;
      const userStr = localStorage.getItem("user");
      if (userStr && userStr !== "undefined") {
        const userObj = JSON.parse(userStr);
        return userObj?.schoolId || userObj?.school?._id || userObj?.school || userObj?.organization || null;
      }
    } catch (e) {
      console.error("Auth parsing error:", e);
    }
    return "use_token";
  };

  const schoolId = getSchoolId();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [classesResponse, statsResponse, examsResponse] = await Promise.all([
          api.get("/principal/students/classes"),
          api.get("/principal/admit-cards/stats"),
          api.get("/principal/exams/admit-card-eligible")
        ]);
        const { classes: cls } = classesResponse?.data?.data || {};
        const classList = cls || [];
        setClasses(classList);
        if (statsResponse.data?.success) {
          setStats(statsResponse.data.data);
        }
        if (examsResponse.data?.success) {
          setExams(examsResponse.data.data || []);
        }
      } catch (loadError) {
        setError("Failed to load exams, classes and statistics.");
        console.error(loadError);
      }
    };
    loadData();
  }, [schoolId]);

  useEffect(() => {
    if (!selectedClass) { setSections([]); setSelectedSection(""); return; }
    const selectedClassObj = classes.find((c) => c._id === selectedClass);
    if (selectedClassObj?.sections) {
      setSections(selectedClassObj.sections.map((sec) => ({ _id: sec, name: sec })));
    } else {
      setSections([{ _id: "A", name: "A" }]);
    }
  }, [selectedClass, classes]);

  const handleLoadStudents = useCallback(async () => {
    if (!selectedExam || !selectedClass) { setError("Please select exam and class"); return; }
    setLoading(true);
    setError("");
    try {
      const [response, statsResponse] = await Promise.all([
        api.get("/principal/admit-cards", {
          params: { classId: selectedClass, sectionId: selectedSection, scheduleId: selectedExam },
        }),
        api.get("/principal/admit-cards/stats", {
          params: { classId: selectedClass, sectionId: selectedSection, scheduleId: selectedExam },
        })
      ]);
      setAdmitCards(response.data?.data || []);
      if (statsResponse.data?.success) {
        setStats(statsResponse.data.data);
      }
      setIsLoaded(true);
    } catch (err) {
      setError("Failed to load admit cards: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }, [selectedExam, selectedClass, selectedSection]);

  const handleGenerateAll = () => {
    setToastMessage("Generation triggered! In a real app, this would generate a bulk PDF.");
    setTimeout(() => setToastMessage(""), 4000);
  };

  const handlePreviewAdmitCard = async (studentId) => {
    try {
      setPreviewLoading(true);
      setError("");
      const response = await api.get(`/principal/admit-card/${studentId}`);
      setPreviewData(response.data?.data);
      setShowAdmitCard(true);
    } catch (err) {
      setError("Failed to fetch specific admit card data.");
      console.error(err);
    } finally {
      setPreviewLoading(false);
    }
  };

  // DataTable columns
  const tableColumns = [
    { key: "studentName", label: "Student Name" },
    { key: "rollNumber", label: "Roll No", align: "center" },
    { key: "examCode", label: "Exam Code", align: "center" },
    { key: "classSection", label: "Class & Section", align: "center" },
    { key: "status", label: "Status", align: "center" },
  ];

  const tableRows = admitCards.map((card) => ({
    ...card,
    classSection: `${card.className} – ${card.section}`,
    _rawStatus: card.status,
  }));

  const tableActions = [
    {
      icon: <Eye size={14} />,
      tooltip: "Preview / Print",
      variant: "ghost",
      loading: (row) => previewLoading,
      onClick: (row) => handlePreviewAdmitCard(row.studentId),
    },
  ];

  // Derived KPIs
  const totalStudents = stats.totalStudents;
  const generatedCards = stats.generatedCards;
  const pendingCards = stats.pendingCards;

  return (
    <div className="pb-12 print:bg-white print:m-0 print:p-0">
      <div className="print:hidden">
        {/* Header */}
        <Heading primaryText="Admit Card" secondaryText="Generation" showAnimations size={12} />

        {/* KPI Cards */}
        <div className="mt-6 mb-6">
          <DashGrid cols={12} gap={4}>
            <EnhancedDashCard
              title="Total Students"
              value={String(totalStudents)}
              icon={<FileText size={20} />}
              accentColor="#223F74"
              size={4}
              showAnimations
            />
            <EnhancedDashCard
              title="Generated Cards"
              value={String(generatedCards)}
              icon={<Check size={20} />}
              accentColor="#22c55e"
              size={4}
              showAnimations
            />
            <EnhancedDashCard
              title="Pending Cards"
              value={String(pendingCards)}
              icon={<Clock size={20} />}
              accentColor="#F59B87"
              size={4}
              showAnimations
            />
          </DashGrid>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-sm p-5 sm:p-6 mb-6">
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-12 sm:col-span-3">
              <label className="block text-[11px] font-black text-[#8794A1] uppercase tracking-widest mb-2.5">Select Exam</label>
              <SelectField
                id="exam-select"
                value={selectedExam}
                onChange={(e) => { setSelectedExam(e.target.value); setIsLoaded(false); }}
                placeholder="Choose Exam"
                searchable={false}
              >
                {exams.map((exam) => (
                  <Option
                    key={exam._id}
                    value={exam._id}
                    label={`${exam.examStructure?.examName || "Exam"} – ${exam.class?.name || "Class"}`}
                  />
                ))}
              </SelectField>
            </div>

            <div className="col-span-12 sm:col-span-3">
              <label className="block text-[11px] font-black text-[#8794A1] uppercase tracking-widest mb-2.5">Select Class</label>
              <SelectField
                id="class-select"
                value={selectedClass}
                onChange={(e) => { setSelectedClass(e.target.value); setIsLoaded(false); }}
                placeholder="Choose Class"
                disabled={!selectedExam}
                searchable={false}
              >
                {classes.map((cls) => (
                  <Option key={cls._id} value={cls._id} label={cls.name} />
                ))}
              </SelectField>
            </div>

            <div className="col-span-12 sm:col-span-3">
              <label className="block text-[11px] font-black text-[#8794A1] uppercase tracking-widest mb-2.5">Select Section</label>
              <SelectField
                id="section-select"
                value={selectedSection}
                onChange={(e) => { setSelectedSection(e.target.value); setIsLoaded(false); }}
                placeholder="All Sections"
                disabled={!selectedClass}
                searchable={false}
              >
                <Option value="" label="All Sections" />
                {sections.map((sec) => (
                  <Option key={sec._id} value={sec._id} label={`Section ${sec.name}`} />
                ))}
              </SelectField>
            </div>

            <div className="col-span-12 sm:col-span-3 flex items-end">
              <button
                onClick={handleLoadStudents}
                disabled={!selectedClass || isLoaded || loading}
                className={`w-full h-[46px] rounded-[14px] font-bold text-sm transition-all active:scale-95 flex items-center justify-center ${selectedClass && !isLoaded && !loading
                    ? "bg-[#223F74] hover:bg-[#1b325c] text-white shadow-md shadow-[#223F74]/20"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
              >
                {loading ? "Loading..." : "Load Admit Cards"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Download toolbar */}
        {isLoaded && !loading && (
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleGenerateAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#F59B87] hover:bg-[#e08976] text-white font-bold rounded-xl text-sm shadow-md shadow-[#F59B87]/30 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              Download Selected (.PDF)
            </button>
            <p className="text-sm font-semibold text-slate-500">
              <span className="text-[#223F74] font-black">{admitCards.length}</span> records
            </p>
          </div>
        )}

        {/* DataTable */}
        {isLoaded && !loading && (
          <DataTable
            columns={tableColumns}
            rows={tableRows}
            actions={tableActions}
            pageSize={10}
            size={12}
            exportable
            exportFileName="admit-cards"
          />
        )}

        {/* Empty state */}
        {!isLoaded && !loading && (
          <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-[#223F74]/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-[#223F74]/40" />
            </div>
            <p className="text-slate-500 font-medium">Select exam, class and section, then click "Load Admit Cards"</p>
          </div>
        )}
      </div>

      {/* ── Printable Modal ── */}
      {showAdmitCard && previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto print:static print:bg-white print:p-0">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 print:shadow-none print:w-full print:max-w-none print:m-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 print:hidden">
              <h3 className="text-lg font-black text-[#223F74]">Admit Card Preview</h3>
              <button onClick={() => setShowAdmitCard(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div id="admit-card-printable-area" className="p-6 sm:p-8 overflow-y-auto max-h-[calc(100vh-200px)] print:overflow-visible print:max-h-none print:p-0">
              <div className="text-center mb-6 pb-6 border-b-2 border-gray-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center border border-gray-300">
                    <span className="text-gray-400 text-xs font-medium">LOGO</span>
                  </div>
                  <div className="text-center flex-1 px-4">
                    <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wider">{previewData.school.name}</h1>
                    <p className="text-xs text-gray-700 mt-1">
                      {previewData.school.address} | Ph: {previewData.school.phone}<br />
                      {previewData.school.email} | Board: {previewData.school.board || "CBSE Affiliated"}
                    </p>
                  </div>
                  <div className="w-16 h-16">
                    <img src={previewData.qrCode} alt="QR Code" className="w-full h-full object-contain" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mt-4 tracking-widest underline decoration-gray-400 underline-offset-4">ADMIT CARD</h2>
                <p className="text-sm font-semibold text-gray-700 mt-2">{previewData.examName} ({previewData.academicYear})</p>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6 pb-6 border-b border-gray-300">
                <div className="col-span-3 grid grid-cols-2 gap-y-4 gap-x-2 pr-4 border-r border-gray-300">
                  {[
                    ["Student Name", previewData.student.name],
                    ["Roll / Enrollment No.", `${previewData.student.rollNumber} / ${previewData.student.enrollmentNo || "N/A"}`],
                    ["Class & Section", `${previewData.student.class} - ${previewData.student.section}`],
                    ["Exam Code", previewData.examCode],
                    ["Father's Name", previewData.student.fatherName || "N/A"],
                    ["Date of Birth", previewData.student.dateOfBirth ? new Date(previewData.student.dateOfBirth).toLocaleDateString() : "N/A"],
                  ].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-bold text-gray-900">{val}</p>
                    </div>
                  ))}
                </div>
                <div className="col-span-1 flex flex-col items-center justify-center">
                  <div className="w-24 h-28 border-2 border-dashed border-gray-300 bg-gray-50 rounded flex items-center justify-center overflow-hidden mb-2">
                    {previewData.student.photo
                      ? <img src={previewData.student.photo} alt="Student" className="w-full h-full object-cover" />
                      : <span className="text-gray-400 text-[10px] text-center px-2">Paste recent passport size photograph</span>
                    }
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-bold text-gray-900 mb-3 bg-gray-100 py-1 px-2 border-l-4 border-gray-800">Examination Schedule</p>
                <table className="w-full text-sm border-collapse border border-gray-800">
                  <thead>
                    <tr className="bg-gray-100 text-gray-900">
                      {["Date", "Subject", "Timing", "Room / Venue", "Max Marks"].map((h) => (
                        <th key={h} className="border border-gray-800 px-3 py-2 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.subjects.map((slot, idx) => (
                      <tr key={idx}>
                        <td className="border border-gray-800 px-3 py-2 font-medium">{slot.date ? new Date(slot.date).toLocaleDateString("en-GB") : "TBD"}</td>
                        <td className="border border-gray-800 px-3 py-2 font-bold">{slot.name} ({slot.code})</td>
                        <td className="border border-gray-800 px-3 py-2">{slot.startTime} - {slot.endTime}</td>
                        <td className="border border-gray-800 px-3 py-2">{slot.venue}</td>
                        <td className="border border-gray-800 px-3 py-2 text-center">{slot.maxMarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mb-8 p-4 bg-gray-50 border border-gray-800 rounded">
                <p className="text-sm font-bold text-gray-900 mb-2">Important Instructions to Candidates:</p>
                <ol className="text-xs text-gray-800 space-y-1.5 list-decimal list-outside ml-4">
                  <li>Please check that the details printed on the admit card are correct. Report discrepancies immediately.</li>
                  <li>Candidates must carry this printout of the Admit Card to the Examination Centre.</li>
                  <li>Candidates are required to report at the Examination Centre at least 30 minutes before the exam time.</li>
                  <li>Mobile phones, smartwatches, calculators, and other electronic gadgets are strictly prohibited.</li>
                  <li>No candidate shall be allowed to leave the examination hall before the conclusion of the test.</li>
                </ol>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-12 pb-4">
                <div className="text-center">
                  <div className="border-t-2 border-gray-400 w-3/4 mx-auto pt-2">
                    <p className="text-xs font-semibold text-gray-800">Candidate's Signature</p>
                  </div>
                </div>
                <div className="text-center flex flex-col items-center justify-end">
                  <div className="w-16 h-16 border-2 border-[#223F74] rounded-full flex items-center justify-center opacity-40 mb-2">
                    <span className="text-[8px] text-[#223F74] text-center leading-tight">School<br />Seal</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t-2 border-gray-400 w-3/4 mx-auto pt-2">
                    <p className="text-xs font-semibold text-gray-800">Principal's Signature</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl print:hidden">
              <button
                onClick={() => setShowAdmitCard(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-2.5 bg-[#F59B87] hover:bg-[#e08976] text-white font-bold rounded-xl transition-all shadow-md shadow-[#F59B87]/30 active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" /> Save as PDF / Print
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 left-6 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold z-50 print:hidden">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default AdmitCard;
