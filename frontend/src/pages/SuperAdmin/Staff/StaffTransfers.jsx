import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  Eye,
  Check,
  X,
  Plus,
} from "lucide-react";
import { useSelector } from "react-redux";
import { toast, Toaster } from "react-hot-toast";

import { selectSuperAdmin } from "../../../features/auth/superAuthSlice";
import {
  fetchTransfers,
  approveTransfer,
  rejectTransfer,
  completeTransfer,
  createTransfer, // 🔥 New API import
} from "../../../services/hrmApi";
import { fetchAllStaff } from "../../../services/staffApi"; // 🔥 To get staff list for dropdown

import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  DataTable,
  Modal,
  ModalProfile,
  ModalGrid,
  ModalData,
  Button,
  openModal,
  closeModal,
  PanelModal,
  DataField,
  SelectField,
  Option,
} from "../../../components/shared/Common_Components";

const VIEW_MODAL_ID = "staff-transfer-view-modal";
const ADD_MODAL_ID = "staff-transfer-add-modal";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const labelizeStatus = (status = "") =>
  status.replace("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());

const emptyForm = {
  staffId: "",
  toSchool: "",
  transferType: "permanent",
  effectiveDate: "",
  reason: "",
};

const StaffTransfer = () => {
  // ── Auth & Organization ──
  const authUser = useSelector(selectSuperAdmin);
  const organizationId = authUser?.organization?._id || authUser?.superAdmin?.organization || authUser?._id;
  const initiatedBy = authUser?.superAdmin?._id || authUser?._id;

  // ── States ──
  const [transfers, setTransfers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState("");

  const [addForm, setAddForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Load Data ──
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch transfers AND staff list concurrently
      const [transfersRes, staffRes] = await Promise.all([
        fetchTransfers(),
        fetchAllStaff()
      ]);
      setTransfers(transfersRes?.data || []);
      setStaffList(staffRes?.data || []);
    } catch (err) {
      setError(err.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Extract unique schools from the staff list for the "To School" dropdown
  const schoolOptions = useMemo(() => {
    const map = new Map();
    staffList.forEach((staff) => {
      const schoolId = staff?.school?._id;
      const schoolName = staff?.school?.schoolName || staff?.school?.name;
      if (schoolId && !map.has(schoolId)) {
        map.set(schoolId, { id: schoolId, name: schoolName || schoolId });
      }
    });
    return Array.from(map.values());
  }, [staffList]);

  // Derived state: Get details of the currently selected staff in the Add Form
  const selectedStaffObj = useMemo(() => {
    if (!addForm.staffId) return null;
    return staffList.find(s => s._id === addForm.staffId) || null;
  }, [addForm.staffId, staffList]);


  // ── Stats ──
  const stats = useMemo(() => {
    const completed = transfers.filter((t) => t.status === "completed").length;
    const pending = transfers.filter((t) => t.status === "pending").length;
    return [
      {
        title: "Total Transfers",
        value: transfers.length.toString(),
        icon: <ArrowRightLeft size={22} />,
        accentColor: "#7A8FC6",
      },
      {
        title: "Completed",
        value: completed.toString(),
        icon: <CheckCircle2 size={22} />,
        accentColor: "#5B9A6A",
      },
      {
        title: "Pending Approval",
        value: pending.toString(),
        icon: <Clock size={22} />,
        accentColor: "#E0A04B",
      },
    ];
  }, [transfers]);

  const patchTransferStatus = (id, status) => {
    setTransfers((prev) => prev.map((item) => (item._id === id ? { ...item, status } : item)));
    setSelectedTransfer((prev) => (prev && prev._id === id ? { ...prev, status } : prev));
  };

  const runAction = async (id, action) => {
    try {
      setActionId(id);
      if (action === "approve") {
        await approveTransfer(id, {});
        patchTransferStatus(id, "approved");
        toast.success("Transfer approved successfully");
      }
      if (action === "reject") {
        await rejectTransfer(id, { rejectionReason: "Rejected by super admin" });
        patchTransferStatus(id, "rejected");
        toast.success("Transfer rejected successfully");
      }
      if (action === "complete") {
        await completeTransfer(id);
        patchTransferStatus(id, "completed");
        toast.success("Transfer completed successfully");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update transfer status");
    } finally {
      setActionId("");
    }
  };

  // ── Add Transfer Handler ──
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.staffId || !addForm.toSchool || !addForm.effectiveDate || !addForm.reason) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!selectedStaffObj || !selectedStaffObj.school) {
      toast.error("Invalid staff selected (Missing current school)");
      return;
    }

    if (selectedStaffObj.school._id === addForm.toSchool) {
      toast.error("Destination school cannot be the same as the current school");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        staffId: addForm.staffId,
        staffRole: selectedStaffObj.role,
        fromSchool: selectedStaffObj.school._id,
        toSchool: addForm.toSchool,
        organization: organizationId,
        transferType: addForm.transferType,
        effectiveDate: addForm.effectiveDate,
        reason: addForm.reason,
        initiatedBy: initiatedBy
      };

      const response = await createTransfer(payload);
      setTransfers([response.data, ...transfers]);
      toast.success("Transfer request created successfully!");
      closeModal(ADD_MODAL_ID);
      setAddForm(emptyForm);
    } catch (err) {
      toast.error(err.message || "Failed to create transfer request");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── DataTable column config ──
  const columns = [
    {
      key: "staffId",
      label: "Staff Member",
      sortValue: (row) => row?.staffId?.name || "",
      searchValue: (row) =>
        `${row?.staffId?.name || ""} ${row?.fromSchool?.schoolName || ""} ${row?.toSchool?.schoolName || ""}`,
      render: (_val, row) => row?.staffId?.name || "Unknown Staff",
    },
    {
      key: "fromSchool",
      label: "From",
      sortValue: (row) => row?.fromSchool?.schoolName || "",
      render: (_val, row) => row?.fromSchool?.schoolName || "-",
    },
    {
      key: "toSchool",
      label: "To",
      sortValue: (row) => row?.toSchool?.schoolName || "",
      render: (_val, row) => row?.toSchool?.schoolName || "-",
    },
    { key: "effectiveDate", label: "Date", render: (val) => formatDate(val) },
    { key: "status", label: "Status", render: (val) => labelizeStatus(val) },
  ];

  const actions = [
    {
      icon: <Eye size={14} />,
      tooltip: "View Details",
      variant: "ghost",
      onClick: (row) => {
        setSelectedTransfer(row);
        openModal(VIEW_MODAL_ID);
      },
    },
    {
      icon: <Check size={14} />,
      tooltip: "Approve",
      variant: "success",
      show: (row) => row.status === "pending",
      loading: (row) => actionId === row._id,
      onClick: (row) => runAction(row._id, "approve"),
    },
    {
      icon: <X size={14} />,
      tooltip: "Reject",
      variant: "danger",
      show: (row) => row.status === "pending",
      loading: (row) => actionId === row._id,
      onClick: (row) => runAction(row._id, "reject"),
    },
    {
      icon: <CheckCircle2 size={14} />,
      tooltip: "Complete Transfer",
      variant: "primary",
      show: (row) => row.status === "approved",
      loading: (row) => actionId === row._id,
      onClick: (row) => runAction(row._id, "complete"),
    },
  ];

  return (
    <div className="min-h-screen w-full px-2 sm:px-4 lg:px-6 flex flex-col gap-6">
      <Toaster position="top-center" toastOptions={{ style: { zIndex: 99999 } }} />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
          <span className="text-rose-700 font-semibold text-sm flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Banner */}
      <Heading 
        primaryText="Staff" 
        secondaryText="Transfer" 
        size={12} 
        action={
          <Button
            text="Add Transfer"
            icon={<Plus size={16} />}
            variant="primary"
            onClick={() => {
              setAddForm(emptyForm);
              openModal(ADD_MODAL_ID);
            }}
          />
        }
      />

      {/* Stats */}
      <DashGrid cols={12} gap={4}>
        {stats.map((s) => (
          <EnhancedDashCard
            key={s.title}
            title={s.title}
            value={s.value}
            icon={s.icon}
            accentColor={s.accentColor}
            size={4}
          />
        ))}
      </DashGrid>

      {/* Transfer log table */}
      <DataTable
        title="Recent Transfer Logs"
        columns={columns}
        rows={transfers}
        actions={actions}
        searchable
        pageSize={10}
        pageSizeOptions={[10, 20, 50]}
        onRefresh={loadInitialData}
        filters={[
          {
            title: "Status",
            type: "toggle",
            key: "status",
            options: ["pending", "approved", "rejected", "completed"],
          },
        ]}
      />

      {/* ── Add Transfer Form Modal ── */}
      <PanelModal id={ADD_MODAL_ID} title="Initiate Staff Transfer" size="md">
        <form onSubmit={handleAddSubmit} className="flex flex-col gap-5">
          
          <SelectField
            label="Select Staff Member *"
            id="staffId"
            value={addForm.staffId}
            onChange={(e) => setAddForm({ ...addForm, staffId: e.target.value })}
            searchable={true}
          >
            <Option value="" label="-- Choose Staff --" disabled />
            {staffList.filter(s => s.status === 'active').map((staff) => (
              <Option 
                key={staff._id} 
                value={staff._id} 
                label={`${staff.name} (${staff.email})`} 
              />
            ))}
          </SelectField>

          {/* Auto-filled details of selected staff */}
          {selectedStaffObj && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Current Role</span>
                <span className="text-sm font-semibold text-slate-800 capitalize">{selectedStaffObj.role.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Current Branch</span>
                <span className="text-sm font-semibold text-slate-800">{selectedStaffObj.school?.schoolName || selectedStaffObj.school?.name || "Unknown"}</span>
              </div>
            </div>
          )}

          <SelectField
            label="Destination Branch (To School) *"
            id="toSchool"
            value={addForm.toSchool}
            onChange={(e) => setAddForm({ ...addForm, toSchool: e.target.value })}
            searchable={false}
          >
            <Option value="" label="-- Choose Destination --" disabled />
            {schoolOptions
              // Hide their current school from the destination list
              .filter(school => !selectedStaffObj || school.id !== selectedStaffObj.school?._id)
              .map((school) => (
              <Option key={school.id} value={school.id} label={school.name} />
            ))}
          </SelectField>

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Transfer Type *"
              id="transferType"
              value={addForm.transferType}
              onChange={(e) => setAddForm({ ...addForm, transferType: e.target.value })}
              searchable={false}
            >
              <Option value="permanent" label="Permanent" />
              <Option value="temporary" label="Temporary" />
            </SelectField>

            <DataField
              label="Effective Date *"
              type="date"
              id="effectiveDate"
              value={addForm.effectiveDate}
              onChange={(e) => setAddForm({ ...addForm, effectiveDate: e.target.value })}
            />
          </div>

          <DataField
            label="Reason for Transfer *"
            type="textarea"
            id="reason"
            rows={3}
            placeholder="Provide a reason for this transfer..."
            value={addForm.reason}
            onChange={(e) => setAddForm({ ...addForm, reason: e.target.value })}
          />

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
            <Button
              text="Cancel"
              variant="ghost"
              size={3}
              onClick={() => closeModal(ADD_MODAL_ID)}
            />
            <Button
              text={isSubmitting ? "Creating..." : "Submit Transfer Request"}
              variant="primary"
              size={5}
              type="submit"
              loading={isSubmitting}
              disabled={isSubmitting}
            />
          </div>
        </form>
      </PanelModal>

      {/* ── View Transfer Details Modal ── */}
      <Modal id={VIEW_MODAL_ID} title="Transfer Details" size="md">
        {selectedTransfer && (
          <div className="flex flex-col gap-4">
            <ModalProfile
              name={selectedTransfer?.staffId?.name || "-"}
              subtitle={selectedTransfer?.staffRole || "Staff"}
              meta={`Status: ${labelizeStatus(selectedTransfer.status)}`}
            />

            <ModalGrid title="Transfer Route" cols={2}>
              <ModalData
                label="From School"
                value={selectedTransfer?.fromSchool?.schoolName || "-"}
              />
              <ModalData
                label="To School"
                value={selectedTransfer?.toSchool?.schoolName || "-"}
              />
            </ModalGrid>

            <ModalGrid title="Schedule" cols={2}>
              <ModalData
                label="Transfer Date"
                value={formatDate(selectedTransfer.effectiveDate)}
              />
              <ModalData label="Status" value={labelizeStatus(selectedTransfer.status)} />
            </ModalGrid>

            <ModalGrid title="Reason" cols={1}>
              <ModalData label="Transfer Reason" value={selectedTransfer.reason || "-"} />
            </ModalGrid>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-2">
              {selectedTransfer.status === "pending" && (
                <>
                  <Button
                    text="Reject"
                    variant="danger"
                    size={3}
                    icon={<X size={16} />}
                    loading={actionId === selectedTransfer._id}
                    onClick={() => runAction(selectedTransfer._id, "reject")}
                  />
                  <Button
                    text="Approve"
                    variant="success"
                    size={3}
                    icon={<Check size={16} />}
                    loading={actionId === selectedTransfer._id}
                    onClick={() => runAction(selectedTransfer._id, "approve")}
                  />
                </>
              )}
              {selectedTransfer.status === "approved" && (
                <Button
                  text="Complete Transfer"
                  variant="primary"
                  size={4}
                  icon={<CheckCircle2 size={16} />}
                  loading={actionId === selectedTransfer._id}
                  onClick={() => runAction(selectedTransfer._id, "complete")}
                />
              )}
              <Button
                text="Close"
                variant="ghost"
                size={3}
                onClick={() => closeModal(VIEW_MODAL_ID)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StaffTransfer;