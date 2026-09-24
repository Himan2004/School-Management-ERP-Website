import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import api from "../../../services/api"; 
import {
  createTeacherAssignment,
  deleteTeacherAssignment,
  getPrincipalClassesSections,
  getPrincipalSubjects,
  getPrincipalTeacherAssignments,
} from "../../../services/api/principalAcademicsApi";
import { Heading } from "../../../components/shared/Common_Components";

const AssignSubjects = () => {
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]); // Stores all subjects safely
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    classId: "",
    section: "",
    subjectId: "",
    academicYear: new Date().getFullYear() + "-" + String(new Date().getFullYear() + 1).slice(-2),
  });

  const loadAll = async () => {
    try {
      setLoading(true);
      setError("");
      
      // THE FIX: Fetch everything simultaneously to prevent isolated crashes
      const [tRes, cRes, sRes] = await Promise.all([
        getPrincipalTeacherAssignments(), 
        getPrincipalClassesSections(),
        getPrincipalSubjects() 
      ]);
      
      const teacherList = tRes?.data?.teachers || [];
      setTeachers(teacherList);
      setAssignments(tRes?.data?.assignments || []);
      
      const classData = cRes?.data?.data || cRes?.data || cRes || [];
      setClasses(Array.isArray(classData) ? classData : []);
      
      const subjectData = sRes?.data?.data || sRes?.data || sRes || [];
      setSubjects(Array.isArray(subjectData) ? subjectData : []);
      
      if (!selectedTeacher && teacherList.length) setSelectedTeacher(teacherList[0]._id);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load assignment data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // FIXED: Safely identify the selected class using id or _id
  const selectedClass = useMemo(() => 
    classes.find((c) => String(c._id || c.id) === String(form.classId)), 
  [classes, form.classId]);

  // FIXED: Safely extract section names (handling both objects and plain strings)
  const availableSections = useMemo(() => {
    if (!selectedClass || !selectedClass.sections) return [];
    return selectedClass.sections.map(s => typeof s === 'object' ? s.name : s);
  }, [selectedClass]);

  useEffect(() => {
    if (availableSections.length > 0 && !availableSections.includes(form.section)) {
      setForm((s) => ({ ...s, section: availableSections[0] }));
    } else if (availableSections.length === 0 && form.section !== "") {
      setForm((s) => ({ ...s, section: "" }));
    }
  }, [availableSections, form.section]);

  // BULLETPROOF FILTER: Checks both the new assignedClasses array AND the legacy classId
  const availableSubjects = useMemo(() => {
    if (!form.classId) return [];
    
    return subjects.filter(sub => {
      const inNewArray = sub.assignedClasses?.some(c => String(c._id || c) === String(form.classId));
      const isLegacyMatch = String(sub.classId?._id || sub.classId) === String(form.classId);
      return inNewArray || isLegacyMatch;
    });
  }, [subjects, form.classId]);

  const teacherAssignments = useMemo(
    () => assignments.filter((a) => String(a.teacherUser?._id || a.teacherUser) === String(selectedTeacher)),
    [assignments, selectedTeacher]
  );

  const addAssignment = async () => {
    try {
      if (!selectedTeacher || !form.classId || !form.section || !form.subjectId) {
          setError("Please select a class, section, and subject");
          setTimeout(() => setError(""), 3000);
          return;
      }
      
      await createTeacherAssignment({
        teacherUserId: selectedTeacher,
        classId: form.classId,
        section: form.section,
        subjectId: form.subjectId,
        academicYear: form.academicYear,
      });
      
      await loadAll();
      setForm(s => ({ ...s, subjectId: "" })); // Reset subject after adding
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save assignment");
      setTimeout(() => setError(""), 3000);
    }
  };

  const removeAssignment = async (id) => {
    try {
      await deleteTeacherAssignment(id);
      await loadAll();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to remove assignment");
    }
  };

  return (
    <div className="w-full space-y-6 text-left pb-10">
      <Heading
        primaryText="Assign Subjects"
        secondaryText="Live teacher list and live subject assignments."
        showAnimations={true}
      />

      {error && <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-150 text-rose-700 font-medium text-sm">{error}</div>}

          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#223F74] mb-3" />
              <p className="font-semibold text-sm">Loading assignments...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 font-black text-[#223F74] bg-slate-50/30">Teachers ({teachers.length})</div>
                <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
                  {teachers.map((t) => (
                    <button
                      key={t._id}
                      onClick={() => setSelectedTeacher(t._id)}
                      className={`w-full text-left p-4.5 transition-all hover:bg-slate-50 ${String(selectedTeacher) === String(t._id) ? "bg-[#223F74]/10 border-l-4 border-l-[#223F74]" : ""}`}
                    >
                      <p className="font-bold text-slate-800">{t.name || t.user?.name}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-1">{t.loginId || t.user?.email || "Teacher"}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6">
                  <h3 className="text-lg font-black text-[#223F74] mb-4">Add Assignment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <select
                      value={form.classId}
                      onChange={(e) => setForm((s) => ({ ...s, classId: e.target.value, subjectId: "" }))}
                      className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] bg-white transition"
                    >
                      <option value="">Select Class</option>
                      {classes.map((c) => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <select 
                      value={form.section} 
                      onChange={(e) => setForm((s) => ({ ...s, section: e.target.value }))} 
                      className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] bg-white transition disabled:bg-slate-50 disabled:text-slate-400"
                      disabled={!form.classId || availableSections.length === 0}
                    >
                      <option value="">{availableSections.length === 0 ? "No Sections" : "Select Section"}</option>
                      {availableSections.map((sec) => (
                        <option key={sec} value={sec}>
                          Section {sec}
                        </option>
                      ))}
                    </select>

                    <select 
                      value={form.subjectId} 
                      onChange={(e) => setForm((s) => ({ ...s, subjectId: e.target.value }))} 
                      className="px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] bg-white transition disabled:bg-slate-50 disabled:text-slate-400"
                      disabled={!form.classId || availableSubjects.length === 0}
                    >
                      <option value="">{availableSubjects.length === 0 ? "No Subjects Found" : "Select Subject"}</option>
                      {availableSubjects.map((s) => (
                        <option key={s._id || s.id} value={s._id || s.id}>
                          {s.subjectName} ({s.subjectCode})
                        </option>
                      ))}
                    </select>
                    
                    <button onClick={addAssignment} className="bg-[#223F74] text-white rounded-xl px-5 py-2.5 hover:bg-[#1a3360] transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-bold">
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 sm:p-6">
                  <h3 className="text-lg font-black text-[#223F74] mb-4">Current Assignments ({teacherAssignments.length})</h3>
                  {teacherAssignments.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                       <p className="font-semibold text-sm">No assignments found for the selected teacher.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {teacherAssignments.map((a) => (
                        <div key={a._id} className="border border-slate-200/60 rounded-2xl p-4 flex items-center justify-between bg-slate-55/30 hover:bg-slate-50 transition shadow-sm hover:shadow-md">
                          <div>
                            <p className="font-bold text-slate-800">{a.subject?.subjectName || a.subject?.name || "-"}</p>
                            <p className="text-xs font-semibold text-slate-500 mt-1">
                              {(a.class?.name || a.class?.className || "-")} · Section {a.section} ({a.academicYear})
                            </p>
                          </div>
                          <button onClick={() => removeAssignment(a._id)} className="text-rose-600 hover:bg-rose-50 p-2.5 rounded-xl transition" title="Remove Assignment">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
    </div>
  );
};

export default AssignSubjects;