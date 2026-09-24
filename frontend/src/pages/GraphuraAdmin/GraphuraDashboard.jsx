import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  Building2,
  UserCheck,
  Clock,
  Activity,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  Search,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  X,
  School,
  ArrowDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
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
  ComposedChart,
  Line
} from "recharts";
import { format, isValid } from "date-fns";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import * as api from "../../services/api/graphuraApi";

const GraphuraDashboard = () => {
  const navigate = useNavigate();
  const [platformAnalytics, setPlatformAnalytics] = useState(null);

  // Finance states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showExpenseFormModal, setShowExpenseFormModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [totalExpensesAmount, setTotalExpensesAmount] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [expenseSearchTerm, setExpenseSearchTerm] = useState("");
  const [creditSearchTerm, setCreditSearchTerm] = useState("");
  const [selectedOrgForCredit, setSelectedOrgForCredit] = useState(null);

  // Expense Form state
  const [expenseForm, setExpenseForm] = useState({
    organizationId: "",
    title: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    paymentMode: "cash",
    paymentStatus: "paid",
    remarks: "",
  });
  const [submittingExpense, setSubmittingExpense] = useState(false);
  const [organizationsList, setOrganizationsList] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [timeRange, setTimeRange] = useState("month");
  const [chartMetric, setChartMetric] = useState("total");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllBoards, setShowAllBoards] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localRequests, setLocalRequests] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  // 🔥 ADDED STATE FOR THE NEW TREND CHART TOGGLE
  const [trendView, setTrendView] = useState('monthly');

  const [recentActivities, setRecentActivities] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [platformDistribution, setPlatformDistribution] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(false);

  const handleViewActivity = (activity) => {
    setSelectedActivity(activity);
    setShowActivityModal(true);
  };

  const safeFormat = (dateStr, formatStr) => {
    try {
      const d = new Date(dateStr);
      return isValid(d) ? format(d, formatStr) : "N/A";
    } catch (e) {
      return "N/A";
    }
  };

  useEffect(() => {
    fetchAllData(false);
  }, []);

  const fetchAllData = async (showToast = false) => {
    setRefreshing(true);
    try {
      const [analyticsRes, orgsRes, usersRes, requestsRes, expensesRes] =
        await Promise.allSettled([
          api.fetchPlatformAnalytics(),
          api.fetchAllOrganizations(),
          api.fetchAllUsers(),
          api.fetchOrganizationRequests(),
          api.fetchAllExpenses(),
        ]);

      if (
        analyticsRes.status === "fulfilled" &&
        analyticsRes.value.data?.data
      ) {
        const analytics = analyticsRes.value.data.data;
        setPlatformAnalytics(analytics);
        setRecentActivities(analytics.recentActivitiesFeed || []);
        setUserActivity(analytics.userActivity7Days || []);
        setPlatformDistribution(analytics.schoolDistribution || []);
      }

      if (orgsRes.status === "fulfilled") {
        const orgPayload = orgsRes.value.data?.data;
        const orgList = Array.isArray(orgPayload)
          ? orgPayload
          : orgPayload?.organizations || [];
        setOrganizationsList(orgList);
      }

      if (usersRes.status === "fulfilled") {
        const userPayload = usersRes.value.data?.data;
        const userList = Array.isArray(userPayload)
          ? userPayload
          : userPayload?.superAdmins || [];
        setUsers(userList);
      }

      if (requestsRes.status === "fulfilled") {
        const reqs = requestsRes.value.data?.data?.requests || [];
        setLocalRequests(reqs);
      }

      if (expensesRes.status === "fulfilled" && expensesRes.value.data?.success) {
        const allExpenses = expensesRes.value.data.data || [];
        console.log("Expenses fetched:", allExpenses);
        // Filter: Keep only Graphura Admin / Graphura Super Admin created expenses
        const expensesData = allExpenses.filter((e) => e.recordedBy?.role === "graphuraAdmin");
        setExpenses(expensesData);
        setExpenseCount(expensesData.length);
        const total = expensesData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        setTotalExpensesAmount(total);
      } else if (expensesRes.status === "rejected") {
        console.error("Expenses fetch failed:", expensesRes.reason);
      }

      if (showToast) {
        toast.success("Dashboard refreshed successfully!");
      }
    } catch (error) {
      console.error("Refresh error:", error);
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleApprove = async (request) => {
    try {
      await api.approveOrganizationRequest(request._id);
      toast.success(`${request.organizationName} approved successfully!`);
      fetchAllData();
    } catch (error) {
      console.error("Approve error:", error);
      toast.error(error.response?.data?.message || "Failed to approve request");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      await api.rejectOrganizationRequest(selectedRequest._id, rejectReason);
      toast.success(
        `${selectedRequest.organizationName} rejected successfully`,
      );
      setShowRejectModal(false);
      setRejectReason("");
      fetchAllData();
    } catch (error) {
      console.error("Reject error:", error);
      toast.error(error.response?.data?.message || "Failed to reject request");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Aggregate expenses by organizationId
      const orgExpensesMap = {};
      (expenses || []).forEach((exp) => {
        const orgId = exp.organization?._id?.toString() || exp.organization?.toString();
        if (orgId) {
          orgExpensesMap[orgId] = (orgExpensesMap[orgId] || 0) + Number(exp.amount || 0);
        }
      });

      const formattedOrgs = (organizationsList || []).map((org) => {
        const copy = {};

        // Copy all keys except the removed ones
        Object.keys(org).forEach((key) => {
          if (
            key === "organizationAcademic" ||
            key === "subscriptionPlan" ||
            key === "paymentDetails" ||
            key === "superAdminProfile" ||
            key === "subscriptionAmount" ||
            key === "billing" ||
            key === "quotas" ||
            key === "subscriptionStatus" ||
            key === "autoRenew" ||
            key === "subscriptionExpiryDate" ||
            key === "organizationLogo" ||
            key === "usage"
          ) {
            return;
          }
          copy[key] = org[key];
        });

        // Set numberOfBranches to the actual allocated branch count
        copy.numberOfBranches = org.quotas?.maxSchools || 1;

        // Add paymentTimeline
        copy.paymentTimeline = org.billing?.cycle || "-";

        // Add paymentDate
        let paymentDateFormatted = "-";
        if (org.billing?.lastPaymentDate) {
          try {
            const d = new Date(org.billing.lastPaymentDate);
            paymentDateFormatted = isValid(d) ? format(d, "dd MMM yyyy") : "-";
          } catch (e) {
            paymentDateFormatted = "-";
          }
        }
        copy.paymentDate = paymentDateFormatted;

        // Add paymentAmount
        copy.paymentAmount =
          org.billing?.customAmount !== undefined && org.billing?.customAmount !== null
            ? org.billing.customAmount
            : "-";

        // Add totalExpenses
        const orgId = org._id?.toString();
        const totalExp = orgExpensesMap[orgId] || 0;
        copy.totalExpenses = totalExp;

        // Address Fix
        let addressString = "";
        if (org.address) {
          if (typeof org.address === "string") {
            addressString = org.address;
          } else {
            const parts = [
              org.address.line1,
              org.address.line2,
              org.address.city,
              org.address.state,
              org.address.pincode,
              org.address.country,
            ].filter((part) => part && String(part).trim() !== "");
            addressString = parts.join(", ");
          }
        }
        copy.address = addressString || "-";

        // Add subscriptionEndDate
        let subscriptionEndDate = "-";
        if (org.billing?.expiryDate) {
          try {
            const d = new Date(org.billing.expiryDate);
            subscriptionEndDate = isValid(d) ? format(d, "dd MMM yyyy") : "-";
          } catch (e) {
            subscriptionEndDate = "-";
          }
        }
        copy.subscriptionEndDate = subscriptionEndDate;

        // Add subscriptionDaysRemaining
        let subscriptionDaysRemaining = 0;
        if (org.billing?.expiryDate) {
          try {
            const today = new Date();
            const expiry = new Date(org.billing.expiryDate);
            const diffTime = expiry - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            subscriptionDaysRemaining = isNaN(diffDays) ? 0 : diffDays;
          } catch (e) {
            subscriptionDaysRemaining = 0;
          }
        }
        copy.subscriptionDaysRemaining = subscriptionDaysRemaining;

        return copy;
      });

      const removeKeys = (data, keysToRemove) => {
        if (!data) return data;
        if (Array.isArray(data)) {
          return data.map((item) => removeKeys(item, keysToRemove));
        }
        if (typeof data === "object") {
          const cleanCopy = { ...data };
          keysToRemove.forEach((key) => {
            delete cleanCopy[key];
          });
          return cleanCopy;
        }
        return data;
      };

      const keysToRemove = ["subscriptionStatus", "autoRenew", "subscriptionExpiryDate", "organizationLogo", "usage"];

      const exportData = {
        organizations: removeKeys(formattedOrgs, keysToRemove),
        users: removeKeys(users || [], keysToRemove),
        analytics: removeKeys(platformAnalytics || {}, keysToRemove),
        pendingRequests: removeKeys(localRequests.filter((r) => r.status === "pending"), keysToRemove),
        timestamp: new Date().toISOString(),
      };

      const workbook = XLSX.utils.book_new();
      const orgsSheet = XLSX.utils.json_to_sheet(exportData.organizations);
      XLSX.utils.book_append_sheet(workbook, orgsSheet, "Organizations");
      const usersSheet = XLSX.utils.json_to_sheet(exportData.users);
      XLSX.utils.book_append_sheet(workbook, usersSheet, "Users");
      const pendingSheet = XLSX.utils.json_to_sheet(exportData.pendingRequests);
      XLSX.utils.book_append_sheet(workbook, pendingSheet, "Pending Requests");
      const analyticsSheet = XLSX.utils.json_to_sheet([exportData.analytics]);
      XLSX.utils.book_append_sheet(workbook, analyticsSheet, "Analytics");

      XLSX.writeFile(
        workbook,
        `graphura_dashboard_${safeFormat(new Date(), "yyyy-MM-dd")}.xlsx`,
      );
      toast.success("Report exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  const metrics = platformAnalytics?.metricsSnapshot || platformAnalytics || {};

  // 🔥 NEW: DERIVE DATA FOR THE TREND CHART FROM THE BACKEND RESPONSE
  const monthlyTrendData = platformAnalytics?.monthlyTrendData || [];
  const yearlyTrendData = platformAnalytics?.yearlyTrendData || [];
  const chartDataToDisplay = trendView === 'monthly' ? monthlyTrendData : yearlyTrendData;
  const xAxisTrendKey = trendView === 'monthly' ? 'month' : 'year';

  const chartData = useMemo(() => {
    const totalOrganizations = metrics.totalOrganizations || 0;
    const activeOrganizations = metrics.activeOrganizations || 0;

    const points = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 12;
    const now = new Date();
    const data = [];

    for (let i = points - 1; i >= 0; i--) {
      const d = new Date(now);
      if (timeRange === "year") {
        d.setMonth(now.getMonth() - i);
      } else {
        d.setDate(now.getDate() - i);
      }

      const orgCount = Math.max(
        0,
        Math.floor(totalOrganizations - i * (totalOrganizations / points)),
      );
      const activeOrgCount = Math.max(
        0,
        Math.floor(activeOrganizations - i * (activeOrganizations / points)),
      );
      const inactiveOrgCount = Math.max(0, orgCount - activeOrgCount);

      data.push({
        label:
          timeRange === "year" ? safeFormat(d, "MMM") : safeFormat(d, "dd MMM"),
        total: orgCount,
        active: activeOrgCount,
        inactive: inactiveOrgCount,
      });
    }

    return data;
  }, [metrics, timeRange]);

  const boardDistribution = useMemo(() => {
    const orgs = organizationsList || [];
    
    // Group counts by board
    const boardCountsMap = {};
    orgs.forEach((org) => {
      let boardName = org.organizationAcademic?.organizationBoard;
      if (!boardName || typeof boardName !== "string" || !boardName.trim()) {
        boardName = "Unknown";
      } else {
        boardName = boardName.trim();
      }
      boardCountsMap[boardName] = (boardCountsMap[boardName] || 0) + 1;
    });

    // We also want to make sure standard boards are initialized to 0 if they don't have any organizations
    const standardBoards = [
      "CBSE",
      "ICSE",
      "State Board",
      "Gujarat State Board",
      "Maharashtra State Board",
      "IB (International Baccalaureate)",
      "IGCSE (Cambridge)",
      "NIOS",
    ];

    standardBoards.forEach((board) => {
      if (boardCountsMap[board] === undefined) {
        boardCountsMap[board] = 0;
      }
    });

    if (boardCountsMap["Unknown"] === undefined) {
      boardCountsMap["Unknown"] = 0;
    }

    const colors = [
      "#4F46E5",
      "#F59E0B",
      "#10B981",
      "#EC4899",
      "#8B5CF6",
      "#06B6D4",
      "#F43F5E",
      "#84CC16",
      "#14B8A6",
      "#64748B",
    ];

    // Convert map to list of boards. Sort alphabetically first to assign colors stably.
    const sortedBoardNames = Object.keys(boardCountsMap).sort();
    const coloredList = sortedBoardNames.map((name, index) => ({
      name,
      value: boardCountsMap[name],
      color: colors[index % colors.length],
    }));

    // Group the State Boards together (anything containing "State Board" or equals "State")
    let stateTotal = 0;
    const stateChildren = [];
    const others = [];
    let stateColor = "#10B981"; // Default color for the State group

    coloredList.forEach((board) => {
      if (board.name.includes("State Board")) {
        stateTotal += board.value;
        stateChildren.push(board);
        if (board.name === "State Board" || stateColor === "#10B981") {
          stateColor = board.color;
        }
      } else {
        others.push(board);
      }
    });

    const groupedDistribution = [
      ...others,
      {
        name: "State",
        value: stateTotal,
        color: stateColor,
        isGroup: true,
        children: stateChildren
      }
    ];

    // Sort highest values first
    return groupedDistribution.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  }, [organizationsList]);

  // For the Pie chart, we ONLY want to render slices that have > 0 values so it doesn't break the UI
  const activeBoardsOnly = boardDistribution.filter(b => b.value > 0);

  const pendingRequests = (localRequests || []).filter(
    (r) => r?.status === "pending",
  );

  const filteredRequests = (localRequests || []).filter((request) => {
    const matchesSearch =
      (request?.organizationName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (request?.officialEmail || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (request?.city || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request?.state || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (request?.registrationNumber || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (request?.adminName || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || request?.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case "approved":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Approved
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
            {status}
          </span>
        );
    }
  };

  // ─── FETCH CARD DATA DIRECTLY FROM BACKEND METRICS ───
  const totalOrgsCount = metrics.totalOrganizations || 0;
  const activeOrgsCount = metrics.activeOrganizations || 0;
  const totalBranches = metrics.totalSchools || 0;
  const activeBranches = metrics.activeSchools || 0;
  const totalRevenue = Number(metrics.totalRevenue) || 0;
  const totalExpense = totalExpensesAmount || 0;

  const formattedRevenue =
    totalRevenue >= 1000
      ? `₹${(totalRevenue / 1000).toFixed(1)}K`
      : `₹${totalRevenue}`;
  const formattedExpense =
    totalExpense >= 1000
      ? `₹${(totalExpense / 1000).toFixed(1)}K`
      : `₹${totalExpense}`;

  const statCards = [
    {
      title: "Total Organizations",
      value: totalOrgsCount,
      change: "All Time",
      trend: "up",
      icon: Building2,
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600",
    },
    {
      title: "Active Organizations",
      value: activeOrgsCount,
      change: "Live",
      trend: "up",
      icon: CheckCircle,
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
    },
    {
      title: "Total Schools",
      value: totalBranches,
      change: "Branches",
      trend: "up",
      icon: School,
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      title: "Active Schools",
      value: activeBranches,
      change: "Live",
      trend: "up",
      icon: Activity,
      bgColor: "bg-teal-50",
      textColor: "text-teal-600",
    },
    {
      title: "Total Revenue",
      value: formattedRevenue,
      change: "+25.0%",
      trend: "up",
      icon: DollarSign,
      bgColor: "bg-amber-50",
      textColor: "text-amber-600",
    },
    {
      title: "Expense Summary",
      value: `₹${totalExpensesAmount.toLocaleString()}`,
      change: `${expenseCount} Expenses`,
      trend: "down",
      icon: DollarSign,
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
      onClick: () => setShowExpenseModal(true),
    },
  ];

  const ActivityItem = ({ activity }) => (
    <div className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-xl transition-all border border-transparent hover:border-gray-100 group">
      <div
        className={`p-3 rounded-xl shrink-0 mt-1 ${activity.type === "organization" || activity.type === "school" ? "bg-blue-100/50" : activity.type === "user" ? "bg-green-100/50" : activity.type === "subscription" ? "bg-purple-100/50" : "bg-yellow-100/50"}`}
      >
        {(activity.type === "organization" || activity.type === "school") && (
          <Building2 className="w-5 h-5 text-blue-600" />
        )}
        {activity.type === "user" && (
          <Users className="w-5 h-5 text-green-600" />
        )}
        {activity.type === "subscription" && (
          <DollarSign className="w-5 h-5 text-purple-600" />
        )}
        {activity.type === "alert" && (
          <Activity className="w-5 h-5 text-yellow-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-bold text-gray-800 tracking-tight">
            {activity.action}
          </p>
          <button
            onClick={() => handleViewActivity(activity)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shrink-0"
            title="View Details"
          >
            <Eye className="w-4.5 h-4.5" />
          </button>
        </div>
        <p className="text-[15px] font-semibold text-indigo-600 truncate">
          {activity.name}
        </p>

        <div className="mt-2 space-y-1.5">
          {activity.organization && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <span className="truncate">Organization: {activity.organization}</span>
            </div>
          )}
          {activity.location && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <School className="w-3.5 h-3.5 text-gray-400" />
              <span className="truncate">{activity.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mt-2">
            <Clock className="w-3.5 h-3.5" />
            {safeFormat(activity.time, "h:mm a, dd MMM yyyy")}
          </div>
        </div>
      </div>
    </div>
  );

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!expenseForm.organizationId) {
      toast.error("Please select an organization");
      return;
    }
    setSubmittingExpense(true);
    try {
      const selectedOrg = organizationsList.find((o) => o._id === expenseForm.organizationId);
      const orgName = selectedOrg ? selectedOrg.organizationName : "";

      const res = await api.createExpense({
        organizationId: expenseForm.organizationId,
        organizationName: orgName,
        title: expenseForm.title,
        amount: Number(expenseForm.amount),
        expenseDate: expenseForm.expenseDate,
        paymentMode: expenseForm.paymentMode,
        paymentStatus: expenseForm.paymentStatus,
        remarks: expenseForm.remarks,
      });

      if (res.data?.success) {
        toast.success("Expense recorded successfully!");
        setShowExpenseFormModal(false);
        setExpenseForm({
          organizationId: "",
          title: "",
          amount: "",
          expenseDate: new Date().toISOString().split("T")[0],
          paymentMode: "cash",
          paymentStatus: "paid",
          remarks: "",
        });
        fetchAllData(false);
      } else {
        toast.error(res.data?.message || "Failed to record expense");
      }
    } catch (err) {
      console.error("Error submitting expense:", err);
      toast.error(err.response?.data?.message || "Failed to record expense");
    } finally {
      setSubmittingExpense(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    if (!expenseSearchTerm.trim()) return expenses;
    const term = expenseSearchTerm.toLowerCase();
    return expenses.filter(
      (exp) =>
        exp.title?.toLowerCase().includes(term) ||
        exp.description?.toLowerCase().includes(term) ||
        exp.organization?.organizationName?.toLowerCase().includes(term)
    );
  }, [expenses, expenseSearchTerm]);

  const filteredOrgs = useMemo(() => {
    if (!creditSearchTerm.trim()) return organizationsList;
    const term = creditSearchTerm.toLowerCase();
    return organizationsList.filter(
      (org) =>
        org.organizationName?.toLowerCase().includes(term) ||
        org.organizationId?.toLowerCase().includes(term) ||
        org._id?.toLowerCase().includes(term)
    );
  }, [organizationsList, creditSearchTerm]);

  const handleCreditContinue = () => {
    if (!selectedOrgForCredit) return;
    setShowCreditModal(false);
    navigate(`/graphura-admin/school-details/${selectedOrgForCredit._id}?tab=finance`, {
      state: { activeTab: "finance" },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, Admin! Here's what's happening with your platform
            today.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowExpenseFormModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors font-medium shadow-sm"
          >
            <DollarSign className="w-4 h-4" /> Expense
          </button>
          <button
            onClick={() => setShowCreditModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 hover:border-green-300 transition-colors font-medium shadow-sm"
          >
            <Users className="w-4 h-4" /> Credit
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />{" "}
            {exporting ? "Exporting..." : "Export Report"}
          </button>
        </div>
      </div>

      {/* Stats Cards - Rebalanced to 6 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={stat.onClick}
            className={`bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between ${stat.onClick ? "cursor-pointer hover:border-indigo-300" : ""}`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  stat.trend === "up"
                    ? "text-emerald-700 bg-emerald-50"
                    : "text-red-700 bg-red-50"
                }`}
              >
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800 tracking-tight">
                {stat.value}
              </p>
              <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wide">
                {stat.title}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      

      {/* ── RESTORED: ORGANIZATION REGISTRATION REQUESTS ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Organization Registration Requests
                </h2>
                <p className="text-sm text-orange-100 mt-1">
                  Review and approve/reject organization registrations
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="bg-white/20 rounded-lg px-3 py-1">
                <span className="text-white font-bold text-lg">
                  {pendingRequests.length}
                </span>
                <span className="text-white text-sm ml-1">Pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by organization name, city, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
            >
              <option value="pending">Pending Only</option>
              <option value="all">All Requests</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto custom-scrollbar">
          {filteredRequests.length > 0 ? (
            filteredRequests?.map((request) => (
              <motion.div
                key={request._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-5 hover:bg-gray-50 transition-all ${request.status === "pending" ? "bg-white" : "bg-gray-50/50"}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left Section - Organization Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {request.organizationName}
                        </h3>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />{" "}
                        {request.officialEmail}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400" />{" "}
                        {request.contactNumber}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 text-gray-400" />{" "}
                        {request.city}, {request.state}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" /> Applied:{" "}
                        {safeFormat(request.createdAt, "dd MMM yyyy")}
                      </div>
                    </div>

                    {/* Expandable Details */}
                    <AnimatePresence>
                      {expandedId === request._id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-gray-200"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                Organization Details
                              </p>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p>
                                  <span className="font-medium">
                                    Registration No:
                                  </span>{" "}
                                  {request.registrationNumber}
                                </p>
                                <p>
                                  <span className="font-medium">Board:</span>{" "}
                                  {request.board}
                                </p>
                                <p>
                                  <span className="font-medium">
                                    Established:
                                  </span>{" "}
                                  {request.establishedYear}
                                </p>
                                <p>
                                  <span className="font-medium">Website:</span>{" "}
                                  {request.website}
                                </p>
                                <p>
                                  <span className="font-medium">Address:</span>{" "}
                                  {request.address}
                                </p>
                                <p>
                                  <span className="font-medium">Pincode:</span>{" "}
                                  {request.pincode}
                                </p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">
                                Administrator Details
                              </p>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p>
                                  <span className="font-medium">Name:</span>{" "}
                                  {request.principalName ||
                                    request.adminName ||
                                    "N/A"}
                                </p>
                                <p>
                                  <span className="font-medium">Email:</span>{" "}
                                  {request.principalEmail}
                                </p>
                                <p>
                                  <span className="font-medium">Phone:</span>{" "}
                                  {request.principalPhone}
                                </p>
                              </div>
                              {request.documents && (
                                <div className="mt-3">
                                  <p className="text-sm font-medium text-gray-700 mb-1">
                                    Documents
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {request.documents?.map((doc, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                                      >
                                        {doc}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Right Section - Action Buttons */}
                  <div className="flex gap-2 items-start shrink-0">
                    <button
                      onClick={() =>
                        setExpandedId(
                          expandedId === request._id ? null : request._id,
                        )
                      }
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {request.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(request)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium text-sm"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRejectModal(true);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium text-sm"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-bold">
                No organization requests found
              </p>
              <p className="text-xs text-gray-400 mt-1">All caught up!</p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Chart (Original Dashboard Chart) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-bold text-gray-800">Platform Growth (Organizations)</h2>
            <div className="flex gap-2">
              <select
                value={chartMetric}
                onChange={(e) => setChartMetric(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="total">Total Organizations</option>
                <option value="active">Active Organizations</option>
                <option value="inactive">Inactive Organizations</option>
              </select>
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {["week", "month", "year"]?.map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors font-bold ${timeRange === range ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-200"}`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInactive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              {chartMetric === "total" && (
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#4F46E5"
                  fillOpacity={1}
                  fill="url(#colorTotal)"
                  name="Total Organizations"
                />
              )}
              {chartMetric === "active" && (
                <Area
                  type="monotone"
                  dataKey="active"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorActive)"
                  name="Active Organizations"
                />
              )}
              {chartMetric === "inactive" && (
                <Area
                  type="monotone"
                  dataKey="inactive"
                  stroke="#EF4444"
                  fillOpacity={1}
                  fill="url(#colorInactive)"
                  name="Inactive Organizations"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Board Distribution Donut Chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              Board Distribution
            </h2>
            <button
              onClick={() => setShowAllBoards(true)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              View All
            </button>
          </div>
          
          {activeBoardsOnly.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <PieChart className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No organizations registered yet</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={activeBoardsOnly}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {activeBoardsOnly.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-2">
                {activeBoardsOnly.slice(0, 4).map((item, idx) => ( // Show top 4 under the pie chart
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-600 truncate" title={item.name}>
                      {item.name}
                    </span>
                    <span className="text-xs font-bold text-gray-800 ml-auto">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 🔥 NEW: PLATFORM GROWTH TREND (Merged from Analytics) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Platform Growth Trend</h2>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTrendView('monthly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${trendView === 'monthly' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setTrendView('yearly')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${trendView === 'yearly' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Yearly
            </button>
          </div>
        </div>
        
        {chartDataToDisplay && chartDataToDisplay.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartDataToDisplay}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis 
                dataKey={xAxisTrendKey} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                yAxisId="left" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickFormatter={(v) => `₹${v/1000}k`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
              <Area 
                yAxisId="left" 
                type="monotone" 
                dataKey="students" 
                stroke="#4F46E5" 
                fill="url(#colorRevenue)" 
                name="Total Students" 
                strokeWidth={3}
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10B981" 
                name="Revenue (₹)" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
              <Bar 
                yAxisId="left" 
                dataKey="schools" 
                fill="#F59E0B" 
                name="New Schools" 
                radius={[4, 4, 0, 0]} 
                barSize={20}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[350px] bg-gray-50/50 rounded-xl border border-dashed border-gray-200 animate-fadeIn">
            <TrendingUp className="w-10 h-10 text-gray-300 mb-2" />
            <p className="text-sm font-medium text-gray-500 font-sans">No platform growth trend data available</p>
            <p className="text-xs text-gray-400 mt-1 font-sans">Growth metrics will appear once monthly comparisons are processed</p>
          </div>
        )}
      </div>

      {/* User Activity & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            User Activity (Last 7 Days)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="active"
                fill="#4F46E5"
                name="Active Users"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="new"
                fill="#10B981"
                name="New Users"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="returning"
                fill="#F59E0B"
                name="Returning Users"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              Recent Activities
            </h2>
            <button
              onClick={() => setShowAllActivities(true)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-bold"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentActivities?.slice(0, 5).map((activity, idx) => (
              <ActivityItem
                key={activity.id || activity._id || idx}
                activity={activity}
              />
            ))}
            {(!recentActivities || recentActivities.length === 0) && (
              <div className="text-center py-8">
                <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm font-medium">
                  No recent activities
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {createPortal(
        <>
      <AnimatePresence>
        {showRejectModal && selectedRequest && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800">
                    Reject Organization Request
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to reject{" "}
                  <span className="font-medium">
                    {selectedRequest.organizationName}
                  </span>
                  's registration request?
                </p>
                <textarea
                  rows="3"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 mb-4"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
                  >
                    Reject Request
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View All Activities Modal */}
      <AnimatePresence>
        {showAllActivities && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAllActivities(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-gray-50 rounded-l-3xl shadow-2xl w-full max-w-md h-full fixed right-0 top-0 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white shrink-0">
                <div>
                  <h3 className="text-xl font-bold">All Recent Activities</h3>
                  <p className="text-indigo-100 text-sm font-medium mt-0.5">
                    Full history of platform events
                  </p>
                </div>
                <button
                  onClick={() => setShowAllActivities(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {recentActivities?.map((activity, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl shadow-sm border border-gray-100"
                  >
                    <ActivityItem activity={activity} />
                  </div>
                ))}
                {(!recentActivities || recentActivities.length === 0) && (
                  <div className="text-center py-12">
                    <Activity className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 font-bold">
                      No activity history found
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View All Boards Drawer */}
      <AnimatePresence>
        {showAllBoards && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAllBoards(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-gray-50 rounded-l-3xl shadow-2xl w-full max-w-md h-full fixed right-0 top-0 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-600 text-white shrink-0">
                <div>
                  <h3 className="text-xl font-bold">Board Distribution</h3>
                  <p className="text-indigo-100 text-sm">
                    All tracked educational boards
                  </p>
                </div>
                <button
                  onClick={() => setShowAllBoards(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {boardDistribution.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-2">
                    
                    {/* Main Row (Parent) */}
                    <div
                      onClick={() => item.isGroup && setExpandedGroups(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:border-indigo-200 transition-colors ${item.isGroup ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-50">
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color, opacity: item.value > 0 ? 1 : 0.3 }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold ${item.value > 0 ? 'text-gray-800' : 'text-gray-500'}`}>
                              {item.name}
                            </p>
                            {/* Show Chevron arrow if it is a group */}
                            {item.isGroup && (
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${expandedGroups[item.name] ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {item.value === 0 ? "No organizations yet" : "Active organizations"}
                          </p>
                        </div>
                      </div>
                      <div className={`text-xl font-bold ${item.value > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                        {item.value}
                      </div>
                    </div>

                    {/* Expandable Child Dropdown Rows */}
                    <AnimatePresence>
                      {item.isGroup && expandedGroups[item.name] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, marginTop: -8 }}
                          animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                          exit={{ opacity: 0, height: 0, marginTop: -8 }}
                          className="pl-12 pr-2 space-y-2 overflow-hidden"
                        >
                          {item.children.map((child, cIdx) => (
                            <div key={cIdx} className="bg-gray-50/80 rounded-lg border border-gray-100 p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: child.color, opacity: child.value > 0 ? 1 : 0.3 }} />
                                <p className={`text-sm ${child.value > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                                  {child.name}
                                </p>
                              </div>
                              <span className={`text-sm font-bold ${child.value > 0 ? 'text-indigo-500' : 'text-gray-400'}`}>
                                {child.value}
                              </span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activity Details Modal */}
      <AnimatePresence>
        {showActivityModal && selectedActivity && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowActivityModal(false);
              setSelectedActivity(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  <h3 className="text-lg font-bold">Activity Details</h3>
                </div>
                <button
                  onClick={() => {
                    setShowActivityModal(false);
                    setSelectedActivity(null);
                  }}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</span>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedActivity.action}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</span>
                    <p className="text-sm font-semibold text-indigo-600 capitalize mt-0.5">{selectedActivity.type}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Target Name</span>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedActivity.name}</p>
                  </div>
                  {selectedActivity.organization && (
                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Organization</span>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedActivity.organization}</p>
                    </div>
                  )}
                  {selectedActivity.location && (
                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Location / School</span>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedActivity.location}</p>
                    </div>
                  )}
                  {selectedActivity.email && (
                    <div>
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</span>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedActivity.email}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</span>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">
                      {safeFormat(selectedActivity.time, "h:mm a, dd MMM yyyy")}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</span>
                    <div className="mt-1">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded-full border ${selectedActivity.status === "pending" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : selectedActivity.status === "approved" || selectedActivity.status === "active" || selectedActivity.status === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-orange-50 text-orange-700 border-orange-200"}`}
                      >
                        {selectedActivity.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => {
                      setShowActivityModal(false);
                      setSelectedActivity(null);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Expense Creation Form Modal */}
      {showExpenseFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[24px] max-w-lg w-full p-6 shadow-2xl relative border border-slate-100 flex flex-col max-h-[90vh]">
            <button
              onClick={() => setShowExpenseFormModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-slate-800 mb-1 tracking-tight">
              Record New Expense
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Enter expense details to be stored in the platform database.
            </p>

            <form onSubmit={handleExpenseSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
              {/* Organization */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Organization *
                </label>
                <select
                  value={expenseForm.organizationId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, organizationId: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-800"
                >
                  <option value="" className="text-slate-400">Select Organization *</option>
                  {organizationsList.map((org) => (
                    <option key={org._id} value={org._id}>
                      {org.organizationName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expense Title */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Expense Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Electricity Bill Q1"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Expense Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    value={expenseForm.expenseDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                    Payment Mode *
                  </label>
                  <select
                    value={expenseForm.paymentMode}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              {/* Payment Status */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Payment Status *
                </label>
                <select
                  value={expenseForm.paymentStatus}
                  onChange={(e) => setExpenseForm({ ...expenseForm, paymentStatus: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                </select>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                  Remarks / Notes
                </label>
                <textarea
                  rows="3"
                  placeholder="Any additional details or remarks..."
                  value={expenseForm.remarks}
                  onChange={(e) => setExpenseForm({ ...expenseForm, remarks: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowExpenseFormModal(false)}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExpense}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10 text-sm"
                >
                  {submittingExpense ? "Submitting..." : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[24px] max-w-4xl w-full p-6 shadow-2xl relative border border-slate-100 flex flex-col max-h-[85vh]">
            <button
              onClick={() => setShowExpenseModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-slate-800 mb-1 tracking-tight">
              Platform Expense Records
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              System-wide review of recorded school and organization expenditures.
            </p>

            {/* Total Expense Summary */}
            <div className="bg-gradient-to-r from-orange-500 to-indigo-600 rounded-2xl p-5 text-white mb-5 flex justify-between items-center shadow-md">
              <div>
                <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Total Cumulative Expenses</p>
                <h4 className="text-3xl font-black mt-0.5">₹{totalExpensesAmount.toLocaleString()}</h4>
              </div>
              <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-bold border border-white/10">
                {expenseCount} Total Records
              </div>
            </div>

             {/* Search Input */}
             <div className="relative mb-4">
               <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
               <input
                 type="text"
                 placeholder="Search by title, organization, description..."
                 value={expenseSearchTerm}
                 onChange={(e) => setExpenseSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
               />
             </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-4 custom-scrollbar">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-500">No matching expense records found</p>
                </div>
              ) : (
                filteredExpenses.map((expense) => (
                  <div
                    key={expense._id}
                    className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between md:items-center gap-4"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-sm">{expense.title}</h4>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-medium pt-1">
                        <span>Org: <strong className="text-slate-600">{expense.organization?.organizationName || "N/A"}</strong></span>
                        <span>By: <strong className="text-slate-600">{expense.recordedBy?.name || expense.recordedBy?.fullName || "Staff"}</strong></span>
                        <span>Date: <strong>{safeFormat(expense.expenseDate, "dd MMM yyyy")}</strong></span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 font-medium pt-1">
                        <span>Payment Mode: <strong className="text-slate-600 uppercase">{expense.paymentMode}</strong></span>
                        <span>
                          Status:{" "}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            expense.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                            expense.paymentStatus === 'pending' ? 'bg-yellow-50 text-yellow-700' : 'bg-orange-50 text-orange-700'
                          }`}>
                            {expense.paymentStatus}
                          </span>
                        </span>
                      </div>

                      {expense.remarks && (
                        <p className="text-[11px] italic text-slate-400">Remarks: {expense.remarks}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-indigo-600">₹{expense.amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Credit Selection Modal */}
      {showCreditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowCreditModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-slate-800 mb-1 tracking-tight">
              Select Organization
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Choose an organization to navigate to its billing and subscription settings.
            </p>

            {/* Search Input for Orgs */}
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search organization..."
                value={creditSearchTerm}
                onChange={(e) => setCreditSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            {/* Dropdown Options */}
            <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50 mb-6 custom-scrollbar">
              {filteredOrgs.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No organizations found
                </div>
              ) : (
                filteredOrgs.map((org) => {
                  const isSelected = selectedOrgForCredit?._id === org._id;
                  return (
                    <div
                      key={org._id}
                      onClick={() => setSelectedOrgForCredit(org)}
                      className={`px-4 py-3 cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected ? "bg-indigo-50/50 hover:bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <p className={`font-bold text-xs ${isSelected ? "text-indigo-600" : "text-slate-800"}`}>
                          {org.organizationName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {org.organizationId || org._id}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={handleCreditContinue}
              disabled={!selectedOrgForCredit}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/10 text-sm"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {(loading === true || refreshing) && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 flex items-center gap-2 border border-gray-100">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
          <span className="text-sm font-bold text-gray-600">
            Syncing data...
          </span>
        </div>
      )}
        </>,
        document.body
      )}
    </div>
  );
};

export default GraphuraDashboard;