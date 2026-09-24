
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Eye,
  Download,
  Printer,
  GraduationCap,
  Award,
  BookOpen,
  Hash,
  Loader2,
} from "lucide-react";
import {
  Button,
  DataTable,
  Modal,
  ModalProfile,
  ModalGrid,
  ModalData,
  Heading,
  DashGrid,
  DashCard,
  openModal,
  closeModal,
} from "../../components/shared/Common_Components";
import { studentApi } from "../../services/api/studentApi";

// ─────────────────────────────────────────────────────────────────────────────
// THEME
// Single source of truth for the KPI/icon-chip blue so every card
// (top strip + Mid/End Term summary cards) stays visually consistent.
// ─────────────────────────────────────────────────────────────────────────────
const ACCENT_BLUE = "#223F74";
const ACCENT_BLUE_BG = "#EAF0F7"; // light tint of ACCENT_BLUE for icon chips

// ─────────────────────────────────────────────────────────────────────────────
// Result pill — same emerald/rose palette the shared DataTable uses for its
// built-in STATUS_MAP badges (kept local only because "Pass"/"Fail" aren't
// in that map, so DataTable's auto-detection can't be relied on here).
// ─────────────────────────────────────────────────────────────────────────────
const ResultPill = ({ status }) => {
  const isPass = String(status).toLowerCase() === "pass";
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold ${
        isPass ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
      }`}
    >
      {status}
    </span>
  );
};

// Build DataTable columns for a given exam type (shared by the on-page table
// and the read-only table rendered inside the official preview Modal).
const buildSubjectColumns = (examType) => {
  const showEndTerm = examType === "end";
  const cols = [
    { key: "code", label: "Code" },
    { key: "name", label: "Subject" },
    { key: "credits", label: "Credits", align: "center" },
    { key: "internal", label: "Internal", align: "center" },
    { key: "midTerm", label: "Mid Term", align: "center" },
  ];
  if (showEndTerm) {
    cols.push({ key: "endTerm", label: "End Term", align: "center" });
  }
  cols.push(
    {
      key: "total",
      label: "Total",
      align: "center",
      sortValue: (row) => row.internal + row.midTerm + (showEndTerm ? row.endTerm : 0),
      render: (_, row) => row.internal + row.midTerm + (showEndTerm ? row.endTerm : 0),
    },
    { key: "grade", label: "Grade", align: "center" },
    {
      key: "result",
      label: "Result",
      align: "center",
      render: (v) => <ResultPill status={v} />,
    },
  );
  return cols;
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentMarksheetPage() {
  const [student, setStudent] = useState(null);
  const [midData, setMidData] = useState(null);
  const [endData, setEndData] = useState(null);
  const [activeTab, setActiveTab] = useState("mid"); // "mid" | "end" — feeds the on-page table
  const [previewExam, setPreviewExam] = useState(null); // "mid" | "end" | null — feeds the Modal

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await studentApi.getMarksheet();
      if (response.success && response.data) {
        const { student: studentInfo, terms } = response.data;
        setStudent(studentInfo || {});
        setMidData(terms?.mid ? { ...terms.mid, examType: 'mid' } : null);
        setEndData(terms?.final ? { ...terms.final, examType: 'end' } : null);
        
        // Default to whichever tab has data available
        if (!terms?.mid && terms?.final) {
          setActiveTab("end");
        }
      } else {
        throw new Error("Invalid response format from marksheet API");
      }
    } catch (err) {
      setError(err.message || "Something went wrong while loading the marksheet.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const activeData = activeTab === "mid" ? midData : endData;
  const previewData = previewExam ? (previewExam === "mid" ? midData : endData) : null;

  const handleView = (examType) => {
    setPreviewExam(examType);
    openModal("marksheet-preview");
  };

  const handleDownload = (examType) => {
    setPreviewExam(examType);
    openModal("marksheet-preview");
    setTimeout(() => window.print(), 300);
  };

  const handlePrint = () => window.print();

  const activeColumns = useMemo(
    () => buildSubjectColumns(activeTab),
    [activeTab],
  );
  const previewColumns = useMemo(
    () => buildSubjectColumns(previewExam),
    [previewExam],
  );

  const totalCreditsPreview = previewData
    ? previewData.subjects.reduce((sum, s) => sum + (s.credits || 4), 0)
    : 0;

  const totalCreditsEarned = useMemo(() => {
    const midCredits = midData?.subjects?.reduce((sum, s) => sum + (s.credits || 4), 0) || 0;
    const endCredits = endData?.subjects?.reduce((sum, s) => sum + (s.credits || 4), 0) || 0;
    return endCredits || midCredits || 0;
  }, [midData, endData]);

  // ───────────────────────────────────────────────────────────────────────
  // Loading / error states
  // ───────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#FAFAF9" }}>
        <div className="flex flex-col items-center gap-3 text-[#223F74]">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm font-semibold">Loading marksheet…</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#FAFAF9" }}>
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm font-semibold text-rose-600">
            {error || "Unable to load marksheet data."}
          </p>
          <Button text="Retry" variant="primary" size={4} onClick={loadAll} />
        </div>
      </div>
    );
  }

  const hasMarksheet = midData || endData;
  if (!hasMarksheet) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ background: "#FAFAF9" }}>
        <div className="max-w-6xl mx-auto flex flex-col gap-6">
          <Heading primaryText="Marksheet" secondaryText="Overview" size={12} />
          <div className="bg-white rounded-[24px] p-8 text-center" style={{ border: "1px solid #E7E2DB", boxShadow: "0 6px 20px rgba(0,0,0,.06)" }}>
            <GraduationCap size={48} className="mx-auto text-slate-400 mb-3" />
            <h3 className="text-lg font-bold text-[#223F74]">No Marksheets Published</h3>
            <p className="text-sm text-slate-500 mt-1">Your term examinations marksheets have not been published by the administration yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ background: "#FAFAF9" }}>
      {/* Print-only styling: when printing, show ONLY the marksheet document */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #marksheet-print-area, #marksheet-print-area * { visibility: visible; }
          #marksheet-print-area { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Page banner — mirrors the "Homework Tracker" style Heading */}
        <Heading primaryText="Marksheet" secondaryText="Overview" size={12} />

        {/* KPI strip — solid project-blue cards (ACCENT_BLUE) */}
        <DashGrid cols={12} gap={4}>
          <DashCard
            title="CGPA"
            value={String(endData?.cgpa || midData?.cgpa || 'N/A')}
            icon={<GraduationCap size={22} />}
            accentColor={ACCENT_BLUE}
            iconBg="rgba(255,255,255,0.18)"
            style={{ background: ACCENT_BLUE, color: "#FFFFFF" }}
            className="!bg-[#223F74] [&_*]:!text-white"
            size={3}
          />
          <DashCard
            title="Latest SGPA"
            value={String(endData?.sgpa || midData?.sgpa || 'N/A')}
            icon={<Award size={22} />}
            accentColor={ACCENT_BLUE}
            iconBg="rgba(255,255,255,0.18)"
            style={{ background: ACCENT_BLUE, color: "#FFFFFF" }}
            className="!bg-[#223F74] [&_*]:!text-white"
            size={3}
          />
          <DashCard
            title="Overall %"
            value={endData ? `${endData.percentage}%` : (midData ? `${midData.percentage}%` : 'N/A')}
            icon={<BookOpen size={22} />}
            accentColor={ACCENT_BLUE}
            iconBg="rgba(255,255,255,0.18)"
            style={{ background: ACCENT_BLUE, color: "#FFFFFF" }}
            className="!bg-[#223F74] [&_*]:!text-white"
            size={3}
          />
          <DashCard
            title="Credits Earned"
            value={String(totalCreditsEarned)}
            icon={<Hash size={22} />}
            accentColor={ACCENT_BLUE}
            iconBg="rgba(255,255,255,0.18)"
            style={{ background: ACCENT_BLUE, color: "#FFFFFF" }}
            className="!bg-[#223F74] [&_*]:!text-white"
            size={3}
          />
        </DashGrid>

        {/* Mid Term / End Term summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[midData, endData].filter(Boolean).map((data) => (
            <div
              key={data.examType}
              className="bg-white rounded-[24px] p-5 sm:p-6 flex flex-col gap-4"
              style={{ border: "1px solid #E7E2DB", boxShadow: "0 6px 20px rgba(0,0,0,.06)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: ACCENT_BLUE_BG, color: ACCENT_BLUE }}
                  >
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#223F74] leading-tight">{data.name || data.label}</h3>
                    <p className="text-xs font-semibold text-[#6B7280] mt-0.5">
                      Semester {data.semester} · {data.academicYear}
                    </p>
                  </div>
                </div>
                <ResultPill status={data.grade ? 'Pass' : 'N/A'} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl px-4 py-3" style={{ background: "#F4F7FB" }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7280]">Overall %</p>
                  <p className="text-xl font-black text-[#223F74] mt-1">{data.percentage || data.overallPercentage}%</p>
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ background: "#F4F7FB" }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B7280]">SGPA</p>
                  <p className="text-xl font-black text-[#223F74] mt-1">{data.sgpa}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button text="View" icon={<Eye size={15} />} variant="secondary" size={5} onClick={() => handleView(data.examType)} />
                <Button text="Download PDF" icon={<Download size={15} />} variant="primary" size={7} onClick={() => handleDownload(data.examType)} />
              </div>
            </div>
          ))}
        </div>

        {/* Subject-wise Performance — fully driven by the shared DataTable */}
        {activeData && (
          <DataTable
            title="Subject-wise Performance"
            columns={activeColumns}
            rows={activeData.subjects || []}
            size={12}
            pageSize={10}
            searchable={true}
            exportable={true}
            exportFileName={`marksheet-${activeTab}`}
            headerAction={
              <div className="flex flex-wrap items-center gap-2">
                {midData && <Button text="Mid Term" variant={activeTab === "mid" ? "primary" : "secondary"} size={4} onClick={() => setActiveTab("mid")} />}
                {endData && <Button text="End Term" variant={activeTab === "end" ? "primary" : "secondary"} size={4} onClick={() => setActiveTab("end")} />}
                <Button text="View" icon={<Eye size={15} />} variant="secondary" size={3} onClick={() => handleView(activeTab)} />
                <Button text="Download" icon={<Download size={15} />} variant="secondary" size={4} onClick={() => handleDownload(activeTab)} />
              </div>
            }
          />
        )}
      </div>

      {/* Official marksheet preview / print surface — the shared Modal */}
      <Modal id="marksheet-preview" title={previewData ? `${previewData.name || previewData.label} Marksheet Preview` : "Marksheet Preview"} size="2xl">
        {previewData && (
          <div id="marksheet-print-area" className="flex flex-col gap-5">
            <ModalProfile
              name={student?.name || ""}
              subtitle={`${student?.class || 'N/A'} · Semester ${previewData.semester || 'N/A'}`}
              meta={`Admission No. ${student?.admissionNo || 'N/A'} · Roll No. ${student?.rollNo || 'N/A'} · Year ${student?.academicYear || 'N/A'}`}
            />
            <ModalGrid title="Result Summary" cols={3}>
              <ModalData label="Academic Year" value={previewData.academicYear} />
              <ModalData label="SGPA" value={previewData.sgpa} />
              <ModalData label="CGPA" value={previewData.cgpa} />
              <ModalData label="Percentage" value={`${previewData.percentage || previewData.overallPercentage}%`} />
              <ModalData label="Credits Earned" value={totalCreditsPreview} />
              <ModalData label="Final Result" value={previewData.grade || 'N/A'} />
            </ModalGrid>
            <DataTable
              title="Subject-wise Marks"
              columns={previewColumns}
              rows={previewData.subjects || []}
              size={12}
              searchable={false}
              hidePagination={true}
              hideRecordSummary={true}
              pageSize={previewData.subjects?.length || 10}
            />
            <p className="text-xs font-medium text-[#6B7280]">
              Generated on {previewData.generatedOn || new Date().toLocaleDateString()} · Office of the Controller of Examinations
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button text="Close" variant="secondary" size={3} onClick={() => closeModal("marksheet-preview")} />
              <Button text="Print" icon={<Printer size={15} />} variant="primary" size={3} onClick={handlePrint} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}