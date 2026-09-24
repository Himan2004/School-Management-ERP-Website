import React, { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  IndianRupee,
  ListChecks,
  Loader2,
  RefreshCw,
  RotateCcw,
  Users,
  Zap,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import {
  Button,
  DashGrid,
  Heading,
  Option,
  SelectField,
} from "../../../components/shared/Common_Components.jsx";
import {
  bulkExportReportsApi,
  exportReportApi,
  getReportFiltersApi,
} from "../../../services/api/reportsApi";
import { getAllSchools } from "../../../features/superAdmin/superAdminSlice.js";

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTER_STORAGE_KEY = "superadmin_reports_export_filters";

const defaultReportOptions = [
  {
    value: "academic",
    label: "Academic",
    icon: GraduationCap,
    color: "#8b5cf6",
  },
  {
    value: "attendance",
    label: "Attendance",
    icon: CalendarDays,
    color: "#38bdf8",
  },
  { value: "staff", label: "Staff", icon: Users, color: "#5B9A6A" },
  { value: "payroll", label: "HR", icon: Users, color: "#5B9A6A" },
  { value: "financial", label: "Finance", icon: IndianRupee, color: "#E0A04B" },
  {
    value: "compliance",
    label: "Compliance",
    icon: CheckCircle2,
    color: "#D66B5F",
  },
  { value: "audit", label: "Audit Logs", icon: CheckCircle2, color: "#D66B5F" },
  {
    value: "admission",
    label: "Admissions",
    icon: ListChecks,
    color: "#223F74",
  },
];

const getIconAndColor = (value) => {
  switch (value) {
    case "academic":
      return { icon: GraduationCap, color: "#8b5cf6" };
    case "financial":
      return { icon: IndianRupee, color: "#E0A04B" };
    case "staff":
      return { icon: Users, color: "#5B9A6A" };
    case "payroll":
      return { icon: Users, color: "#5B9A6A" };
    case "admission":
      return { icon: ListChecks, color: "#223F74" };
    case "branch":
      return { icon: Building2, color: "#7A8FC6" };
    case "attendance":
      return { icon: CalendarDays, color: "#38bdf8" };
    case "compliance":
    case "audit":
    case "audit_log":
      return { icon: CheckCircle2, color: "#D66B5F" };
    default:
      return { icon: FileText, color: "#94a3b8" };
  }
};

const formatOptions = [
  { value: "CSV", label: "CSV (Excel)" },
  { value: "JSON Raw Data", label: "JSON Raw Data" },
];

const sessions = ["2025-26", "2024-25", "2023-24", "2022-23"];

const monthOptions = [
  { value: "", label: "Select month…" },
  { value: "January", label: "January" },
  { value: "February", label: "February" },
  { value: "March", label: "March" },
  { value: "April", label: "April" },
  { value: "May", label: "May" },
  { value: "June", label: "June" },
  { value: "July", label: "July" },
  { value: "August", label: "August" },
  { value: "September", label: "September" },
  { value: "October", label: "October" },
  { value: "November", label: "November" },
  { value: "December", label: "December" },
];

// Quick-export tiles: one-click exports for common operations
const quickExports = [
  {
    id: "fee_today",
    label: "Today's Fee Collection",
    format: "CSV",
    report: "financial",
    icon: IndianRupee,
    color: "#E0A04B",
  },
  {
    id: "attendance_m",
    label: "Monthly Attendance",
    format: "CSV",
    report: "attendance",
    icon: CalendarDays,
    color: "#38bdf8",
  },
  {
    id: "academic_full",
    label: "Full Academic Report",
    format: "CSV",
    report: "academic",
    icon: GraduationCap,
    color: "#8b5cf6",
  },
  {
    id: "staff_hr",
    label: "Staff Report",
    format: "CSV",
    report: "staff",
    icon: Users,
    color: "#5B9A6A",
  },
  {
    id: "admissions",
    label: "Admissions Summary",
    format: "CSV",
    report: "admission",
    icon: ListChecks,
    color: "#223F74",
  },
  {
    id: "audit_log",
    label: "Compliance Audit Log",
    format: "CSV",
    report: "compliance",
    icon: CheckCircle2,
    color: "#D66B5F",
  },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

export const csvEscape = (value) => {
  if (value == null) return "";
  const text =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.includes(",") || text.includes("\n") || text.includes('"')
    ? `"${text.replace(/"/g, '""')}"`
    : text;
};

export const toCsvContent = (data) => {
  if (typeof data === "string") return data;
  const rows = Array.isArray(data) ? data : [data];
  if (!rows.length) return "";
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row || {})))];
  return [
    keys.map(csvEscape).join(","),
    ...rows.map((row) => keys.map((key) => csvEscape(row?.[key])).join(",")),
  ].join("\n");
};

