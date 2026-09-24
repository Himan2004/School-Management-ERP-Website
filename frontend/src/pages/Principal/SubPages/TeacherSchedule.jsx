import React, { useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { getPrincipalTeacherSchedule, getPrincipalTeachers } from "../../../services/api/principalTeachersApi";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const TeacherSchedule = () => {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [week, setWeek] = useState("");
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTeachers = async () => {
    const res = await getPrincipalTeachers({ status: "active" });
    const list = res?.data || [];
    setTeachers(list);
    if (!selectedTeacher && list.length) setSelectedTeacher(list[0].id);
  };

  const loadSchedule = async (teacherId) => {
    if (!teacherId) return;
    const res = await getPrincipalTeacherSchedule({ teacherId, week: week || undefined });
    setScheduleData(res?.data || null);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadTeachers();
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load teachers");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        if (!selectedTeacher) return;
        setLoading(true);
        await loadSchedule(selectedTeacher);
        setError("");
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load schedule");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [selectedTeacher, week]);

  const matrix = useMemo(() => {
    const map = {};
    DAYS.forEach((d) => {
      map[d] = {};
      PERIODS.forEach((p) => (map[d][p] = null));
    });
    (scheduleData?.schedule || []).forEach((s) => {
      if (map[s.day]) {
        map[s.day][s.periodNumber] = s;
      }
    });
    return map;
  }, [scheduleData]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_80%_0%,#d1fae5_0%,#f8fafc_45%,#e0e7ff_100%)]">
      <div className="text-left">
        <main className="pt-24 px-6 pb-12">
          <div className="mb-8 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <h1 className="text-3xl font-bold">Teacher Schedule</h1>
            <p className="text-cyan-100 mt-2">Weekly schedule loaded from live principal APIs.</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Teacher</label>
              <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg">
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.empId})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Week (optional)</label>
              <input type="date" value={week} onChange={(e) => setWeek(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div className="flex items-end">
              <button onClick={() => loadSchedule(selectedTeacher)} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                <Calendar className="w-4 h-4" /> Load Schedule
              </button>
            </div>
          </div>

          {error && <div className="mb-4 p-3 rounded bg-red-100 text-red-700">{error}</div>}

          {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-10 text-center text-gray-600">Loading schedule...</div>
          ) : scheduleData ? (
            <>
              <div className="bg-white/95 rounded-xl shadow-md border border-cyan-100 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Teacher</p>
                    <p className="text-lg font-bold text-gray-900">{scheduleData.teacher?.name}</p>
                    <p className="text-xs text-gray-600">{scheduleData.teacher?.loginId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Periods</p>
                    <p className="text-2xl font-bold text-blue-600">{scheduleData.totalPeriods}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Free Periods</p>
                    <p className="text-2xl font-bold text-green-600">{scheduleData.freePeriods}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Week Filter</p>
                    <p className="text-base font-semibold text-gray-900">{week || "Current"}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/95 rounded-xl shadow-md border border-cyan-100 p-6 overflow-x-auto">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly Grid</h2>
                <table className="w-full border border-gray-300">
                  <thead>
                    <tr>
                      <th className="bg-cyan-100 p-3 border border-cyan-200 text-left text-sm">Period</th>
                      {DAYS.map((day) => (
                        <th key={day} className="bg-cyan-100 p-3 border border-cyan-200 text-center text-sm capitalize">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((period) => (
                      <tr key={period}>
                        <td className="bg-cyan-50 p-3 border border-cyan-200 font-semibold text-sm text-cyan-800">Period {period}</td>
                        {DAYS.map((day) => {
                          const slot = matrix[day]?.[period];
                          return (
                            <td key={`${day}-${period}`} className="p-2 border border-gray-300 min-w-[140px] h-20">
                              {slot ? (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-200 rounded p-2 text-xs">
                                  <p className="font-semibold text-blue-900">{slot.subject}</p>
                                  <p className="text-blue-700">{slot.class}-{slot.section}</p>
                                  <p className="text-blue-600">{slot.startTime} - {slot.endTime}</p>
                                </div>
                              ) : (
                                <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-500 text-center">Free</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-10 text-center text-gray-600">No schedule data found.</div>
          )}
        </main>
      </div>
    </div>
  );
};

export default TeacherSchedule;
