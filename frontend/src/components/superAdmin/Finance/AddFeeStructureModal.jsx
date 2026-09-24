import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { X, Plus, Trash2, Save, Loader } from "lucide-react";
import toast from "react-hot-toast";
import {
  createFeeStructure,
  createFeeHead,
  getFeeHeads,
  getOrganizationClasses,
  updateFeeStructure,
} from "../../../services/api/financeApi";
import { selectSuperAdmin } from "../../../features/auth/superAuthSlice";

const PRESET_FEE_HEADS = [
  "Tuition Fee",
  "Library Fee",
  "Music Class Fee",
  "Sports Fee",
  "Uniform and Books Fee",
];

const resolveObjectId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;

  return (
    value._id ||
    value.id ||
    value.organization ||
    value.organization?._id ||
    value.organization ||
    ""
  );
};

const AddFeeStructureModal = ({
  isOpen,
  onClose,
  organization,
  onStructureCreated,
  onStructureUpdated,
  initialData = null,
  mode = "create",
}) => {
  const superAdmin = useSelector(selectSuperAdmin);
  const actualOrgId =
    resolveObjectId(organization) ||
    superAdmin?.superAdmin?.organization?._id ||
    superAdmin?.superAdmin?.organization ||
    superAdmin?.organization?._id ||
    superAdmin?.organization ||
    superAdmin?._id ||
    superAdmin?.id ||
    "";

  const [loading, setLoading] = useState(false);
  const [feeHeadsLoading, setFeeHeadsLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(true);
  const [feeHeadsOptions, setFeeHeadsOptions] = useState([]);
  const [classesOptions, setClassesOptions] = useState([]);
  const [creatingFeeHeadIndex, setCreatingFeeHeadIndex] = useState(null);

  const [formData, setFormData] = useState({
    classId: "",
    academicYear: "2025-2026",
    feeLines: [
      {
        feeHeadId: "",
        amount: "",
        dueDate: "",
        overrideReason: "",
        newFeeHeadName: "",
        isCustom: false,
      },
    ],
    isActive: true,
  });

  const [errors, setErrors] = useState({});

  const availablePresetFeeHeads = PRESET_FEE_HEADS.filter((name) =>
    feeHeadsOptions.every(
      (head) => head?.name?.toLowerCase() !== name.toLowerCase(),
    ),
  );

  // Fetch Fee Heads
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFeeHeadsLoading(true);
        const feeHeadsRes = await getFeeHeads(
          actualOrgId ? { organizationId: actualOrgId } : undefined,
        );
        setFeeHeadsOptions(feeHeadsRes.data?.data || []);
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || "Failed to load fee heads";
        toast.error(errorMsg);
        console.error("Error fetching fee heads:", err);
      } finally {
        setFeeHeadsLoading(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, actualOrgId]);

  // Load Initial Data for Edit
  useEffect(() => {
    if (!isOpen || mode !== "edit" || !initialData) return;

    setFormData({
      classId: initialData.classId?._id || initialData.classId || "",
      academicYear: initialData.academicYear || "",
      feeLines: (initialData.feeLines || []).map((line) => ({
        feeHeadId: line.feeHeadId?._id || line.feeHeadId || "",
        amount: line.amount ?? "",
        dueDate: line.dueDate
          ? new Date(line.dueDate).toISOString().slice(0, 10)
          : "",
        overrideReason: line.overrideReason || "",
        newFeeHeadName: "",
        isCustom: false,
      })),
      isActive:
        typeof initialData.isActive === "boolean" ? initialData.isActive : true,
    });
    setErrors({});
  }, [isOpen, mode, initialData]);

  // Fetch Classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!actualOrgId) return;
      try {
        setClassesLoading(true);
        const classesRes = await getOrganizationClasses(actualOrgId);
        setClassesOptions(classesRes.data?.data || []);
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || "Failed to load classes";
        toast.error(errorMsg);
        console.error("Error fetching classes:", err);
      } finally {
        setClassesLoading(false);
      }
    };

    if (isOpen && actualOrgId) {
      fetchClasses();
    }
  }, [isOpen, actualOrgId]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.classId) {
      newErrors.classId = "Please select a class";
    }

    if (!formData.academicYear) {
      newErrors.academicYear = "Academic year is required";
    } else if (!/^\d{4}-\d{4}$/.test(formData.academicYear)) {
      newErrors.academicYear = "Format must be YYYY-YYYY (e.g., 2025-2026)";
    }

    if (formData.feeLines.length === 0) {
      newErrors.feeLines = "At least one fee line is required";
    }

    const seenHeads = new Set();

    formData.feeLines.forEach((line, index) => {
      if (!line.feeHeadId) {
        newErrors[`feeHead-${index}`] = "Select a fee type";
      } else {
        if (seenHeads.has(line.feeHeadId)) {
          newErrors[`feeHead-${index}`] = "This fee type is already added";
        } else {
          seenHeads.add(line.feeHeadId);
        }
      }

      if (!line.amount || line.amount <= 0) {
        newErrors[`amount-${index}`] = "Enter valid amount";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddFeeLine = () => {
    setFormData((prev) => ({
      ...prev,
      feeLines: [
        ...prev.feeLines,
        {
          feeHeadId: "",
          amount: "",
          dueDate: "",
          overrideReason: "",
          newFeeHeadName: "",
          isCustom: false,
        },
      ],
    }));
  };

  const handleRemoveFeeLine = (index) => {
    setFormData((prev) => ({
      ...prev,
      feeLines: prev.feeLines.filter((_, i) => i !== index),
    }));
  };

  const handleFeeLineUpdate = (index, updates) => {
    setFormData((prev) => {
      const updatedLines = [...prev.feeLines];
      updatedLines[index] = {
        ...updatedLines[index],
        ...updates,
      };
      return { ...prev, feeLines: updatedLines };
    });
  };

  const handleFeeLineChange = (index, field, value) => {
    handleFeeLineUpdate(index, { [field]: value });
  };

  const handleFeeHeadSelect = async (index, value) => {
    if (!value) {
      handleFeeLineUpdate(index, {
        feeHeadId: "",
        isCustom: false,
        newFeeHeadName: "",
      });
      return;
    }

    if (value === "custom") {
      handleFeeLineUpdate(index, {
        feeHeadId: "",
        isCustom: true,
        newFeeHeadName: "",
      });
      return;
    }

    handleFeeLineUpdate(index, {
      isCustom: false,
      newFeeHeadName: "",
    });

    if (value.startsWith("preset:")) {
      const presetName = value.replace("preset:", "");

      const existing = feeHeadsOptions.find(
        (head) => head.name?.toLowerCase() === presetName.toLowerCase(),
      );

      if (existing?._id) {
        handleFeeLineUpdate(index, {
          feeHeadId: existing._id,
          isCustom: false,
          newFeeHeadName: "",
        });
        return;
      }

      try {
        setCreatingFeeHeadIndex(index);
        if (!actualOrgId) {
          throw new Error("Organization context is missing");
        }
        const response = await createFeeHead({
          organization: actualOrgId,
          name: presetName,
        });

        const created = response.data?.data;
        if (!created?._id) {
          throw new Error("Invalid fee type response");
        }

        setFeeHeadsOptions((prev) => [...prev, created]);
        handleFeeLineUpdate(index, {
          feeHeadId: created._id,
          isCustom: false,
          newFeeHeadName: "",
        });
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || "Failed to add fee type";
        toast.error(errorMsg);
        console.error("Error creating fee head:", err);
      } finally {
        setCreatingFeeHeadIndex(null);
      }
      return;
    }

    handleFeeLineUpdate(index, {
      feeHeadId: value,
      isCustom: false,
      newFeeHeadName: "",
    });
  };

  const handleCreateFeeHead = async (index) => {
    const name = formData.feeLines[index]?.newFeeHeadName?.trim();

    if (!name) {
      toast.error("Enter a fee type name");
      return;
    }

    try {
      setCreatingFeeHeadIndex(index);

      if (!actualOrgId) {
        toast.error("Organization context missing. Add is disabled.");
        throw new Error("Organization context is missing");
      }

      const existing = feeHeadsOptions.find(
        (head) => head.name?.toLowerCase() === name.toLowerCase(),
      );

      if (existing?._id) {
        handleFeeLineUpdate(index, {
          feeHeadId: existing._id,
          newFeeHeadName: "",
          isCustom: false,
        });
        toast.success("Fee type selected");
        return;
      }

      const payload = { organization: actualOrgId, name };
      const response = await createFeeHead(payload);

      const created = response?.data?.data;

      if (!created?._id) {
        throw new Error("Invalid response from server");
      }

      setFeeHeadsOptions((prev) => [...prev, created]);

      setFormData((prev) => {
        const updated = [...prev.feeLines];
        updated[index] = {
          ...updated[index],
          feeHeadId: created._id,
          newFeeHeadName: "",
          isCustom: false,
        };
        return { ...prev, feeLines: updated };
      });

      toast.success("Fee type added");
    } catch (err) {
      console.error("[AddFeeStructureModal] createFeeHead error:", err);
      const serverMsg =
        err.response?.data?.message ||
        JSON.stringify(err.response?.data) ||
        err.message;
      toast.error(`Failed to add fee type: ${serverMsg}`);
    } finally {
      setCreatingFeeHeadIndex(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix all errors in the form");
      return;
    }

    try {
      setLoading(true);

      // 🔥 FIX: Cleanly mapping feeLines to ensure no empty dueDate objects break Mongoose
      const processedFeeLines = formData.feeLines.map((line) => {
        const processedLine = {
          feeHeadId: line.feeHeadId,
          amount: Number(line.amount),
          overrideReason: line.overrideReason || "",
        };

        // Only attach dueDate if the user actually selected a date
        if (line.dueDate && line.dueDate.trim() !== "") {
          processedLine.dueDate = new Date(line.dueDate).toISOString();
        }

        return processedLine;
      });

      const submitData = {
        organization: actualOrgId,
        classId: formData.classId,
        academicYear: formData.academicYear,
        feeLines: processedFeeLines,
        isActive: formData.isActive,
      };

      if (mode === "edit" && initialData?._id) {
        const response = await updateFeeStructure(initialData._id, submitData);
        toast.success("Fee structure updated successfully!"); 
        onStructureUpdated?.(response.data.data);
      } else {
        const response = await createFeeStructure(submitData);
        toast.success("Fee structure created successfully!");
        onStructureCreated?.(response.data.data);
      }

      if (mode === "create") {
        setFormData({
          classId: "",
          academicYear: "2025-2026",
          feeLines: [
            {
              feeHeadId: "",
              amount: "",
              dueDate: "",
              overrideReason: "",
              newFeeHeadName: "",
              isCustom: false,
            },
          ],
          isActive: true,
        });
        setErrors({});
      }
      onClose();
    }catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to create fee structure";
      toast.error(errorMsg); // REMOVED EMOJI
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    isOpen && (
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-200 bg-white z-10">
            <h2 className="text-2xl font-bold text-slate-800">
              {mode === "edit" ? "Edit Fee Structure" : "Create Fee Structure"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X size={24} className="text-slate-500" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Class Selection */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Select Class *
              </label>
              <select
                id="classId"
                name="classId"
                value={formData.classId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    classId: e.target.value,
                  }))
                }
                disabled={classesLoading}
                className={`w-full p-3 border rounded-xl outline-none focus:ring-2 transition-all ${
                  errors.classId
                    ? "border-red-300 focus:ring-red-500/20"
                    : "border-slate-200 focus:ring-indigo-500/20"
                } ${classesLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <option value="">
                  {classesLoading ? "Loading classes..." : "Choose a class..."}
                </option>
                {classesOptions.map((cls) => (
                  <option key={cls._id || cls.id} value={cls._id || cls.id}>
                    {cls.className || cls.name}{" "}
                    {cls.section ? `- ${cls.section}` : ""}
                  </option>
                ))}
              </select>
              {errors.classId && (
                <p className="text-red-500 text-xs mt-1">{errors.classId}</p>
              )}
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Academic Year *
              </label>
              <input
                id="academicYear"
                name="academicYear"
                type="text"
                value={formData.academicYear}
                maxLength={9} // 🔥 PREVENTS TYPING MORE THAN 9 CHARACTERS
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    academicYear: e.target.value,
                  }))
                }
                placeholder="e.g., 2025-2026"
                className={`w-full p-3 border rounded-xl outline-none focus:ring-2 transition-all ${
                  errors.academicYear
                    ? "border-red-300 focus:ring-red-500/20"
                    : "border-slate-200 focus:ring-indigo-500/20"
                }`}
              />
              {/* 🔥 DISPLAYS THE SPECIFIC RED ERROR MESSAGE */}
              {errors.academicYear && (
                <p className="text-red-500 text-xs mt-1">{errors.academicYear}</p>
              )}
            </div>

            {/* Fee Lines Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-bold text-slate-700">
                  Fee Lines *
                </label>
                <button
                  type="button"
                  onClick={handleAddFeeLine}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all"
                >
                  <Plus size={14} /> Add Fee
                </button>
              </div>

              <div className="space-y-4">
                {formData.feeLines.map((line, index) => (
                  <div
                    key={index}
                    className="bg-slate-50 p-4 rounded-xl border border-slate-200"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 🔥 FIX: De-duplicated Fee Type Select Block */}
                      <div>
                        <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
                          Fee Type
                        </label>
                        {!line.isCustom ? (
                          <select
                            value={line.feeHeadId}
                            onChange={(e) => handleFeeHeadSelect(index, e.target.value)}
                            disabled={feeHeadsLoading}
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                          >
                            <option value="">Select fee type...</option>
                            
                            {/* Preset options */}
                            {availablePresetFeeHeads.map((name) => (
                              <option key={name} value={`preset:${name}`}>
                                {name}
                              </option>
                            ))}
                            
                            <option value="custom">+ Other (Custom)</option>
                            
                            {/* 🔥 FIX: Filter out fee heads that are already selected in OTHER rows */}
                            {feeHeadsOptions
                              .filter((head) => {
                                // Keep it in the list if it's the CURRENT row's selected item
                                if (head._id === line.feeHeadId) return true;
                                
                                // Otherwise, hide it if ANY other row has already selected it
                                const isAlreadySelected = formData.feeLines.some((l) => l.feeHeadId === head._id);
                                return !isAlreadySelected;
                              })
                              .map((head) => (
                                <option key={head._id} value={head._id}>
                                  {head.name}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={line.newFeeHeadName}
                              onChange={(e) =>
                                handleFeeLineChange(
                                  index,
                                  "newFeeHeadName",
                                  e.target.value,
                                )
                              }
                              placeholder="Enter fee name"
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => handleCreateFeeHead(index)}
                              disabled={!line.newFeeHeadName?.trim()}
                              className="px-3 py-1 bg-indigo-600 text-white text-xs rounded font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all"
                            >
                              Add
                            </button>
                          </div>
                        )}
                        {errors[`feeHead-${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`feeHead-${index}`]}
                          </p>
                        )}
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
                          Amount (₹)
                        </label>
                        <input
                          id={`amount-${index}`}
                          name={`amount-${index}`}
                          type="number"
                          value={line.amount}
                          onChange={(e) =>
                            handleFeeLineChange(index, "amount", e.target.value)
                          }
                          placeholder="0"
                          className={`w-full p-2 border rounded-lg text-sm outline-none bg-white ${
                            errors[`amount-${index}`]
                              ? "border-red-300"
                              : "border-slate-200"
                          }`}
                        />
                        {errors[`amount-${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`amount-${index}`]}
                          </p>
                        )}
                      </div>

                      {/* Due Date */}
                      <div>
                        <label className="text-xs font-bold text-slate-600 uppercase mb-1 block">
                          Due Date
                        </label>
                        <input
                          id={`dueDate-${index}`}
                          name={`dueDate-${index}`}
                          type="date"
                          value={line.dueDate}
                          onChange={(e) =>
                            handleFeeLineChange(
                              index,
                              "dueDate",
                              e.target.value,
                            )
                          }
                          className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none bg-white"
                        />
                      </div>
                    </div>

                    {/* Override Reason */}
                    <div className="mt-3">
                      <input
                        id={`overrideReason-${index}`}
                        name={`overrideReason-${index}`}
                        type="text"
                        value={line.overrideReason}
                        onChange={(e) =>
                          handleFeeLineChange(
                            index,
                            "overrideReason",
                            e.target.value,
                          )
                        }
                        placeholder="Override reason (optional)"
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none bg-white"
                      />
                    </div>

                    {/* Remove Button */}
                    {formData.feeLines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFeeLine(index)}
                        className="mt-3 flex items-center gap-2 text-red-600 text-xs font-bold hover:bg-red-50 px-2 py-1 rounded transition-all"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Active Status */}
            <label className="flex items-center gap-2 cursor-pointer group w-fit">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded accent-indigo-600"
              />
              <span className="text-sm font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">
                Active structure
              </span>
            </label>

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    {mode === "edit" ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {mode === "edit" ? "Update Structure" : "Create Structure"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  );
};

export default AddFeeStructureModal;
