import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Download, Lock, TrendingUp, Users, CheckCircle, XCircle } from "lucide-react";
import {
  Grid, Heading, DashGrid, EnhancedDashCard, SelectField, Option, Button, Modal,
  openModal, closeModal, ModalGrid, ModalData,
} from "../../../components/shared/Common_Components";
import { getPrincipalExamSchedules, getPrincipalExamStudents, getPrincipalMarksheets, savePrincipalExamMarks } from "../../../services/api/principalExamApi";
import api from "../../../services/api"; // add this import

const GRADE_SCALE = [
  { range: [90, 100], grade: "A+" }, { range: [80, 89],  grade: "A"  },
  { range: [70, 79],  grade: "B+" }, { range: [60, 69],  grade: "B"  },
  { range: [50, 59],  grade: "C"  }, { range: [40, 49],  grade: "D"  },
  { range: [0,  39],  grade: "F"  },
];

const getGrade       = (pct) => (GRADE_SCALE.find((e) => pct >= e.range[0] && pct <= e.range[1]) ?? { grade: "F" }).grade;
const getStudentKey  = (s) => String(s._id);
const getStudentName = (s) => s.user?.name || s.name || "Student";
const getStudentRoll = (s, i) => s.rollNo || s.rollNumber || i + 1;

const GRADE_BADGE = {
  "A+": "bg-emerald-100 text-emerald-700", "A":  "bg-emerald-100 text-emerald-700",
  "B+": "bg-teal-100   text-teal-700", "B":  "bg-blue-100   text-blue-700",
  "C":  "bg-amber-100  text-amber-700", "D":  "bg-amber-100  text-amber-700",
  "F":  "bg-rose-100   text-rose-700",
};

