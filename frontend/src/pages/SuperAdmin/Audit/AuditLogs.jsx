import React, { useCallback, useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { getAuditBranches } from "../../../services/api/auditApi";
import { Heading, DataTable } from "../../../components/shared/Common_Components";

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAuditBranches({
        search: "",
        page: 1,
        limit: 1000,
      });

      const branchPayload = response?.data ?? response ?? {};
      const branches = branchPayload.branches ?? [];

      // Map keys correctly for DataTable component
      const mapped = branches.map((log) => ({
        ...log,
        date: log.timestamp, // key used by DataTable's date range filter
      }));

      setLogs(mapped);
    } catch (fetchError) {
      const message =
        fetchError?.message ||
        fetchError?.response?.data?.message ||
        "Failed to load audit logs";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Table Columns Definition
  const columns = [
    {
      key: "schoolName",
      label: "School",
    },
    {
      key: "userName",
      label: "User",
    },
    {
      key: "role",
      label: "Role",
      render: (_, row) => {
        const viewStatus = row.role || "Unknown";
        let badgeCls = "bg-blue-50 text-blue-500 border border-blue-100";
        if (viewStatus.toLowerCase() === "principal") {
          badgeCls = "bg-purple-50 text-purple-600 border border-purple-100";
        } else if (viewStatus.toLowerCase() === "teacher") {
          badgeCls = "bg-indigo-50 text-indigo-600 border border-indigo-100";
        }
        return (
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeCls}`}>
            {viewStatus}
          </span>
        );
      },
    },
    {
      key: "timestamp",
      label: "Log In Time",
      render: (_, row) => new Date(row.timestamp).toLocaleString(),
      sortValue: (row) => new Date(row.timestamp).getTime(),
    },
  ];

  // Table Filters Definition
  const filters = [
    {
      title: "Role",
      type: "select",
      key: "role",
      options: ["teacher", "principal"],
    },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans min-h-screen">
      <Heading
        primaryText="Audit"
        secondaryText="Logs"
        size={12}
        showAnimations={true}
      />

      <div>
        {error ? (
          <div className="bg-white rounded-[1.5rem] sm:rounded-[30px] shadow-sm border border-gray-100 p-8 sm:p-12 flex items-center justify-center min-h-[300px] sm:min-h-[400px]">
            <div className="text-center max-w-lg px-4">
              <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
              <p className="text-gray-900 font-bold text-base sm:text-lg">
                Unable to load audit logs
              </p>
              <p className="text-gray-500 text-sm sm:text-base mt-2">{error}</p>
              <button
                onClick={fetchAuditLogs}
                className="mt-5 sm:mt-6 px-5 sm:px-6 py-2.5 sm:py-3 bg-[#223F74] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#1a3360] transition-all shadow-sm"
              >
                Retry
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
            <Loader2 className="animate-spin text-[#223F74]" size={24} />
            <span className="font-semibold text-sm">Loading audit logs...</span>
          </div>
        ) : (
          <DataTable
            title="Login Audit Trail"
            size={12}
            columns={columns}
            rows={logs}
            searchable={true}
            exportable={true}
            exportFileName="login_audit_logs"
            date={true}
            filters={filters}
            onRefresh={fetchAuditLogs}
            pageSize={10}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
