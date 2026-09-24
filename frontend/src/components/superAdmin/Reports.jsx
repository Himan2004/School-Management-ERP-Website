import React, { useEffect, useState } from "react";

import {
  FileText,
  Download,
  Search,
  Calendar,
  BarChart3,
  Users,
 School,
  IndianRupee,
  ArrowLeft,
  Filter,
  Eye,
  RefreshCcw,
} from "lucide-react";

import axios from "axios";

import { useNavigate } from "react-router-dom";

const Reports = () => {

  const navigate = useNavigate();

  // ================= STATES =================

  const [searchTerm, setSearchTerm] = useState("");

  const [reportsData, setReportsData] = useState([]);

  const [loading, setLoading] = useState(true);

  // ================= FETCH REPORTS =================

  const fetchReports = async () => {

    try {

      setLoading(true);

      const response = await axios.get(
        "http://localhost:5000/api/reports"
      );

      setReportsData(response.data);

    } catch (error) {

      console.log(error);

      alert("Failed To Load Reports");

    } finally {

      setLoading(false);

    }
  };

  // ================= USE EFFECT =================

  useEffect(() => {

    fetchReports();

  }, []);

  // ================= FILTERED REPORTS =================

  const filteredReports = reportsData.filter((report) =>
    report.reportName
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // ================= DOWNLOAD =================

  const handleDownload = (name) => {

    alert(`${name} Downloaded Successfully`);

  };

  // ================= VIEW =================

  const handleView = (name) => {

    alert(`Viewing ${name}`);

  };

  // ================= GENERATE =================

  const handleGenerate = () => {

    alert("Report Generated Successfully!");

  };

  // ================= LOADING =================

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef2f7]">

        <div className="text-center">

          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>

          <h2 className="text-xl font-bold text-slate-700">
            Loading Reports...
          </h2>

        </div>

      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef2f7] p-3 sm:p-5 md:p-8">

      {/* ================= HEADER ================= */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">

        <div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">
            Reports Dashboard
          </h1>

          <p className="text-gray-500 mt-2 text-sm sm:text-base">
            Manage, generate and export ERP reports
          </p>

        </div>

        {/* BUTTONS */}

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">

          {/* BACK */}

          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-100 border border-gray-200 px-6 py-3 rounded-2xl shadow-sm transition-all cursor-pointer w-full sm:w-auto"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          {/* REFRESH */}

          <button
            onClick={fetchReports}
            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-2xl shadow-sm transition-all cursor-pointer w-full sm:w-auto"
          >
            <RefreshCcw size={18} />
            Refresh
          </button>

          {/* GENERATE */}

          <button
            onClick={handleGenerate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl shadow-sm transition-all cursor-pointer w-full sm:w-auto"
          >
            Generate Report
          </button>

        </div>

      </div>

      {/* ================= CARDS ================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">

        {/* CARD 1 */}

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-gray-400 text-sm">
                Total Reports
              </p>

              <h2 className="text-3xl font-bold text-slate-800 mt-2">
                {reportsData.length}
              </h2>

            </div>

            <div className="bg-blue-100 p-4 rounded-2xl">
              <FileText className="text-blue-600" />
            </div>

          </div>

        </div>

        {/* CARD 2 */}

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-gray-400 text-sm">
                School Reports
              </p>

              <h2 className="text-3xl font-bold text-green-600 mt-2">
                {
                  reportsData.filter(
                    (item) => item.category === "Finance"
                  ).length
                }
              </h2>

            </div>

            <div className="bg-green-100 p-4 rounded-2xl">
              <School className="text-green-600" />
            </div>

          </div>

        </div>

        {/* CARD 3 */}

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-gray-400 text-sm">
                Student Reports
              </p>

              <h2 className="text-3xl font-bold text-orange-600 mt-2">
                {
                  reportsData.filter(
                    (item) => item.category === "Students"
                  ).length
                }
              </h2>

            </div>

            <div className="bg-orange-100 p-4 rounded-2xl">
              <Users className="text-orange-600" />
            </div>

          </div>

        </div>

        {/* CARD 4 */}

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-gray-400 text-sm">
                Revenue Reports
              </p>

              <h2 className="text-3xl font-bold text-purple-600 mt-2">
                ₹{reportsData.length * 2000}
              </h2>

            </div>

            <div className="bg-purple-100 p-4 rounded-2xl">
              <IndianRupee className="text-purple-600" />
            </div>

          </div>

        </div>

      </div>

      {/* ================= SEARCH & FILTER ================= */}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-8">

        <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">

          {/* SEARCH */}

          <div className="relative w-full lg:max-w-md">

            <Search
              size={18}
              className="absolute left-4 top-4 text-gray-400"
            />

            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(e.target.value)
              }
              className="w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          {/* FILTER */}

          <button
            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 px-5 py-3 rounded-2xl transition-all cursor-pointer"
          >
            <Filter size={18} />
            Filter Reports
          </button>

        </div>

      </div>

      {/* ================= TABLE ================= */}

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">

        {/* HEADER */}

        <div className="border-b border-gray-100 p-5 sm:p-8">

          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <BarChart3 className="text-blue-600" />
            Reports List
          </h2>

          <p className="text-gray-500 mt-2 text-sm">
            View and manage all generated ERP reports
          </p>

        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">

          <table className="w-full min-w-[800px]">

            <thead className="bg-gray-50">

              <tr>

                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Report Name
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Category
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Date
                </th>

                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Status
                </th>

                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">
                  Actions
                </th>

              </tr>

            </thead>

            <tbody>

              {filteredReports.map((report) => (

                <tr
                  key={report._id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-all"
                >

                  <td className="px-6 py-5 font-semibold text-slate-700">
                    {report.reportName}
                  </td>

                  <td className="px-6 py-5 text-gray-600">
                    {report.category}
                  </td>

                  <td className="px-6 py-5 text-gray-600">
                    {report.date}
                  </td>

                  <td className="px-6 py-5">

                    <span
                      className={`px-4 py-1 rounded-full text-xs font-semibold ${
                        report.status === "Generated"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {report.status}
                    </span>

                  </td>

                  {/* ACTIONS */}

                  <td className="px-6 py-5">

                    <div className="flex items-center justify-center gap-3">

                      {/* VIEW */}

                      <button
                        onClick={() =>
                          handleView(report.reportName)
                        }
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-3 rounded-xl transition-all cursor-pointer"
                      >
                        <Eye size={18} />
                      </button>

                      {/* DOWNLOAD */}

                      <button
                        onClick={() =>
                          handleDownload(report.reportName)
                        }
                        className="bg-green-100 hover:bg-green-200 text-green-700 p-3 rounded-xl transition-all cursor-pointer"
                      >
                        <Download size={18} />
                      </button>

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* ================= QUICK REPORTS ================= */}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">

        {/* QUICK CARD */}

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">

          <div className="flex items-center justify-between mb-5">

            <div className="bg-blue-100 p-4 rounded-2xl">
              <Calendar className="text-blue-600" />
            </div>

            <button
              onClick={handleGenerate}
              className="text-blue-600 font-semibold hover:underline"
            >
              Generate
            </button>

          </div>

          <h3 className="text-xl font-bold text-slate-800">
            Monthly Report
          </h3>

          <p className="text-gray-500 mt-2 text-sm">
            Generate school monthly analytics reports
          </p>

        </div>

        {/* QUICK CARD */}

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">

          <div className="flex items-center justify-between mb-5">

            <div className="bg-green-100 p-4 rounded-2xl">
              <Users className="text-green-600" />
            </div>

            <button
              onClick={handleGenerate}
              className="text-green-600 font-semibold hover:underline"
            >
              Generate
            </button>

          </div>

          <h3 className="text-xl font-bold text-slate-800">
            Students Report
          </h3>

          <p className="text-gray-500 mt-2 text-sm">
            Export students performance reports
          </p>

        </div>

        {/* QUICK CARD */}

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">

          <div className="flex items-center justify-between mb-5">

            <div className="bg-purple-100 p-4 rounded-2xl">
              <IndianRupee className="text-purple-600" />
            </div>

            <button
              onClick={handleGenerate}
              className="text-purple-600 font-semibold hover:underline"
            >
              Generate
            </button>

          </div>

          <h3 className="text-xl font-bold text-slate-800">
            Revenue Report
          </h3>

          <p className="text-gray-500 mt-2 text-sm">
            Download financial analytics reports
          </p>

        </div>

      </div>

    </div>
  );
};

export default Reports;