const getExportTimestamp = () =>
  new Date().toISOString().slice(0, 19).replace("T", " ");

const downloadBlob = (content, fileName, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const normalizeExportRows = (rows = []) =>
  rows.map((row) => {
    const normalized = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      normalized[key] =
        value && typeof value === "object" ? JSON.stringify(value) : value;
    });
    return normalized;
  });

const loadPdfLibraries = async () => {
  const [jsPdfModule, html2CanvasModule] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  return {
    jsPDF: jsPdfModule.default || jsPdfModule.jsPDF,
    html2canvas: html2CanvasModule.default,
  };
};

const addPdfFooter = (doc) => {
  const pageCount = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "Generated by Graphura School Management System",
      40,
      pageHeight - 28,
    );
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 90, pageHeight - 28);
  }
};

const addWrappedText = (doc, text, x, y, maxWidth, lineHeight = 14) => {
  const lines = doc.splitTextToSize(String(text || ""), maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
};

const addSimpleTable = (doc, title, rows = [], startY) => {
  if (!rows.length) return startY;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const keys = Object.keys(rows[0]).slice(0, 7);
  const colWidth = (pageWidth - margin * 2) / Math.max(keys.length, 1);
  let y = startY;

  if (y > pageHeight - 120) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(13);
  doc.setTextColor(34, 63, 116);
  doc.text(title, margin, y);
  y += 18;

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(34, 63, 116);
  doc.rect(margin, y - 11, pageWidth - margin * 2, 16, "F");
  keys.forEach((key, i) => {
    doc.text(key.replace(/([A-Z])/g, " $1"), margin + i * colWidth + 4, y);
  });
  y += 18;

  doc.setTextColor(45, 55, 72);
  rows.slice(0, 14).forEach((row, rowIndex) => {
    if (y > pageHeight - 54) {
      doc.addPage();
      y = margin;
    }
    if (rowIndex % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 11, pageWidth - margin * 2, 16, "F");
    }
    keys.forEach((key, i) => {
      doc.text(
        String(row[key] ?? "").slice(0, 24),
        margin + i * colWidth + 4,
        y,
      );
    });
    y += 16;
  });
  return y + 10;
};

// ─── AnalyticsExportService (re-exported for use in other pages) ──────────────

