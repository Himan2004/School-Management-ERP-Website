import React, { useEffect, useState } from "react";
import {
  School,
  Upload,
  Building2,
  Users,
  BadgeCheck,
  ArrowLeft,
  Save,
  MapPin,
  Settings,
  Image as ImageIcon,
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heading,
  DashGrid,
  DashCard,
  Button,
  DataField,
} from "../../../components/shared/Common_Components";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
const AddSchool = () => {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.superAuth?.authUser);
  const schools = useSelector((state) => state.superAdmin?.schools) || [];

  // ================= STATES =================
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState(null);
  const [stats, setStats] = useState({
    totalSchools: 0,
    activeSchools: 0,
    premiumPlans: 0,
    totalStudents: 0,
  });

  const [formData, setFormData] = useState({
    schoolName: "",
    schoolCode: "",
    principalName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    schoolType: "",
    totalStudents: "",
    subscriptionPlan: "",
    status: "active",
  });

  // ================= FETCH DASHBOARD STATS =================
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/schools/dashboard-stats"
      );
      setStats(response.data);
    } catch (error) {
      console.log("Stats Fetch Error:", error);
    }
  };

  // ================= HANDLE CHANGE =================
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // ================= HANDLE LOGO =================
  const handleLogoChange = (e) => {
    setLogo(e.target.files[0]);
  };

  // ================= HANDLE RESET =================
  const handleReset = () => {
    setFormData({
      schoolName: "",
      schoolCode: "",
      principalName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      schoolType: "",
      totalStudents: "",
      subscriptionPlan: "",
      status: "active",
    });
    setLogo(null);
    alert("Form Reset Successfully!");
  };

  // ================= SAVE DRAFT =================
  const handleSaveDraft = () => {
    localStorage.setItem("schoolDraft", JSON.stringify(formData));
    alert("Draft Saved Successfully!");
  };

  // ================= HANDLE SUBMIT =================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const maxSchools = authUser?.organization?.quotas?.maxSchools || 1;
    const currentSchools = schools.length;
    if (currentSchools >= maxSchools) {
      toast.error(
        <div className="text-left">
          <strong className="block font-black text-sm">School Limit Reached</strong>
          <span className="text-xs">
            You have already used all allocated school slots ({currentSchools}/{maxSchools}).
            Please increase capacity before creating a new school.
          </span>
        </div>,
        { id: "school-limit-toast", duration: 5000 }
      );
      return;
    }
    try {
      setLoading(true);
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key]);
      });
      if (logo) {
        data.append("logo", logo);
      }
      const response = await axios.post(
        "http://localhost:5000/api/schools/create",
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      alert(response.data.message);
      handleReset();
      fetchDashboardStats();
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Failed to Create School");
    } finally {
      setLoading(false);
    }
  };

  // ================= HANDLE BACK =================
  const handleBack = () => {
    navigate(-1);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.4 } },
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-8 font-sans pb-16">
      {/* ================= HEADER ================= */}
      <Heading
        primaryText="Add New School"
        secondaryText="Register and manage schools in the ERP platform"
        size={12}
        action={
          <div className="flex gap-3 items-center">
            <Button
              text="Back"
              icon={<ArrowLeft size={18} />}
              variant="secondary"
              onClick={handleBack}
            />
            <Button
              text="Reset Form"
              variant="danger"
              onClick={handleReset}
            />
          </div>
        }
      />

      {/* ================= DASHBOARD CARDS ================= */}
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        <DashGrid cols={12} gap={6}>
          <motion.div variants={itemVariants} className="col-span-12 sm:col-span-6 lg:col-span-3">
            <DashCard
              title="Total Schools"
              value={stats.totalSchools}
              icon={<School size={22} />}
              accentColor="#3b82f6"
            />
          </motion.div>
          <motion.div variants={itemVariants} className="col-span-12 sm:col-span-6 lg:col-span-3">
            <DashCard
              title="Active Schools"
              value={stats.activeSchools}
              icon={<BadgeCheck size={22} />}
              accentColor="#10b981"
            />
          </motion.div>
          <motion.div variants={itemVariants} className="col-span-12 sm:col-span-6 lg:col-span-3">
            <DashCard
              title="Premium Plans"
              value={stats.premiumPlans}
              icon={<Building2 size={22} />}
              accentColor="#8b5cf6"
            />
          </motion.div>
          <motion.div variants={itemVariants} className="col-span-12 sm:col-span-6 lg:col-span-3">
            <DashCard
              title="Students"
              value={stats.totalStudents}
              icon={<Users size={22} />}
              accentColor="#f97316"
            />
          </motion.div>
        </DashGrid>
      </motion.div>

      {/* ================= MAIN FORM ================= */}
      <form onSubmit={handleSubmit} className="space-y-6 mt-8">
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Main Info & Settings */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* Section 1: Basic Information */}
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white/40 shadow-xl shadow-slate-200/40 p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
              
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-indigo-200/50">
                  <School size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Basic Information</h2>
                  <p className="text-sm text-slate-500 font-medium">Core details about the institution</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                <DataField
                  label="School Name"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleChange}
                  placeholder="Enter school name"
                  required
                />
                <DataField
                  label="School Code"
                  name="schoolCode"
                  value={formData.schoolCode}
                  onChange={handleChange}
                  placeholder="SCH-1001"
                  required
                />
                <DataField
                  label="Principal Name"
                  name="principalName"
                  value={formData.principalName}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                />
                <DataField
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="school@example.com"
                />
                <DataField
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                />
                <DataField
                  label="Total Students"
                  name="totalStudents"
                  type="number"
                  value={formData.totalStudents}
                  onChange={handleChange}
                  placeholder="e.g. 1500"
                />
              </div>
            </motion.div>

            {/* Section 2: Location Details */}
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white/40 shadow-xl shadow-slate-200/40 p-6 sm:p-8 relative overflow-hidden">
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-emerald-200/50">
                  <MapPin size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Location Details</h2>
                  <p className="text-sm text-slate-500 font-medium">Where is this school located?</p>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <DataField
                  label="Full Address"
                  name="address"
                  type="textarea"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter full street address"
                  rows={3}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DataField
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g. Mumbai"
                  />
                  <DataField
                    label="State"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="e.g. Maharashtra"
                  />
                  <DataField
                    label="Pincode"
                    name="pincode"
                    type="number"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="e.g. 400001"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Configuration & Uploads */}
          <div className="space-y-6">
            
            {/* Section 3: Configuration */}
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white/40 shadow-xl shadow-slate-200/40 p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-rose-200/50">
                  <Settings size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Configuration</h2>
                  <p className="text-sm text-slate-500 font-medium">Setup board and plans</p>
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    School Board Type
                  </label>
                  <select
                    name="schoolType"
                    value={formData.schoolType}
                    onChange={handleChange}
                    className="w-full bg-white/50 border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  >
                    <option value="">Select Type</option>
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="State Board">State Board</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Subscription Plan
                  </label>
                  <select
                    name="subscriptionPlan"
                    value={formData.subscriptionPlan}
                    onChange={handleChange}
                    className="w-full bg-white/50 border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  >
                    <option value="">Select Plan</option>
                    <option value="Basic">Basic</option>
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Account Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full bg-white/50 border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Section 4: Brand Logo */}
            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-2xl rounded-[2rem] border border-white/40 shadow-xl shadow-slate-200/40 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-amber-200/50">
                  <ImageIcon size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Brand Logo</h2>
                </div>
              </div>

              <label className="relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-3xl bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-400 transition-all cursor-pointer group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="p-4 bg-white rounded-full shadow-sm border border-slate-100 text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all z-10 mb-4">
                  <Upload size={24} />
                </div>
                <p className="font-bold text-slate-700 z-10 text-center">
                  {logo ? logo.name : "Click to upload logo"}
                </p>
                <p className="text-xs text-slate-500 mt-2 z-10 font-medium">PNG, JPG up to 5MB</p>
                <input type="file" className="hidden" onChange={handleLogoChange} />
              </label>
            </motion.div>
          </div>
        </motion.div>

        {/* ================= FLOATING ACTION BAR ================= */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 p-3 rounded-full shadow-2xl flex items-center gap-3 z-50"
        >
          <div className="flex-1">
            <Button
              text={loading ? "Registering School..." : "Add School"}
              variant="primary"
              disabled={loading}
              onClick={handleSubmit}
              size={12}
            />
          </div>
          <div className="flex-1">
            <Button
              text="Save Draft"
              icon={<Save size={18} />}
              variant="secondary"
              onClick={handleSaveDraft}
              size={12}
            />
          </div>
        </motion.div>
      </form>
    </div>
  );
};

export default AddSchool;