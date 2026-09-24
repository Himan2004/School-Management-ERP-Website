import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Search,
  Filter,
  Eye,
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Download,
  RefreshCw,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Clock,
  Award,
  Star,
  Mail,
  Phone,
  Building2,
  Users,
  FileText,
  Zap,
  Shield,
  Sparkles,
  Gift,
  Crown,
  BarChart3,
  Activity,
  Target,
  Printer,
  Share2,
  Copy,
  ExternalLink,
  X,
  Loader2,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import * as api from "../../services/api/graphuraApi";
import * as XLSX from "xlsx";

// --- SAFE DATE HELPERS ---
const formatDateSafe = (dateString, formatStr = "dd MMM yyyy") => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? "Invalid Date" : format(d, formatStr);
};

const getDaysLeft = (endDate) => {
  if (!endDate) return 0;
  const d = new Date(endDate);
  return isNaN(d.getTime()) ? 0 : differenceInDays(d, new Date());
};

const Subscriptions = () => {
  const [localSubscriptions, setLocalSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [submitting, setSubmitting] = useState(false); // Protects modal actions

  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState("table");

  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);

  const [editData, setEditData] = useState({});
  const [renewData, setRenewData] = useState({ duration: "1year" });

  const fetchSubscriptions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.fetchAllSubscriptions();
      const mappedData = (response.data?.data || []).map((org) => ({
        id: org._id || Math.random().toString(),
        schoolName: org.organizationName || "Unknown School",
        schoolId: org.organizationId || "N/A",
        email: org.officialEmail || "N/A",
        phone: org.contactNumber || "N/A",
        plan: org.subscriptionPlan || "Standard",
        status: org.subscriptionStatus || "active",
        endDate: org.subscriptionExpiryDate || new Date().toISOString(),
        startDate: org.createdAt || new Date().toISOString(),
        autoRenew: !!org.autoRenew,
        amount:
          org.subscriptionPlan === "Premium"
            ? 4999
            : org.subscriptionPlan === "Standard"
              ? 2999
              : 999,
        paymentMethod: "Annual",
        lastPayment: org.createdAt || new Date().toISOString(),
      }));
      setLocalSubscriptions(mappedData);
    } catch (error) {
      console.error("Fetch subscriptions error:", error);
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // --- HANDLERS ---
  const handleUpdateSubscription = async () => {
    if (!selectedSubscription) return;
    setSubmitting(true);
    try {
      await api.updateSubscription(selectedSubscription.id, editData);
      toast.success("Subscription updated successfully");
      setLocalSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === selectedSubscription.id ? { ...sub, ...editData } : sub,
        ),
      );
      setShowEditModal(false);
    } catch (error) {
      toast.error("Failed to update subscription");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenewSubscription = async () => {
    if (!selectedSubscription || !selectedSubscription.endDate) return;
    setSubmitting(true);
    try {
      // Safely parse current end date, fallback to today if invalid
      let currentEnd = new Date(selectedSubscription.endDate);
      if (isNaN(currentEnd.getTime())) currentEnd = new Date();

      const newEndDate = addDays(
        currentEnd,
        renewData.duration === "1year" ? 365 : 180,
      );
      const updatePayload = {
        subscriptionExpiryDate: newEndDate.toISOString(),
        subscriptionStatus: "active",
      };

      await api.updateSubscription(selectedSubscription.id, updatePayload);
      toast.success(`Subscription renewed until ${formatDateSafe(newEndDate)}`);
      setLocalSubscriptions((prev) =>
        prev.map((sub) =>
          sub.id === selectedSubscription.id
            ? { ...sub, endDate: newEndDate.toISOString(), status: "active" }
            : sub,
        ),
      );
      setShowRenewModal(false);
    } catch (error) {
      toast.error("Failed to renew subscription");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    if (filteredSubscriptions.length === 0) {
      toast.error("No data to export");
      return;
    }
    setExporting(true);
    try {
      const exportData = filteredSubscriptions.map((sub) => ({
        "School Name": sub.schoolName,
        Plan: sub.plan,
        Amount: sub.amount,
        "Start Date": formatDateSafe(sub.startDate),
        "End Date": formatDateSafe(sub.endDate),
        Status: sub.status,
        "Days Remaining": getDaysLeft(sub.endDate),
        "Auto Renew": sub.autoRenew ? "Yes" : "No",
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Subscriptions");
      XLSX.writeFile(
        workbook,
        `subscriptions_${formatDateSafe(new Date(), "yyyy-MM-dd")}.xlsx`,
      );
      toast.success("Export completed successfully!");
    } catch (error) {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleViewDetails = (subscription) => {
    setSelectedSubscription(subscription);
    setShowDetailsModal(true);
  };

  // --- MEMOIZED CALCULATIONS ---
  const filteredSubscriptions = useMemo(() => {
    return localSubscriptions.filter((sub) => {
      const safeName = (sub.schoolName || "").toLowerCase();
      const safeEmail = (sub.email || "").toLowerCase();
      const searchLower = searchTerm.toLowerCase();

      const matchesSearch =
        safeName.includes(searchLower) || safeEmail.includes(searchLower);
      const matchesPlan = filterPlan === "all" || sub.plan === filterPlan;

      const daysLeft = getDaysLeft(sub.endDate);
      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "expiring_soon" &&
          (sub.status === "expiring_soon" ||
            (sub.status === "active" && daysLeft <= 30 && daysLeft >= 0))) ||
        sub.status === filterStatus;

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [localSubscriptions, searchTerm, filterPlan, filterStatus]);

  const stats = useMemo(() => {
    const total = localSubscriptions.length;
    const totalRevenue = localSubscriptions.reduce(
      (sum, s) => sum + (s.amount || 0),
      0,
    );

    return {
      total,
      active: localSubscriptions.filter((s) => s.status === "active").length,
      expiringSoon: localSubscriptions.filter(
        (s) =>
          s.status === "expiring_soon" ||
          (s.status === "active" &&
            getDaysLeft(s.endDate) <= 30 &&
            getDaysLeft(s.endDate) >= 0),
      ).length,
      premium: localSubscriptions.filter((s) => s.plan === "Premium").length,
      totalRevenue,
      avgRevenue: total > 0 ? Math.round(totalRevenue / total) : 0,
      renewalRate:
        total > 0
          ? Math.round(
              (localSubscriptions.filter((s) => s.autoRenew).length / total) *
                100,
            )
          : 0,
    };
  }, [localSubscriptions]);

  const planDistribution = useMemo(
    () => [
      {
        name: "Premium",
        value: localSubscriptions.filter((s) => s.plan === "Premium").length,
        color: "#F59E0B",
      },
      {
        name: "Standard",
        value: localSubscriptions.filter((s) => s.plan === "Standard").length,
        color: "#3B82F6",
      },
      {
        name: "Basic",
        value: localSubscriptions.filter((s) => s.plan === "Basic").length,
        color: "#6B7280",
      },
    ],
    [localSubscriptions],
  );

  // --- UI HELPERS ---
  const getPlanBadge = (plan) => {
    switch (plan) {
      case "Premium":
        return (
          <span className="px-2 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full text-xs flex items-center gap-1 w-fit">
            <Crown className="w-3 h-3" /> Premium
          </span>
        );
      case "Standard":
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1 w-fit">
            <Star className="w-3 h-3" /> Standard
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs flex items-center gap-1 w-fit">
            <Zap className="w-3 h-3" /> Basic
          </span>
        );
    }
  };

  const getStatusBadge = (status, endDate) => {
    const daysLeft = getDaysLeft(endDate);
    if (status === "active") {
      if (daysLeft <= 30 && daysLeft >= 0) {
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs flex items-center gap-1 w-fit animate-pulse">
            <Clock className="w-3 h-3" /> Expiring Soon ({daysLeft}d)
          </span>
        );
      }
      return (
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1 w-fit">
          <CheckCircle className="w-3 h-3" /> Active
        </span>
      );
    }
    if (status === "expiring_soon") {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs flex items-center gap-1 w-fit">
          <Clock className="w-3 h-3" /> Expiring Soon
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1 w-fit">
        <XCircle className="w-3 h-3" /> Expired
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Subscriptions Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage school subscriptions, plans, and renewals
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          <div className="flex bg-gray-100 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setViewMode("table")}
              className={`p-2 rounded transition-all ${viewMode === "table" ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              <CreditCard className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Building2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("analytics")}
              className={`p-2 rounded transition-all ${viewMode === "analytics" ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => fetchSubscriptions(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 shrink-0 font-medium text-sm disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />{" "}
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || filteredSubscriptions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shrink-0 font-medium text-sm disabled:opacity-50 transition-colors"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}{" "}
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Total
            </span>
            <CreditCard className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-gray-800">
            {stats.total}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Active
            </span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-green-600">
            {stats.active}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Expiring
            </span>
            <Clock className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-yellow-600">
            {stats.expiringSoon}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Premium
            </span>
            <Crown className="w-4 h-4 text-yellow-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-yellow-600">
            {stats.premium}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Total Revenue
            </span>
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-green-600 truncate">
            ₹{stats.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Renewal
            </span>
            <RefreshCw className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-purple-600">
            {stats.renewalRate}%
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by school name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium text-slate-700"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Plans</option>
              <option value="Premium">Premium</option>
              <option value="Standard">Standard</option>
              <option value="Basic">Basic</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    School
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Plan
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Amount
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Dates
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="py-12 text-center text-slate-500 font-medium"
                    >
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />{" "}
                      Loading Subscriptions...
                    </td>
                  </tr>
                ) : filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="py-12 text-center text-slate-500 font-medium"
                    >
                      No subscriptions match your search.
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800 text-sm truncate max-w-[200px]">
                          {sub.schoolName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                          {sub.email}
                        </p>
                      </td>
                      <td className="px-5 py-4">{getPlanBadge(sub.plan)}</td>
                      <td className="px-5 py-4">
                        <span className="font-black text-slate-800 text-sm">
                          ₹{sub.amount.toLocaleString()}
                        </span>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">
                          {sub.paymentMethod}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-[11px] text-slate-500 font-bold mb-0.5">
                          <span className="text-slate-400">Start:</span>{" "}
                          {formatDateSafe(sub.startDate)}
                        </p>
                        <p className="text-[11px] text-slate-500 font-bold">
                          <span className="text-slate-400">End:</span>{" "}
                          {formatDateSafe(sub.endDate)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(sub.status, sub.endDate)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleViewDetails(sub)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSubscription(sub);
                              setEditData(sub);
                              setShowEditModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSubscription(sub);
                              setShowRenewModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Renew"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500 font-medium">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />{" "}
              Loading Subscriptions...
            </div>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 font-medium">
              No subscriptions match your search.
            </div>
          ) : (
            filteredSubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <div
                  className={`p-5 ${sub.plan === "Premium" ? "bg-gradient-to-r from-yellow-500 to-orange-500" : sub.plan === "Standard" ? "bg-gradient-to-r from-blue-500 to-indigo-500" : "bg-gradient-to-r from-gray-500 to-gray-600"} text-white`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold opacity-90 uppercase tracking-widest">
                        {sub.plan} Plan
                      </p>
                      <p className="text-3xl font-black mt-1">
                        ₹{sub.amount.toLocaleString()}
                      </p>
                      <p className="text-xs font-medium opacity-80 mt-1">
                        per year
                      </p>
                    </div>
                    {getPlanBadge(sub.plan)}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-800 text-lg line-clamp-1">
                    {sub.schoolName}
                  </h3>
                  <div className="flex items-center gap-2 mt-3">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-600 truncate">
                      {sub.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-600 truncate">
                      {sub.phone}
                    </span>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Valid Until
                      </span>
                      <span className="font-bold text-sm text-slate-700">
                        {formatDateSafe(sub.endDate)}
                      </span>
                    </div>
                    <div className="mb-4">
                      {getStatusBadge(sub.status, sub.endDate)}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleViewDetails(sub)}
                        className="flex-1 px-3 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => {
                          setSelectedSubscription(sub);
                          setShowRenewModal(true);
                        }}
                        className="flex-1 px-3 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
                      >
                        Renew
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Analytics View */}
      {viewMode === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-black text-gray-800 mb-6">
              Plan Distribution
            </h3>
            {localSubscriptions.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {planDistribution.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip wrapperClassName="font-bold text-xs rounded-xl shadow-xl border-none" />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{
                      fontSize: "12px",
                      fontWeight: 600,
                      paddingTop: "20px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400 font-medium">
                No Data Available
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-black text-gray-800 mb-6">
              Revenue by Top Schools
            </h3>
            {localSubscriptions.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={filteredSubscriptions.slice(0, 6).map((sub) => ({
                    name:
                      (sub.schoolName || "Unknown").substring(0, 10) + "...",
                    amount: sub.amount || 0,
                  }))}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    wrapperClassName="font-bold text-xs rounded-xl shadow-xl border-none"
                  />
                  <Bar
                    dataKey="amount"
                    fill="#4F46E5"
                    radius={[4, 4, 0, 0]}
                    barSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400 font-medium">
                No Data Available
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-black text-gray-800 mb-6">
              Active vs Expiring
            </h3>
            {localSubscriptions.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Active (Safe)",
                        value: stats.active - stats.expiringSoon,
                        color: "#10B981",
                      },
                      {
                        name: "Expiring Soon",
                        value: stats.expiringSoon,
                        color: "#F59E0B",
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={5}
                  >
                    <Cell fill="#10B981" />
                    <Cell fill="#F59E0B" />
                  </Pie>
                  <Tooltip wrapperClassName="font-bold text-xs rounded-xl shadow-xl border-none" />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{
                      fontSize: "12px",
                      fontWeight: 600,
                      paddingTop: "20px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400 font-medium">
                No Data Available
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-black text-gray-800 mb-6">
              Key Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-6 bg-indigo-50 rounded-2xl">
                <p className="text-3xl font-black text-indigo-600">
                  {stats.renewalRate}%
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
                  Renewal Rate
                </p>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-2xl">
                <p className="text-3xl font-black text-green-600">
                  ₹{stats.avgRevenue.toLocaleString()}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
                  Avg. Revenue
                </p>
              </div>
              <div className="text-center p-6 bg-yellow-50 rounded-2xl">
                <p className="text-3xl font-black text-yellow-600">
                  {stats.premium}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
                  Premium Orgs
                </p>
              </div>
              <div className="text-center p-6 bg-red-50 rounded-2xl">
                <p className="text-3xl font-black text-red-600">
                  {stats.expiringSoon}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
                  Need Attention
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedSubscription && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-br from-slate-900 to-indigo-900 px-8 py-6">
                <div className="flex items-start justify-between">
                  <div className="pr-4">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-1 block">
                      Subscription Profile
                    </span>
                    <h2 className="text-2xl font-black text-white leading-tight">
                      {selectedSubscription.schoolName}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0"
                  >
                    <X className="w-5 h-5 text-slate-300" />
                  </button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto max-h-[calc(85vh-100px)] custom-scrollbar">
                {/* Status Row */}
                <div className="flex flex-wrap gap-4 mb-8">
                  <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl flex-1 min-w-[120px]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      Status
                    </p>
                    {getStatusBadge(
                      selectedSubscription.status,
                      selectedSubscription.endDate,
                    )}
                  </div>
                  <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl flex-1 min-w-[120px]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      Plan Tier
                    </p>
                    {getPlanBadge(selectedSubscription.plan)}
                  </div>
                  <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl flex-1 min-w-[120px]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                      Time Left
                    </p>
                    <p
                      className={`text-lg font-black ${getDaysLeft(selectedSubscription.endDate) <= 30 ? "text-red-600" : "text-slate-800"}`}
                    >
                      {getDaysLeft(selectedSubscription.endDate)} Days
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {/* Organization Info */}
                  <div>
                    <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                      <Building2 className="w-4 h-4 text-indigo-500" />{" "}
                      Organization Data
                    </h3>
                    <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Platform ID
                        </p>
                        <p className="font-semibold text-slate-700 text-sm mt-0.5">
                          {selectedSubscription.schoolId || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Admin Email
                        </p>
                        <p className="font-semibold text-slate-700 text-sm mt-0.5 break-all">
                          {selectedSubscription.email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Contact Number
                        </p>
                        <p className="font-semibold text-slate-700 text-sm mt-0.5">
                          {selectedSubscription.phone || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Billing Details */}
                  <div>
                    <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wide">
                      <CreditCard className="w-4 h-4 text-green-500" /> Billing
                      Details
                    </h3>
                    <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Annual Rate
                        </p>
                        <p className="font-black text-slate-800">
                          ₹{selectedSubscription.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Start Date
                        </p>
                        <p className="font-semibold text-slate-700 text-sm">
                          {formatDateSafe(selectedSubscription.startDate)}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Renewal Date
                        </p>
                        <p className="font-semibold text-slate-700 text-sm">
                          {formatDateSafe(selectedSubscription.endDate)}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Auto Charge
                        </p>
                        <p className="font-semibold text-slate-700 text-sm">
                          {selectedSubscription.autoRenew
                            ? "Enabled"
                            : "Disabled"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-8 mt-8 border-t border-slate-100">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="flex-1 px-4 py-3.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Close Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedSubscription(selectedSubscription);
                      setEditData(selectedSubscription);
                      setShowEditModal(true);
                    }}
                    className="flex-1 px-4 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md shadow-slate-200"
                  >
                    Modify Plan
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowRenewModal(true);
                    }}
                    className="flex-1 px-4 py-3.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
                  >
                    Process Renewal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedSubscription && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !submitting && setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <h3 className="text-xl font-black text-slate-800 mb-1">
                  Modify Subscription
                </h3>
                <p className="text-sm font-semibold text-slate-500 mb-6 truncate">
                  {selectedSubscription.schoolName}
                </p>

                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Plan Tier
                    </label>
                    <select
                      value={editData.plan || "Basic"}
                      onChange={(e) =>
                        setEditData({ ...editData, plan: e.target.value })
                      }
                      className="w-full p-3.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Standard">Standard</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Annual Rate (₹)
                    </label>
                    <input
                      type="number"
                      value={editData.amount || 0}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          amount: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full p-3.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      End Date
                    </label>
                    {/* Safe conversion to YYYY-MM-DD for input type="date" */}
                    <input
                      type="date"
                      value={
                        editData.endDate
                          ? new Date(editData.endDate)
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          endDate: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : new Date().toISOString(),
                        })
                      }
                      className="w-full p-3.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Status
                    </label>
                    <select
                      value={editData.status || "active"}
                      onChange={(e) =>
                        setEditData({ ...editData, status: e.target.value })
                      }
                      className="w-full p-3.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="expiring_soon">Expiring Soon</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setShowEditModal(false)}
                    disabled={submitting}
                    className="flex-1 px-4 py-3.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateSubscription}
                    disabled={submitting}
                    className="flex-1 px-4 py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Renew Modal */}
      <AnimatePresence>
        {showRenewModal && selectedSubscription && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !submitting && setShowRenewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center shrink-0">
                    <RefreshCw className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 leading-tight">
                      Process Renewal
                    </h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 truncate max-w-[200px]">
                      {selectedSubscription.schoolName}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Current Plan
                    </span>
                    <span className="font-bold text-slate-700 text-sm">
                      {selectedSubscription.plan}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Current Rate
                    </span>
                    <span className="font-black text-slate-800">
                      ₹{selectedSubscription.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Expires On
                    </span>
                    <span
                      className={`font-bold text-sm ${getDaysLeft(selectedSubscription.endDate) <= 30 ? "text-red-500" : "text-slate-700"}`}
                    >
                      {formatDateSafe(selectedSubscription.endDate)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Extension Duration
                  </label>
                  <select
                    value={renewData.duration || "1year"}
                    onChange={(e) => setRenewData({ duration: e.target.value })}
                    className="w-full p-3.5 mt-1 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                  >
                    <option value="6months">
                      6 Months Extension (₹
                      {Math.floor(
                        (selectedSubscription.amount || 0) / 2,
                      ).toLocaleString()}
                      )
                    </option>
                    <option value="1year">
                      1 Year Extension (₹
                      {(selectedSubscription.amount || 0).toLocaleString()})
                    </option>
                  </select>
                </div>

                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setShowRenewModal(false)}
                    disabled={submitting}
                    className="flex-1 px-4 py-3.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRenewSubscription}
                    disabled={submitting}
                    className="flex-1 px-4 py-3.5 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}{" "}
                    {submitting ? "Processing..." : "Confirm Renewal"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Subscriptions;
