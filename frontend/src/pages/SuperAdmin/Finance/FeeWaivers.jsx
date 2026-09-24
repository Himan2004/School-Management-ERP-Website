import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Percent,
  Users,
  Trash2,
  Edit3,
  FileText,
  AlertTriangle,
  Save,
  Plus,
} from "lucide-react";
import {
  getWaiverPolicies,
  createWaiverPolicy,
  updateWaiverPolicy,
  deleteWaiverPolicy,
} from "../../../services/api/financeApi";
import {
  WAIVER_CATEGORY_LABELS,
  DISCOUNT_TYPE_LABELS,
} from "../../../utils/financeHelpers";

import {
  Heading,
  DashGrid,
  DashCard,
  DataField,
  SelectField,
  Option,
  Button,
  ToggleButton,
  DataTable,
  PanelModal,
} from "../../../components/shared/Common_Components";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const INITIAL_FORM_STATE = {
  name: "",
  category: "custom",
  discountType: "percentage",
  maxDiscountValue: "",
  applicableFeeHeads: [],
  isActive: true,
  approvalRequiredFrom: "hq_admin",
};

const FeeWaiverManager = () => {
  const [waivers, setWaivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState({});

  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState(INITIAL_FORM_STATE);
  const [editFormErrors, setEditFormErrors] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Filter State
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ category: "", discountType: "", isActive: "" });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let active = true;
    const loadWaivers = async () => {
      try {
        setLoading(true);
        const response = await getWaiverPolicies();
        if (active)
          setWaivers(
            Array.isArray(response.data?.data) ? response.data.data : []
          );
      } catch (err) {
        if (active)
          toast.error(
            err.response?.data?.message || "Failed to load waiver policies"
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    loadWaivers();
    return () => {
      active = false;
    };
  }, []);

  const validateForm = (data, setErrorsFn) => {
    const errors = {};
    if (!data.name.trim()) errors.name = "Waiver name is required";
    if (
      !data.maxDiscountValue ||
      isNaN(data.maxDiscountValue) ||
      Number(data.maxDiscountValue) <= 0
    ) {
      errors.maxDiscountValue = "Enter a valid value greater than 0";
    } else if (
      data.discountType === "percentage" &&
      Number(data.maxDiscountValue) > 100
    ) {
      errors.maxDiscountValue = "Percentage cannot exceed 100";
    }
    setErrorsFn(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(formData, setFormErrors))
      return toast.error("Please fix errors");
    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        maxDiscountValue: Number(formData.maxDiscountValue),
      };
      const response = await createWaiverPolicy(payload);
      toast.success("Waiver policy created successfully!");
      setWaivers((prev) => [...prev, response.data.data]);
      setFormData(INITIAL_FORM_STATE);
      setCreateOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create waiver");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (waiver) => {
    setEditingId(waiver._id);
    setEditFormData({
      name: waiver.name,
      category: waiver.category,
      discountType: waiver.discountType,
      maxDiscountValue: waiver.maxDiscountValue,
      applicableFeeHeads: waiver.applicableFeeHeads || [],
      isActive: waiver.isActive,
      approvalRequiredFrom: waiver.approvalRequiredFrom || "hq_admin",
    });
    setEditOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm(editFormData, setEditFormErrors))
      return toast.error("Please fix errors");
    try {
      setEditSubmitting(true);
      const payload = {
        ...editFormData,
        maxDiscountValue: Number(editFormData.maxDiscountValue),
      };
      const response = await updateWaiverPolicy(editingId, payload);
      toast.success("Waiver policy updated successfully!");
      setWaivers((prev) =>
        prev.map((w) => (w._id === editingId ? response.data.data : w))
      );
      setEditOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update waiver");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteWaiver = async (waiverID) => {
    if (!window.confirm("Delete this waiver policy? This cannot be undone."))
      return;
    try {
      setDeleting(waiverID);
      await deleteWaiverPolicy(waiverID);
      toast.success("Waiver policy deleted successfully!");
      setWaivers(waivers.filter((w) => w._id !== waiverID));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete waiver");
    } finally {
      setDeleting(null);
    }
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditingId(null);
    setEditFormData(INITIAL_FORM_STATE);
    setEditFormErrors({});
  };

  const stats = useMemo(
    () => ({
      total: waivers.length,
      percentagePlans: waivers.filter((w) => w.discountType === "percentage").length,
      fixedPlans: waivers.filter((w) => w.discountType === "fixed_amount").length,
      activePlans: waivers.filter((w) => w.isActive).length,
    }),
    [waivers]
  );

  const filteredWaivers = useMemo(() => {
    return waivers.filter((waiver) => {
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !term ||
        (waiver.name?.toLowerCase() || "").includes(term) ||
        (WAIVER_CATEGORY_LABELS[waiver.category] || waiver.category || "").toLowerCase().includes(term) ||
        (DISCOUNT_TYPE_LABELS[waiver.discountType] || waiver.discountType || "").toLowerCase().includes(term);

      const matchesCategory = !filters.category || waiver.category === filters.category;
      const matchesType = !filters.discountType || waiver.discountType === filters.discountType;
      const matchesStatus = filters.isActive === "" || waiver.isActive.toString() === filters.isActive;

      return matchesSearch && matchesCategory && matchesType && matchesStatus;
    });
  }, [searchTerm, waivers, filters]);

  const tableData = useMemo(
    () =>
      filteredWaivers.map((w) => ({
        ...w,
        formattedValue:
          w.discountType === "percentage"
            ? `${w.maxDiscountValue}%`
            : formatCurrency(w.maxDiscountValue),
        status: w.isActive ? "Active" : "Inactive",
      })),
    [filteredWaivers]
  );

  const columns = [
    { key: "name", label: "Waiver Name" },
    {
      key: "discountType",
      label: "Type",
      render: (val) => DISCOUNT_TYPE_LABELS[val] || val,
    },
    { key: "formattedValue", label: "Value" },
    {
      key: "category",
      label: "Category",
      render: (val) => WAIVER_CATEGORY_LABELS[val] || val,
    },
    { key: "status", label: "Status" },
  ];

  const actions = [
    {
      icon: <Edit3 size={16} />,
      tooltip: "Edit",
      variant: "primary",
      onClick: handleEditClick,
    },
    {
      icon: <Trash2 size={16} />,
      tooltip: "Delete",
      variant: "danger",
      onClick: (row) => handleDeleteWaiver(row._id),
    },
  ];

  return (
    <div className="font-sans flex flex-col gap-4">

      {/* ── HEADER WITH DARK ANIMATED BACKGROUND ── */}
      <Heading 
        primaryText="Fee Waiver & Scholarship" 
        showAnimations={true} 
      />

      {/* ── STAT CARDS USING DASHCARD ── */}
      <DashGrid cols={12} gap={4}>
        <DashCard
          title="Waiver Policies"
          value={String(stats.total).padStart(2, "0")}
          icon={<Percent size={22} />}
          accentColor="#223F74"
          size={3}
        />
        <DashCard
          title="Percentage Plans"
          value={String(stats.percentagePlans).padStart(2, "0")}
          icon={<Users size={22} />}
          accentColor="#5B9A6A"
          size={3}
        />
        <DashCard
          title="Fixed Amount Plans"
          value={String(stats.fixedPlans).padStart(2, "0")}
          icon={<FileText size={22} />}
          accentColor="#E0A04B"
          size={3}
        />
        <DashCard
          title="Active Policies"
          value={String(stats.activePlans).padStart(2, "0")}
          icon={<AlertTriangle size={22} />}
          accentColor="#D66B5F"
          size={3}
        />
      </DashGrid>

      {/* ── MAIN CONTENT: TABLE ── */}
      <div className="flex justify-end mb-2">
        <div className="w-56">
          <Button
            text="Create New Waiver"
            icon={<Plus size={16} />}
            variant="primary"
            onClick={() => setCreateOpen(true)}
          />
        </div>
      </div>
      
      <div className="w-full min-w-0 overflow-hidden">
          
          <DataTable
            title="Defined Waiver Types"
            columns={columns}
            rows={tableData}
            actions={actions}
            searchable={true}
            hidePagination={true}
            hideRecordSummary={true}
            hidePageSizeLabel={true}
            filters={[
              {
                title: "Status",
                type: "toggle",
                key: "status",
                options: ["Active", "Inactive"],
              },
              {
                title: "Type",
                type: "select",
                key: "discountType",
                options: ["percentage", "fixed_amount"],
              },
              {
                title: "Category",
                type: "select",
                key: "category",
                options: [
                  "custom",
                  "sibling_discount",
                  "merit_scholarship",
                  "staff_child",
                  "financial_hardship",
                  "sports_quota",
                ],
              },
            ]}
          />
        </div>

      {/* ── CREATE MODAL ── */}
      <PanelModal
        id="create-waiver"
        title="Create New Waiver"
        isVisible={createOpen}
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DataField
            label="Waiver Name *"
            id="name"
            name="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((p) => ({ ...p, name: e.target.value }))
            }
            placeholder="e.g. Sports Scholarship"
            error={formErrors.name}
          />

          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Type"
              id="discountType"
              size={12}
              value={formData.discountType}
              onChange={(e) =>
                setFormData((p) => ({ ...p, discountType: e.target.value }))
              }
              searchable={false}
            >
              <Option value="percentage"    label="Percentage (%)" />
              <Option value="fixed_amount"  label="Fixed Amount (₹)" />
            </SelectField>

            <DataField
              label="Value *"
              id="maxDiscountValue"
              type="number"
              value={formData.maxDiscountValue}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  maxDiscountValue: e.target.value,
                }))
              }
              placeholder={
                formData.discountType === "percentage" ? "0-100" : "Amount"
              }
              error={formErrors.maxDiscountValue}
            />
          </div>

          <SelectField
            label="Category"
            id="category"
            value={formData.category}
            onChange={(e) =>
              setFormData((p) => ({ ...p, category: e.target.value }))
            }
            searchable={false}
          >
            <Option value="custom"              label="Custom" />
            <Option value="sibling_discount"    label="Sibling Discount" />
            <Option value="merit_scholarship"   label="Merit Scholarship" />
            <Option value="staff_child"         label="Staff Child" />
            <Option value="financial_hardship"  label="Financial Hardship" />
            <Option value="sports_quota"        label="Sports Quota" />
          </SelectField>

          <div className="py-1">
            <ToggleButton
              label="Active Status"
              checked={formData.isActive}
              onChange={(val) =>
                setFormData((p) => ({ ...p, isActive: val }))
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-[#E7E2DB]">
            <Button
              text="Cancel"
              variant="ghost"
              size={3}
              onClick={() => setCreateOpen(false)}
            />
            <Button
              type="submit"
              text="Save Waiver Type"
              variant="primary"
              icon={<Save size={16} />}
              size={4}
              loading={submitting}
            />
          </div>
        </form>
      </PanelModal>

      {/* ── EDIT MODAL ── */}
      <PanelModal
        id="edit-waiver"
        title="Edit Waiver Type"
        isVisible={editOpen}
        onClose={closeEditModal}
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <DataField
            label="Waiver Name *"
            id="edit_name"
            value={editFormData.name}
            onChange={(e) =>
              setEditFormData((p) => ({ ...p, name: e.target.value }))
            }
            error={editFormErrors.name}
          />

          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Type"
              id="edit_type"
              value={editFormData.discountType}
              onChange={(e) =>
                setEditFormData((p) => ({
                  ...p,
                  discountType: e.target.value,
                }))
              }
              searchable={false}
            >
              <Option value="percentage"   label="Percentage (%)" />
              <Option value="fixed_amount" label="Fixed Amount (₹)" />
            </SelectField>

            <DataField
              label="Value *"
              type="number"
              id="edit_value"
              value={editFormData.maxDiscountValue}
              onChange={(e) =>
                setEditFormData((p) => ({
                  ...p,
                  maxDiscountValue: e.target.value,
                }))
              }
              error={editFormErrors.maxDiscountValue}
            />
          </div>

          <SelectField
            label="Category"
            id="edit_category"
            value={editFormData.category}
            onChange={(e) =>
              setEditFormData((p) => ({ ...p, category: e.target.value }))
            }
            searchable={false}
          >
            <Option value="custom"             label="Custom" />
            <Option value="sibling_discount"   label="Sibling Discount" />
            <Option value="merit_scholarship"  label="Merit Scholarship" />
            <Option value="staff_child"        label="Staff Child" />
            <Option value="financial_hardship" label="Financial Hardship" />
            <Option value="sports_quota"       label="Sports Quota" />
          </SelectField>

          <div className="py-2">
            <ToggleButton
              label="Active Status"
              checked={editFormData.isActive}
              onChange={(val) =>
                setEditFormData((p) => ({ ...p, isActive: val }))
              }
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-[#E7E2DB]">
            <Button
              text="Cancel"
              variant="ghost"
              size={3}
              onClick={closeEditModal}
            />
            <Button
              type="submit"
              text="Update Waiver"
              variant="primary"
              size={4}
              loading={editSubmitting}
            />
          </div>
        </form>
      </PanelModal>
    </div>
  );
};

export default FeeWaiverManager;