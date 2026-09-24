import React, { useState, useEffect, useMemo } from "react";
import {
  Eye, CheckCircle, Search, Filter, Clock3,
  ClipboardList, BookOpen, AlertTriangle, X
} from "lucide-react";
import toast from "react-hot-toast";
import StudentAdmissionDetailsModal from "../../../components/principal/StudentAdmissionDetailsModal";
import {
  getAllAdmissions as fetchAdmissionRequests,
  approveAdmission,
  rejectAdmission,
  markAdmissionInReview
} from "../../../services/api/principalAdmissionApi";

const statusConfig = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  under_review: "bg-sky-100 text-sky-800",
  cancelled: "bg-slate-100 text-slate-800",
};

const normalizeDocuments = (docs) => {
  if (!docs || typeof docs !== "object") return [];
  return Object.entries(docs)
    .filter(([, val]) => val && val.url)
    .map(([key, val]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      fileName: val.url.split("/").pop() || `${key}.pdf`,
      status: val.status || 'submitted',
      remarks: val.remarks || '',
      url: val.url,
    }));
};


const normalizeAdmissionRequest = (item, studentIndex = 0) => {
  const student = Array.isArray(item.students) ? item.students[studentIndex] || {} : {};
  const parent = item.parent || {};
  const address = parent.address || {};

  return {
    _id: item._id,
    admissionRequestId: item._id,
    studentIndex: studentIndex,
    applicationNo: item.applicationNumber || "N/A",
    submittedAt: item.submittedAt || item.createdAt || new Date().toISOString(),
    status: item.status || "pending",
    organizationName: item.organizationName || "",
    branchName: item.branchName || "",
    student: {
      fullName: student.fullName || "Unnamed",
      dob: student.dob ? new Date(student.dob).toLocaleDateString('en-IN') : "",
      gender: student.gender || "",
      bloodGroup: student.bloodGroup || "",
      aadhaar: parent.aadharNumber || "",
      previousSchool: student.previousSchool || "",
      photo: student.photo || null,
    },
    academic: {
      appliedClass: student.class?.name || student.class || "",
      preferredSection: student.section || "",
      academicYear: student.academicYear || "",
      rollNumber: student.rollNumber || "",
      transportRequired: student.transport?.required ? "Yes" : "No",
      busRoute: student.transport?.busRoute || "",
      healthNotes: student.healthNotes || "",
    },
    contact: {
      email: parent.email || "",
      phone: parent.primaryContact || "",
      alternatePhone: parent.alternateContact || "",
      city: address.city || "",
      address: [address.street, address.city, address.state, address.pincode]
        .filter(Boolean).join(", "),
    },
    parent: {
      fullName: parent.fullName || "",
      relation: parent.relation || "",
      fatherName: parent.fatherName || "",
      motherName: parent.motherName || "",
      guardianPhone: parent.alternateContact || parent.primaryContact || "",
      notifications: parent.notifications || {},
    },
    documents: normalizeDocuments(student.documents),
    remarks: item.remarks || "",
    rawStudents: item.students || [],
  };
};

