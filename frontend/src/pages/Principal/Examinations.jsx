import React, { useEffect, useState } from "react";
import {
  FileText,
  CheckCircle,
  Clock3,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getPrincipalExamStats } from "../../services/api/principalExamApi";

const Examinations = () => {
  const navigate = useNavigate();
  const schoolId = localStorage.getItem("schoolId");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalSchedules: 0,
    pendingVerifications: 0,
    publishedResults: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      if (!schoolId) {
        setError("School ID not found. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const response = await getPrincipalExamStats(schoolId);
        setStats(response?.data || stats);
      } catch (statsError) {
        setError(
          statsError.response?.data?.message ||
            statsError.message ||
            "Failed to load exam statistics",
        );
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const shortcuts = [
    { label: "Create Exam", path: "/principal/examinations/create" },
    { label: "Marks Entry", path: "/principal/examinations/marks-entry" },
    { label: "Results", path: "/principal/examinations/results" },
    { label: "Marksheet", path: "/principal/examinations/marksheet" },
    { label: "Admit Card", path: "/principal/examinations/admit-card" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="md:ml-64 mt-20 p-6 lg:p-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">
              Examinations Management
            </h2>
            <p className="text-gray-500">
              Principal exam overview, schedule and result controls
            </p>
          </div>
          <button
            onClick={() => navigate("/principal/examinations/create")}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition"
          >
            Create Exam
            <ArrowRight size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Schedules</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {loading ? "..." : stats.totalSchedules}
                </p>
              </div>
              <CalendarDays className="text-blue-600" />
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Verifications</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {loading ? "..." : stats.pendingVerifications}
                </p>
              </div>
              <Clock3 className="text-amber-500" />
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Published Results</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {loading ? "..." : stats.publishedResults}
                </p>
              </div>
              <CheckCircle className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {shortcuts.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="rounded-2xl bg-white p-5 text-left shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition"
            >
              <FileText className="mb-4 text-blue-600" />
              <p className="font-semibold text-gray-900">{item.label}</p>
              <p className="mt-1 text-sm text-gray-500">
                Open {item.label.toLowerCase()} screen
              </p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Examinations;
