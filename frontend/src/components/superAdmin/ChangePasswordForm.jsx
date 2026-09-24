import React, { useState } from 'react';
import { DataField, Button } from '../shared/Common_Components';
import { Lock } from 'lucide-react';

const ChangePasswordForm = ({ onSuccess }) => {
  const [form, setForm] = useState({ current: '', new: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm((p) => ({ ...p, [id]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.current) {
      setError('Current password is required');
      return;
    }
    if (form.new !== form.confirm) {
      setError('New passwords do not match');
      return;
    }
    // simulate success
    setSuccess('Password changed successfully');
    setForm({ current: '', new: '', confirm: '' });
    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      {error && <p className="text-sm font-semibold text-rose-500 mb-4 bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</p>}
      {success && <p className="text-sm font-semibold text-emerald-600 mb-4 bg-emerald-50 p-3 rounded-xl border border-emerald-100">{success}</p>}
      
      <div className="space-y-5">
        <DataField
          label="Current Password"
          id="current"
          type="password"
          icon={Lock}
          value={form.current}
          onChange={handleChange}
          placeholder="Enter current password"
          size={12}
        />
        <DataField
          label="New Password"
          id="new"
          type="password"
          icon={Lock}
          value={form.new}
          onChange={handleChange}
          placeholder="Enter new password"
          size={12}
        />
        <DataField
          label="Confirm New Password"
          id="confirm"
          type="password"
          icon={Lock}
          value={form.confirm}
          onChange={handleChange}
          placeholder="Confirm your new password"
          size={12}
        />
        
        <div className="pt-2">
          <Button
            type="submit"
            variant="danger"
            text="Update Password"
            size={12}
          />
        </div>
      </div>
    </form>
  );
};

export default ChangePasswordForm;