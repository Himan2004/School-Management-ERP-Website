import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Download,
  Trash2,
  User,
  ArrowRight,
  Clock,
  ShieldAlert,
  Loader,
  AlertCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  deleteStudentChangeLog,
  getStudentChanges,
} from "../../../services/api/auditApi";

const StudentChanges = () => {
  const [studentLogs, setStudentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  const fetchStudentChanges = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getStudentChanges({
        search,
        page: pagination.page,
        limit: pagination.limit,
      });

      const logs = response?.logs || [];
      const pageInfo = response?.pagination || {};

      setStudentLogs(logs);
      setPagination((prev) => ({
        ...prev,
        total: pageInfo.total || logs.length,
        pages: pageInfo.pages || 1,
      }));
    } catch (fetchError) {
      const message = fetchError?.message || "Failed to fetch student changes";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [search, pagination.page, pagination.limit]);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        fetchStudentChanges();
      },
      search ? 300 : 0,
    );

    return () => clearTimeout(timer);
  }, [fetchStudentChanges, search]);

  const formatRelativeTime = (value) => {
    if (!value) return "N/A";
    const time = new Date(value);
    if (Number.isNaN(time.getTime())) return String(value);

    const diffMs = Date.now() - time.getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(months / 12);
    return `${years}y ago`;
  };

  // 2. Export Log Logic
  const handleExport = () => {
    if (!filteredLogs.length) {
      toast.error("No logs available to export");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Student Modification Logs", 14, 20);

    const tableData = filteredLogs.map((log) => [
      log.id,
      log.name,
      `${log.from} -> ${log.to}`,
      log.authority,
      formatRelativeTime(log.time),
    ]);

    autoTable(doc, {
      startY: 30,
      head: [["ID", "Student Name", "Change Detail", "Approved By", "Time"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save("Student_Changes_Log.pdf");
    toast.success("Log Exported Successfully!");
  };

  // 3. Delete Logic
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this log entry?")) {
      try {
        setDeletingId(id);
        const response = await deleteStudentChangeLog(id);

        if (response?.success === false) {
          toast.error(response.message || "Failed to delete log entry");
          return;
        }

        setStudentLogs((prev) => prev.filter((log) => log.id !== id));
        toast.success(response?.message || "Log entry removed");
      } catch (deleteError) {
        toast.error(deleteError?.message || "Failed to delete log entry");
      } finally {
        setDeletingId("");
      }
    }
  };

  const filteredLogs = useMemo(() => studentLogs, [studentLogs]);

  return (
    <div className="p-8 bg-[#f8faff] min-h-screen font-sans">
      <Toaster />

      {/* Header Section */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2">
            Compliance & Audit
          </p>
          <h2 className="text-4xl font-bold text-slate-800">
            Student <span className="text-blue-600">Changes</span>
          </h2>
        </div>
        <button
          onClick={handleExport}
          className="px-8 py-3.5 bg-[#0f172a] text-white rounded-2xl font-bold flex items-center gap-3 shadow-xl hover:scale-105 transition-all"
        >
          <Download size={18} /> Export Log
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-[45px] shadow-sm border border-gray-50 p-10">
        {/* Search Input */}
        <div className="relative max-w-lg mb-12 group">
          <Search
            className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Search student ID or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-full pl-16 pr-6 py-4 bg-gray-50 rounded-3xl outline-none border-none text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>

        {/* Logs List */}
        <div className="space-y-6">
          {error ? (
            <div className="text-center py-20 bg-red-50 rounded-[35px] border border-red-100">
              <AlertCircle size={40} className="mx-auto text-red-400 mb-4" />
              <p className="text-red-600 font-bold">{error}</p>
              <button
                onClick={fetchStudentChanges}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg font-semibold"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="text-center py-20 bg-gray-50 rounded-[35px] border-2 border-dashed border-gray-100">
              <Loader
                size={40}
                className="mx-auto text-blue-400 mb-4 animate-spin"
              />
              <p className="text-gray-500 font-bold italic">
                Loading student change records...
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-6 bg-white border border-gray-50 rounded-[35px] hover:shadow-md transition-all group"
              >
                {/* Student Info */}
                <div className="flex items-center gap-5 w-1/4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <User size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">
                      {log.name}
                    </h4>
                    <p className="text-[11px] font-black text-blue-500 tracking-tighter uppercase">
                      {log.id}
                    </p>
                  </div>
                </div>

                {/* Change Tracking (The AI/Modern Feel) */}
                <div className="flex items-center gap-6 w-1/3">
                  <span className="text-sm font-bold text-gray-400">
                    {log.from}
                  </span>
                  <ArrowRight size={16} className="text-blue-400" />
                  <span
                    className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                      log.to === "TC Issued"
                        ? "bg-red-50 text-red-500 border border-red-100"
                        : "bg-green-50 text-green-500 border border-green-100"
                    }`}
                  >
                    {log.to}
                  </span>
                </div>

                {/* Authority Info */}
                <div className="w-1/6">
                  <span className="px-4 py-2 bg-gray-50 rounded-xl text-xs font-black text-slate-600 uppercase tracking-tighter">
                    {log.authority}
                  </span>
                </div>

                {/* Timeline & Action */}
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2 text-gray-300 font-bold text-sm italic">
                    <Clock size={14} /> {formatRelativeTime(log.time)}
                  </div>
                  <button
                    onClick={() => handleDelete(log.id)}
                    disabled={deletingId === log.id}
                    className="p-3 text-red-100 group-hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    {deletingId === log.id ? (
                      <Loader size={18} className="animate-spin" />
                    ) : (
                      <Trash2 size={18} />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}

          {!loading && !error && filteredLogs.length === 0 && (
            <div className="text-center py-20 bg-gray-50 rounded-[35px] border-2 border-dashed border-gray-100">
              <ShieldAlert size={40} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-400 font-bold italic">
                No student change records found for this search.
              </p>
            </div>
          )}
        </div>

        {!loading && !error && filteredLogs.length > 0 && (
          <div className="px-2 pt-8 flex items-center justify-between text-sm text-gray-500">
            <span>
              Showing {filteredLogs.length} of {pagination.total} logs
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.max(1, prev.page - 1),
                  }))
                }
                disabled={pagination.page <= 1}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.pages || 1}
              </span>
              <button
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: Math.min(prev.pages || 1, prev.page + 1),
                  }))
                }
                disabled={pagination.page >= (pagination.pages || 1)}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentChanges;