// ── Reject Reason Modal ───────────────────────────────────────────────────────
const RejectModal = ({ onConfirm, onCancel, loading }) => {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Reject Admission</h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Please provide a reason for rejection. This will be sent to the parent via email.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Enter rejection reason..."
          className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-300 resize-none"
        />
        <div className="flex gap-3 mt-4 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || loading}
            className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Rejecting..." : "Confirm Reject"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const AdmissionRequests = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [classFilter, setClassFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null); // id of request being rejected
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);

  const updateStatusLocally = (id, status) => {
    setRequests((prev) => prev.map((r) => {
      return r._id === id ? { ...r, status } : r;
    }));
  };

  const loadRequests = async (page = 1) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetchAdmissionRequests({ 
          page, 
          limit: 10, 
          status: statusFilter !== "all" ? statusFilter : undefined 
      });
      
      const raw = Array.isArray(response.data) ? response.data : [];
      const normalized = raw.map(item => normalizeAdmissionRequest(item, 0));
      setRequests(normalized);
      setPagination(response.pagination || { total: normalized.length, page: 1, pages: 1 });
    } catch (error) {
      console.error("API Error details:", error);
      // This will now extract the ACTUAL error message from the backend if it exists!
      const actualErrorMsg = error?.response?.data?.message || error?.message || "Failed to fetch admission requests.";
      setErrorMessage(`Error: ${actualErrorMsg}`);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadRequests(currentPage); }, [currentPage, statusFilter]);

  // Keep modal in sync when list updates
  useEffect(() => {
    if (!selectedRequest) return;
    const latest = requests.find((r) => r._id === selectedRequest._id);
    if (latest) setSelectedRequest(latest);
  }, [requests]);

  const classOptions = useMemo(() => {
    const set = new Set(requests.map((r) => r.academic.appliedClass).filter(Boolean));
    return [...set].sort((a, b) => String(a).localeCompare(String(b)));
  }, [requests]);

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    review: requests.filter((r) => r.status === "under_review").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  }), [requests]);

  const filteredRequests = useMemo(() => requests.filter((r) => {
    const text = searchTerm.toLowerCase();
    const rawStudents = r.rawStudents || [];
    const studentMatches = rawStudents.some(s => 
      (s.fullName || "").toLowerCase().includes(text)
    );
    const matchSearch =
      studentMatches ||
      r.applicationNo.toLowerCase().includes(text) ||
      r.contact.email.toLowerCase().includes(text) ||
      r.parent.fullName.toLowerCase().includes(text);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchClass = classFilter === "all" || rawStudents.some(s => {
      const className = s.class?.name || s.class || "";
      return className === classFilter;
    });
    return matchSearch && matchStatus && matchClass;
  }), [requests, searchTerm, statusFilter, classFilter]);

  const handleViewRequest = async (request) => {
    // 1. Open the modal immediately so the UI feels fast
    setSelectedRequest(request);

    // 2. If it is currently pending, tell the backend it is now In Review
    if (request.status === "pending") {
      try {
        const dbId = request.admissionRequestId || request._id;
        await markAdmissionInReview(dbId);
        updateStatusLocally(request._id, "under_review");
      } catch (error) {
        console.error("Failed to mark as in review", error);
      }
    }
  };

  const handleApprove = async (id) => {
    const reqObj = requests.find(r => r._id === id);
    const dbId = reqObj?.admissionRequestId || id;
    setActionLoadingId(id);
    try {
      await approveAdmission(dbId);
      updateStatusLocally(id, "approved");
      toast.success("Admission approved successfully.");
    } catch (error) {
      toast.error(error?.message || "Unable to approve admission.");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleRejectConfirm = async (reason) => {
    const reqObj = requests.find(r => r._id === rejectTarget);
    const dbId = reqObj?.admissionRequestId || rejectTarget;
    setActionLoadingId(rejectTarget);
    try {
      await rejectAdmission(dbId, reason);
      updateStatusLocally(rejectTarget, "rejected");
      toast.success("Admission rejected.");
      setRejectTarget(null);
    } catch (error) {
      toast.error(error?.message || "Unable to reject admission.");
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-sky-50 to-emerald-50">
      <main className="text-left">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* Header */}
          <section className="rounded-3xl bg-blue-500 p-6 text-white shadow-xl">
            <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Principal Admissions Desk</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">Student Admission Applications</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Review applications, verify documents, and take action from a single board.
            </p>
          </section>

          {/* Loading */}
          {isLoading && (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Loading admission applications...</p>
            </section>
          )}

          {/* Error */}
          {!isLoading && errorMessage && (
            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
              <p className="text-sm font-semibold text-rose-800">{errorMessage}</p>
              <button
                onClick={() => loadRequests(currentPage)}
                className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Retry
              </button>
            </section>
          )}

          {!isLoading && !errorMessage && (
            <>
              {/* Stats */}
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: "Total", value: stats.total, icon: ClipboardList, color: "slate" },
                  { label: "Pending", value: stats.pending, icon: Clock3, color: "amber" },
                  { label: "Approved", value: stats.approved, icon: CheckCircle, color: "emerald" },
                  { label: "In Review", value: stats.review, icon: BookOpen, color: "sky" },
                  { label: "Rejected", value: stats.rejected, icon: AlertTriangle, color: "rose" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className={`rounded-2xl border border-${color}-200 bg-${color}-50 p-4 shadow-sm`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-semibold uppercase text-${color}-700`}>{label}</p>
                      <Icon className={`h-4 w-4 text-${color}-700`} />
                    </div>
                    <p className={`mt-2 text-2xl font-black text-${color}-700`}>{value}</p>
                  </div>
                ))}
              </section>

              {/* Filters */}
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="relative md:col-span-2">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by student name, application no, email..."
                      className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Filter className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 py-2 pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="under_review">In Review</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <select
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 py-2 px-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
                    >
                      <option value="all">All Classes</option>
                      {classOptions.map((cls) => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Table */}
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Applicants / Parent</div>
                  <div className="col-span-2">Application ID</div>
                  <div className="col-span-1">Class</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>

                {filteredRequests.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-500">
                    <ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-30" />
                    No admission applications match your filters.
                  </div>
                ) : (
                  filteredRequests.map((request, idx) => (
                    <div
                      key={request._id}
                      className="grid grid-cols-12 items-center border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <div className="col-span-1 text-slate-400 font-medium">{idx + 1}</div>
                      <div className="col-span-3">
                        <p className="font-bold text-slate-800 truncate">
                          {request.rawStudents?.length > 1
                            ? `${request.rawStudents[0]?.fullName || "Unnamed"} (+${request.rawStudents.length - 1})`
                            : request.student.fullName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{request.parent.fullName}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="font-mono text-xs text-slate-700 truncate">{request.applicationNo}</p>
                      </div>
                      <div className="col-span-1 text-slate-700 font-medium">
                        {request.rawStudents?.length > 1
                          ? `${request.rawStudents[0]?.class?.name || request.rawStudents[0]?.class || "—"} (+${request.rawStudents.length - 1})`
                          : (request.academic.appliedClass || "—")}
                      </div>
                      <div className="col-span-2 text-xs text-slate-500">
                        {new Date(request.submittedAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </div>
                      <div className="col-span-1">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusConfig[request.status] || "bg-slate-100 text-slate-700"}`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="col-span-2 flex justify-end gap-1.5">
                        <button
                          onClick={() => handleViewRequest(request)}
                          className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-100 transition"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {(request.status === "pending" || request.status === "under_review") && (
                          <>
                            <button
                              onClick={() => handleApprove(request._id)}
                              disabled={actionLoadingId === request._id}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                            >
                              {actionLoadingId === request._id ? "..." : "Approve"}
                            </button>
                            <button
                              onClick={() => setRejectTarget(request._id)}
                              disabled={actionLoadingId === request._id}
                              className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </section>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <section className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
                  <p className="text-sm text-slate-500">
                    Showing page {pagination.page} of {pagination.pages} ({pagination.total} total)
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium disabled:opacity-40 hover:bg-slate-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(pagination.pages, p + 1))}
                      disabled={currentPage === pagination.pages}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium disabled:opacity-40 hover:bg-slate-50"
                    >
                      Next
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedRequest && (
        <StudentAdmissionDetailsModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleApprove}
          onReject={(id) => { setSelectedRequest(null); setRejectTarget(id); }}
          actionLoadingId={actionLoadingId}
        />
      )}

      {/* Reject Reason Modal */}
      {rejectTarget && (
        <RejectModal
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
          loading={actionLoadingId === rejectTarget}
        />
      )}
    </div>
  );
};

export default AdmissionRequests;