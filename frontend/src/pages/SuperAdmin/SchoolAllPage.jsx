import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { selectSuperAdmin } from "../../features/auth/superAuthSlice.js";
import {
  getAllSchools,
  updateSchool,
  toggleSchoolStatus,
  deleteSchool,
  clearError,
  clearMessage,
} from "../../features/superAdmin/superAdminSlice.js";
import toast, { Toaster } from "react-hot-toast";
import api from "../../services/api.js";
import { getOrganizationClasses } from "../../services/api/organizationApi.js";
import { sortGrades } from "../../utils/gradeSorter";
import {
  School,
  CheckCircle2,
  XCircle,
  Eye,
  Power,
  Trash2,
  Edit3,
  Users,
} from "lucide-react";

// ─── Shared Component Imports ──────────────────────────────────────────────
import {
  Heading,
  DashGrid,
  DashCard,
  DataTable,
  PanelModal,
  ModalProfile,
  ModalGrid,
  ModalData,
  Grid,
  DataField,
  SelectField,
  Option,
  Button,
} from "../../components/shared/Common_Components";
import { useNavigate } from "react-router-dom";
import SchoolRequestsTabContent from "./SchoolRequestsPage.jsx";

// ─── Constants & Helpers ───────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: "+91", country: "India", label: "🇮🇳 +91 (India)" },
  { code: "+1", country: "United States", label: "🇺🇸 +1 (US)" },
  { code: "+44", country: "United Kingdom", label: "🇬🇧 +44 (UK)" },
  { code: "+61", country: "Australia", label: "🇦🇺 +61 (AUS)" },
  { code: "+971", country: "UAE", label: "🇦🇪 +971 (UAE)" },
];

const INDIAN_BOARDS = [
  "CBSE (Central Board of Secondary Education)",
  "ICSE / ISC (Council for the Indian School Certificate Examinations)",
  "State Board",
  "IB (International Baccalaureate)",
  "Cambridge (IGCSE / GCE A Levels)",
];
// ─── Helpers ───────────────────────────────────────────────────────────────
function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000),
    h = Math.floor(diff / 3600000),
    d = Math.floor(diff / 8400000);
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

const parsePhone = (phoneStr) => {
  if (!phoneStr) return { code: "+91", number: "" };
  const sortedCodes = [...COUNTRY_CODES].sort(
    (a, b) => b.code.length - a.code.length,
  );
  for (const c of sortedCodes) {
    if (phoneStr.startsWith(c.code))
      return { code: c.code, number: phoneStr.substring(c.code.length).trim() };
  }
  return { code: "+91", number: phoneStr.replace(/\D/g, "") };
};

const parseGradesOffered = (gradesStr) => {
  if (!gradesStr) return [];
  return gradesStr
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
};

const fetchPincodeDetails = async (pin) => {
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await response.json();
    if (data?.[0]?.Status === "Success") {
      const postOffice = data[0].PostOffice[0];
      return {
        city: postOffice.District || postOffice.Division || "",
        state: postOffice.State || "",
        country: "India",
      };
    }
  } catch (err) {
    console.error("Failed to fetch pincode details:", err);
  }
  return null;
};

