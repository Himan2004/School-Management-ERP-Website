import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Download,
  AlertTriangle,
  Eye,
  Search,
  Loader2,
  Users,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  ChevronDown
} from "lucide-react";
import {
  getPrincipalFeeDueReports,
  sendPrincipalBulkReminder,
  sendPrincipalFeeReminder,
} from "../../../services/api/principalFinanceApi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  DashGrid,
  EnhancedDashCard,
  Heading,
  DataTable,
  Button,
  Modal,
  openModal,
  closeModal,
  SelectField,
  Option,
  DataField,
  Grid,
} from "../../../components/shared/Common_Components";

// --- Custom Dual-Export Dropdown (Sits inside the table header) ---
const ExportDropdown = ({ onExportCsv, onExportPdf }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="absolute top-5 right-6 z-30" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white border border-slate-200 text-[#223F74] font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-all shadow-sm focus:ring-2 focus:ring-[#223F74]/20"
      >
        <Download size={16} />
        Export
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden transform opacity-100 scale-100 transition-all origin-top-right">
          <button 
            onClick={() => { setIsOpen(false); onExportCsv(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-[#223F74] transition-colors border-b border-slate-100"
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            Export as CSV
          </button>
          <button 
            onClick={() => { setIsOpen(false); onExportPdf(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-[#223F74] transition-colors"
          >
            <FileText size={16} className="text-rose-600" />
            Export as PDF
          </button>
        </div>
      )}
    </div>
  );
};

const DueReports = () => {
  const navigate = useNavigate();
  const [studentsWithDues, setStudentsWithDues] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [dueRangeFilter, setDueRangeFilter] = useState("All");
  const [amountRangeFilter, setAmountRangeFilter] = useState("All");
  const [loadingPage, setLoadingPage] = useState(true);
  const [error, setError] = useState("");
  const [showBulkLoading, setShowBulkLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalDueAmount: 0,
    studentsWithDues: 0,
    overdue30Plus: 0,
    highestDue: 0,
  });
  
  const [viewStudent, setViewStudent] = useState(null);

  const getSchoolId = () => {
    const directId = localStorage.getItem("schoolId") || "backend_handles_this";
    if (directId && directId !== "undefined" && directId !== "null") return directId;
    try {
       const userStr = localStorage.getItem("user");
       if (userStr) {
           const userObj = JSON.parse(userStr);
           return userObj?.school || userObj?.school?._id || null;
       }
    } catch(e) { console.error("Error parsing"); }
    return null;
  };

  const schoolId = getSchoolId();

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const loadDueReports = async () => {
    if (!schoolId) {
      setLoadingPage(false);
      setError("School ID not found. Please sign in again.");
      return;
    }

    setLoadingPage(true);
    setError("");

    try {
      const response = await getPrincipalFeeDueReports(schoolId);
      const payload = response?.data || {};
      const nextStudents = payload.students || [];
      setStudentsWithDues(nextStudents);
      setFilteredStudents(nextStudents);
      setSummary(payload.summary || summary);
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
          loadError.message ||
          "Failed to load due reports"
      );
    } finally {
      setLoadingPage(false);
    }
  };

  useEffect(() => {
    loadDueReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const derivedSummary = useMemo(() => {
    const totalDueAmount = studentsWithDues.reduce(
      (sum, student) => sum + (Number(student.due) || 0),
      0,
    );
    const overdue30Plus = studentsWithDues.filter(
      (student) => Number(student.duesSince) > 30,
    ).length;
    const highestDue = studentsWithDues.reduce(
      (max, student) => Math.max(max, Number(student.due) || 0),
      0,
    );

    return {
      totalDueAmount,
      studentsWithDues: studentsWithDues.length,
      overdue30Plus,
      highestDue,
    };
  }, [studentsWithDues]);

  useEffect(() => {
    let filtered = [...studentsWithDues];

    if (searchTerm) {
      filtered = filtered.filter((s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (classFilter) {
      filtered = filtered.filter((s) => String(s.class) === String(classFilter));
    }

    if (sectionFilter) {
      filtered = filtered.filter((s) => String(s.section) === String(sectionFilter));
    }

    if (dueRangeFilter === "0-30") {
      filtered = filtered.filter((s) => s.duesSince <= 30);
    } else if (dueRangeFilter === "31-60") {
      filtered = filtered.filter((s) => s.duesSince > 30 && s.duesSince <= 60);
    } else if (dueRangeFilter === "60+") {
      filtered = filtered.filter((s) => s.duesSince > 60);
    }

    if (amountRangeFilter === "below-1000") {
      filtered = filtered.filter((s) => s.due < 1000);
    } else if (amountRangeFilter === "1000-5000") {
      filtered = filtered.filter((s) => s.due >= 1000 && s.due <= 5000);
    } else if (amountRangeFilter === "5000+") {
      filtered = filtered.filter((s) => s.due > 5000);
    }

    setFilteredStudents(filtered);
  }, [
    searchTerm,
    classFilter,
    sectionFilter,
    dueRangeFilter,
    amountRangeFilter,
    studentsWithDues,
  ]);

  const handleSendReminder = async () => {
    if (!schoolId || !viewStudent) return;

    try {
      await sendPrincipalFeeReminder(schoolId, {
        studentId: viewStudent.id,
        installmentId: viewStudent.installmentId,
        amount: viewStudent.due,
      });
      toast.success(
        `Reminder sent to ${viewStudent.fatherName} (${viewStudent.contact}) for ${formatAmount(viewStudent.due)} due`
      );
    } catch (sendError) {
      toast.error(
        sendError.response?.data?.message ||
          sendError.message ||
          "Failed to send reminder. Please try again."
      );
    }
  };

  const handleViewDetails = (student) => {
    setViewStudent(student);
    openModal("view-details-modal");
  };

  const criticalDues = studentsWithDues.filter((s) => s.duesSince > 60);
  const classOptions = [...new Set(studentsWithDues.map((s) => s.class).filter(Boolean))];
  const sectionOptions = [...new Set(studentsWithDues.map((s) => s.section).filter(Boolean))];

  const handleExportCsv = () => {
    const headers = [
      "Name",
      "Class",
      "Section",
      "Father Name",
      "Contact",
      "Total Fee",
      "Amount Paid",
      "Due",
      "Due Since",
    ];
    const rows = filteredStudents.map((student) => [
      student.name,
      student.class,
      student.section,
      student.fatherName || 'N/A',
      student.contact || 'N/A',
      student.totalFee,
      student.amountPaid,
      student.due,
      student.duesSince,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? "")}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "principal-due-reports.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    toast.success("Exporting PDF...");
    // Future integration for PDF export goes here
  };

  // ================= TABLE COLUMNS =================
  const tableColumns = [
    { key: "name", label: "Student Name", width: "18%" },
    { 
      key: "classDisplay", 
      label: "Class & Section", 
      width: "12%",
      render: (_, row) => `Class ${row.class}-${row.section}`
    },
    { key: "fatherName", label: "Father Name", width: "15%" },
    { key: "contact", label: "Contact", width: "12%" },
    { key: "totalFeeFormatted", label: "Total Fee", width: "10%" },
    { key: "amountPaidFormatted", label: "Amount Paid", width: "10%" },
    { 
      key: "dueFormatted", 
      label: "Due Amount", 
      width: "10%",
      render: (val, row) => (
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          row.due < 1000 ? "bg-amber-100 text-amber-800" 
          : row.due <= 5000 ? "bg-orange-100 text-orange-800" 
          : "bg-rose-100 text-rose-800"
        }`}>
          {val}
        </span>
      )
    },
    { 
      key: "duesSince", 
      label: "Due Since", 
      width: "8%",
      render: (val) => `${val} days`
    }
  ];

  const tableRows = filteredStudents.map(student => ({
    ...student,
    totalFeeFormatted: formatAmount(student.totalFee),
    amountPaidFormatted: formatAmount(student.amountPaid),
    dueFormatted: formatAmount(student.due),
    _raw: student
  }));

  const tableActions = [
    {
      icon: <Eye size={14} />,
      tooltip: "View Details",
      variant: "ghost",
      onClick: (row) => handleViewDetails(row._raw),
    }
  ];

  const CARD = 'rounded-[24px] border border-slate-200 bg-white shadow-sm';

  return (
    <div className="w-full space-y-6 pb-12 font-sans text-left">

      {/* Page Header */}
      <Grid cols={12} gap={4}>
        <Heading
          primaryText="Due"
          secondaryText="Reports"
          size={12}
          showAnimations={true}
        />
      </Grid>

      {loadingPage && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#223F74]" />
        </div>
      )}

      {error && (
        <div className="p-5 rounded-2xl border border-rose-100 bg-rose-50/50 text-[#9E2E25] font-semibold text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {!loadingPage && !error && (
        <>
          {/* KPI Cards */}
          <DashGrid cols={12} gap={4}>
            <EnhancedDashCard 
              title="Total Due Amount" 
              value={formatAmount(derivedSummary.totalDueAmount || summary.totalDueAmount || 0)} 
              icon={<AlertCircle size={22} />} 
              accentColor="#dc2626" 
              size={3} 
              showAnimations 
            />
            <EnhancedDashCard 
              title="Students with Dues" 
              value={String(derivedSummary.studentsWithDues || summary.studentsWithDues || 0)} 
              icon={<Users size={22} />} 
              accentColor="#f59e0b" 
              size={3} 
              showAnimations 
            />
            <EnhancedDashCard 
              title="Overdue by 30+ Days" 
              value={String(derivedSummary.overdue30Plus || summary.overdue30Plus || 0)} 
              icon={<Calendar size={22} />} 
              accentColor="#8b5cf6" 
              size={3} 
              showAnimations 
            />
            <EnhancedDashCard 
              title="Highest Due Amount" 
              value={formatAmount(derivedSummary.highestDue || summary.highestDue || 0)} 
              icon={<AlertTriangle size={22} />} 
              accentColor="#dc2626" 
              size={3} 
              showAnimations 
            />
          </DashGrid>

          {/* Critical Dues Alert */}
          {criticalDues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/50 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 mb-2">
                    ⚠ Critical Dues (60+ Days Overdue)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {criticalDues.slice(0, 8).map((student) => (
                      <div key={student.id} className="text-sm text-red-800 bg-white/60 rounded-xl p-3 border border-red-100 flex flex-col justify-between">
                        <span className="font-bold truncate">{student.name}</span>
                        <span className="font-black text-red-600 mt-1">{formatAmount(student.due)} <span className="text-xs font-medium opacity-70">({student.duesSince}d)</span></span>
                      </div>
                    ))}
                  </div>
                  {criticalDues.length > 8 && (
                     <p className="text-xs font-bold text-red-700 mt-3">+ {criticalDues.length - 8} more students</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className={`${CARD} p-5`}>
            <DashGrid cols={12} gap={4}>
              <SelectField
                label="Class"
                id="class_filter"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                searchable={false}
                size={3}
              >
                <Option value="" label="All Classes" />
                {classOptions.map((c) => <Option key={c} value={c} label={`Class ${c}`} />)}
              </SelectField>
              <SelectField
                label="Section"
                id="sec_filter"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                searchable={false}
                size={3}
              >
                <Option value="" label="All Sections" />
                {sectionOptions.map((s) => <Option key={s} value={s} label={s} />)}
              </SelectField>
              <SelectField
                label="Due Range"
                id="due_range"
                value={dueRangeFilter}
                onChange={(e) => setDueRangeFilter(e.target.value)}
                searchable={false}
                size={3}
              >
                <Option value="All" label="All Due Range" />
                <Option value="0-30" label="0-30 days" />
                <Option value="31-60" label="31-60 days" />
                <Option value="60+" label="60+ days" />
              </SelectField>
              <SelectField
                label="Amount Range"
                id="amt_range"
                value={amountRangeFilter}
                onChange={(e) => setAmountRangeFilter(e.target.value)}
                searchable={false}
                size={3}
              >
                <Option value="All" label="All Amounts" />
                <Option value="below-1000" label="Below ₹1000" />
                <Option value="1000-5000" label="₹1000 - ₹5000" />
                <Option value="5000+" label="Above ₹5000" />
              </SelectField>
            </DashGrid>
          </div>

          {/* DataTable */}
          <div className="relative">
            <ExportDropdown onExportCsv={handleExportCsv} onExportPdf={handleExportPdf} />
            <DataTable
              title="Due Reports List"
              columns={tableColumns}
              rows={tableRows}
              actions={tableActions}
              pageSize={10}
              size={12}
            />
          </div>
        </>
      )}

      {/* View Details Modal */}
      {viewStudent && (
        <Modal
          id="view-details-modal"
          title="Student Due Details"
          size="md"
        >
          <div className="space-y-6">
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="w-16 h-16 bg-[#223F74]/5 text-[#223F74] font-black rounded-full flex items-center justify-center mx-auto mb-3 text-xl shadow-sm border border-[#223F74]/10">
                {viewStudent.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
              </div>
              <h3 className="text-lg font-black text-[#223F74]">{viewStudent.name}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">Class {viewStudent.class} - Section {viewStudent.section}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Father's Name</p>
                <p className="text-sm font-semibold text-slate-700 mt-1">{viewStudent.fatherName || 'N/A'}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contact Number</p>
                <p className="text-sm font-semibold text-slate-700 mt-1">{viewStudent.contact || 'N/A'}</p>
              </div>
            </div>

            <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100 relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-100/40 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
              <div className="relative z-10">
                <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">Outstanding Dues</p>
                <p className="text-3xl font-black text-rose-600 mt-1">{formatAmount(viewStudent.due)}</p>
                <p className="text-xs text-rose-500 mt-1 font-semibold">Overdue since {viewStudent.duesSince} days</p>
              </div>
              <Button text="Send Reminder" variant="danger" size={4} onClick={handleSendReminder} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#223F74]/5 rounded-xl border border-[#223F74]/10 text-center">
                <p className="text-xs text-[#223F74] font-bold uppercase tracking-wider">Total Fee</p>
                <p className="text-xl font-black text-[#223F74] mt-1">{formatAmount(viewStudent.totalFee)}</p>
              </div>
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 text-center">
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Amount Paid</p>
                <p className="text-xl font-black text-emerald-600 mt-1">{formatAmount(viewStudent.amountPaid)}</p>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-100 flex justify-end gap-3">
              <Button text="Close" variant="secondary" onClick={() => closeModal("view-details-modal")} size={3} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DueReports;