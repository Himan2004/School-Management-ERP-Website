import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Edit2, Eye, Trophy, Users, CheckCircle, XCircle, TrendingUp } from "lucide-react";
import {
  Grid, Heading, DashGrid, EnhancedDashCard, SelectField, Option, Button, DataTable,
  Modal, openModal, closeModal, ModalGrid, ModalData, GColumnChart,
} from "../../../components/shared/Common_Components";
import { getPrincipalExamSchedules ,getPrincipalMarksheets} from "../../../services/api/principalExamApi";

const GRADE_SCALE = [
  { range: [90, 100], grade: "A+" }, { range: [80, 89],  grade: "A"  },
  { range: [70, 79],  grade: "B+" }, { range: [60, 69],  grade: "B"  },
  { range: [50, 59],  grade: "C"  }, { range: [40, 49],  grade: "D"  },
  { range: [0,  39],  grade: "F"  },
];

const getGrade       = (pct) => (GRADE_SCALE.find((e) => pct >= e.range[0] && pct <= e.range[1]) ?? { grade: "F" }).grade;
const getStudentName = (m)   => m.student?.name || m.student?.user?.name || m.studentName || "Student";
const getStudentRoll = (m, i)=> m.rollNumber || m.student?.rollNumber || m.student?.rollNo || i + 1;
const getClassLabel  = (m)   => m.class?.name || m.class?.className || m.class || "Class";
const getSectionLabel= (m)   => m.section || m.examSchedule?.section || "";

const GRADE_BADGE = {
  "A+": "bg-emerald-100 text-emerald-700", "A":  "bg-emerald-100 text-emerald-700",
  "B+": "bg-teal-100   text-teal-700", "B":  "bg-blue-100   text-blue-700",
  "C":  "bg-amber-100  text-amber-700", "D":  "bg-amber-100  text-amber-700",
  "F":  "bg-rose-100   text-rose-700",
};

const MEDAL = [
  { label: "Gold",   bg: "bg-amber-50",  border: "border-amber-300",  icon: "🥇" },
  { label: "Silver", bg: "bg-slate-50",  border: "border-slate-300",  icon: "🥈" },
  { label: "Bronze", bg: "bg-orange-50", border: "border-orange-300", icon: "🥉" },
];