export const AnalyticsExportService = {
  exportCsv({
    fileName = "analytics_export.csv",
    rows = [],
    metadata = {},
    includeMetadata = true,
  } = {}) {
    const normalizedRows = normalizeExportRows(rows);
    const metadataRows = includeMetadata
      ? [
          ["Export Time", metadata.exportTime || getExportTimestamp()],
          ["Generated By", metadata.generatedBy || "Super Admin"],
          [
            "Report",
            metadata.reportTitle || metadata.title || "Analytics Report",
          ],
          ["Filters", JSON.stringify(metadata.filters || {})],
          [],
        ]
      : [];
    const metadataContent = metadataRows
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");
    const csvContent = toCsvContent(normalizedRows);
    const content = `\ufeff${metadataContent}${metadataContent ? "\n" : ""}${csvContent}`;
    downloadBlob(
      content,
      fileName.endsWith(".csv") ? fileName : `${fileName}.csv`,
      "text/csv;charset=utf-8;",
    );
  },

  async exportPdf({
    fileName = "analytics_report.pdf",
    title = "Analytics Report",
    organizationName = "Graphura School Management System",
    generatedBy = "Super Admin",
    dateRange = "Current View",
    metadata = {},
    summary = [],
    sections = [],
    insights = [],
    chartElementIds = [],
  } = {}) {
    const { jsPDF, html2canvas } = await loadPdfLibraries();
    const doc = new jsPDF("p", "pt", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;

    // Cover header
    doc.setFillColor(34, 63, 116);
    doc.rect(0, 0, pageWidth, 170, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text(title, margin, 76);
    doc.setFontSize(12);
    doc.text(organizationName, margin, 104);
    doc.text(`Date Range: ${dateRange}`, margin, 126);
    doc.text(`Generated By: ${generatedBy}`, margin, 146);

    doc.setTextColor(45, 55, 72);
    doc.setFontSize(10);
    doc.text(
      `Generated: ${metadata.exportTime || getExportTimestamp()}`,
      margin,
      205,
    );
    doc.text(`Filters: ${JSON.stringify(metadata.filters || {})}`, margin, 224);

    let y = 270;
    doc.setFontSize(16);
    doc.setTextColor(34, 63, 116);
    doc.text("Executive Summary", margin, y);
    y += 22;

    const summaryColWidth = (pageWidth - margin * 2) / 3;
    summary.slice(0, 12).forEach((item, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = margin + col * summaryColWidth;
      const cardY = y + row * 58;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, cardY, summaryColWidth - 12, 44, 8, 8, "F");
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.text(String(item.label || item.title || ""), x + 10, cardY + 15);
      doc.setTextColor(29, 29, 31);
      doc.setFontSize(13);
      doc.text(String(item.value ?? "-"), x + 10, cardY + 33);
    });
    y += Math.ceil(summary.slice(0, 12).length / 3) * 58 + 24;

    sections.forEach((section) => {
      y = addSimpleTable(
        doc,
        section.title,
        normalizeExportRows(section.rows || []),
        y,
      );
    });

    if (insights.length) {
      if (y > pageHeight - 150) {
        doc.addPage();
        y = margin;
      }
      doc.setFontSize(16);
      doc.setTextColor(34, 63, 116);
      doc.text("Insights", margin, y);
      y += 22;
      doc.setFontSize(10);
      doc.setTextColor(45, 55, 72);
      insights.forEach((insight) => {
        y =
          addWrappedText(
            doc,
            `• ${insight}`,
            margin,
            y,
            pageWidth - margin * 2,
            13,
          ) + 6;
      });
    }

    for (const elementId of chartElementIds) {
      const element = document.getElementById(elementId);
      if (!element) continue;
      const canvas = await html2canvas(element, { scale: 1.5, useCORS: true });
      const image = canvas.toDataURL("image/png");
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(34, 63, 116);
      doc.text("Report Preview", margin, margin);
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = Math.min(
        pageHeight - 120,
        (canvas.height * imageWidth) / canvas.width,
      );
      doc.addImage(image, "PNG", margin, margin + 24, imageWidth, imageHeight);
    }

    addPdfFooter(doc);
    doc.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
  },

  async shareReport({ title = "Analytics Report", text = "" } = {}) {
    if (navigator.share) {
      await navigator.share({ title, text });
      return;
    }
    await navigator.clipboard?.writeText(text || title);
  },
};

// ─── ExportDropdown (re-exported for inline use from other pages) ─────────────

export const ExportDropdown = ({
  config,
  disabled = false,
  onSuccess,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState("");

  const runAction = async (action) => {
    if (disabled || loadingAction) return;
    try {
      setLoadingAction(action);
      if (action === "pdf") {
        await AnalyticsExportService.exportPdf(config?.pdf);
        toast.success("PDF generated");
      } else if (action === "csv") {
        AnalyticsExportService.exportCsv(config?.csv);
        toast.success("CSV ready");
      } else if (action === "share") {
        await AnalyticsExportService.shareReport(config?.share);
        toast.success("Report shared");
      }
      onSuccess?.(action);
      setOpen(false);
    } catch (error) {
      toast.error(error?.message || "Export failed");
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        text={loadingAction ? "Preparing…" : "Export Report"}
        icon={<FileDown className="w-4 h-4" />}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || !!loadingAction}
        loading={!!loadingAction}
      />
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl">
          {[
            {
              action: "pdf",
              label: "Export PDF",
              icon: <FileText className="h-4 w-4 text-blue-600" />,
            },
            {
              action: "csv",
              label: "Export CSV",
              icon: <FileSpreadsheet className="h-4 w-4 text-emerald-600" />,
            },
            {
              action: "share",
              label: "Share Report",
              icon: <FileDown className="h-4 w-4 text-amber-600" />,
            },
          ].map(({ action, label, icon }) => (
            <button
              key={action}
              type="button"
              onClick={() => runAction(action)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── ReportTypeSelector (multi-select checkboxes) ────────────────────────────

const ReportTypeSelector = ({ selected, onChange, reportOptions = [] }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (value) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  const selectedLabels = selected
    .map((v) => reportOptions.find((o) => o.value === v)?.label)
    .filter(Boolean);

  return (
    <div className="col-span-12 lg:col-span-6 relative" ref={ref}>
      <span className="block text-xs font-bold uppercase tracking-[0.3em] text-[#6B7280] mb-2">
        Select Reports
      </span>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full rounded-2xl border border-[#E7E2DB] bg-white px-4 py-3.5 text-sm font-bold text-slate-700 flex items-center justify-between gap-3 hover:border-[#F59B87] transition"
      >
        <span className="truncate text-left">
          {selectedLabels.length === 0
            ? "Select at least one report…"
            : selectedLabels.join(", ")}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute z-20 w-full mt-2 bg-white border border-[#E7E2DB] rounded-2xl shadow-xl max-h-72 overflow-y-auto py-2 top-full left-0">
          {reportOptions.map((option) => {
            const Icon = option.icon;
            const checked = selected.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.value)}
                  className="h-4 w-4 rounded border-slate-300 text-[#223F74] focus:ring-[#F59B87]"
                />
                <Icon
                  size={15}
                  style={{ color: option.color }}
                  className="shrink-0"
                />
                <span className="text-sm font-bold text-slate-700">
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── BulkProgressBar ─────────────────────────────────────────────────────────

const BulkProgressBar = ({ current, total }) => {
  const pct = total ? Math.round((current / total) * 100) : 0;
  return (
    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-black text-blue-700 uppercase tracking-widest">
          Bulk Export Progress
        </span>
        <span className="text-xs font-black text-blue-700">
          {current} of {total} files
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-blue-100 overflow-hidden">
        <div
          className="h-2 rounded-full bg-[#223F74] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// ─── ExportHistoryRow ─────────────────────────────────────────────────────────

const ExportHistoryRow = ({ record, onReDownload }) => {
  const Icon = record.format === "PDF" ? FileText : FileSpreadsheet;
  const iconColor = record.format === "PDF" ? "#223F74" : "#5B9A6A";
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="rounded-xl p-2 shrink-0"
          style={{ backgroundColor: `${iconColor}15` }}
        >
          <Icon size={15} style={{ color: iconColor }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">
            {record.fileName}
          </p>
          <p className="text-xs font-semibold text-slate-400">
            {record.timestamp} · {record.branch}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {record.rows !== undefined && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500">
            {record.rows} rows
          </span>
        )}
        <span
          className="rounded-full px-2 py-0.5 text-xs font-black"
          style={{ backgroundColor: `${iconColor}15`, color: iconColor }}
        >
          {record.format}
        </span>
        <button
          type="button"
          onClick={() => onReDownload(record)}
          title="Re-download"
          className="p-1.5 rounded-xl text-slate-400 hover:text-[#223F74] hover:bg-slate-50 transition"
        >
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
};

// ─── ReportsExport (main page) ───────────────────────────────────────────────

const ReportsExport = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { schools = [] } = useSelector((state) => state.superAdmin || {});

  // ── Dynamic Options States ──
  const [reportOptions, setReportOptions] = useState(defaultReportOptions);
  const [sessions, setSessions] = useState([
    "2026-27",
    "2025-26",
    "2024-25",
    "2023-24",
    "2022-23",
  ]);

  // ── Filters ──
  const [format, setFormat] = useState("CSV");
  const [selectedReports, setSelectedReports] = useState(["academic"]);
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [academicSession, setAcademicSession] = useState("2026-27");

  // ── UI ──
  const [loading, setLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [exportHistory, setExportHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("export_history") || "[]");
    } catch {
      return [];
    }
  });
  const [quickLoading, setQuickLoading] = useState("");

  // Load report filters (academic years & categories) dynamically on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await getReportFiltersApi();
        if (res.success && res.data) {
          // Process report types
          if (res.data.reportTypes && Array.isArray(res.data.reportTypes)) {
            const mapped = res.data.reportTypes.map((item) => {
              const { icon, color } = getIconAndColor(item.value);
              return {
                value: item.value,
                label: item.label,
                icon,
                color,
              };
            });
            setReportOptions(mapped);
          }

          // Process academic sessions
          if (res.data.academicYears && Array.isArray(res.data.academicYears)) {
            const formattedYears = res.data.academicYears.map((y) => {
              const match = y.match(/^(\d{4})-(\d{4})$/);
              if (match) {
                return `${match[1]}-${match[2].slice(-2)}`;
              }
              return y;
            });
            if (!formattedYears.includes("2026-27")) {
              formattedYears.unshift("2026-27");
            }
            setSessions(formattedYears);
          }
        }
      } catch (error) {
        console.error("Failed to load report filters from backend:", error);
      }
    };
    fetchFilters();
  }, []);

  // Persist history
  useEffect(() => {
    localStorage.setItem(
      "export_history",
      JSON.stringify(exportHistory.slice(0, 10)),
    );
  }, [exportHistory]);

  const addToHistory = (record) => {
    setExportHistory((prev) => [record, ...prev].slice(0, 10));
  };

  // Load schools
  useEffect(() => {
    const orgId = localStorage.getItem("organizationMongoId");
    dispatch(getAllSchools({ status: "all", organizationId: orgId }));
  }, [dispatch]);

  // Parse URL params (called from other pages)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rp = params.get("report") || params.get("reports");
    if (rp) {
      const vals = rp
        .split(",")
        .map((v) => v.trim())
        .filter((v) => reportOptions.some((o) => o.value === v));
      if (vals.length) setSelectedReports(vals);
    }
    if (params.get("branch")) setSelectedBranch(params.get("branch"));
    if (params.get("dateFrom")) setDateFrom(params.get("dateFrom"));
    if (params.get("dateTo")) setDateTo(params.get("dateTo"));
    if (params.get("format"))
      setFormat(
        params.get("format") === "Excel (CSV)" ? "CSV" : params.get("format"),
      );
  }, [location.search, reportOptions]);

  // ── Derived labels ──
  const formatLabel = format.includes("CSV") ? "CSV" : "JSON";
  const selectedBranchLabel =
    selectedBranch === "all"
      ? "All Branches"
      : schools.find((s) => s._id === selectedBranch)?.schoolName ||
        "Selected Branch";
  const selectedReportLabels = selectedReports
    .map((v) => reportOptions.find((o) => o.value === v)?.label)
    .filter(Boolean);

  // ── Helpers ──
  const downloadFile = (data, fileName, fileFormat) => {
    const isCsv = fileFormat.includes("CSV");
    const ext = isCsv ? ".csv" : ".json";
    const mime = isCsv
      ? "text/csv;charset=utf-8;"
      : "application/json;charset=utf-8;";
    const content = isCsv
      ? "\ufeff" + toCsvContent(data)
      : JSON.stringify(data, null, 2);
    downloadBlob(content, `${fileName}${ext}`, mime);
  };

  // ── Quick Export ──
  const handleQuickExport = async (tile) => {
    if (quickLoading) return;
    try {
      setQuickLoading(tile.id);
      const response = await exportReportApi({
        reportType: tile.report,
        format: "Excel",
        branchId: selectedBranch === "all" ? undefined : selectedBranch,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        academicYear: academicSession,
      });
      const data = response?.data?.data ?? response?.data ?? response;
      const fileName =
        response?.data?.fileName || `${tile.report}_quick_export`;
      if (!data || (Array.isArray(data) && !data.length)) {
        throw new Error("No data for this report.");
      }
      downloadFile(data, fileName, tile.format);
      const rows = Array.isArray(data) ? data.length : undefined;
      addToHistory({
        fileName: `${fileName}.csv`,
        format: "CSV",
        timestamp: getExportTimestamp(),
        branch: selectedBranchLabel,
        rows,
        data,
        fileFormat: tile.format,
      });
      toast.success(`${tile.label} downloaded`);
    } catch (error) {
      toast.error(error?.message || "Quick export failed");
      console.error("[Quick Export Error]:", error);
    } finally {
      setQuickLoading("");
    }
  };

  // ── Main CSV/JSON Export ──
  const handleExport = async () => {
    if (!selectedReports.length) {
      toast.error("Select at least one report type.");
      return;
    }
    try {
      setLoading(true);
      const isBulk = selectedReports.length > 1;
      const backendFormat = format.includes("CSV") ? "Excel" : "JSON";
      const commonPayload = {
        format: backendFormat,
        branchId: selectedBranch === "all" ? undefined : selectedBranch,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        academicYear: academicSession,
      };

      if (!isBulk) {
        const response = await exportReportApi({
          reportType: selectedReports[0],
          ...commonPayload,
        });
        const data = response?.data?.data ?? response?.data ?? response;
        const fileName =
          response?.data?.fileName ||
          response?.fileName ||
          `${selectedReports[0]}_report`;
        if (!data || (Array.isArray(data) && !data.length)) {
          throw new Error("No data found for the selected criteria.");
        }
        downloadFile(data, fileName, format);
        const rows = Array.isArray(data) ? data.length : undefined;
        addToHistory({
          fileName: `${fileName}${format.includes("CSV") ? ".csv" : ".json"}`,
          format: formatLabel,
          timestamp: getExportTimestamp(),
          branch: selectedBranchLabel,
          rows,
          data,
          fileFormat: format,
        });
        toast.success(`Exported: ${fileName}`);
      } else {
        const response = await bulkExportReportsApi({
          reportTypes: selectedReports,
          ...commonPayload,
        });
        const data = response?.data?.data ?? response?.data ?? response;
        if (!data || !Array.isArray(data) || !data.length) {
          throw new Error("Bulk export returned no data.");
        }
        setBulkProgress({ current: 0, total: data.length });
        data.forEach((report, index) => {
          setTimeout(() => {
            downloadFile(
              report.data,
              report.fileName || `${report.name}_report`,
              format,
            );
            setBulkProgress((prev) => ({ ...prev, current: prev.current + 1 }));
            addToHistory({
              fileName: `${report.fileName || report.name}.${format.includes("CSV") ? "csv" : "json"}`,
              format: formatLabel,
              timestamp: getExportTimestamp(),
              branch: selectedBranchLabel,
              rows: Array.isArray(report.data) ? report.data.length : undefined,
              data: report.data,
              fileFormat: format,
            });
            if (index === data.length - 1) {
              setTimeout(() => setBulkProgress({ current: 0, total: 0 }), 1500);
            }
          }, index * 800);
        });
        toast.success(`${data.length} reports queued for download`);
      }
    } catch (error) {
      toast.error(error?.message || "Export failed.");
      console.error("[Export Error]:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── PDF Export ──
  const handleExportPdf = async () => {
    if (!selectedReports.length) {
      toast.error("Select at least one report type.");
      return;
    }
    try {
      setLoading(true);
      const fileName = `${selectedReports.join("_")}_report_${new Date().toISOString().slice(0, 10)}`;

      const pdfSections = [
        {
          title: "Export Info",
          rows: selectedReportLabels.map((label, i) => ({
            no: i + 1,
            report: label,
            scope: selectedBranchLabel,
            session: academicSession,
            from: dateFrom || "—",
            to: dateTo || "—",
          })),
        },
      ];

      // Fetch actual data for each selected report to include in the PDF
      for (const reportType of selectedReports) {
        try {
          const response = await exportReportApi({
            reportType,
            format: "JSON",
            branchId: selectedBranch === "all" ? undefined : selectedBranch,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            academicYear: academicSession,
          });
          const reportData = response?.data?.data ?? response?.data ?? response;
          const label =
            reportOptions.find((o) => o.value === reportType)?.label ||
            reportType;
          if (Array.isArray(reportData) && reportData.length > 0) {
            pdfSections.push({
              title: `${label} Data Preview`,
              rows: reportData,
            });
          }
        } catch (err) {
          console.error(`Failed to load PDF data for ${reportType}:`, err);
        }
      }

      await AnalyticsExportService.exportPdf({
        fileName,
        title: "Super Admin Reports Export",
        organizationName: "Graphura School Management System",
        generatedBy: "Super Admin",
        dateRange: `${dateFrom || "Start"} – ${dateTo || "End"}`,
        metadata: {
          filters: {
            reports: selectedReports,
            branch: selectedBranch,
            format,
            dateFrom,
            dateTo,
            academicSession,
          },
        },
        summary: [
          { label: "Reports Selected", value: selectedReports.length },
          { label: "Branch Scope", value: selectedBranchLabel },
          { label: "Output Format", value: "PDF Document" },
          { label: "Academic Session", value: academicSession },
          {
            label: "Month Range",
            value: `${dateFrom || "Start"} – ${dateTo || "End"}`,
          },
        ],
        sections: pdfSections,
        insights: [
          "Export metadata is attached to support filtered, audit-friendly reporting.",
          "For compliance purposes, each export is timestamped and scoped to the selected branch and session.",
        ],
        chartElementIds: ["export-preview-card"],
      });

      addToHistory({
        fileName: `${fileName}.pdf`,
        format: "PDF",
        timestamp: getExportTimestamp(),
        branch: selectedBranchLabel,
        rows: undefined,
      });
      toast.success("PDF generated");
    } catch (error) {
      toast.error(error?.message || "PDF export failed.");
      console.error("[PDF Export Error]:", error);
    } finally {
      setLoading(false);
    }
  };

  // ── Re-download from history ──
  const handleReDownload = (record) => {
    if (!record.data) {
      toast.error("Original data not available. Please re-export.");
      return;
    }
    downloadFile(
      record.data,
      record.fileName.replace(/\.[^.]+$/, ""),
      record.fileFormat || "CSV",
    );
    toast.success("Re-downloaded");
  };

  const buttonText =
    selectedReports.length > 1
      ? `Bulk Export as ${formatLabel} (${selectedReports.length} reports)`
      : `Export as ${formatLabel}`;

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 font-sans pb-14 overflow-x-hidden min-h-screen">
      {/* ── Heading ── */}
      <Heading primaryText="Export" secondaryText="Reports" size={12} />

      {/* ── Quick Exports ── */}
      <div className="mt-6 rounded-[28px] border border-[#E7E2DB] bg-white p-5 shadow-[0_6px_20px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-2xl bg-amber-50 p-2.5 text-amber-600">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800">
              Quick Exports
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              One-click download for common reports — uses your current branch
              and date filters.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {quickExports.map((tile) => {
            const Icon = tile.icon;
            const isBusy = quickLoading === tile.id;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => handleQuickExport(tile)}
                disabled={!!quickLoading}
                className="group flex flex-col items-center gap-2.5 rounded-[20px] border border-[#E7E2DB] bg-white p-4 text-center transition hover:-translate-y-0.5 hover:border-[#223F74]/30 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <div
                  className="rounded-2xl p-2.5 transition group-hover:scale-110"
                  style={{ backgroundColor: `${tile.color}18` }}
                >
                  {isBusy ? (
                    <Loader2
                      size={18}
                      style={{ color: tile.color }}
                      className="animate-spin"
                    />
                  ) : (
                    <Icon size={18} style={{ color: tile.color }} />
                  )}
                </div>
                <span className="text-xs font-black text-slate-700 leading-snug">
                  {tile.label}
                </span>
                <span
                  className="rounded-full text-[10px] font-black px-2 py-0.5"
                  style={{
                    backgroundColor: `${tile.color}15`,
                    color: tile.color,
                  }}
                >
                  {tile.format}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Export Configuration ── */}
      <div className="mt-8 rounded-[28px] border border-[#E7E2DB] bg-white p-5 sm:p-6 shadow-[0_6px_20px_rgba(0,0,0,.06)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-2xl bg-blue-50 p-2.5 text-blue-600">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800">
              Export Configuration
            </h2>
            <p className="text-xs font-semibold text-slate-400">
              Configure scope, format, and date range before exporting.
            </p>
          </div>
        </div>

        <DashGrid cols={12} gap={4}>
          {/* Report multi-select */}
          <ReportTypeSelector
            selected={selectedReports}
            onChange={setSelectedReports}
            reportOptions={reportOptions}
          />

          {/* Format */}
          <SelectField
            label="Output Format"
            id="export_format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            size={3}
            searchable={false}
          >
            {formatOptions.map((o) => (
              <Option key={o.value} value={o.value} label={o.label} />
            ))}
          </SelectField>

          {/* Branch */}
          <SelectField
            label="Target Branch"
            id="export_branch"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            size={3}
            searchable={false}
          >
            <Option value="all" label="All Branches (Entire Organization)" />
            {schools.map((school) => (
              <Option
                key={school._id}
                value={school._id}
                label={`${school.schoolName}${school.city ? ` (${school.city})` : ""}`}
              />
            ))}
          </SelectField>

          {/* Academic Session */}
          <SelectField
            label="Academic Session"
            id="academic_session"
            value={academicSession}
            onChange={(e) => setAcademicSession(e.target.value)}
            size={3}
            searchable={false}
          >
            {sessions.map((s) => (
              <Option key={s} value={s} label={s} />
            ))}
          </SelectField>

          {/* Date from */}
          <SelectField
            label="Month From"
            id="date_from"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            size={3}
            searchable={false}
            disabled={loading}
          >
            {monthOptions.map((o) => (
              <Option key={o.value} value={o.value} label={o.label} />
            ))}
          </SelectField>

          {/* Date to */}
          <SelectField
            label="Month To"
            id="date_to"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            size={3}
            searchable={false}
            disabled={loading}
          >
            {monthOptions.map((o) => (
              <Option key={o.value} value={o.value} label={o.label} />
            ))}
          </SelectField>
        </DashGrid>

        {/* Bulk progress */}
        {bulkProgress.total > 0 && (
          <BulkProgressBar
            current={bulkProgress.current}
            total={bulkProgress.total}
          />
        )}

        {/* Preview card */}
        <div
          id="export-preview-card"
          className="mt-6 rounded-[20px] border border-slate-100 bg-slate-50/60 p-5"
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
              Export Preview
            </p>
            <span className="rounded-full bg-[#223F74]/10 text-[#223F74] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest">
              PDF Source
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">
                Reports
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedReportLabels.length > 0 ? (
                  selectedReportLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-bold text-slate-600"
                    >
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">None selected</span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">
                Branch
              </p>
              <p className="text-sm font-bold text-slate-800">
                {selectedBranchLabel}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">
                Session
              </p>
              <p className="text-sm font-bold text-slate-800">
                {academicSession}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black mb-2">
                Month Range
              </p>
              <p className="text-sm font-bold text-slate-800">
                {dateFrom || "Start"} → {dateTo || "End"}
              </p>
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              text={loading ? "Processing…" : buttonText}
              onClick={handleExport}
              loading={loading}
              disabled={loading || !selectedReports.length}
              icon={<FileSpreadsheet className="w-4 h-4" />}
              size={12}
            />
            <Button
              text="Export PDF"
              variant="secondary"
              onClick={handleExportPdf}
              disabled={loading || !selectedReports.length}
              icon={<FileText className="w-4 h-4" />}
              size={12}
            />
          </div>
          <p className="text-xs font-bold text-slate-400">
            {selectedReports.length} report(s) ·{" "}
            {selectedBranch === "all" ? "All branches" : "1 branch"} ·{" "}
            {academicSession}
          </p>
        </div>
      </div>

      {/* ── Export History ── */}
      <div className="mt-8 rounded-[28px] border border-[#E7E2DB] bg-white p-5 shadow-[0_6px_20px_rgba(0,0,0,.06)]">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-2.5 text-slate-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">
                Export History
              </h2>
              <p className="text-xs font-semibold text-slate-400">
                Last {exportHistory.length} exports this session. Re-download
                anytime.
              </p>
            </div>
          </div>
          {exportHistory.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setExportHistory([]);
                localStorage.removeItem("export_history");
              }}
              className="text-xs font-bold text-slate-400 hover:text-rose-500 transition flex items-center gap-1"
            >
              <RefreshCw size={12} />
              Clear
            </button>
          )}
        </div>

        {exportHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="rounded-2xl bg-slate-50 p-4 mb-3">
              <FileDown className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-400">No exports yet</p>
            <p className="text-xs font-semibold text-slate-300 mt-1">
              Your export history will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {exportHistory.map((record, index) => (
              <ExportHistoryRow
                key={`${record.fileName}-${index}`}
                record={record}
                onReDownload={handleReDownload}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsExport;