const MarksEntry = () => {
  const [availableExams,    setAvailableExams]    = useState([]);
  const [availableClasses,  setAvailableClasses]  = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedExam,      setSelectedExam]      = useState("");
  const [selectedClass,     setSelectedClass]     = useState("");
  const [selectedSubject,   setSelectedSubject]   = useState("");
  const [selectedSection,   setSelectedSection]   = useState("");
  const [marksData,         setMarksData]         = useState({});
  const [isLoaded,          setIsLoaded]          = useState(false);
  const [isLocked,          setIsLocked]          = useState(false);
  const [loadingStudents,   setLoadingStudents]   = useState(false);
  const [loadingSave,       setLoadingSave]       = useState(false);
  const [toastMessage,      setToastMessage]      = useState("");
  const [toastType,         setToastType]         = useState("success");

  const getSchoolId = () => {
    let sid = localStorage.getItem("schoolId");
    if (!sid || sid === "undefined") {
      try { sid = JSON.parse(localStorage.getItem("user"))?.schoolId; } catch(e){}
    }
    return sid;
  };
  const schoolId = getSchoolId();

  const showToast = (msg, type = "success") => {
    setToastMessage(msg); setToastType(type);
    setTimeout(() => setToastMessage(""), 4000);
  };

  useEffect(() => {
    getPrincipalExamSchedules()
      .then((res) => {
        if (res.success && res.data) {
          setAvailableExams(res.data);
          // Classes derived from exams — only classes that have exam schedules
          const classMap = new Map();
          res.data.forEach(ex => {
            if (ex.class) {
              const id = String(ex.class._id || ex.class.id || ex.class);
              const name = ex.class.name || ex.class.className || `Class ${id.slice(-4)}`;
              if (!classMap.has(id)) classMap.set(id, { _id: id, name });
            }
          });
          setAvailableClasses(Array.from(classMap.values()));
        }
      }).catch(() => showToast("Failed to load exams", "error"));
  }, []);

  useEffect(() => {
    if (!selectedExam) {
      setAvailableSubjects([]); setSelectedSubject(""); setSelectedClass("");
      setSelectedSection(""); setIsLoaded(false); setAvailableStudents([]);
      return;
    }
    const exam = availableExams.find((e) => e._id === selectedExam);
    if (exam) {
      const classId = String(exam.class?._id || exam.class?.id || exam.class || "");
      setSelectedClass(classId);
      setSelectedSection(exam.section || "");

      // 1. Try subjects from exam slots first (already resolved by backend)
      const slotsSubjects = (exam.slots || [])
        .filter(slot => slot.subject?._id && String(slot.subject._id).trim() !== "null" && String(slot.subject._id).trim() !== "undefined")
        .map(slot => ({
          id: String(slot.subject?._id || slot.subject),
          name: slot.subject?.subjectName || slot.subject?.name || "Unknown Subject",
          maxMarks: slot.maxMarks || 100
        }))
        .filter(sub => {
          const name = (sub.name || "").trim().toLowerCase();
          return !name.includes("null") && !name.includes("unknown");
        });

      if (slotsSubjects.length > 0) {
        setAvailableSubjects(slotsSubjects);
        setSelectedSubject(slotsSubjects[0].id);
      } else if (classId) {
        // 2. Fallback: fetch subjects assigned to this class from academics API
        api.get("/principal/academics/subjects")
          .then(res => {
            const allSubjects = res.data?.data || [];
            // Filter subjects assigned to this class
            const classNameStr = String(exam.class?.name || exam.class?.className || "").toLowerCase().trim();
            const classSubjects = allSubjects.filter(sub => {
              const assignedIds = (sub.assignedClasses || []).map(c => String(c._id || c).toLowerCase().trim());
              return assignedIds.includes(String(classId).toLowerCase().trim()) || 
                     String(sub.classId).toLowerCase().trim() === String(classId).toLowerCase().trim() ||
                     (classNameStr && assignedIds.includes(classNameStr));
            });
            const mapped = classSubjects.map(sub => ({
              id: String(sub._id),
              name: sub.subjectName || sub.name || "Unknown",
              maxMarks: (sub.theoryMarks || 80) + (sub.practicalMarks || 0)
            }));
            setAvailableSubjects(mapped);
            if (mapped.length > 0) setSelectedSubject(mapped[0].id);
          })
          .catch(() => showToast("Failed to load subjects", "error"));
      }
    } else {
      setAvailableSubjects([]); setSelectedSubject("");
    }
    setIsLoaded(false); setAvailableStudents([]);
  }, [selectedExam, availableExams]);

  const selectedSubjectMeta = useMemo(() => availableSubjects.find((s) => s.id === selectedSubject) || null, [availableSubjects, selectedSubject]);

  const selectedExamLabel = useMemo(() => {
    const ex = availableExams.find((e) => e._id === selectedExam);
    if (!ex) return "";
    const className = ex.class?.name || ex.class?.className || "Class";
    return `${ex.examStructure?.examName || ex.name || "Exam"} - ${className}${ex.section ? ` - Sec ${ex.section}` : ""}`;
  }, [selectedExam, availableExams]);

  const totalMaxMarks  = selectedSubjectMeta?.maxMarks || 100;
  const maxTheoryMarks = Math.floor(totalMaxMarks * 0.8);
  const maxPractMarks  = totalMaxMarks - maxTheoryMarks;
  const passMarks      = Math.round(totalMaxMarks * 0.4);
  const canLoad        = Boolean(selectedExam && selectedClass && selectedSubject);

  const targetSchedule = useMemo(() => {
    return availableExams.find(sch => String(sch._id) === String(selectedExam));
  }, [availableExams, selectedExam]);

  const calculateMarks = (key) => {
    const theory = marksData[key]?.theoryMarks;
    const pract  = marksData[key]?.practicalMarks;
    if (theory == null || pract == null) return { total: null, percentage: null, grade: null, status: "Not Entered" };
    const total = theory + pract;
    const pct   = (total / totalMaxMarks) * 100;
    const grade = getGrade(pct);
    return { total, percentage: pct.toFixed(1), grade, status: pct >= passMarks ? "Pass" : "Fail" };
  };

  const handleMarkChange = (key, field, value) => {
    if (isLocked) return;
    const num = value === "" ? null : Math.max(0, parseInt(value, 10) || 0);
    setMarksData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        theoryMarks:    field === "theory"    ? (num === null ? null : Math.min(num, maxTheoryMarks)) : prev[key]?.theoryMarks,
        practicalMarks: field === "practical" ? (num === null ? null : Math.min(num, maxPractMarks))  : prev[key]?.practicalMarks,
      },
    }));
  };

  const statistics = useMemo(() => {
    if (!isLoaded || !availableStudents.length) return null;
    let hi = -Infinity, lo = Infinity, sum = 0, cnt = 0, pass = 0, fail = 0;
    availableStudents.forEach((s) => {
      const c = calculateMarks(getStudentKey(s));
      if (c.total !== null) {
        hi  = Math.max(hi, c.total); lo = Math.min(lo, c.total);
        sum += c.total; cnt++;
        c.status === "Pass" ? pass++ : fail++;
      }
    });
    return { highest: cnt > 0 ? hi : "—", lowest: cnt > 0 ? lo : "—", average: cnt > 0 ? (sum / cnt).toFixed(1) : "—", pass, fail };
  }, [isLoaded, availableStudents, marksData]);

  const handleLoadStudents = async () => {
    if (!canLoad) return;
    setLoadingStudents(true);
    try {
      const res = await getPrincipalExamStudents(schoolId, selectedClass, selectedSection);
      const students = res?.data || [];
      setAvailableStudents(students);

      let existingMarksData = {};
      if (targetSchedule) {
        const marksRes = await getPrincipalMarksheets(schoolId, { scheduleId: targetSchedule._id, classId: selectedClass, section: selectedSection });
        const marksheets = marksRes?.data || [];

        marksheets.forEach(marksheet => {
           const studentKey = String(marksheet.student?._id || marksheet.student?.id);
           const subjectEntry = marksheet.subjectMarks?.find(sm => String(sm.subject?._id || sm.subject) === String(selectedSubject));
           if (subjectEntry) {
              existingMarksData[studentKey] = { theoryMarks: subjectEntry.theoryMarks, practicalMarks: subjectEntry.practicalMarks };
           }
        });
      }

      const init = {};
      students.forEach((s) => { 
        const key = getStudentKey(s);
        init[key] = existingMarksData[key] || { theoryMarks: null, practicalMarks: null }; 
      });
      
      setMarksData(init);
      setIsLoaded(true);
      setIsLocked(targetSchedule?.status === "completed" || targetSchedule?.status === "published");
      showToast(`Loaded ${students.length} students.`, "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load students.", "error");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSaveMarks = async () => {
    if (!targetSchedule) return showToast("Schedule not found.", "error");
    setLoadingSave(true);
    try {
      const formattedMarks = Object.keys(marksData).map(studentKey => ({
        studentId: studentKey,
        theoryMarks: marksData[studentKey].theoryMarks,
        practicalMarks: marksData[studentKey].practicalMarks
      }));

      await savePrincipalExamMarks(schoolId, {
        examScheduleId: targetSchedule._id,
        classId: selectedClass,
        section: selectedSection,
        subjectId: selectedSubject,
        marks: formattedMarks
      });

      showToast("Marks saved successfully to database!");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save marks.", "error");
    } finally {
      setLoadingSave(false);
    }
  };

  const handleLockMarks = () => { setIsLocked(true); closeModal("lock-modal"); showToast(`Marks locked for ${selectedSubjectMeta?.name || "subject"}.`); };

  const handleExport = () => {
    const rows = availableStudents.map((s, i) => {
      const key  = getStudentKey(s);
      const calc = calculateMarks(key);
      return [getStudentRoll(s, i), getStudentName(s), marksData[key]?.theoryMarks ?? "", marksData[key]?.practicalMarks ?? "", calc.total ?? "", calc.percentage ?? "", calc.grade ?? "", calc.status].join(",");
    });
    const csv  = ["Roll No,Name,Theory,Practical,Total,Percentage,Grade,Status", ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "marks-entry.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const selectedClassObj = availableClasses.find((c) => String(c._id) === String(selectedClass));

  return (
    <div className="w-full space-y-5 text-left">
      <Grid cols={12} gap={4}><Heading primaryText="Marks" secondaryText="Entry" size={12} showAnimations /></Grid>

      {isLoaded && statistics && (
        <DashGrid cols={12} gap={4}>
          <EnhancedDashCard title="Total Students" value={String(availableStudents.length)} icon={<Users size={22} />} accentColor="#7A8FC6" size={3} />
          <EnhancedDashCard title="Highest Marks" value={String(statistics.highest)} icon={<TrendingUp size={22} />} accentColor="#5B9A6A" size={3} />
          <EnhancedDashCard title="Pass" value={String(statistics.pass)} icon={<CheckCircle size={22} />} accentColor="#5B9A6A" size={3} />
          <EnhancedDashCard title="Fail" value={String(statistics.fail)} icon={<XCircle size={22} />} accentColor="#D66B5F" size={3} />
        </DashGrid>
      )}

      <div className="bg-white border border-[#E7E2DB] rounded-[24px] p-5 shadow-[0_6px_20px_rgba(0,0,0,.06)]">
        

        <Grid cols={12} gap={4}>
          <SelectField label="Select Exam" id="exam" size={4} value={selectedExam} placeholder="Choose Exam" onChange={(e) => { setSelectedExam(e.target.value); setIsLoaded(false); setAvailableStudents([]); }}>
            {availableExams.map((ex) => {
              const className = ex.class?.name || ex.class?.className || "Class";
              return (
                <Option key={ex._id} value={ex._id} label={`${ex.examStructure?.examName || ex.name || "Exam"} - ${className}${ex.section ? ` - Sec ${ex.section}` : ""}`} />
              );
            })}
          </SelectField>
          <SelectField label="Select Class" id="class" size={4} value={selectedClass} placeholder="Choose Class" disabled={!selectedExam} onChange={(e) => { setSelectedClass(e.target.value); setIsLoaded(false); setAvailableStudents([]); }}>
            {availableClasses.map((c) => (
              <Option key={c._id} value={c._id} label={c.name} />
            ))}
          </SelectField>
          <SelectField label="Select Subject" id="subject" size={4} value={selectedSubject} placeholder="Choose Subject" disabled={!selectedClass || availableSubjects.length === 0} onChange={(e) => { setSelectedSubject(e.target.value); setIsLoaded(false); }}>
            {availableSubjects.map((s) => (
              <Option key={s.id} value={s.id} label={s.name} />
            ))}
          </SelectField>
          <div className="col-span-12 flex justify-end">
            <div className="w-48">
              <Button text={loadingStudents ? "Loading…" : "Load Students"} variant="primary" size={12} loading={loadingStudents} disabled={!canLoad || loadingStudents} onClick={handleLoadStudents} />
            </div>
          </div>
        </Grid>
      </div>

      {isLoaded && (
        <div className="bg-[#223F74] rounded-[20px] px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Exam", value: selectedExamLabel || "—" },
              { label: "Class & Section", value: `${selectedClassObj?.name || "—"} - ${selectedSection || "—"}` },
              { label: "Subject", value: selectedSubjectMeta?.name || "—" },
              { label: "Max Marks", value: String(totalMaxMarks) },
              { label: "Pass Marks", value: String(passMarks) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-sm font-bold text-white truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoaded && (
        <div className="bg-white border border-[#E7E2DB] rounded-[24px] overflow-hidden shadow-[0_6px_20px_rgba(0,0,0,.06)]">
          {isLocked && (
            <div className="flex items-center gap-3 px-5 py-3 bg-emerald-50 border-b border-emerald-200">
              <Lock size={15} className="text-emerald-700" />
              <p className="text-sm font-bold text-emerald-800">Marks are locked — editing is disabled.</p>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "760px" }}>
              <thead>
                <tr className="bg-[#223F74] text-white">
                  <th className="py-4 px-4 text-left text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Roll No</th>
                  <th className="py-4 px-4 text-left text-[11px] font-black uppercase tracking-[0.2em]">Student Name</th>
                  <th className="py-4 px-4 text-center text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Theory <span className="opacity-60">/{maxTheoryMarks}</span></th>
                  <th className="py-4 px-4 text-center text-[11px] font-black uppercase tracking-[0.2em] whitespace-nowrap">Practical <span className="opacity-60">/{maxPractMarks}</span></th>
                  <th className="py-4 px-4 text-center text-[11px] font-black uppercase tracking-[0.2em]">Total</th>
                  <th className="py-4 px-4 text-center text-[11px] font-black uppercase tracking-[0.2em]">%</th>
                  <th className="py-4 px-4 text-center text-[11px] font-black uppercase tracking-[0.2em]">Grade</th>
                  <th className="py-4 px-4 text-center text-[11px] font-black uppercase tracking-[0.2em]">Status</th>
                </tr>
              </thead>
              <tbody>
                {availableStudents.map((student, i) => {
                  const key  = getStudentKey(student);
                  const calc = calculateMarks(key);
                  const theory = marksData[key]?.theoryMarks;
                  const pract  = marksData[key]?.practicalMarks;
                  return (
                    <tr key={key} className={`border-b border-[#E2E8F0]/60 transition ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAF9]"} hover:bg-[#F8FAFC]`}>
                      <td className="py-3 px-4 font-bold text-[#223F74]">{getStudentRoll(student, i)}</td>
                      <td className="py-3 px-4 font-medium text-[#1D1D1F]">{getStudentName(student)}</td>
                      <td className="py-2 px-4">
                        <input type="number" min="0" max={maxTheoryMarks} value={theory ?? ""} onChange={(e) => handleMarkChange(key, "theory", e.target.value)} disabled={isLocked} placeholder="—" className={`w-full text-center text-sm font-bold py-2 px-2 rounded-xl border outline-none transition ${isLocked ? "bg-[#F9FAFB] cursor-not-allowed text-[#6B7280] border-[#E2E8F0]" : theory !== null && theory < Math.round(maxTheoryMarks * 0.4) ? "border-rose-300 bg-rose-50 text-rose-700 focus:ring-2 focus:ring-rose-200" : "border-[#E2E8F0] bg-white text-[#1D1D1F] focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74]"}`} />
                      </td>
                      <td className="py-2 px-4">
                        <input type="number" min="0" max={maxPractMarks} value={pract ?? ""} onChange={(e) => handleMarkChange(key, "practical", e.target.value)} disabled={isLocked} placeholder="—" className={`w-full text-center text-sm font-bold py-2 px-2 rounded-xl border outline-none transition ${isLocked ? "bg-[#F9FAFB] cursor-not-allowed text-[#6B7280] border-[#E2E8F0]" : "border-[#E2E8F0] bg-white text-[#1D1D1F] focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74]"}`} />
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[#1D1D1F]">{calc.total !== null ? `${calc.total}/${totalMaxMarks}` : "—"}</td>
                      <td className="py-3 px-4 text-center font-bold text-[#223F74]">{calc.percentage !== null ? `${calc.percentage}%` : "—"}</td>
                      <td className="py-3 px-4 text-center">{calc.grade ? <span className={`px-3 py-1 rounded-full text-xs font-bold ${GRADE_BADGE[calc.grade] ?? "bg-slate-100 text-slate-600"}`}>{calc.grade}</span> : "—"}</td>
                      <td className="py-3 px-4 text-center">{calc.status === "Pass" ? <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Pass</span> : calc.status === "Fail" ? <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">Fail</span> : <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">—</span>}</td>
                    </tr>
                  );
                })}
                <tr className="bg-[#F4F7FB] border-t-2 border-[#E2E8F0]">
                  <td colSpan={2} className="py-3 px-4 text-xs font-black text-[#223F74] uppercase tracking-widest">Class Statistics</td>
                  <td colSpan={2} className="py-3 px-4 text-center text-xs text-[#6B7280] font-semibold">—</td>
                  <td className="py-3 px-4 text-center text-xs font-black text-[#223F74]">↑ {statistics?.highest} &nbsp;↓ {statistics?.lowest}</td>
                  <td className="py-3 px-4 text-center text-xs font-black text-[#223F74]">Avg {statistics?.average}%</td>
                  <td className="py-3 px-4 text-center text-xs text-[#6B7280] font-semibold">—</td>
                  <td className="py-3 px-4 text-center"><div className="flex justify-center gap-2 text-xs font-bold"><span className="text-emerald-700">✓ {statistics?.pass}</span><span className="text-rose-700">✗ {statistics?.fail}</span></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isLoaded && (
        <div className="flex flex-wrap gap-3 justify-end mt-4">
          <Button text="Export Sheet" variant="secondary" size={2} icon={<Download size={15} />} onClick={handleExport} />
          <Button text="Lock Marks" variant="secondary" size={2} icon={<Lock size={15} />} disabled={isLocked} onClick={() => openModal("lock-modal")} />
          <Button text={loadingSave ? "Saving..." : "Save Marks"} variant="primary" size={2} loading={loadingSave} disabled={isLocked || loadingSave} onClick={handleSaveMarks} />
        </div>
      )}

      <Modal id="lock-modal" title="Lock Marks" size="sm">
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">Confirm Lock?</p>
              <p className="text-sm text-amber-700 mt-1">Once locked, marks cannot be edited without Admin approval.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button text="Cancel" variant="secondary" size={4} onClick={() => closeModal("lock-modal")} />
            <Button text="Confirm Lock" variant="danger" size={6} onClick={handleLockMarks} />
          </div>
        </div>
      </Modal>

      {toastMessage && (
        <div className={`fixed bottom-6 left-6 px-5 py-3 rounded-2xl shadow-xl text-sm font-bold z-50 text-white ${toastType === "error" ? "bg-rose-500" : "bg-emerald-500"}`}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default MarksEntry;