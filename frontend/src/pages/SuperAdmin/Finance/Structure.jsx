import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Layers3, CheckCircle, Calendar, Eye, Edit3, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { deleteFeeStructure, getFeeStructures } from "../../../services/api/financeApi";
import AddFeeStructureModal from "../../../components/superAdmin/Finance/AddFeeStructureModal";
import { selectSuperAdmin } from "../../../features/auth/superAuthSlice";

import {
  Heading,
  DashGrid,
  DashCard,
  DataTable,
  PanelModal,
  ModalGrid,
  ModalData,
  Button
} from "../../../components/shared/Common_Components";

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const SuperAdminFeeStructure = () => {
  const superAdmin = useSelector(selectSuperAdmin);
  const organizationId =
    superAdmin?.superAdmin?.organization?._id ||
    superAdmin?.superAdmin?.organization ||
    superAdmin?.organization?._id ||
    superAdmin?.organization ||
    superAdmin?._id ||
    superAdmin?.id;

  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingStructure, setViewingStructure] = useState(null);

  const loadStructures = async () => {
    try {
      setLoading(true);
      const response = await getFeeStructures();
      setFeeStructures(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load fee structures");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStructures(); }, []);

  const handleStructureCreated = (newStructure) =>
    setFeeStructures((prev) => [...prev, newStructure]);

  const handleStructureUpdated = (updatedStructure) =>
    setFeeStructures((prev) =>
      prev.map((item) => item._id === updatedStructure._id ? updatedStructure : item)
    );

  const handleView = (structure) => { setViewingStructure(structure); setIsViewOpen(true); };
  const handleEdit = (structure) => { setEditingStructure(structure); setIsEditOpen(true); };
  const handleDelete = async (structure) => {
    if (!window.confirm("Permanently delete this fee structure? This cannot be undone.")) return;
    try {
      await deleteFeeStructure(structure._id);
      setFeeStructures((prev) => prev.filter((item) => item._id !== structure._id));
      toast.success("Fee structure permanently deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete fee structure");
    }
  };

  const stats = useMemo(() => {
    const activeStructures = feeStructures.filter((s) => s.isActive).length;
    const classesCovered = new Set(
      feeStructures.map((s) => s.classId?.name || "Unknown")
    ).size;
    return { totalStructures: feeStructures.length, activeStructures, classesCovered };
  }, [feeStructures]);

  const tableData = useMemo(() => feeStructures.map(s => ({
    ...s,
    className: s.classId?.name || "Unknown Class",
    feeHeadsCount: `${s.feeLines?.length || 0} Heads`,
    formattedAmount: formatCurrency(s.totalAmount),
    status: s.isActive ? "Active" : "Inactive"
  })), [feeStructures]);

  const columns = [
    { key: "className",       label: "Class" },
    { key: "academicYear",    label: "Academic Year" },
    { key: "feeHeadsCount",   label: "Fee Heads" },
    { key: "formattedAmount", label: "Total Amount" },
    { key: "status",          label: "Status" }
  ];

  const actions = [
    { icon: <Eye    size={16} />, tooltip: "View",   variant: "ghost",   onClick: handleView },
    { icon: <Edit3  size={16} />, tooltip: "Edit",   variant: "primary", onClick: handleEdit },
    { icon: <Trash2 size={16} />, tooltip: "Delete", variant: "danger",  onClick: handleDelete }
  ];

  return (
    <div className="font-sans flex flex-col gap-4">

      {/* ── HEADER WITH DARK ANIMATED BACKGROUND ── */}
      <Heading 
        primaryText="Master Fee Structure" 
        showAnimations={true}
        action={<Button text="Add Fee Structure" icon={<Plus size={16}/>} onClick={() => setIsModalOpen(true)} size={12} />}
      />

      {/* ── STAT CARDS ── */}
      <DashGrid cols={12} gap={4}>
        <DashCard
          title="Fee Structures"
          value={String(stats.totalStructures).padStart(2, "0")}
          icon={<Layers3 size={22} />}
          accentColor="#223F74"
          size={4}
        />
        <DashCard
          title="Active Structures"
          value={String(stats.activeStructures).padStart(2, "0")}
          icon={<CheckCircle size={22} />}
          accentColor="#5B9A6A"
          size={4}
        />
        <DashCard
          title="Classes Covered"
          value={String(stats.classesCovered).padStart(2, "0")}
          icon={<Calendar size={22} />}
          accentColor="#E0A04B"
          size={4}
        />
      </DashGrid>

      {/* ── TABLE ── */}
      <div className="min-w-0 overflow-hidden w-full">
        <DataTable
          title="Fee Structure Records"
          columns={columns}
          rows={tableData}
          actions={actions}
          searchable={true}
          pageSize={10}
          hidePagination={false}
          hidePageSizeLabel={true}
          onRefresh={loadStructures}
        />
      </div>

      {/* ── VIEW MODAL ── */}
      <PanelModal
        id="view-structure"
        title="Structure Details"
        isVisible={isViewOpen}
        onClose={() => setIsViewOpen(false)}
      >
        {viewingStructure && (
          <div className="flex flex-col gap-5">
            <ModalGrid title="General Information" cols={2}>
              <ModalData
                label="Class"
                value={`${viewingStructure.classId?.name || "Unknown"}${
                  viewingStructure.classId?.section
                    ? ` - ${viewingStructure.classId.section}`
                    : ""
                }`}
              />
              <ModalData label="Academic Year"  value={viewingStructure.academicYear || "N/A"} />
              <ModalData label="Total Amount"   value={formatCurrency(viewingStructure.totalAmount)} />
              <ModalData label="Status"         value={viewingStructure.isActive ? "Active" : "Inactive"} />
            </ModalGrid>

            <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="bg-[#223F74] px-4 py-2.5">
                <p className="text-xs font-black text-white uppercase tracking-[0.18em]">
                  Fee Lines Breakdown
                </p>
              </div>
              <div className="p-4 bg-white space-y-3">
                {(viewingStructure.feeLines || []).map((line, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-[#223F74]">
                        {line.feeHeadId?.name || "Fee Head"}
                      </p>
                      {line.overrideReason && (
                        <p className="text-xs text-amber-600 mt-1 italic">
                          Note: {line.overrideReason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">
                        {formatCurrency(line.amount)}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase mt-0.5">
                        Due:{" "}
                        {line.dueDate
                          ? new Date(line.dueDate).toLocaleDateString("en-GB")
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                text="Close"
                variant="ghost"
                size={3}
                onClick={() => setIsViewOpen(false)}
              />
            </div>
          </div>
        )}
      </PanelModal>

      {/* ── CREATE/EDIT MODALS ── */}
      <AddFeeStructureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        organization={organizationId}
        onStructureCreated={handleStructureCreated}
        mode="create"
      />

      <AddFeeStructureModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        organization={organizationId}
        initialData={editingStructure}
        onStructureUpdated={handleStructureUpdated}
        mode="edit"
      />
    </div>
  );
};

export default SuperAdminFeeStructure;