// ─── Edit Modal Component ──────────────────────────────────────────────────
function EditModal({ school, schools = [], authUser, onClose, onSave }) {
  const [form, setForm] = useState({
    ...school,
    totalStaff:
      school?.totalStaff !== undefined && school?.totalStaff !== ""
        ? school.totalStaff
        : (Number(school?.totalTeachingStaff) || 0) +
            (Number(school?.totalNonTeachingStaff) || 0) || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const [officialPhoneCode, setOfficialPhoneCode] = useState("+91");
  const [officialPhoneNumber, setOfficialPhoneNumber] = useState("");
  const [principalPhoneCode, setPrincipalPhoneCode] = useState("+91");
  const [principalPhoneNumber, setPrincipalPhoneNumber] = useState("");
  const [availableClasses, setAvailableClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      const orgId = school.organization || localStorage.getItem("organizationMongoId") || authUser?.organization?._id || authUser?.organizationId || authUser?.superAdmin?.organization || "";
      if (!orgId) {
        setAvailableClasses([]);
        setClassesLoading(false);
        return;
      }
      setClassesLoading(true);
      try {
        const res = await getOrganizationClasses(orgId);
        if (res.success) {
          const sorted = sortGrades(res.data || [], (c) => c.name);
          setAvailableClasses(sorted);
        } else {
          setAvailableClasses([]);
        }
      } catch (err) {
        console.error("Failed to fetch classes:", err);
        setAvailableClasses([]);
      } finally {
        setClassesLoading(false);
      }
    };
    fetchClasses();
  }, [school, authUser]);

  useEffect(() => {
    if (!classesLoading && availableClasses.length > 0) {
      const availableNames = availableClasses.map(c => c.name);
      const currentSelected = parseGradesOffered(form.gradesOffered);
      const validSelected = currentSelected.filter(g => availableNames.includes(g));
      const sortedSelected = sortGrades(validSelected);
      if (sortedSelected.join(", ") !== form.gradesOffered) {
        setForm(prev => ({ ...prev, gradesOffered: sortedSelected.join(", ") }));
      }
    }
  }, [classesLoading, availableClasses]);

  const [orgDetails, setOrgDetails] = useState(null);
  const [fetchingOrg, setFetchingOrg] = useState(true);

  useEffect(() => {
    const fetchOrgCapacity = async () => {
      try {
        setFetchingOrg(true);
        const res = await api.get("/organization/my-subscription");
        if (res.data && res.data.success) {
          setOrgDetails(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch organization capacity:", err);
      } finally {
        setFetchingOrg(false);
      }
    };
    if (school) {
      fetchOrgCapacity();
    }
  }, [school]);

  const quotas = orgDetails?.quotas || authUser?.organization?.quotas || {
    maxStudents: 500,
    maxStaff: 70,
  };

  const otherUsage = useMemo(() => {
    return schools
      .filter((s) => s._id !== school._id)
      .reduce(
        (acc, s) => {
          acc.students += Number(s.enrollmentCapacity) || 0;
          acc.staff +=
            s.totalStaff !== undefined
              ? Number(s.totalStaff) || 0
              : (Number(s.totalTeachingStaff) || 0) +
                (Number(s.totalNonTeachingStaff) || 0);
          return acc;
        },
        { students: 0, staff: 0 },
      );
  }, [schools, school._id]);

  const maxStaffQuota =
    quotas.maxStaff !== undefined
      ? quotas.maxStaff
      : (quotas.maxTeachingStaff || 0) + (quotas.maxNonTeachingStaff || 0) ||
        70;
  const remainingStudents = Math.max(
    0,
    (quotas.maxStudents || 0) - otherUsage.students,
  );
  const remainingStaff = Math.max(0, maxStaffQuota - otherUsage.staff);

  const maxStudents = quotas.maxStudents || 500;
  const totalUsedStudents = otherUsage.students + (Number(school.enrollmentCapacity) || 0);
  const remainingStudentsForDisplay = Math.max(0, maxStudents - totalUsedStudents);

  const totalUsedStaff = otherUsage.staff + (
    school.totalStaff !== undefined && school.totalStaff !== ""
      ? Number(school.totalStaff) || 0
      : (Number(school.totalTeachingStaff) || 0) + (Number(school.totalNonTeachingStaff) || 0)
  );
  const remainingStaffForDisplay = Math.max(0, maxStaffQuota - totalUsedStaff);
  const selectedGrades = useMemo(
    () => parseGradesOffered(form.gradesOffered),
    [form.gradesOffered],
  );

  useEffect(() => {
    if (school) {
      const parsedOfficial = parsePhone(school.officialPhone);
      setOfficialPhoneCode(parsedOfficial.code);
      setOfficialPhoneNumber(parsedOfficial.number);
      const parsedPrincipal = parsePhone(school.principalPhone);
      setPrincipalPhoneCode(parsedPrincipal.code);
      setPrincipalPhoneNumber(parsedPrincipal.number);
    }
  }, [school]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      officialPhone: officialPhoneNumber
        ? `${officialPhoneCode} ${officialPhoneNumber}`
        : "",
    }));
  }, [officialPhoneCode, officialPhoneNumber]);
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      principalPhone: principalPhoneNumber
        ? `${principalPhoneCode} ${principalPhoneNumber}`
        : "",
    }));
  }, [principalPhoneCode, principalPhoneNumber]);

  const handleChange = (field) => (e) => {
    const valStr = e.target.value;
    setForm((prev) => ({ ...prev, [field]: valStr }));

    if (field === "enrollmentCapacity") {
      const val = Number(valStr);
      setErrors((prev) => {
        const next = { ...prev };
        if (valStr.trim() === "") {
          next.enrollmentCapacity = "Required";
        } else if (val < 0) {
          next.enrollmentCapacity = "Cannot be negative";
        } else if (val > remainingStudents) {
          next.enrollmentCapacity = "Allocated capacity exceeds remaining organization quota.";
        } else {
          delete next.enrollmentCapacity;
        }
        return next;
      });
    } else if (field === "totalStaff") {
      const val = Number(valStr);
      setErrors((prev) => {
        const next = { ...prev };
        if (valStr.trim() === "") {
          next.totalStaff = "Required";
        } else if (val < 0) {
          next.totalStaff = "Cannot be negative";
        } else if (val > remainingStaff) {
          next.totalStaff = "Allocated capacity exceeds remaining organization quota.";
        } else {
          delete next.totalStaff;
        }
        return next;
      });
    } else {
      if (errors[field])
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
    }
  };

  const handleGradeToggle = (grade) => {
    let nextGrades = selectedGrades.includes(grade)
      ? selectedGrades.filter((g) => g !== grade)
      : [...selectedGrades, grade];
    nextGrades.sort(
      (a, b) => {
        const idxA = availableClasses.findIndex(c => c.name === a);
        const idxB = availableClasses.findIndex(c => c.name === b);
        return idxA - idxB;
      }
    );
    setForm((prev) => ({ ...prev, gradesOffered: nextGrades.join(", ") }));
    if (errors.gradesOffered)
      setErrors((prev) => {
        const next = { ...prev };
        delete next.gradesOffered;
        return next;
      });
  };

  const validateForm = () => {
    const errs = {};
    if (!form.schoolName?.trim()) errs.schoolName = "Required";
    if (!form.address?.trim()) errs.address = "Required";
    if (!form.principalName?.trim()) errs.principalName = "Required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.officialEmail?.trim()) errs.officialEmail = "Required";
    else if (!emailRegex.test(form.officialEmail))
      errs.officialEmail = "Invalid format";
    if (!form.principalEmail?.trim()) errs.principalEmail = "Required";
    else if (!emailRegex.test(form.principalEmail))
      errs.principalEmail = "Invalid format";
    if (!officialPhoneNumber.trim()) errs.officialPhone = "Required";
    if (form.pinCode && !/^[1-9][0-9]{5}$/.test(form.pinCode))
      errs.pinCode = "Invalid PIN";
    if (!form.enrollmentCapacity) errs.enrollmentCapacity = "Required";
    else if (Number(form.enrollmentCapacity) > remainingStudents)
      errs.enrollmentCapacity = "Allocated capacity exceeds remaining organization quota.";
    if (!form.totalStaff) errs.totalStaff = "Required";
    else if (Number(form.totalStaff) > remainingStaff)
      errs.totalStaff = "Allocated capacity exceeds remaining organization quota.";
    if (availableClasses.length === 0) {
      errs.gradesOffered = "No classes created yet. Please create classes first from Organization Classes.";
    } else if (!form.gradesOffered || form.gradesOffered.trim() === "") {
      errs.gradesOffered = "Select at least one grade";
    } else {
      const currentSelectedGrades = form.gradesOffered.split(", ").filter(Boolean);
      const availableClassNames = availableClasses.map((c) => c.name);
      const invalidGrades = currentSelectedGrades.filter(g => !availableClassNames.includes(g));
      if (invalidGrades.length > 0) {
        errs.gradesOffered = `The following selected grades no longer exist: ${invalidGrades.join(", ")}. Please update your selection.`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    await onSave(school._id, form);
    setIsSaving(false);
    onClose();
  };

  if (fetchingOrg) {
    return (
      <PanelModal
        isVisible={!!school}
        onClose={onClose}
        title="Edit Branch Registry"
        size="2xl"
      >
        <div className="flex flex-col items-center justify-center p-12 gap-3">
          <span className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></span>
          <p className="text-slate-500 font-semibold text-sm">Fetching capacity limits...</p>
        </div>
      </PanelModal>
    );
  }

  return (
    <PanelModal
      isVisible={!!school}
      onClose={onClose}
      title="Edit Branch Registry"
      size="2xl"
    >
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <Grid cols={12} gap={4}>
          <Heading
            primaryText="Core Profile"
            size={12}
            fontSize="lg"
            showAnimations={true}
          />
          {/* Capacity Summary Section */}
          <div className="col-span-12 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-[20px] p-4 mb-2 shadow-sm">
            {/* Students Card */}
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <span className="text-base"></span> Students
              </span>
              <div className="grid grid-cols-3 gap-2 mt-2 text-center border-t border-slate-50 pt-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Allocated</span>
                  <span className="text-sm font-extrabold text-slate-700">{maxStudents}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Used</span>
                  <span className="text-sm font-extrabold text-slate-700">{totalUsedStudents}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remaining</span>
                  <span className="text-sm font-extrabold text-indigo-600">{remainingStudentsForDisplay}</span>
                </div>
              </div>
            </div>
            {/* Staff Card */}
            <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <span className="text-base"></span> Staff
              </span>
              <div className="grid grid-cols-3 gap-2 mt-2 text-center border-t border-slate-50 pt-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Allocated</span>
                  <span className="text-sm font-extrabold text-slate-700">{maxStaffQuota}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Used</span>
                  <span className="text-sm font-extrabold text-slate-700">{totalUsedStaff}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remaining</span>
                  <span className="text-sm font-extrabold text-indigo-600">{remainingStaffForDisplay}</span>
                </div>
              </div>
            </div>
          </div>
          <DataField
            label="School Name"
            value={form.schoolName || ""}
            onChange={handleChange("schoolName")}
            size={6}
            error={errors.schoolName}
          />
          <DataField
            label="Official Email"
            type="email"
            value={form.officialEmail || ""}
            onChange={handleChange("officialEmail")}
            size={6}
            error={errors.officialEmail}
          />

          {/* Custom Composite Field for Phone */}
          <div className="col-span-12 sm:col-span-6 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em]">
              Official Phone
            </label>
            <div className="flex gap-2">
              <select
                value={officialPhoneCode}
                onChange={(e) => setOfficialPhoneCode(e.target.value)}
                className="w-32 border border-[#E2E8F0] rounded-2xl px-3 outline-none text-sm font-medium focus:ring-2 focus:ring-[#F59B87]/15 focus:border-[#F59B87]"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={officialPhoneNumber}
                onChange={(e) =>
                  setOfficialPhoneNumber(
                    e.target.value.replace(/\D/g, "").slice(0, 15),
                  )
                }
                className={`flex-1 border ${errors.officialPhone ? "border-rose-400 bg-rose-50" : "border-[#E2E8F0]"} rounded-2xl px-4 py-3.5 outline-none text-sm font-medium focus:ring-2 focus:ring-[#F59B87]/15 focus:border-[#F59B87]`}
              />
            </div>
            {errors.officialPhone && (
              <span className="text-xs font-semibold text-rose-500">
                {errors.officialPhone}
              </span>
            )}
          </div>

          <DataField
            label="Website URL"
            type="url"
            value={form.website || ""}
            onChange={handleChange("website")}
            size={6}
          />

          <Heading
            primaryText="Academic & Location"
            size={12}
            fontSize="lg"
            showAnimations={false}
          />
          <SelectField
            label="Academic Board"
            value={form.board || ""}
            onChange={handleChange("board")}
            size={4}
          >
            {INDIAN_BOARDS.map((b) => (
              <Option key={b} value={b} label={b} />
            ))}
          </SelectField>
          <DataField
            label="Max Students"
            type="number"
            value={form.enrollmentCapacity || ""}
            onChange={handleChange("enrollmentCapacity")}
            size={4}
            error={errors.enrollmentCapacity}
          />
          <DataField
            label="Max Staff"
            type="number"
            value={form.totalStaff || ""}
            onChange={handleChange("totalStaff")}
            size={4}
            error={errors.totalStaff}
          />
          <DataField
            label="City"
            value={form.city || ""}
            onChange={handleChange("city")}
            size={4}
          />
          <DataField
            label="State"
            value={form.state || ""}
            onChange={handleChange("state")}
            size={4}
          />
          <DataField
            label="PIN Code"
            value={form.pinCode || ""}
            onChange={async (e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 6);
              setForm({ ...form, pinCode: val });
              if (val.length === 6) {
                const details = await fetchPincodeDetails(val);
                if (details)
                  setForm((p) => ({
                    ...p,
                    city: details.city,
                    state: details.state,
                    country: details.country,
                  }));
              }
            }}
            size={4}
            error={errors.pinCode}
          />
          <DataField
            label="Full Address"
            value={form.address || ""}
            onChange={handleChange("address")}
            size={12}
            error={errors.address}
          />

          <div className="col-span-12 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em]">
              Grades Offered
            </label>
            {classesLoading ? (
              <div className="flex items-center justify-center p-6 border border-[#E2E8F0] bg-slate-50 rounded-2xl">
                <span className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full mr-2"></span>
                <span className="text-xs font-semibold text-slate-500">Loading classes...</span>
              </div>
            ) : availableClasses.length === 0 ? (
              <div className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-200 rounded-2xl p-4">
                No classes created yet. Please create classes first from Organization Classes.
              </div>
            ) : (
              <div
                className={`flex flex-wrap gap-2 p-4 rounded-2xl border ${errors.gradesOffered ? "border-rose-400 bg-rose-50" : "border-[#E2E8F0] bg-slate-50"}`}
              >
                {availableClasses.map((cls) => {
                  const g = cls.name;
                  const isSelected = selectedGrades.includes(g);
                  return (
                    <button
                      type="button"
                      key={cls._id}
                      onClick={() => handleGradeToggle(g)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                        isSelected
                          ? "bg-[#223F74] text-white border-[#223F74]"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            )}
            {errors.gradesOffered && (
              <span className="text-xs font-semibold text-rose-500">
                {errors.gradesOffered}
              </span>
            )}
          </div>

          <Heading
            primaryText="Principal Info"
            size={12}
            fontSize="lg"
            showAnimations={false}
          />
          <DataField
            label="Principal Name"
            value={form.principalName || ""}
            onChange={handleChange("principalName")}
            size={4}
            error={errors.principalName}
          />
          <DataField
            label="Principal Email"
            type="email"
            value={form.principalEmail || ""}
            onChange={handleChange("principalEmail")}
            size={4}
            error={errors.principalEmail}
          />

          <div className="col-span-12 sm:col-span-4 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em]">
              Principal Phone
            </label>
            <div className="flex gap-2">
              <select
                value={principalPhoneCode}
                onChange={(e) => setPrincipalPhoneCode(e.target.value)}
                className="w-24 border border-[#E2E8F0] rounded-2xl px-2 outline-none text-sm font-medium focus:ring-2 focus:ring-[#F59B87]/15"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={principalPhoneNumber}
                onChange={(e) =>
                  setPrincipalPhoneNumber(
                    e.target.value.replace(/\D/g, "").slice(0, 15),
                  )
                }
                className={`flex-1 border ${errors.principalPhone ? "border-rose-400 bg-rose-50" : "border-[#E2E8F0]"} rounded-2xl px-4 py-3.5 outline-none text-sm font-medium focus:ring-2 focus:ring-[#F59B87]/15`}
              />
            </div>
          </div>
        </Grid>

        <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-slate-100">
          <Button
            text="Cancel"
            variant="secondary"
            size={2}
            onClick={onClose}
          />
          <Button
            text={isSaving ? "Saving..." : "Save Modifications"}
            variant="primary"
            type="submit"
            size={3}
            disabled={isSaving || !!errors.enrollmentCapacity || !!errors.totalStaff}
          />
        </div>
      </form>
    </PanelModal>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────
export default function SchoolRequestsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    schools = [],
    loading,
    error,
    message,
  } = useSelector((state) => state.superAdmin);
  const authUser = useSelector(selectSuperAdmin);

  const [selectedSchool, setSelectedSchool] = useState(null);
  const [editingSchool, setEditingSchool] = useState(null);

  const [activeTab, setActiveTab] = useState("registered"); // "registered" or "requests"
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvingRequest, setApprovingRequest] = useState(null);
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessingRejection, setIsProcessingRejection] = useState(false);

  const fetchRequests = async () => {
    const orgId = localStorage.getItem("organizationMongoId") || authUser?.organization?._id || authUser?.organizationId || authUser?.superAdmin?.organization || "";
    if (!orgId) return;
    try {
      setLoadingRequests(true);
      const res = await api.get(`/super-admin/requests?organizationId=${orgId}`);
      if (res.data && res.data.success) {
        setRequests(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch school requests:", err);
      toast.error("Failed to fetch school requests.");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (activeTab === "requests") {
      fetchRequests();
    }
  }, [activeTab]);

  const handleApproveConfirm = async () => {
    if (!approvingRequest) return;
    try {
      setIsProcessingApproval(true);
      const res = await api.put(`/super-admin/requests/${approvingRequest._id}/accept`, {
        maxStaffLimit: approvingRequest.totalStaff || (Number(approvingRequest.totalTeachingStaff) || 0) + (Number(approvingRequest.totalNonTeachingStaff) || 0) || 70,
        maxStudentLimit: approvingRequest.totalStudents || approvingRequest.enrollmentCapacity || 500,
      });
      if (res.data.success) {
        toast.success(res.data.message || "School registration approved successfully!");
        setApprovingRequest(null);
        fetchRequests();
        const orgId = localStorage.getItem("organizationMongoId") || authUser?.organization?._id || authUser?.organizationId || authUser?.superAdmin?.organization || "";
        dispatch(getAllSchools({ status: "all", organizationId: orgId }));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to approve school registration.");
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingRequest) return;
    try {
      setIsProcessingRejection(true);
      const res = await api.put(`/super-admin/requests/${rejectingRequest._id}/reject`, {
        reason: rejectionReason,
      });
      if (res.data.success) {
        toast.success(res.data.message || "School registration rejected successfully!");
        setRejectingRequest(null);
        setRejectionReason("");
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to reject school registration.");
    } finally {
      setIsProcessingRejection(false);
    }
  };

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

  useEffect(() => {
    const orgId = localStorage.getItem("organizationMongoId") || authUser?.organization?._id || authUser?.organizationId || authUser?.superAdmin?.organization || "";
    dispatch(getAllSchools({ status: "all", organizationId: orgId }));
  }, [dispatch]);

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

  const handleEditSave = async (id, updatedForm) => {
    await dispatch(updateSchool({ id, formData: updatedForm }));
  };

  const stats = useMemo(
    () => ({
      total: schools.length,
      active: schools.filter((s) => s.isActive).length,
      inactive: schools.filter((s) => !s.isActive).length,
      capacity: schools.reduce(
        (acc, curr) => acc + (parseInt(curr.enrollmentCapacity, 10) || 0),
        0,
      ),
    }),
    [schools],
  );

  // Format rows for DataTable (adding a 'statusStr' property to trigger standard styling)
  // And explicitly adding the new CSV requested fields to the payload mapped rows
  const tableRows = useMemo(() => {
    return schools.map((s) => {
      // Calculate Staff Capacity Fallback
      const staffCap =
        s.totalStaff !== undefined && s.totalStaff !== ""
          ? s.totalStaff
          : (Number(s.totalTeachingStaff) || 0) +
            (Number(s.totalNonTeachingStaff) || 0);

      // Calculate enrolled counts derived from previousStats
      const staffEnrolled =
        (s.previousStats?.teachers || 0) + (s.previousStats?.staff || 0);

      return {
        ...s,
        statusStr: s.isActive ? "Active" : "Inactive",
        // Format explicit keys for the new CSV columns
        totalStudentCapacity: s.enrollmentCapacity || "0",
        totalStudentEnrolled: s.previousStats?.students || 0,
        totalStaffCapacity: staffCap || "0",
        totalStaffEnrolled: staffEnrolled,
      };
    });
  }, [schools]);

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-10">
      <Toaster />

      {/* ── Header ── */}
      <Heading
        primaryText="School Management"
        secondaryText="Organization"
        size={12}
      />

      {/* ── Full Width Tabs ── */}
      <div className="grid grid-cols-2 border-b border-slate-200 w-full mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("registered")}
          className={`py-3.5 text-center font-bold text-sm border-b-2 transition-all ${
            activeTab === "registered"
              ? "border-[#2524D1] text-[#2524D1]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Registered Schools
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`py-3.5 text-center font-bold text-sm border-b-2 transition-all ${
            activeTab === "requests"
              ? "border-[#2524D1] text-[#2524D1]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          School Requests
        </button>
      </div>

      {activeTab === "registered" ? (
        <>
          {/* ── Stats ── */}
          <div className="mt-6 mb-8">
            <DashGrid cols={12} gap={4}>
              <DashCard
                title="Total Branches"
                value={stats.total}
                icon={<School size={22} />}
                accentColor="#3b82f6"
                size={3}
              />
              <DashCard
                title="Active Nodes"
                value={stats.active}
                icon={<CheckCircle2 size={22} />}
                accentColor="#22c55e"
                size={3}
              />
              <DashCard
                title="Inactive Nodes"
                value={stats.inactive}
                icon={<XCircle size={22} />}
                accentColor="#64748b"
                size={3}
              />
              <DashCard
                title="Total Capacity"
                value={stats.capacity.toLocaleString()}
                icon={<Users size={22} />}
                accentColor="#8b5cf6"
                size={3}
              />
            </DashGrid>
          </div>

          <DataTable
            title="Registered Schools"
            columns={[
              {
                key: "schoolName",
                label: "Institution",
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
                    <span className="font-semibold text-slate-700">
                      {val || "Not Assigned"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {row.principalEmail || row.officialEmail || "N/A"}
                    </span>
                  </div>
                ),
              },
              // Added required CSV columns to data-table
              {
                key: "totalStudentCapacity",
                label: "Student Cap.",
                align: "center",
              },
              {
                key: "totalStudentEnrolled",
                label: "Student Enrolled",
                align: "center",
              },
              { key: "totalStaffCapacity", label: "Staff Cap.", align: "center" },
              {
                key: "totalStaffEnrolled",
                label: "Staff Enrolled",
                align: "center",
              },
              { key: "yearOfEstablishment", label: "Established", align: "center" },
              { key: "statusStr", label: "Status", align: "center" },
            ]}
            rows={tableRows}
            actions={[
              {
                icon: <Eye size={16} />,
                tooltip: "View Profile",
                variant: "ghost",
                onClick: (row) => setSelectedSchool(row),
              },
              {
                icon: <Edit3 size={16} />,
                tooltip: "Modify Details",
                variant: "ghost",
                onClick: (row) => setEditingSchool(row),
              },
              {
                icon: <Power size={16} />,
                tooltip: "Toggle Status",
                variant: "ghost",
                onClick: (row) =>
                  dispatch(
                    toggleSchoolStatus({
                      id: row._id,
                      status: row.isActive ? "inactive" : "active",
                    }),
                  ),
              },
              {
                icon: <Trash2 size={16} />,
                tooltip: "Purge Record",
                variant: "danger",
                onClick: (row) => {
                  if (window.confirm(`Permanently delete ${row.schoolName}?`))
                    dispatch(deleteSchool(row._id));
                },
              },
            ]}
            filters={[
              {
                title: "Status",
                type: "select",
                key: "statusStr",
                options: ["Active", "Inactive"],
              },
            ]}
            searchable={true}
            exportable={true}
            exportFileName="branch-registry-export"
            size={12}
            pageSize={10}
          />
        </>
      ) : (
        <SchoolRequestsTabContent />
      )}

      {/* ── Modals ── */}
      <PanelModal
        isVisible={!!selectedSchool}
        onClose={() => setSelectedSchool(null)}
        title="Institution Profile"
        size="md"
      >
        {selectedSchool && (
          <div className="flex flex-col gap-6">
            <ModalProfile
              name={selectedSchool.schoolName}
              subtitle={`Board: ${selectedSchool.board || "Not Specified"}`}
              meta={`Created ${timeAgo(selectedSchool.createdAt)}`}
              avatarColor="#3b82f6"
            />
            <ModalGrid title="Academic Specifications" cols={2}>
              <ModalData
                label="Founded"
                value={selectedSchool.yearOfEstablishment || "—"}
              />
              <ModalData
                label="Medium"
                value={selectedSchool.mediumOfInstruction || "—"}
              />
              <ModalData
                label="Grades"
                value={selectedSchool.gradesOffered || "—"}
              />
              <ModalData
                label="Total Staff"
                value={
                  selectedSchool.totalStaff !== undefined &&
                  selectedSchool.totalStaff !== ""
                    ? selectedSchool.totalStaff
                    : (Number(selectedSchool.totalTeachingStaff) || 0) +
                        (Number(selectedSchool.totalNonTeachingStaff) || 0) ||
                      "—"
                }
              />
            </ModalGrid>
            <ModalGrid title="Contact Information" cols={1}>
              <ModalData
                label="Principal"
                value={`${selectedSchool.principalName || "—"} (${selectedSchool.principalEmail || "—"})`}
              />
              <ModalData
                label="Official Email"
                value={selectedSchool.officialEmail || "—"}
              />
              <ModalData
                label="Official Phone"
                value={selectedSchool.officialPhone || "—"}
              />
              <ModalData
                label="Address"
                value={selectedSchool.address || "—"}
              />
            </ModalGrid>
            <div className="flex justify-end pt-2">
              <Button
                text="Close Profile"
                variant="secondary"
                size={3}
                onClick={() => setSelectedSchool(null)}
              />
            </div>
          </div>
        )}
      </PanelModal>

      {editingSchool && (
        <EditModal
          school={editingSchool}
          schools={schools}
          authUser={authUser}
          onClose={() => setEditingSchool(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
