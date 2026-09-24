import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Modal,
  DataField,
  DashGrid,
  Button,
  SelectField,
  Option,
  closeModal
} from "../shared/Common_Components";

const INITIAL_FORM = {
  name: "",
  email: "",
  status: "active",
  gender: "",
  dob: "",
  address: "",
};

export const ADD_ADMIN_MODAL_ID = "add-admin-modal";

function AddAdminModal() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const update = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) {
      setErrors((errs) => {
        const newErrs = { ...errs };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Invalid email format";
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/principal/add-admin`,
        form,
        { withCredentials: true }
      );

      if (response.data.success) {
        toast.success("Admin created successfully! Credentials sent to email.");
        setForm(INITIAL_FORM);
        closeModal(ADD_ADMIN_MODAL_ID);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create admin";
      toast.error(msg);
      setErrors({ submit: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal id={ADD_ADMIN_MODAL_ID} title="Add New Admin" size="lg">
      <div className="space-y-6">
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
          <p className="text-sm font-semibold text-slate-600 mb-4">
            Create a school administrator account
          </p>
          <DashGrid cols={12} gap={4}>
            <DataField
              label="Full Name *"
              id="admin_name"
              placeholder="e.g. John Doe"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              error={errors.name}
              size={6}
            />
            <DataField
              label="Email Address *"
              id="admin_email"
              type="email"
              placeholder="admin@school.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              error={errors.email}
              size={6}
            />
            <SelectField
              label="Status"
              id="admin_status"
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
              searchable={false}
              size={4}
            >
              <Option value="active" label="Active" />
              <Option value="inactive" label="Inactive" />
            </SelectField>
            <SelectField
              label="Gender"
              id="admin_gender"
              value={form.gender}
              onChange={(e) => update("gender", e.target.value)}
              searchable={false}
              size={4}
            >
              <Option value="" label="Select Gender" />
              <Option value="Male" label="Male" />
              <Option value="Female" label="Female" />
              <Option value="Other" label="Other" />
            </SelectField>
            <DataField
              label="Date of Birth (Optional)"
              id="admin_dob"
              type="date"
              value={form.dob}
              onChange={(e) => update("dob", e.target.value)}
              size={4}
            />
            <DataField
              label="Address (Optional)"
              id="admin_address"
              type="textarea"
              placeholder="Full residential address"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              size={12}
            />
          </DashGrid>
        </div>

        {errors.submit && (
          <p className="text-red-500 text-sm font-medium text-center">{errors.submit}</p>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            text="Cancel"
            variant="secondary"
            onClick={() => closeModal(ADD_ADMIN_MODAL_ID)}
            size={3}
          />
          <Button
            text={loading ? "Creating..." : "Create Admin"}
            onClick={handleSubmit}
            disabled={loading}
            size={4}
          />
        </div>
      </div>
    </Modal>
  );
}

export default AddAdminModal;
