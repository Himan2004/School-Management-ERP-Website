import React, { useState, useEffect, useCallback, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  Plus,
  FileText,
  Trash2,
  History as HistoryIcon,
  RefreshCcw,
  Globe,
  Eye,
  Clock,
} from "lucide-react";
import {
  getPoliciesApi,
  uploadPolicyApi,
  updatePolicyStatusApi,
  deletePolicyApi,
  getGovernanceAuditLogsApi,
} from "../../../services/api/policyApi";

// ── Shared Component Imports ───────────────────────────────────────────────
import {
  Heading,
  DashGrid,
  DashCard,
  DataTable,
  PanelModal,
  Grid,
  DataField,
  Button,
} from "../../../components/shared/Common_Components";

const HQDisciplineGovernance = () => {
  const [activeTab, setActiveTab] = useState("policies");
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyName, setPolicyName] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // PDF Viewer Modal State & API Base URL
  const [viewingPolicy, setViewingPolicy] = useState(null);
  const rawBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";
  const apiBaseUrl = rawBaseUrl.endsWith("/api")
    ? rawBaseUrl
    : `${rawBaseUrl.replace(/\/$/, "")}/api`;

  // Live Data State
  const [policies, setPolicies] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Fetch Live Data
  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [policiesRes, logsRes] = await Promise.all([
        getPoliciesApi(),
        getGovernanceAuditLogsApi(),
      ]);

      if (policiesRes.success) setPolicies(policiesRes.data);
      if (logsRes.success) setAuditLogs(logsRes.data);
    } catch (error) {
      console.error("Failed to load governance data:", error);
      toast.error(error.message || "Failed to load governance data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData(true);
    setIsRefreshing(false);
    toast.success("Governance database updated successfully.");
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    if (!policyName.trim()) {
      toast.error("Policy Name is required");
      return;
    }
    if (!pdfFile) {
      toast.error("Please select a PDF file to upload");
      return;
    }

    const formData = new FormData();
    formData.append("policyName", policyName.trim());
    formData.append("pdfFile", pdfFile);

    setIsRefreshing(true);
    try {
      const res = await uploadPolicyApi(formData);
      if (res.success) {
        toast.success("New PDF policy attached successfully!");
        setShowPolicyModal(false);
        setPolicyName("");
        setPdfFile(null);
        await loadData(true);
      }
    } catch (error) {
      console.error("Policy upload error:", error);
      toast.error(error.message || "Failed to attach policy");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeletePolicy = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete policy: "${name}"?`)) {
      try {
        const res = await deletePolicyApi(id);
        if (res.success) {
          toast.success("Policy deleted from registry successfully.");
          await loadData(true);
        }
      } catch (error) {
        console.error("Delete policy error:", error);
        toast.error(error.message || "Failed to delete policy");
      }
    }
  };

  const togglePolicyStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const res = await updatePolicyStatusApi(id, newStatus);
      if (res.success) {
        toast.success(`Policy status updated to ${newStatus}.`);
        await loadData(true);
      }
    } catch (error) {
      console.error("Toggle policy status error:", error);
      toast.error(error.message || "Failed to update policy status");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "N/A";
    const seconds = Math.floor(
      (Date.now() - new Date(dateStr).getTime()) / 1000,
    );
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const activePoliciesCount = policies.filter(
    (p) => p.status === "Active",
  ).length;

  // ── Formatted Data for DataTables ──
  const policyRows = useMemo(
    () =>
      policies.map((p) => ({
        ...p,
        uploadedDate: formatDate(p.uploadedAt || p.createdAt),
      })),
    [policies],
  );

  const auditRows = useMemo(
    () =>
      auditLogs.map((log) => ({
        ...log,
        timeAgo: formatTimeAgo(log.timestamp || log.createdAt),
      })),
    [auditLogs],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <RefreshCcw className="w-10 h-10 text-[#223F74] animate-spin" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">
            Loading Governance Module...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full font-sans space-y-6 pb-10">
      <Toaster />

      {/* Header */}
      <Heading
        primaryText="Discipline Policy"
        secondaryText="GOVERNANCE & RULES"
        size={12}
        action={
          <div className="flex gap-3 items-center">
            <Button
              icon={<RefreshCcw size={16} className={isRefreshing ? "animate-spin" : ""} />}
              variant="secondary"
              onClick={handleRefresh}
            />
            <Button
              text="ATTACH NEW POLICY"
              icon={<Plus size={16} />}
              variant="primary"
              onClick={() => {
                setPdfFile(null);
                setPolicyName("");
                setShowPolicyModal(true);
              }}
            />
          </div>
        }
      />

      {/* KPI Cards */}
      <DashGrid cols={12} gap={4}>
        <DashCard
          title="Active Policies"
          value={activePoliciesCount}
          icon={<FileText size={22} />}
          accentColor="#10b981"
          size={4}
        />
        <DashCard
          title="Total Policies"
          value={policies.length}
          icon={<Globe size={22} />}
          accentColor="#3b82f6"
          size={4}
        />
        <DashCard
          title="Audit Trail Logs"
          value={auditLogs.length}
          icon={<HistoryIcon size={22} />}
          accentColor="#8b5cf6"
          size={4}
        />
      </DashGrid>

      {/* Main Content Area */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col gap-6">
        {/* Simple Tab Navigation */}
        <div className="flex gap-2 p-1 bg-slate-100/80 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("policies")}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === "policies"
                ? "bg-white text-[#223F74] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Manage Policies
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === "analytics"
                ? "bg-white text-[#223F74] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Audit Trail
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "policies" && (
            <DataTable
              title="All Policies"
              columns={[
                {
                  key: "policyName",
                  label: "Policy Name",
                  render: (val, row) => (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <FileText size={16} />
                      </div>
                      <span className="font-bold text-slate-800">{val}</span>
                      {row.pdfFile?.includes("/image/upload/") && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded uppercase">
                          Legacy
                        </span>
                      )}
                    </div>
                  ),
                },
                { key: "uploadedDate", label: "Uploaded Date" },
                { 
                  key: "status", 
                  label: "Status",
                  render: (val) => (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${val === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {val}
                    </span>
                  )
                },
              ]}
              rows={policyRows}
              size={12}
              pageSize={10}
              searchable={true}
              actions={[
                {
                  icon: <Eye size={16} />,
                  tooltip: "View Policy Document",
                  variant: "primary",
                  onClick: (row) => setViewingPolicy(row),
                },
                {
                  label: (row) => row.status === "Active" ? "Deactivate" : "Activate",
                  variant: "ghost",
                  onClick: (row) => togglePolicyStatus(row._id, row.status),
                },
                {
                  icon: <Trash2 size={16} />,
                  tooltip: "Delete Policy",
                  variant: "danger",
                  onClick: (row) => handleDeletePolicy(row._id, row.policyName),
                },
              ]}
            />
          )}

          {activeTab === "analytics" && (
            <DataTable
              title="Audit Trail"
              columns={[
                {
                  key: "action",
                  label: "Action",
                  render: (val, row) => (
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${row.type === "create" ? "bg-emerald-100 text-emerald-600" : row.type === "delete" ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"}`}>
                        <Clock size={16} />
                      </div>
                      <span className="font-semibold text-slate-800">{val}</span>
                    </div>
                  ),
                },
                {
                  key: "user",
                  label: "User",
                  render: (val) => <span className="text-sm font-medium text-slate-500">By {val}</span>,
                },
                {
                  key: "timeAgo",
                  label: "Time",
                  align: "right",
                  render: (val) => <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">{val}</span>,
                },
              ]}
              rows={auditRows}
              size={12}
              pageSize={10}
              searchable={true}
            />
          )}
        </div>
      </div>

      {/* Attach Policy Modal */}
      <PanelModal
        isVisible={showPolicyModal}
        onClose={() => setShowPolicyModal(false)}
        title="Attach New Policy"
        size="md"
      >
        <form onSubmit={handleSavePolicy} className="space-y-6">
          <Grid cols={12} gap={4}>
            <DataField
              label="Policy Name"
              value={policyName}
              onChange={(e) => setPolicyName(e.target.value)}
              placeholder="e.g. Anti-Bullying Directive"
              size={12}
            />
            <div className="col-span-12">
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none mb-2 mt-2">
                PDF Document
              </label>
              <label className="border-2 border-dashed border-slate-200 hover:border-[#223F74] bg-slate-50 transition-all rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer relative overflow-hidden group">
                <input
                  type="file"
                  accept=".pdf"
                  required
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
                        toast.error("Only PDF files are allowed");
                        e.target.value = "";
                        setPdfFile(null);
                        return;
                      }
                      setPdfFile(file);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="bg-[#223F74]/10 p-3 rounded-full text-[#223F74] group-hover:scale-110 transition-transform">
                  <FileText size={24} />
                </div>
                <div className="text-center pointer-events-none">
                  <span className="text-sm font-bold text-slate-700 block">
                    {pdfFile ? pdfFile.name : "Select PDF Document"}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    {pdfFile ? `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB` : "Click to browse files"}
                  </span>
                </div>
              </label>
            </div>
          </Grid>
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
             <Button
               text="Cancel"
               variant="ghost"
               type="button"
               onClick={() => setShowPolicyModal(false)}
             />
             <Button
               text="Upload Policy"
               variant="primary"
               type="submit"
               loading={isRefreshing}
               disabled={isRefreshing}
             />
          </div>
        </form>
      </PanelModal>

      {/* PDF Viewer Modal */}
      <PanelModal
        isVisible={!!viewingPolicy}
        onClose={() => setViewingPolicy(null)}
        title={viewingPolicy?.policyName || "Document Viewer"}
        size="2xl"
      >
        {viewingPolicy && (
          <div className="w-full bg-slate-100 h-[75vh] rounded-2xl overflow-hidden shadow-inner border border-slate-200">
            <iframe
              src={`${apiBaseUrl}/policies/${viewingPolicy._id}/view?token=${localStorage.getItem("token")}`}
              className="w-full h-full border-none"
              title={viewingPolicy.policyName}
            />
          </div>
        )}
      </PanelModal>
    </div>
  );
};

export default HQDisciplineGovernance;
