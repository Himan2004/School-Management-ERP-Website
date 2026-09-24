import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  User, Camera, Edit2, Lock, Eye, EyeOff, Copy, Check,
  Shield, Mail, Phone, MapPin, Briefcase, GraduationCap, Calendar,
} from "lucide-react";
import {
  getPrincipalProfileApi, updatePrincipalProfileApi, uploadPrincipalAvatarApi,
  removePrincipalAvatarApi, changePrincipalPasswordApi,
} from "../../services/api/principalProfileApi";
import { Heading, Button, DataField, DashGrid } from "../../components/shared/Common_Components";

const PrincipalProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "", email: "", phone: "", qualification: "", experience: "", address: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });

  const passwordStrength = useMemo(() => {
    const password = passwordData.newPassword;
    if (!password) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
    if (score <= 3) return { label: "Medium", color: "bg-yellow-500", width: "w-2/4" };
    return { label: "Strong", color: "bg-green-500", width: "w-full" };
  }, [passwordData.newPassword]);

  const fetchProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getPrincipalProfileApi();
      const data = response?.data;
      setProfile(data);
      setFormData({
        name: data?.name || "", email: data?.email || "", phone: data?.phone || "",
        qualification: data?.qualification || "", experience: data?.experience || "", address: data?.address || "",
      });
    } catch (err) {
      setError(err?.message || "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const initials = (profile?.name || "PR")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const formattedJoinDate = profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : "-";
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "-";

  const handleEditToggle = () => {
    setIsEditing(true);
    setMessage("");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setMessage("");
    setFormData({
      name: profile?.name || "", email: profile?.email || "", phone: profile?.phone || "",
      qualification: profile?.qualification || "", experience: profile?.experience || "", address: profile?.address || "",
    });
  };

  const handleSaveProfile = async () => {
    setMessage("");
    try {
      const response = await updatePrincipalProfileApi(formData);
      const updated = response?.data;
      setProfile(updated);
      setFormData({
        name: updated?.name || "", email: updated?.email || "", phone: updated?.phone || "",
        qualification: updated?.qualification || "", experience: updated?.experience || "", address: updated?.address || "",
      });
      setIsEditing(false);
      setMessage("Profile updated successfully");
    } catch (err) {
      setMessage(err?.message || "Failed to update profile");
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setMessage("");
    try {
      const response = await uploadPrincipalAvatarApi(file);
      const avatarUrl = response?.data?.avatarUrl;
      setProfile((prev) => ({ ...prev, photo: avatarUrl }));
      setMessage("Profile picture uploaded successfully");
    } catch (err) {
      setMessage(err?.message || "Failed to upload profile picture");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarRemoving(true);
    setMessage("");
    try {
      await removePrincipalAvatarApi();
      setProfile((prev) => ({ ...prev, photo: null }));
      setMessage("Profile picture removed successfully");
    } catch (err) {
      setMessage(err?.message || "Failed to remove profile picture");
    } finally {
      setAvatarRemoving(false);
    }
  };

  const handleCopyLoginId = async () => {
    if (!profile?.loginId) return;
    try {
      await navigator.clipboard.writeText(profile.loginId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      setMessage("Failed to copy login ID");
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New password and confirm password do not match");
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await changePrincipalPasswordApi(passwordData);
      setPasswordSuccess(response?.message || "Password changed successfully");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPasswordError(err?.message || "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  // 🔴 CLEANED UP LOADING STATE WRAPPERS
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  // 🔴 CLEANED UP ERROR STATE WRAPPERS
  if (error) {
    return (
      <div className="text-left">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  // 🔴 CLEANED UP MAIN RETURN WRAPPERS
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pb-12 text-left font-sans overflow-x-hidden">
      <Heading primaryText="My" secondaryText="Profile" size={12} />

      <div className="px-6 space-y-6 mt-6">
        {message && (
          <div className="rounded-xl border border-slate-200 bg-emerald-50 px-4 py-3 text-emerald-800 text-sm font-semibold">
            {message}
          </div>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="relative group">
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={avatarUploading}
                className="relative h-24 w-24 rounded-full overflow-hidden ring-4 ring-[#223F74]/10 disabled:opacity-60"
              >
                {profile?.photo ? (
                  <img src={profile.photo} alt="Principal Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-[#223F74] text-white text-2xl font-bold flex items-center justify-center">
                    {initials || "PR"}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Camera size={20} className="text-white" />
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{profile?.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                  Principal
                </span>
                <span className="text-sm text-gray-600 font-semibold">{profile?.schoolName || "School"}</span>
                <span className="text-sm text-gray-400">Joined {formattedJoinDate}</span>
              </div>
            </div>

            {profile?.photo && (
              <div className="w-40">
                <Button
                  text={avatarRemoving ? "Removing..." : "Remove Photo"}
                  variant="danger"
                  onClick={handleRemoveAvatar}
                  disabled={avatarRemoving}
                />
              </div>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-[#223F74]">Personal Information</h2>
              {!isEditing ? (
                <div className="w-40">
                  <Button
                    text="Edit Profile"
                    icon={<Edit2 size={16} />}
                    onClick={handleEditToggle}
                  />
                </div>
              ) : null}
            </div>

            <DashGrid cols={12} gap={4}>
              <DataField
                label="Full Name"
                id="name"
                value={isEditing ? formData.name : profile?.name || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                readOnly={!isEditing}
                size={6}
              />

              <DataField
                label="Email"
                id="email"
                icon={Mail}
                value={isEditing ? formData.email : profile?.email || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                readOnly={!isEditing}
                size={6}
              />

              <DataField
                label="Phone"
                id="phone"
                icon={Phone}
                value={isEditing ? formData.phone : profile?.phone || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                readOnly={!isEditing}
                size={6}
              />

              <DataField
                label="Qualification"
                id="qualification"
                icon={GraduationCap}
                value={isEditing ? formData.qualification : profile?.qualification || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, qualification: e.target.value }))}
                readOnly={!isEditing}
                size={6}
              />

              <DataField
                label="Experience (years)"
                id="experience"
                value={isEditing ? formData.experience : profile?.experience || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, experience: e.target.value }))}
                readOnly={!isEditing}
                size={6}
              />

              <DataField
                label="Address"
                id="address"
                icon={MapPin}
                type="textarea"
                value={isEditing ? formData.address : profile?.address || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                readOnly={!isEditing}
                size={12}
                rows={3}
              />
            </DashGrid>

            {isEditing && (
              <div className="mt-6 flex gap-3 w-80">
                <div className="flex-1">
                  <Button text="Save Changes" onClick={handleSaveProfile} />
                </div>
                <div className="flex-1">
                  <Button text="Cancel" variant="ghost" onClick={handleCancelEdit} />
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#223F74] mb-4">Account Information</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
                <User size={16} className="text-[#223F74] mt-1" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Login ID</p>
                  <p className="text-sm font-medium text-gray-900">{profile?.loginId || "-"}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLoginId}
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
                  title="Copy Login ID"
                >
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                </button>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
                <Shield size={16} className="text-[#223F74] mt-1" />
                <div>
                  <p className="text-xs text-gray-500">Role</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{profile?.role || "principal"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
                <Briefcase size={16} className="text-[#223F74] mt-1" />
                <div>
                  <p className="text-xs text-gray-500">School Name</p>
                  <p className="text-sm font-medium text-gray-900">{profile?.schoolName || "-"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
                <Check size={16} className="text-emerald-600 mt-1" />
                <div>
                  <p className="text-xs text-gray-500">Account Status</p>
                  <span className="inline-flex mt-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Active
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-3">
                <Calendar size={16} className="text-[#223F74] mt-1" />
                <div>
                  <p className="text-xs text-gray-500">Member Since</p>
                  <p className="text-sm font-medium text-gray-900">{memberSince}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={18} className="text-[#223F74]" />
            <h2 className="text-lg font-bold text-[#223F74]">Change Password</h2>
          </div>

          {passwordError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {passwordSuccess}
            </div>
          )}

          <form onSubmit={handlePasswordChange}>
            <DashGrid cols={12} gap={4}>
              {[
                { key: "currentPassword", label: "Current Password" },
                { key: "newPassword", label: "New Password" },
                { key: "confirmPassword", label: "Confirm New Password" },
              ].map((field) => (
                <DataField
                  key={field.key}
                  label={field.label}
                  id={field.key}
                  type="password"
                  value={passwordData[field.key]}
                  onChange={(e) =>
                    setPasswordData((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  size={4}
                />
              ))}

              <div className="col-span-12 md:col-span-8">
                <p className="text-xs text-gray-500 mb-1">Password Strength: {passwordStrength.label}</p>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full ${passwordStrength.color} ${passwordStrength.width} transition-all`} />
                </div>
              </div>

              <div className="col-span-12 w-48 mt-2">
                <Button
                  text={passwordLoading ? "Updating..." : "Update Password"}
                  type="submit"
                  disabled={passwordLoading}
                />
              </div>
            </DashGrid>
          </form>
        </section>
      </div>
    </div>
  );
};

export default PrincipalProfile;