const Results = () => {
  const [pendingResults,     setPendingResults]     = useState([]);
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [selectedExam,       setSelectedExam]       = useState("");
  const [selectedClass,      setSelectedClass]      = useState("");
  const [selectedSection,    setSelectedSection]    = useState("");
  const [isLoaded,           setIsLoaded]           = useState(false);
  const [isApproved,         setIsApproved]         = useState(false);
  const [loadingPage,        setLoadingPage]        = useState(false);
  const [loadingResults,     setLoadingResults]     = useState(false);
  const [error,              setError]              = useState("");
  const [toastMessage,       setToastMessage]       = useState("");
  const [toastType,          setToastType]          = useState("success");
  const [selectedStudent,    setSelectedStudent]    = useState(null);

  const getSchoolId = () => {
    let sid = localStorage.getItem("schoolId");
    if (!sid || sid === "undefined") {
      try { sid = JSON.parse(localStorage.getItem("user"))?.schoolId; } catch(e) {}
    }
    return sid;
  };
  const schoolId = getSchoolId();

  const showToast = (msg, type = "success") => {
    setToastMessage(msg); setToastType(type);
    setTimeout(() => setToastMessage(""), 4000);
  };

  useEffect(() => {
    setLoadingPage(true);
    getPrincipalExamSchedules()
      .then((res) => { 
          if (res.success && res.data) {
              setAvailableSchedules(res.data); 
          }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingPage(false));
  }, []);

  const source = availableSchedules.length > 0 ? availableSchedules : pendingResults;

  const examOptions = useMemo(() => {
    const map = new Map();
    source.forEach((s) => {
      const id = String(s._id || s.id || s.examScheduleId || "");
      if (!id || map.has(id)) return;
      
      const className = s.class?.name || s.class?.className || "Class";
      const name = `${s.examStructure?.examName || s.name || "Exam"} - ${className}${s.section ? ` - Sec ${s.section}` : ""}`;
      map.set(id, { id, name });
    });
    return Array.from(map.values());
  }, [source]);

  const classOptions = useMemo(() => {
    const map = new Map();
    const filtered = selectedExam ? source.filter((s) => String(s._id || s.id || "") === selectedExam) : source;
    filtered.forEach((s) => {
      const id = String(s.class?._id || s.class?.id || s.class || "");
      if (!id || map.has(id)) return;
      map.set(id, { id, name: s.class?.name || s.class?.className || getClassLabel(s) });
    });
    return Array.from(map.values());
  }, [source, selectedExam]);

  const sectionOptions = useMemo(() => {
    const map = new Map();
    source
      .filter((s) => !selectedClass || String(s.class?._id || s.class?.id || s.class || "") === selectedClass)
      .forEach((s) => {
        const sec = s.section || s.examSchedule?.section || "A";
        if (!map.has(sec)) map.set(sec, sec);
      });
    return Array.from(map.values());
  }, [source, selectedClass]);

  const filteredResults = useMemo(() =>
    pendingResults.filter((m) => {
      const schedId = String(m.examSchedule?._id || m.examSchedule || m.examScheduleId || "");
      const classId = String(m.class?._id || m.class || "");
      const section = getSectionLabel(m);
      if (selectedExam    && schedId !== selectedExam)    return false;
      if (selectedClass   && classId !== selectedClass)   return false;
      if (selectedSection && section !== selectedSection) return false;
      return true;
    }),
  [pendingResults, selectedExam, selectedClass, selectedSection]);

  const subjectColumns = useMemo(() => {
    const first = filteredResults[0];
    if (!first?.subjectMarks?.length) return [];
    return first.subjectMarks.map((e) => ({
      key:      String(e.subject?._id || e.subject || e.subjectName || e.subjectCode || ""),
      label:    e.subject?.subjectName || e.subject?.name || e.subject?.subjectCode || "Subject",
      maxMarks: e.maxMarks || 100,
    }));
  }, [filteredResults]);

  const studentsWithStats = useMemo(() => {
    if (!isLoaded) return [];
    return filteredResults
      .map((m, i) => {
        const total    = m.totalMarksObtained ?? (m.subjectMarks || []).reduce((s, e) => s + (e.totalMarks || 0), 0);
        const maxMarks = m.totalMaxMarks       || (m.subjectMarks || []).reduce((s, e) => s + (e.maxMarks  || 0), 0);
        const pct      = maxMarks > 0 ? (total / maxMarks) * 100 : 0;
        const grade    = m.overallGrade || getGrade(pct);
        const result   = pct >= 40 ? "Pass" : pct >= 30 ? "Compartment" : "Fail";
        return {
          ...m,
          rollNo:       getStudentRoll(m, i),
          studentName:  getStudentName(m),
          totalMarks:   total,
          totalMaxMarks: maxMarks,
          percentage:   parseFloat(pct.toFixed(2)),
          grade,
          result,
          status: result,
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .map((s, i) => ({ ...s, rank: i + 1 }));
  }, [isLoaded, filteredResults]);

  const summary = useMemo(() => {
    if (!isLoaded || !studentsWithStats.length) return null;
    const pass        = studentsWithStats.filter((s) => s.result === "Pass").length;
    const fail        = studentsWithStats.filter((s) => s.result === "Fail").length;
    const compartment = studentsWithStats.filter((s) => s.result === "Compartment").length;
    const avgPct      = studentsWithStats.reduce((s, m) => s + m.percentage, 0) / studentsWithStats.length;
    return { total: studentsWithStats.length, pass, fail, compartment, average: avgPct.toFixed(1) };
  }, [isLoaded, studentsWithStats]);

  const topPerformers = useMemo(() => studentsWithStats.slice(0, 3), [studentsWithStats]);

  const chartData = useMemo(() => {
    if (!isLoaded || !studentsWithStats.length || !subjectColumns.length) return [];
    return subjectColumns.map((sub) => {
      const avg = studentsWithStats.reduce((sum, s) => {
        const entry = s.subjectMarks?.find(
          (mk) => String(mk.subject?._id || mk.subject || mk.subjectName || mk.subjectCode || "") === sub.key
        );
        return sum + (entry?.totalMarks || 0);
      }, 0) / studentsWithStats.length;
      return { name: sub.label.substring(0, 12), average: parseFloat(avg.toFixed(1)) };
    });
  }, [isLoaded, studentsWithStats, subjectColumns]);

  const tableColumns = useMemo(() => [
    { key: "rank",        label: "Rank",    width: "60px", align: "center", render: (v) => <span className="font-black text-[#223F74]">#{v}</span> },
    { key: "rollNo",      label: "Roll No", width: "80px" },
    { key: "studentName", label: "Student" },
    ...subjectColumns.map((sub) => ({
      key:   `sub_${sub.key}`,
      label: sub.label.substring(0, 10),
      align: "center",
      render: (_, row) => {
        const entry = row.subjectMarks?.find((mk) => String(mk.subject?._id || mk.subject || mk.subjectName || mk.subjectCode || "") === sub.key);
        const marks = entry?.totalMarks ?? 0;
        const fail  = marks < 40;
        return <span className={`text-xs font-bold ${fail ? "text-rose-600" : "text-[#1D1D1F]"}`}>{marks}/{sub.maxMarks}</span>;
      },
    })),
    { key: "totalMarks",  label: "Total",  align: "center", render: (_, row) => `${row.totalMarks}/${row.totalMaxMarks}` },
    { key: "percentage",  label: "%",      align: "center", render: (v) => <span className="font-bold text-[#223F74]">{v}%</span> },
    { key: "grade", label: "Grade", align: "center", render: (v) => <span className={`px-3 py-1 rounded-full text-xs font-bold ${GRADE_BADGE[v] ?? "bg-slate-100 text-slate-600"}`}>{v}</span> },
    { key: "status", label: "Result", align: "center" },
  ], [subjectColumns]);

  const tableActions = [
    { icon: <Eye size={14} />, tooltip: "View Details", variant: "ghost", onClick: (row) => { setSelectedStudent(row); openModal("student-detail-modal"); } },
    { icon: <Edit2 size={14} />, tooltip: "Edit Marks", variant: "ghost", onClick: () => showToast("Edit marks from the Marks Entry page.", "info") },
  ];

  const handleLoadResults = async () => {
    setLoadingResults(true);
    try {
      const targetSchedule = availableSchedules.find(sch => 
        String(sch.examStructure?._id || sch.examStructure || sch._id) === String(selectedExam) &&
        String(sch.class?._id || sch.class?.id || sch.class) === String(selectedClass) &&
        (sch.section?.name || sch.section || sch.examSchedule?.section || "A") === String(selectedSection)
      );

      const scheduleId = targetSchedule ? (targetSchedule._id || targetSchedule.id) : selectedExam;

      const res = await getPrincipalMarksheets(schoolId, {
        scheduleId: scheduleId,
        classId: selectedClass,
        section: selectedSection
      });

      if (res.success && res.data) {
        setPendingResults(res.data);
        setIsLoaded(true);
        
        // If all results are already published, disable the approve button
        const allPublished = res.data.length > 0 && res.data.every(m => m.status === 'published');
        setIsApproved(allPublished);
        
        showToast(`Successfully loaded ${res.data.length} results.`, "success");
      } else {
        showToast("No results found for this selection.", "info");
      }
    } catch (err) {
      showToast(err.message || "Failed to load results from server.", "error");
    } finally {
      setLoadingResults(false);
    }
  };

  const handleApproveResults = async () => {
    if (!selectedExam) return showToast("Please select an exam first.", "error");
    
    try {
      const targetSchedule = availableSchedules.find(sch => String(sch.examStructure?._id || sch.examStructure || sch._id) === String(selectedExam));
      const scheduleId = targetSchedule ? (targetSchedule._id || targetSchedule.id) : selectedExam;

      await api.put("/principal/exams/publish", {
        scheduleId: scheduleId,
        section: selectedSection || undefined,
      });
      
      setIsApproved(true); 
      closeModal("approve-modal"); 
      showToast("Results approved and published for parents.");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to publish results.", "error");
      closeModal("approve-modal");
    }
  };

  const selectedExamLabel  = examOptions.find((o) => o.id === selectedExam)?.name  || "";
  const selectedClassLabel = classOptions.find((o) => o.id === selectedClass)?.name || "";

  return (
    <div className="w-full space-y-5 text-left">
      <Grid cols={12} gap={4}><Heading primaryText="Examination" secondaryText="Results" size={12} showAnimations /></Grid>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700 font-medium">{error}</div>}

      {isLoaded && summary && (
        <DashGrid cols={12} gap={4}>
          <EnhancedDashCard title="Total Students" value={String(summary.total)} icon={<Users size={22} />} accentColor="#7A8FC6" size={3} />
          <EnhancedDashCard title="Pass" value={String(summary.pass)} icon={<CheckCircle size={22} />} accentColor="#5B9A6A" size={3} />
          <EnhancedDashCard title="Fail" value={String(summary.fail)} icon={<XCircle size={22} />} accentColor="#D66B5F" size={3} />
          <EnhancedDashCard title="Class Average" value={`${summary.average}%`} icon={<TrendingUp size={22} />} accentColor="#E0A04B" size={3} />
        </DashGrid>
      )}

      <div className="bg-white border border-[#E7E2DB] rounded-[24px] p-5 shadow-[0_6px_20px_rgba(0,0,0,.06)]">
        <Grid cols={12} gap={4}>
          <SelectField label="Select Exam" id="exam" size={3} value={selectedExam} placeholder="Choose Exam" disabled={loadingPage}
            onChange={(e) => { setSelectedExam(e.target.value); setSelectedClass(""); setSelectedSection(""); setIsLoaded(false); setIsApproved(false); }}>
            {examOptions.map((o) => <Option key={o.id} value={o.id} label={o.name} />)}
          </SelectField>

          <SelectField label="Select Class" id="class" size={3} value={selectedClass} placeholder="Choose Class" disabled={!selectedExam || loadingPage}
            onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(""); setIsLoaded(false); setIsApproved(false); }}>
            {classOptions.map((o) => <Option key={o.id} value={o.id} label={o.name} />)}
          </SelectField>

          <SelectField label="Select Section" id="section" size={3} value={selectedSection} placeholder="Choose Section" disabled={!selectedClass || loadingPage}
            onChange={(e) => { setSelectedSection(e.target.value); setIsLoaded(false); setIsApproved(false); }}>
            {sectionOptions.map((s) => <Option key={s} value={s} label={`Section ${s}`} />)}
          </SelectField>

          <div className="col-span-12 sm:col-span-3 flex items-end">
            <Button text={loadingResults ? "Loading…" : "Load Results"} variant="primary" size={12} loading={loadingResults} disabled={!selectedExam || !selectedClass || !selectedSection || loadingPage || loadingResults} onClick={handleLoadResults} />
          </div>
        </Grid>

        {selectedExam && !isLoaded && !loadingResults && filteredResults.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[#E7E2DB]">
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-3">Preview — {filteredResults.length} student{filteredResults.length !== 1 ? "s" : ""} found</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {subjectColumns.map((sub) => {
                const avgMarks = filteredResults.length ? filteredResults.reduce((acc, m) => { const entry = m.subjectMarks?.find((mk) => String(mk.subject?._id || mk.subject || "") === sub.key); return acc + (entry?.totalMarks || 0); }, 0) / filteredResults.length : 0;
                return (
                  <div key={sub.key} className="bg-[#F8F7F4] rounded-2xl px-4 py-3 flex flex-col gap-1 border border-[#E7E2DB]">
                    <span className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest">{sub.label}</span>
                    <div className="flex items-end gap-1">
                      <span className="text-xl font-black text-[#223F74]">{avgMarks.toFixed(1)}</span>
                      <span className="text-xs text-[#9CA3AF] mb-0.5">/ {sub.maxMarks} avg</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#E7E2DB] overflow-hidden mt-1"><div className="h-full rounded-full bg-[#223F74]" style={{ width: `${(avgMarks / sub.maxMarks) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <p className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-3">Top Students (snapshot)</p>
              <div className="flex flex-col gap-2">
                {filteredResults.map((m) => { const total = m.totalMarksObtained ?? 0; const max = m.totalMaxMarks ?? 1; return { name: getStudentName(m), roll: getStudentRoll(m, 0), pct: (total / max) * 100 }; }).sort((a, b) => b.pct - a.pct).slice(0, 3).map((s, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-[#F8F7F4] border border-[#E7E2DB] rounded-2xl px-4 py-2.5">
                      <span className="text-base">{["🥇", "🥈", "🥉"][idx]}</span>
                      <span className="font-bold text-sm text-[#1D1D1F] flex-1">{s.name}</span>
                      <span className="text-xs text-[#6B7280]">Roll: {s.roll}</span>
                      <span className="font-black text-sm text-[#223F74]">{s.pct.toFixed(1)}%</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${GRADE_BADGE[getGrade(s.pct)] ?? "bg-slate-100 text-slate-600"}`}>{getGrade(s.pct)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {isLoaded && (
        <Grid cols={12} gap={4}>
          <DataTable title="Student Results" columns={tableColumns} rows={studentsWithStats} actions={tableActions} size={12} pageSize={10} pageSizeOptions={[10, 20, 50]} searchable exportable exportFileName="exam-results" userProfile="studentName" />
        </Grid>
      )}

      {isLoaded && topPerformers.length > 0 && (
        <Grid cols={12} gap={4}>
          <div className="col-span-12">
            <h3 className="text-lg font-black text-[#223F74] mb-4 flex items-center gap-2"><Trophy size={20} className="text-amber-500" /> Top 3 Performers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topPerformers.map((s, idx) => {
                const medal = MEDAL[idx];
                return (
                  <div key={s._id || idx} className={`${medal.bg} border-2 ${medal.border} rounded-[20px] p-5 text-center shadow-sm`}>
                    <div className="text-3xl mb-2">{medal.icon}</div>
                    <p className="text-xs font-black text-[#6B7280] uppercase tracking-widest mb-1">{medal.label}</p>
                    <p className="font-black text-[#223F74] text-base">{s.studentName}</p>
                    <p className="text-sm text-[#6B7280] mt-1">Roll No: {s.rollNo}</p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="text-xl font-black text-[#223F74]">{s.percentage}%</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${GRADE_BADGE[s.grade] ?? "bg-slate-100 text-slate-600"}`}>{s.grade}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Grid>
      )}

      {isLoaded && chartData.length > 0 && (
        <DashGrid cols={12} gap={4}>
          <GColumnChart title="Subject-wise Class Average" subtitle="Average marks per subject" data={chartData} bars={[{ key: "average", label: "Average Marks", color: "#223F74" }]} size={12} height={280} />
        </DashGrid>
      )}

      {isLoaded && (
        <div className="bg-white border border-[#E7E2DB] rounded-[24px] p-6 shadow-[0_6px_20px_rgba(0,0,0,.06)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-base font-black text-[#223F74] mb-1">Result Approval</p>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isApproved ? "bg-emerald-500" : "bg-amber-400"}`} />
              <span className={`text-sm font-bold ${isApproved ? "text-emerald-700" : "text-amber-700"}`}>{isApproved ? "Approved & Published ✓" : "Pending Approval"}</span>
            </div>
          </div>
          {!isApproved ? (
            <Button text="Approve & Publish" variant="success" size={3} onClick={() => openModal("approve-modal")} />
          ) : (
            <span className="px-5 py-2.5 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-2xl border border-emerald-200">Results Published</span>
          )}
        </div>
      )}

      <Modal id="approve-modal" title="Approve & Publish Results" size="sm">
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Confirm Approval</p>
              <p className="text-sm text-amber-700 mt-1">You are about to publish results for <strong>{selectedExamLabel || "the selected exam"}</strong>{selectedClassLabel ? ` — ${selectedClassLabel}` : ""}{selectedSection ? ` — Section ${selectedSection}` : ""}. Once published, results will be visible to parents.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button text="Cancel" variant="secondary" size={4} onClick={() => closeModal("approve-modal")} />
            <Button text="Approve & Publish" variant="success" size={6} onClick={handleApproveResults} />
          </div>
        </div>
      </Modal>

      <Modal id="student-detail-modal" title="Student Result Details" size="md">
        {selectedStudent && (
          <div className="flex flex-col gap-4">
            <ModalGrid title="Student Info" cols={2}>
              <ModalData label="Name"       value={selectedStudent.studentName} />
              <ModalData label="Roll No"    value={selectedStudent.rollNo} />
              <ModalData label="Rank"       value={`#${selectedStudent.rank}`} />
              <ModalData label="Class"      value={getClassLabel(selectedStudent)} />
              <ModalData label="Total"      value={`${selectedStudent.totalMarks} / ${selectedStudent.totalMaxMarks}`} />
              <ModalData label="Percentage" value={`${selectedStudent.percentage}%`} />
              <ModalData label="Grade"      value={selectedStudent.grade} />
              <ModalData label="Result"     value={selectedStudent.result} />
            </ModalGrid>
            {subjectColumns.length > 0 && (
              <ModalGrid title="Subject-wise Marks" cols={2}>
                {subjectColumns.map((sub) => {
                  const entry = selectedStudent.subjectMarks?.find((mk) => String(mk.subject?._id || mk.subject || mk.subjectName || mk.subjectCode || "") === sub.key);
                  return <ModalData key={sub.key} label={sub.label} value={`${entry?.totalMarks ?? 0} / ${sub.maxMarks}`} />;
                })}
              </ModalGrid>
            )}
            <div className="flex justify-end pt-1"><Button text="Close" variant="ghost" size={3} onClick={() => closeModal("student-detail-modal")} /></div>
          </div>
        )}
      </Modal>

      {toastMessage && <div className={`fixed bottom-6 left-6 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold z-50 text-white ${toastType === "error" ? "bg-rose-500" : toastType === "info" ? "bg-[#223F74]" : "bg-emerald-500"}`}>{toastMessage}</div>}
    </div>
  );
};

export default Results;