import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Download,
  BellRing,
  DollarSign,
  Wallet,
  Clock3,
  BarChart3,
  Users,
  TrendingUp,
} from "lucide-react";

import {
  getPendingDues,
  exportPendingDues,
} from "../../../services/api/financeApi";

import {
  DashGrid,
  EnhancedDashCard,
  DataTable,
  Heading,
  Button,
  GLineChart,
  GDoughnutChart,
  GBarChart,
} from "../../../components/shared/Common_Components";

const asText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    return asText(
      value.name ||
        value.className ||
        value.title ||
        value.label ||
        value._id ||
        value.id,
    );
  }
  return "";
};

const getStudentClass = (student = {}) => {
  return asText(student.class || student.className || student.classId);
};

const getStudentStatus = (student = {}) => {
  const status = asText(student.status || student.dueStatus);
  if (!status) return "Pending";
  // Capitalize properly for standard Badge mapping in DataTable
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

const normalizePendingStudents = (payload) => {
  const rows = Array.isArray(payload?.students)
    ? payload.students
    : Array.isArray(payload)
      ? payload
      : [];
  return rows.map((student) => ({
    ...student,
    id: asText(student.id || student.studentId || student.loginId),
    schoolName: asText(student.schoolName) || "Unknown Branch",
    class: getStudentClass(student),
    status: getStudentStatus(student),
    feeType: asText(student.feeType) || "Tuition Fee",
    totalDue: Number(student.totalDue ?? student.totalFee ?? 0),
    paidAmount: Number(student.paidAmount ?? 0),
    pendingAmount: Number(student.pendingAmount ?? student.totalDue ?? 0),
    daysOverdue: Number(student.daysOverdue ?? 0),
    parentName: asText(student.parentName) || "-",
    parentContact: asText(student.parentContact) || "-",
    dueDate: student.dueDate || "-",
  }));
};

const PendingDues = () => {
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [remindLoading, setRemindLoading] = useState(false);

  const [pendingData, setPendingData] = useState([]);
  const [rawStats, setRawStats] = useState({});
  const [collectionTrendData, setCollectionTrendData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await getPendingDues();

        if (response.data?.data) {
          const data = response.data.data;
          setPendingData(normalizePendingStudents(data));
          setCollectionTrendData(data.collectionTrend || []);

          setRawStats({
            totalDues: data.totalDues ?? "₹0",
            pendingDues: data.pendingDues ?? "₹0",
            collection: data.collection ?? "₹0",
            otherIncome: data.otherIncome ?? "₹0",
          });
        } else {
          toast.error("Failed to load pending dues data");
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || err.message || "An error occurred";
        toast.error(`Error: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Export ALL data (Top right button)
  const handleExport = async () => {
    try {
      setExportLoading(true);
      const response = await exportPendingDues();
      const payload = response.data?.data || "";
      const fileName = response.data?.fileName || "pending_dues";

      if (!payload) {
        toast.error("No export data received");
        return;
      }

      const blob = new Blob([payload], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (error) {
      toast.error(error.response?.data?.message || "Export failed");
    } finally {
      setExportLoading(false);
    }
  };

  // Export SPECIFIC BRANCH data (Row Action)
  const handleBranchExport = (branchName) => {
    // 1. Filter the global pending data for just this branch
    const branchStudents = pendingData.filter(
      (s) => s.schoolName === branchName,
    );

    if (branchStudents.length === 0) {
      toast.error(`No student data found for ${branchName}`);
      return;
    }

    // 2. Define headers
    const headers = [
      "Student Name",
      "Admission No",
      "Class",
      "Fee Type",
      "Total Fee",
      "Paid Amount",
      "Pending Amount",
      "Due Date",
      "Days Overdue",
      "Status",
      "Parent Name",
      "Parent Contact",
    ];

    // 3. Map students to CSV rows (wrapping strings in quotes to avoid comma issues)
    const csvRows = branchStudents.map((s) => {
      return [
        `"${s.name || s.studentName || "-"}"`,
        `"${s.id || "-"}"`,
        `"${s.class || "-"}"`,
        `"${s.feeType || "-"}"`,
        s.totalDue || 0,
        s.paidAmount || 0,
        s.pendingAmount || 0,
        `"${s.dueDate || "-"}"`,
        s.daysOverdue || 0,
        `"${s.status || "-"}"`,
        `"${s.parentName || "-"}"`,
        `"${s.parentContact || "-"}"`,
      ].join(",");
    });

    // 4. Combine headers and rows
    const csvContent = [headers.join(","), ...csvRows].join("\n");

    // 5. Trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;

    // Create a safe filename (e.g., "cambridge_international_pending_dues.csv")
    const safeBranchName = branchName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    link.setAttribute("download", `${safeBranchName}_pending_dues.csv`);

    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast.success(`Export downloaded for ${branchName}`);
  };

  const handleRemindAll = async () => {
    try {
      setRemindLoading(true);
      toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
        loading: "Sending reminders...",
        success: "✅ Reminders sent to all pending dues",
        error: "Failed to send reminders",
      });
    } catch {
      toast.error("Failed to send reminders");
    } finally {
      setRemindLoading(false);
    }
  };

  // --- DERIVED METRICS FOR STAT CARDS ---
  const totalStudents = pendingData.length;
  const overdueCount = pendingData.filter((d) => d.daysOverdue > 0).length;

  // These are approximations if backend doesn't provide them all
  const amountCollected =
    parseFloat(String(rawStats.collection).replace(/[^0-9.]/g, "")) || 0;
  const pendingAmountVal =
    parseFloat(String(rawStats.pendingDues).replace(/[^0-9.]/g, "")) || 0;
  const totalVal = amountCollected + pendingAmountVal || 1; // avoid divide by zero
  const recoveryRate = ((amountCollected / totalVal) * 100).toFixed(1) + "%";

  const avgOutstanding =
    totalStudents > 0 ? (pendingAmountVal / totalStudents).toFixed(0) : 0;

  // --- DERIVED CHARTS DATA ---
  // Fee Type Distribution
  const feeTypeMap = pendingData.reduce((acc, row) => {
    acc[row.feeType] =
      (acc[row.feeType] || 0) +
      (parseFloat(String(row.pendingAmount).replace(/[^0-9.]/g, "")) || 0);
    return acc;
  }, {});
  const feeTypeData = Object.keys(feeTypeMap).map((k) => ({
    name: k,
    value: feeTypeMap[k],
  }));

  // Branch Wise Outstanding Dues
  const branchMap = pendingData.reduce((acc, row) => {
    acc[row.schoolName] =
      (acc[row.schoolName] || 0) +
      (parseFloat(String(row.pendingAmount).replace(/[^0-9.]/g, "")) || 0);
    return acc;
  }, {});
  const branchData = Object.keys(branchMap).map((k) => ({
    name: k,
    pending: branchMap[k],
  }));

  // --- DERIVED BRANCH SUMMARY FOR TABLE ---
  const branchSummaryData = Object.values(
    pendingData.reduce((acc, row) => {
      const branch = row.schoolName;
      if (!acc[branch]) {
        acc[branch] = {
          id: branch, // Add an ID for React keys and DataTable selection
          schoolName: branch,
          studentCount: 0,
          totalPending: 0,
        };
      }
      acc[branch].studentCount += 1;
      acc[branch].totalPending += Number(row.pendingAmount || 0);
      return acc;
    }, {}),
  );

  // --- TABLE CONFIGURATION (BRANCH LEVEL) ---
  const branchColumns = [
    { key: "schoolName", label: "Branch Name" },
    { key: "studentCount", label: "Students with Dues", align: "center" },
    {
      key: "totalPending",
      label: "Total Pending Amount",
      render: (val) => (
        <span className="font-bold text-rose-600">
          ₹{Number(val || 0).toLocaleString("en-IN")}
        </span>
      ),
      sortValue: (row) => Number(row.totalPending || 0),
    },
  ];

  // ✅ Updated Row Actions: Removed Reminder, Added functional Export
  const branchRowActions = [
    {
      icon: <Download size={14} />,
      tooltip: "Export Branch Report",
      variant: "ghost",
      onClick: (row) => handleBranchExport(row.schoolName),
    },
  ];

  const branchBulkActions = [
    {
      title: "Send Reminders",
      icon: <BellRing size={14} />,
      onClick: (rows) =>
        toast.success(`Reminders sent for ${rows.length} branches`),
    },
    {
      title: "Export Selected",
      icon: <Download size={14} />,
      onClick: (rows) =>
        toast.success(`Exporting ${rows.length} selected branches`),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen font-sans bg-[#F8FAFC] max-w-7xl mx-auto w-full max-w-[100vw] box-border overflow-x-hidden">
      {/* HEADER SECTION */}
      <div className="mb-8">
        <Heading
          primaryText="Pending Dues"
          secondaryText="Finance Dashboard"
          size={12}
          showAnimations={true}
          action={
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                text={exportLoading ? "Exporting..." : "Export"}
                icon={<Download size={16} />}
                onClick={handleExport}
                disabled={exportLoading}
                variant="secondary"
                size={12}
              />
              <Button
                text={remindLoading ? "Sending..." : "Remind All"}
                icon={<BellRing size={16} />}
                onClick={handleRemindAll}
                disabled={remindLoading}
                variant="primary"
                size={12}
              />
            </div>
          }
        />
      </div>

      <DashGrid cols={12} gap={4}>
        {/* SUMMARY SECTION */}
        <EnhancedDashCard
          title="Total Outstanding Amount"
          value={rawStats.totalDues}
          icon={<DollarSign size={22} />}
          accentColor="#ef4444"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Students With Pending Dues"
          value={totalStudents}
          icon={<Users size={22} />}
          accentColor="#f59e0b"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Overdue Dues"
          value={overdueCount}
          icon={<Clock3 size={22} />}
          accentColor="#f43f5e"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Amount Collected"
          value={rawStats.collection}
          icon={<Wallet size={22} />}
          accentColor="#22c55e"
          size={3}
          showAnimations
        />

        <EnhancedDashCard
          title="Expected Collection"
          value={`₹${totalVal}`}
          icon={<BarChart3 size={22} />}
          accentColor="#8b5cf6"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Recovery Rate"
          value={recoveryRate}
          icon={<TrendingUp size={22} />}
          accentColor="#3b82f6"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Average Outstanding"
          value={`₹${avgOutstanding}`}
          icon={<DollarSign size={22} />}
          accentColor="#14b8a6"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Due This Month"
          value={rawStats.pendingDues}
          icon={<Clock3 size={22} />}
          accentColor="#eab308"
          size={3}
          showAnimations
        />

        {/* ANALYTICS SECTION */}
        <GLineChart
          title="Collection Trend"
          subtitle="Expected vs Collected"
          data={collectionTrendData}
          lines={[
            { key: "expected", label: "Expected", color: "#94a3b8" },
            { key: "collected", label: "Collected", color: "#22c55e" },
          ]}
          size={6}
          height={260}
        />

        <GDoughnutChart
          title="Fee Type Distribution"
          subtitle="Outstanding by Fee Type"
          data={feeTypeData}
          size={3}
          height={260}
        />

        <GBarChart
          title="Branch Wise Outstanding Dues"
          subtitle="Amount pending per branch"
          data={branchData}
          bars={[{ key: "pending", label: "Pending Amount", color: "#f43f5e" }]}
          size={3}
          height={260}
          yAxisWidth={80}
        />

        {/* TABLE SECTION */}
        <DataTable
          title="Branch Wise Dues Summary"
          columns={branchColumns}
          rows={branchSummaryData}
          actions={branchRowActions}
          searchable={true}
          bulkAction={true}
          bulkActions={branchBulkActions}
          exportable={true}
          exportFileName="Branch_Dues_Summary"
          pageSize={10}
          size={12}
        />
      </DashGrid>
    </div>
  );
};

export default PendingDues;
