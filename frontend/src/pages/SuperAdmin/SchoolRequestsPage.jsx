import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { selectSuperAdmin } from "../../features/auth/superAuthSlice.js";
import {
  getSchoolRequests,
  acceptSchoolRequest,
  rejectSchoolRequest,
  clearError,
  clearMessage,
  getAllSchools,
} from "../../features/superAdmin/superAdminSlice.js";
import toast from "react-hot-toast";
import api from "../../services/api.js";
import {
  School,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Calendar,
  Headset,
} from "lucide-react";
import {
  Heading,
  DashGrid,
  DashCard,
  DataTable,
  PanelModal,
  ModalProfile,
  ModalGrid,
  ModalData,
  Button,
} from "../../components/shared/Common_Components";

function timeAgo(date) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000),
    h = Math.floor(diff / 3600000),
    d = Math.floor(diff / 86400000);
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function SchoolRequestsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { requests = [], schools = [], loading, error, message } = useSelector(
    (state) => state.superAdmin
  );
  const authUser = useSelector(selectSuperAdmin);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvingRequest, setApprovingRequest] = useState(null);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessingRejection, setIsProcessingRejection] = useState(false);

  const [validationDetails, setValidationDetails] = useState(null);

  useEffect(() => {
    dispatch(getSchoolRequests());
    const orgId = localStorage.getItem("organizationMongoId") || authUser?.organization?._id || authUser?.organizationId || authUser?.superAdmin?.organization || "";
    if (orgId) {
      dispatch(getAllSchools({ status: "all", organizationId: orgId }));
    }
  }, [dispatch, authUser]);

  useEffect(() => {
    if (message) {
      toast.success(message);
      dispatch(clearMessage());
    }
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [message, error, dispatch]);

  const handleApproveConfirm = async () => {
    if (!approvingRequest) return;
    try {
      setIsProcessingApproval(true);

      const orgId = localStorage.getItem("organizationMongoId") || authUser?.organization?._id || authUser?.organizationId || authUser?.superAdmin?.organization || "";
      if (!orgId) {
        toast.error("Organization ID is missing.");
        return;
      }

      // Step 1: Fetch current organization subscription (quotas)
      const orgRes = await api.get(`/school/organizations/${orgId}`);
      const orgData = orgRes.data.data;
      if (!orgData) {
        toast.error("Failed to fetch organization details for validation.");
        return;
      }

      // Step 2: Calculate current usage
      const quotas = orgData.quotas || {};
      const maxSchools = quotas.maxSchools || 1;
      const maxStudents = quotas.maxStudents || 500;
      const maxStaff = quotas.maxStaff !== undefined
        ? quotas.maxStaff
        : (quotas.maxTeachingStaff || 0) + (quotas.maxNonTeachingStaff || 0) || 70;

      const currentSchoolsCount = schools.length;
      const currentStudentCapacityUsed = schools.reduce((sum, s) => sum + (Number(s.enrollmentCapacity) || 0), 0);
      const currentStaffCapacityUsed = schools.reduce((sum, s) => {
        const staffCount = s.totalStaff !== undefined && s.totalStaff !== ""
          ? Number(s.totalStaff) || 0
          : (Number(s.totalTeachingStaff) || 0) + (Number(s.totalNonTeachingStaff) || 0);
        return sum + staffCount;
      }, 0);

      // Step 3: Read incoming School Request values
      const requestedStudents = Number(approvingRequest.totalStudents) || 0;
      const requestedStaff = approvingRequest.totalStaff !== undefined && approvingRequest.totalStaff !== ""
        ? Number(approvingRequest.totalStaff) || 0
        : (Number(approvingRequest.totalTeachingStaff) || 0) + (Number(approvingRequest.totalNonTeachingStaff) || 0);

      // Step 4: Calculate future totals
      const afterApprovalSchools = currentSchoolsCount + 1;
      const afterApprovalStudents = currentStudentCapacityUsed + requestedStudents;
      const afterApprovalStaff = currentStaffCapacityUsed + requestedStaff;

      const isSchoolExceeded = afterApprovalSchools > maxSchools;
      const isStudentExceeded = afterApprovalStudents > maxStudents;
      const isStaffExceeded = afterApprovalStaff > maxStaff;

      // Validate all of these
      if (isSchoolExceeded || isStudentExceeded || isStaffExceeded) {
        setValidationDetails({
          schoolLimit: {
            allocated: maxSchools,
            currentlyUsed: currentSchoolsCount,
            afterApproval: afterApprovalSchools,
            exceeded: isSchoolExceeded,
          },
          studentLimit: {
            allocated: maxStudents,
            currentlyUsed: currentStudentCapacityUsed,
            requested: requestedStudents,
            afterApproval: afterApprovalStudents,
            exceeded: isStudentExceeded,
            exceededBy: isStudentExceeded ? afterApprovalStudents - maxStudents : 0,
          },
          staffLimit: {
            allocated: maxStaff,
            currentlyUsed: currentStaffCapacityUsed,
            requested: requestedStaff,
            afterApproval: afterApprovalStaff,
            exceeded: isStaffExceeded,
            exceededBy: isStaffExceeded ? afterApprovalStaff - maxStaff : 0,
          },
        });
        setApprovingRequest(null); // Close approval confirm modal
        return;
      }

      // If valid, proceed to API call
      const limits = {
        maxStaffLimit: requestedStaff,
        maxStudentLimit: requestedStudents,
      };
      
      await dispatch(acceptSchoolRequest({ id: approvingRequest._id, ...limits })).unwrap();
      toast.success("School registration approved successfully!");
      setApprovingRequest(null);
      dispatch(getSchoolRequests());

      // Refresh registered schools count/data
      dispatch(getAllSchools({ status: "all", organizationId: orgId }));
    } catch (err) {
      console.error(err);
      if (err?.reason === "subscription_limit_exceeded" && err?.validation) {
        setValidationDetails(err.validation);
        setApprovingRequest(null);
      } else {
        const errorMsg = err?.message || "Failed to approve school registration.";
        toast.error(errorMsg);
      }
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingRequest) return;
    try {
      setIsProcessingRejection(true);
      await dispatch(rejectSchoolRequest({ id: rejectingRequest._id, reason: rejectionReason })).unwrap();
      toast.success("School registration request declined.");
      setRejectingRequest(null);
      setRejectionReason("");
      dispatch(getSchoolRequests());
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to reject school registration.");
    } finally {
      setIsProcessingRejection(false);
    }
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const stats = useMemo(() => {
    const today = requests.filter((r) => new Date(r.createdAt) >= todayStart).length;
    return {
      pending: requests.filter((r) => r.status === "pending").length,
      accepted: requests.filter((r) => r.status === "accepted" || r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
      today,
    };
  }, [requests]);

  const requestBoards = useMemo(() => {
    const boards = new Set();
    requests.forEach((r) => {
      if (r.board) boards.add(r.board);
    });
    return Array.from(boards);
  }, [requests]);

  const tableRequests = useMemo(() => {
    return requests.map((r) => ({
      ...r,
      date: r.createdAt ? r.createdAt.substring(0, 10) : "",
    }));
  }, [requests]);

  const renderStatusBadge = (status) => {
    const normalized = String(status).toLowerCase();
    if (normalized === "accepted" || normalized === "approved") {
      return (
        <span className="px-2.5 py-1 text-xs font-bold bg-green-50 text-green-700 border border-green-200 rounded-full uppercase tracking-wider">
          Approved
        </span>
      );
    }
    if (normalized === "rejected") {
      return (
        <span className="px-2.5 py-1 text-xs font-bold bg-red-50 text-red-700 border border-red-200 rounded-full uppercase tracking-wider">
          Rejected
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full uppercase tracking-wider">
        Pending
      </span>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* ── Summary Cards ── */}
      <div className="mt-6 mb-8">
        <DashGrid cols={12} gap={4}>
          <DashCard
            title="Pending Requests"
            value={stats.pending}
            icon={<Clock size={22} />}
            accentColor="#eab308"
            size={3}
          />
          <DashCard
            title="Approved Requests"
            value={stats.accepted}
            icon={<CheckCircle2 size={22} />}
            accentColor="#22c55e"
            size={3}
          />
          <DashCard
            title="Rejected Requests"
            value={stats.rejected}
            icon={<XCircle size={22} />}
            accentColor="#ef4444"
            size={3}
          />
          <DashCard
            title="Today's Requests"
            value={stats.today}
            icon={<Calendar size={22} />}
            accentColor="#3b82f6"
            size={3}
          />
        </DashGrid>
      </div>

      {/* ── Main Data Table ── */}
      {loading ? (
        <div className="w-full flex justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <span className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></span>
            <p className="text-slate-500 font-semibold text-sm animate-pulse">Loading requests...</p>
          </div>
        </div>
      ) : (
        <DataTable
          title="Onboarding Queue"
          columns={[
            {
              key: "schoolName",
              label: "School Name",
              render: (val, row) => (
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800">{val}</span>
                  <span className="text-xs text-slate-500 font-medium">
                    {row.city || "Unknown Location"}
                  </span>
                </div>
              ),
            },
            {
              key: "principalName",
              label: "Principal",
              render: (val, row) => (
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-700">{val || "—"}</span>
                  <span className="text-xs text-slate-500">{row.principalEmail || row.officialEmail || "N/A"}</span>
                </div>
              ),
            },
            { key: "board", label: "Board" },
            { key: "mediumOfInstruction", label: "Medium" },
            {
              key: "gradesOffered",
              label: "Requested Classes",
              render: (val) => {
                if (!val) return "0 Classes";
                if (Array.isArray(val)) {
                  return `${val.length} Classes`;
                }
                if (typeof val === "string") {
                  const count = val.split(",").map((c) => c.trim()).filter(Boolean).length;
                  return `${count} Classes`;
                }
                return "0 Classes";
              },
            },
            {
              key: "totalStudents",
              label: "Student Capacity",
              align: "center",
              render: (val, row) => val || row.enrollmentCapacity || "0",
            },
            {
              key: "totalStaff",
              label: "Staff Capacity",
              align: "center",
              render: (val, row) =>
                val !== undefined && val !== ""
                  ? val
                  : (Number(row.totalTeachingStaff) || 0) + (Number(row.totalNonTeachingStaff) || 0) || "0",
            },
            {
              key: "createdAt",
              label: "Requested Date",
              render: (val) => new Date(val).toLocaleDateString(),
            },
            {
              key: "status",
              label: "Status",
              align: "center",
              render: (val) => renderStatusBadge(val),
            },
          ]}
          rows={tableRequests}
          actions={[
            {
              icon: <Eye size={16} />,
              tooltip: "View Detail",
              variant: "ghost",
              onClick: (row) => setSelectedRequest(row),
            },
            {
              icon: <CheckCircle2 size={16} />,
              tooltip: "Approve Request",
              variant: "ghost",
              show: (row) => row.status === "pending",
              onClick: (row) => setApprovingRequest(row),
            },
            {
              icon: <XCircle size={16} />,
              tooltip: "Reject Request",
              variant: "danger",
              show: (row) => row.status === "pending",
              onClick: (row) => setRejectingRequest(row),
            },
          ]}
          filters={[
            {
              title: "Status",
              type: "select",
              key: "status",
              options: ["Pending", "Approved", "Rejected"],
              fn: (row, value) => {
                const statusMap = {
                  "Pending": "pending",
                  "Approved": "accepted",
                  "Rejected": "rejected"
                };
                const mapped = statusMap[value] || value.toLowerCase();
                return String(row.status || "").toLowerCase() === mapped;
              }
            },
            {
              title: "Board",
              type: "select",
              key: "board",
              options: requestBoards,
            }
          ]}
          date={true}
          searchable={true}
          noRecordsMessage="No school registration requests found."
          size={12}
          pageSize={10}
        />
      )}

      {/* ── Modals ── */}
      <PanelModal
        isVisible={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        title="School Registration Request"
        size="md"
      >
        {selectedRequest && (
          <div className="flex flex-col gap-6">
            <ModalProfile
              name={selectedRequest.schoolName}
              subtitle={`Board: ${selectedRequest.board || "Not Specified"}`}
              meta={`Submitted ${timeAgo(selectedRequest.createdAt)}`}
              avatarColor="#eab308"
            />
            <ModalGrid title="School Information" cols={2}>
              <ModalData
                label="Branch Creation ID"
                value={selectedRequest.branchCreationId || "—"}
              />
              <ModalData
                label="Established"
                value={selectedRequest.yearOfEstablishment || "—"}
              />
              <ModalData
                label="School Type"
                value={selectedRequest.schoolType || "—"}
              />
              <ModalData
                label="Medium"
                value={selectedRequest.mediumOfInstruction || "—"}
              />
              <ModalData
                label="Grades Requested"
                value={selectedRequest.gradesOffered || "—"}
              />
              <ModalData
                label="Student Capacity"
                value={selectedRequest.totalStudents || selectedRequest.enrollmentCapacity || "—"}
              />
              <ModalData
                label="Staff Capacity"
                value={
                  selectedRequest.totalStaff !== undefined && selectedRequest.totalStaff !== ""
                    ? selectedRequest.totalStaff
                    : (Number(selectedRequest.totalTeachingStaff) || 0) +
                        (Number(selectedRequest.totalNonTeachingStaff) || 0) ||
                      "—"
                }
              />
            </ModalGrid>
            
            <ModalGrid title="Contact Information" cols={2}>
              <ModalData
                label="School Email"
                value={selectedRequest.officialEmail || "—"}
              />
              <ModalData
                label="School Phone"
                value={selectedRequest.officialPhone || "—"}
              />
              <ModalData
                label="Website"
                value={selectedRequest.website || "—"}
                colSpan={2}
              />
              <ModalData
                label="Address"
                value={`${selectedRequest.address || ""}, ${selectedRequest.city || ""}, ${selectedRequest.state || ""}, ${selectedRequest.pinCode || ""}, ${selectedRequest.country || ""}`}
                colSpan={2}
              />
            </ModalGrid>

            <ModalGrid title="Principal Details" cols={2}>
              <ModalData
                label="Principal Name"
                value={selectedRequest.principalName || "—"}
              />
              <ModalData
                label="Principal Email"
                value={selectedRequest.principalEmail || "—"}
              />
              <ModalData
                label="Principal Phone"
                value={selectedRequest.principalPhone || "—"}
              />
            </ModalGrid>

            {selectedRequest.status === "rejected" && selectedRequest.rejectionReason && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-xs font-semibold">
                <strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}
              </div>
            )}

            {selectedRequest.logo && (
              <div className="flex flex-col gap-1 border-t pt-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">School Logo</span>
                <img
                  src={selectedRequest.logo}
                  alt="School Logo"
                  className="w-20 h-20 object-contain rounded-xl border p-1"
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                text="Close"
                variant="secondary"
                size={3}
                onClick={() => setSelectedRequest(null)}
              />
              {selectedRequest.status === "pending" && (
                <>
                  <Button
                    text="Reject"
                    variant="danger"
                    size={3}
                    onClick={() => {
                      setRejectingRequest(selectedRequest);
                      setSelectedRequest(null);
                    }}
                  />
                  <Button
                    text="Approve"
                    variant="primary"
                    size={3}
                    onClick={() => {
                      setApprovingRequest(selectedRequest);
                      setSelectedRequest(null);
                    }}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </PanelModal>

      {/* Approve Confirmation Modal */}
      <PanelModal
        isVisible={!!approvingRequest}
        onClose={() => setApprovingRequest(null)}
        title="Approve Registration"
        size="sm"
      >
        {approvingRequest && (
          <div className="space-y-6">
            <p className="text-sm text-slate-600 leading-relaxed font-semibold">
              Are you sure you want to approve this school registration for{" "}
              <span className="text-[#2524D1] font-black">{approvingRequest.schoolName}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                text="Cancel"
                variant="secondary"
                size={3}
                onClick={() => setApprovingRequest(null)}
                disabled={isProcessingApproval}
              />
              <Button
                text={isProcessingApproval ? "Approving..." : "Approve"}
                variant="primary"
                size={3}
                onClick={handleApproveConfirm}
                disabled={isProcessingApproval}
              />
            </div>
          </div>
        )}
      </PanelModal>

      {/* Reject Confirmation Modal */}
      <PanelModal
        isVisible={!!rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        title="Reject Registration"
        size="sm"
      >
        {rejectingRequest && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed font-semibold">
              Are you sure you want to reject the registration request for{" "}
              <span className="text-red-600 font-black">{rejectingRequest.schoolName}</span>?
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">
                Rejection Reason (Optional)
              </label>
              <textarea
                placeholder="Provide a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                text="Cancel"
                variant="secondary"
                size={3}
                onClick={() => {
                  setRejectingRequest(null);
                  setRejectionReason("");
                }}
                disabled={isProcessingRejection}
              />
              <Button
                text={isProcessingRejection ? "Rejecting..." : "Reject"}
                variant="danger"
                size={3}
                onClick={handleRejectConfirm}
                disabled={isProcessingRejection}
              />
            </div>
          </div>
        )}
      </PanelModal>

      {/* Validation Failure Modal */}
      <PanelModal
        isVisible={!!validationDetails}
        onClose={() => setValidationDetails(null)}
        title="Cannot Approve School"
        size="md"
      >
        {validationDetails && (
          <div className="space-y-6">
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
              This organization has reached its subscription limits.
            </p>

            <div className="space-y-4">
              {/* School Limit Section */}
              {validationDetails.schoolLimit && (
                <div className={`p-5 rounded-2xl border ${validationDetails.schoolLimit.exceeded ? "bg-red-50/50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {validationDetails.schoolLimit.exceeded ? (
                      <XCircle className="text-rose-500 w-5 h-5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0" />
                    )}
                    <h4 className={`font-black text-sm uppercase tracking-wider ${validationDetails.schoolLimit.exceeded ? "text-red-700" : "text-slate-700"}`}>
                      School Limit
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-slate-500">
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400">Allocated</span>
                      <span className="text-sm text-slate-800">{validationDetails.schoolLimit.allocated}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400">Currently Used</span>
                      <span className="text-sm text-slate-800">{validationDetails.schoolLimit.currentlyUsed}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400">After Approval</span>
                      <span className="text-sm text-slate-855 font-black">{validationDetails.schoolLimit.afterApproval}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400">Remaining</span>
                      <span className="text-sm text-slate-800">
                        {Math.max(0, validationDetails.schoolLimit.allocated - validationDetails.schoolLimit.currentlyUsed)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Student Capacity Section */}
              {validationDetails.studentLimit && (
                <div className={`p-5 rounded-2xl border ${validationDetails.studentLimit.exceeded ? "bg-red-50/50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {validationDetails.studentLimit.exceeded ? (
                      <XCircle className="text-rose-500 w-5 h-5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0" />
                    )}
                    <h4 className={`font-black text-sm uppercase tracking-wider ${validationDetails.studentLimit.exceeded ? "text-red-700" : "text-slate-700"}`}>
                      Student Capacity
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs font-bold text-slate-500">
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400">Allocated</span>
                      <span className="text-sm text-slate-800">{validationDetails.studentLimit.allocated}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400">Currently Used</span>
                      <span className="text-sm text-slate-800">{validationDetails.studentLimit.currentlyUsed}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400">Requested</span>
                      <span className="text-sm text-slate-800">{validationDetails.studentLimit.requested}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400">After Approval</span>
                      <span className="text-sm text-slate-855 font-black">{validationDetails.studentLimit.afterApproval}</span>
                    </div>
                    {validationDetails.studentLimit.exceeded && (
                      <div>
                        <span className="block text-[10px] uppercase text-red-500">Exceeded By</span>
                        <span className="text-sm text-red-600 font-extrabold">{validationDetails.studentLimit.exceededBy}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Staff Capacity Section */}
              {validationDetails.staffLimit && (
                <div className={`p-5 rounded-2xl border ${validationDetails.staffLimit.exceeded ? "bg-red-50/50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    {validationDetails.staffLimit.exceeded ? (
                      <XCircle className="text-rose-500 w-5 h-5 shrink-0" />
                    ) : (
                      <CheckCircle2 className="text-emerald-500 w-5 h-5 shrink-0" />
                    )}
                    <h4 className={`font-black text-sm uppercase tracking-wider ${validationDetails.staffLimit.exceeded ? "text-red-700" : "text-slate-700"}`}>
                      Staff Capacity
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs font-bold text-slate-500">
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400">Allocated</span>
                      <span className="text-sm text-slate-800">{validationDetails.staffLimit.allocated}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400">Currently Used</span>
                      <span className="text-sm text-slate-800">{validationDetails.staffLimit.currentlyUsed}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400">Requested</span>
                      <span className="text-sm text-slate-800">{validationDetails.staffLimit.requested}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-slate-400">After Approval</span>
                      <span className="text-sm text-slate-855 font-black">{validationDetails.staffLimit.afterApproval}</span>
                    </div>
                    {validationDetails.staffLimit.exceeded && (
                      <div>
                        <span className="block text-[10px] uppercase text-red-500">Exceeded By</span>
                        <span className="text-sm text-red-600 font-extrabold">{validationDetails.staffLimit.exceededBy}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                text="Close"
                variant="secondary"
                size={3}
                onClick={() => setValidationDetails(null)}
              />
              <Button
                text="Contact Graphura"
                variant="primary"
                icon={<Headset size={16} />}
                size={3}
                onClick={() => {
                  setValidationDetails(null);
                  navigate("/superadmin/support");
                }}
              />
            </div>
          </div>
        )}
      </PanelModal>
    </div>
  );
}
