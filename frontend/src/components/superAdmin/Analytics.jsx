import React, { useEffect, useState } from "react";

import axios from "axios";

import {
  Award,
  RefreshCcw,
  Edit,
  Calendar,
  BookOpen,
  Gift,
  FileText,
  Shield,
} from "lucide-react";

const AcademicConfiguration = () => {

  // ======================================================
  // ================= STATES =============================
  // ======================================================

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("grading");

  const [config, setConfig] = useState(null);

  // ======================================================
  // ================= FETCH CONFIG =======================
  // ======================================================

  const fetchConfig = async () => {

    try {

      setLoading(true);

      const response = await axios.get(
        "http://127.0.0.1:5000/api/academic/config"
      );

      setConfig(response.data);

    } catch (error) {

      console.log("Academic Config Error:", error);

      if (error.request) {

        alert("Backend Server Not Running");

      } else {

        alert("Failed To Load Academic Configuration");

      }

    } finally {

      setLoading(false);

    }
  };

  // ======================================================
  // ================= USE EFFECT =========================
  // ======================================================

  useEffect(() => {

    fetchConfig();

  }, []);

  // ======================================================
  // ================= LOADING ============================
  // ======================================================

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef2f7]">

        <div className="text-center">

          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>

          <h2 className="text-xl font-bold text-slate-700">
            Loading Academic Configuration...
          </h2>

        </div>

      </div>
    );
  }

  // ======================================================
  // ================= MAIN UI ============================
  // ======================================================

  return (
    <div className="min-h-screen bg-[#eef2f7] p-4 md:p-8">

      {/* ======================================================
          ================= HEADER =============================
      ====================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">

        <div>

          <h1 className="text-3xl md:text-5xl font-bold text-slate-900">
            Academic Configuration
          </h1>

          <p className="text-gray-500 mt-2 text-lg">
            Configure academic settings for your organization
          </p>

        </div>

        {/* REFRESH BUTTON */}

        <button
          onClick={fetchConfig}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-100 px-6 py-3 rounded-2xl shadow-sm transition-all"
        >
          <RefreshCcw size={18} />
          Refresh
        </button>

      </div>

      {/* ======================================================
          ================= TABS ===============================
      ====================================================== */}

      <div className="flex flex-wrap gap-3 mb-8 border-b border-gray-200 pb-4">

        {/* TAB */}

        <button
          onClick={() => setActiveTab("year")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all ${
            activeTab === "year"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Calendar size={18} />
          Academic Year
        </button>

        {/* TAB */}

        <button
          onClick={() => setActiveTab("classes")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all ${
            activeTab === "classes"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          <BookOpen size={18} />
          Classes & Subjects
        </button>

        {/* TAB */}

        <button
          onClick={() => setActiveTab("holidays")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all ${
            activeTab === "holidays"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Gift size={18} />
          Holidays
        </button>

        {/* TAB */}

        <button
          onClick={() => setActiveTab("exams")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all ${
            activeTab === "exams"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          <FileText size={18} />
          Exam Patterns
        </button>

        {/* TAB */}

        <button
          onClick={() => setActiveTab("grading")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all ${
            activeTab === "grading"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Award size={18} />
          Grading System
        </button>

        {/* TAB */}

        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all ${
            activeTab === "rules"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Shield size={18} />
          Rules
        </button>

      </div>

      {/* ======================================================
          ================= GRADING SECTION ===================
      ====================================================== */}

      {activeTab === "grading" && (

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">

          {/* TOP */}

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">

            <div className="flex items-center gap-3">

              <Award className="text-indigo-600" />

              <h2 className="text-3xl font-bold text-slate-900">
                Grading System
              </h2>

            </div>

            {/* EDIT BUTTON */}

            <button
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl transition-all"
            >
              <Edit size={18} />
              Edit Grading System
            </button>

          </div>

          {/* INFO */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

            {/* GRADING TYPE */}

            <div className="bg-gray-50 rounded-2xl p-5">

              <p className="text-gray-500 mb-2">
                Grading Type
              </p>

              <h3 className="text-3xl font-bold text-slate-800">
                {config?.gradingType}
              </h3>

            </div>

            {/* PASSING MARKS */}

            <div className="bg-gray-50 rounded-2xl p-5">

              <p className="text-gray-500 mb-2">
                Passing Marks
              </p>

              <h3 className="text-3xl font-bold text-slate-800">
                {config?.passingMarks}%
              </h3>

            </div>

          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">

            <table className="w-full min-w-[700px]">

              <thead className="bg-gray-100">

                <tr>

                  <th className="text-left px-5 py-4">
                    Grade
                  </th>

                  <th className="text-left px-5 py-4">
                    Min %
                  </th>

                  <th className="text-left px-5 py-4">
                    Max %
                  </th>

                  <th className="text-left px-5 py-4">
                    Grade Point
                  </th>

                  <th className="text-left px-5 py-4">
                    Remarks
                  </th>

                </tr>

              </thead>

              <tbody>

                {config?.gradeSlabs?.map((item, index) => (

                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-all"
                  >

                    <td className="px-5 py-4 font-semibold">
                      {item.grade}
                    </td>

                    <td className="px-5 py-4">
                      {item.min}
                    </td>

                    <td className="px-5 py-4">
                      {item.max}
                    </td>

                    <td className="px-5 py-4">
                      {item.point}
                    </td>

                    <td className="px-5 py-4">
                      {item.remarks}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}

    </div>
  );
};

export default AcademicConfiguration;