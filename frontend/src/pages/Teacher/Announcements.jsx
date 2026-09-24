/**
 * Announcements.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Announcements & Notices page — two tabs:
 *   1. Announcements — class teachers create/manage announcements + online classes
 *   2. Notices       — read-only notices published by Principal/Admin/Accountant
 *
 * Built strictly on the shared Common_Components library wherever a matching
 * component exists (Heading, Grid, DataField, SelectField, Option, Button,
 * Modal, ModalGrid, ModalData, ToggleButton, P). A small number of custom
 * pieces are added only where the library has no equivalent — a rich text
 * editor, a file-attachment uploader, a tab bar, and card layouts for
 * announcements/notices — all styled with the same navy #223F74 / rounded-
 * [24px] / soft-shadow design language used throughout Common_Components.
 *
 * DUMMY DATA — every announcement/notice below is mock data for
 * representation only. Replace MOCK_ANNOUNCEMENTS / MOCK_NOTICES with real
 * API data (e.g. getAnnouncements, getNotices) when wiring up the backend.
 * ─────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Heading,
  Grid,
  DataField,
  SelectField,
  Option,
  Button,
  ToggleButton,
  Modal,
  openModal,
  closeModal,
} from "../../components/shared/Common_Components";
import {
  Megaphone,
  Bell,
  Search,
  Plus,
  Paperclip,
  FileText,
  Download,
  Pencil,
  Trash2,
  Copy,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  X,
  Calendar,
  Clock,
  Users,
  GraduationCap,
  Video,
  User,
  Bold,
  Italic,
  Underline,
  List,
  CheckCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────
const SECTION_OPTIONS = ["A", "B", "C", "D"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High"];
const TYPE_OPTIONS = ["General", "Homework", "Exam", "Event", "Meeting", "Online Class"];
const AUDIENCE_OPTIONS = ["Entire Class", "Specific Students"];
const PLATFORM_OPTIONS = ["Google Meet", "Zoom", "Microsoft Teams"];
const DEPARTMENT_OPTIONS = ["Principal", "Admin", "Accountant", "Academic", "Finance", "General"];
const STATUS_FILTER_OPTIONS = ["All", "Active", "Scheduled", "Expired"];
const SORT_OPTIONS = ["Latest First", "Oldest First"];
const ATTACHMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.doc,.docx,.ppt,.pptx";

const TYPE_ICON = {
  General: Megaphone,
  Homework: FileText,
  Exam: GraduationCap,
  Event: Calendar,
  Meeting: Users,
  "Online Class": Video,
};

// ─────────────────────────────────────────────────────────────────────────
// DUMMY DATA — for representation only, replace with real API data.
// ─────────────────────────────────────────────────────────────────────────
const MOCK_MANAGED_CLASSES = ["Class 8", "Class 9"]; // classes this teacher manages

const MOCK_ANNOUNCEMENTS = [];
const MOCK_NOTICES = [];

// ─────────────────────────────────────────────────────────────────────────
// BADGE HELPERS
// ─────────────────────────────────────────────────────────────────────────
const priorityBadgeCls = (priority) => {
  if (priority === "High") return "bg-rose-100 text-rose-700";
  if (priority === "Medium") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700"; // Low
};

const statusBadgeCls = (status) => {
  if (status === "Active") return "bg-emerald-100 text-emerald-700";
  if (status === "Scheduled") return "bg-blue-100 text-blue-700";
  if (status === "Expired") return "bg-slate-200 text-slate-600";
  return "bg-slate-100 text-slate-600";
};

const stripHtml = (html = "") => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const prettyDate = (dateStr) =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// Local grid-span helper — mirrors Common_Components' internal colSpan map,
// used only to wrap non-grid-aware components (like ToggleButton) inside <Grid>.
const gridSpan = (size = 12) => {
  const map = {
    4: "col-span-12 sm:col-span-4",
    6: "col-span-12 sm:col-span-6",
    12: "col-span-12",
  };
  return map[size] ?? "col-span-12";
};

// ─────────────────────────────────────────────────────────────────────────
// TAB BAR (custom — library has no tab component)
// ─────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "notices", label: "Notices", icon: Bell },
];

const TabBar = ({ active, onChange, unreadNotices }) => (
  <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[#F4F7FB] border border-[#E2E8F0] w-fit">
    {TABS.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        type="button"
        onClick={() => onChange(id)}
        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
          active === id ? "bg-[#223F74] text-white shadow-sm" : "text-[#6B7280] hover:bg-white"
        }`}
      >
        <Icon size={15} />
        {label}
        {id === "notices" && unreadNotices > 0 && (
          <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
            {unreadNotices}
          </span>
        )}
      </button>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
// RICH TEXT EDITOR (custom — library has no RTE)
// Uncontrolled by design: writes live content into a ref via onChange so the
// contentEditable cursor never jumps from a React re-render mid-typing.
// ─────────────────────────────────────────────────────────────────────────
const RichTextEditor = ({ initialValue = "", onChange, placeholder = "Write announcement details…" }) => {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialValue || "";
  }, [initialValue]);

  const exec = (cmd) => {
    document.execCommand(cmd, false, null);
    editorRef.current?.focus();
    onChange?.(editorRef.current?.innerHTML ?? "");
  };

  const toolbarBtns = [
    { cmd: "bold", Icon: Bold, label: "Bold" },
    { cmd: "italic", Icon: Italic, label: "Italic" },
    { cmd: "underline", Icon: Underline, label: "Underline" },
    { cmd: "insertUnorderedList", Icon: List, label: "Bullet list" },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <style>{`.rte-editable:empty:before{content:attr(data-placeholder);color:#9CA3AF;}`}</style>
      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
        Description
      </label>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden focus-within:ring-2 focus-within:ring-[#223F74]/20 focus-within:border-[#223F74] transition">
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          {toolbarBtns.map(({ cmd, Icon, label }) => (
            <button
              key={cmd}
              type="button"
              title={label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec(cmd)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#223F74] hover:bg-[#E2E8F0] transition"
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={(e) => onChange?.(e.currentTarget.innerHTML)}
          className="rte-editable min-h-[120px] max-h-[240px] overflow-y-auto px-4 py-3.5 text-sm text-[#1D1D1F] font-medium focus:outline-none"
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// FILE UPLOAD (custom — library has no file uploader)
// Accepts PDF, Image, Word Document, PPT
// ─────────────────────────────────────────────────────────────────────────
const FileUpload = ({ files = [], onFilesChange }) => {
  const inputRef = useRef(null);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files || []).map((f) => ({ name: f.name, size: f.size }));
    onFilesChange([...files, ...selected]);
    e.target.value = "";
  };

  const removeFile = (idx) => onFilesChange(files.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em] select-none">
        Attachments
      </label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] py-6 px-4 text-center hover:border-[#223F74]/40 hover:bg-[#F4F7FB] transition"
      >
        <Paperclip size={18} className="text-[#223F74]" />
        <span className="text-sm font-semibold text-[#223F74]">Click to upload</span>
        <span className="text-xs text-[#6B7280]">PDF, Image, Word Document, or PPT</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={handleFiles}
      />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {files.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] text-xs font-semibold text-[#223F74]"
            >
              <FileText size={13} />
              {f.name}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// SMALL ICON ACTION BUTTON (matches the DataTable ActionButton visual style)
// ─────────────────────────────────────────────────────────────────────────
const IconAction = ({ icon: Icon, tooltip, onClick, danger = false, active = false }) => (
  <button
    type="button"
    title={tooltip}
    onClick={onClick}
    className={`w-8 h-8 rounded-xl flex items-center justify-center transition duration-150 active:scale-95 ${
      danger
        ? "bg-rose-50 text-[#D66B5F] border border-rose-200 hover:bg-rose-100"
        : active
          ? "bg-[#223F74] text-white hover:bg-[#1a3360]"
          : "bg-[#F4F7FB] text-[#223F74] hover:bg-[#E2E8F0]"
    }`}
  >
    <Icon size={14} />
  </button>
);

// ─────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENT CARD
// ─────────────────────────────────────────────────────────────────────────
const AnnouncementCard = ({ announcement: a, onEdit, onDelete, onDuplicate, onTogglePin, onToggleArchive }) => {
  const TypeIcon = TYPE_ICON[a.type] ?? Megaphone;
  const preview = stripHtml(a.description);

  return (
    <div className="rounded-[24px] border border-[#E7E2DB] bg-white p-5 shadow-[0_6px_20px_rgba(0,0,0,.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#F8EEE9] flex items-center justify-center text-[#223F74]">
            <TypeIcon size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {a.pinned && <Pin size={13} className="text-[#F59B87] flex-shrink-0" />}
              <p className="text-sm font-bold text-[#1D1D1F] truncate">{a.title}</p>
            </div>
            <p className="text-xs text-[#6B7280]">{a.classId} · Section {a.section}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${statusBadgeCls(a.status)}`}>
            {a.status}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${priorityBadgeCls(a.priority)}`}>
            {a.priority} Priority
          </span>
        </div>
      </div>

      {/* Description preview */}
      <p className="text-xs text-[#6B7280] font-medium line-clamp-2">
        {preview.length > 140 ? `${preview.slice(0, 140)}…` : preview}
      </p>

      {/* Meta */}
      <div className="flex flex-col gap-2 text-xs text-[#6B7280] font-medium">
        <div className="flex items-center gap-2">
          <User size={13} className="text-[#223F74]" />
          <span>{a.teacherName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-[#223F74]" />
          <span>Created {prettyDate(a.createdDate)} · Expires {prettyDate(a.expiryDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={13} className="text-[#223F74]" />
          <span>{a.studentsReached} students reached</span>
        </div>
      </div>

      {/* Attachments */}
      {a.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {a.attachments.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F4F7FB] border border-[#E2E8F0] text-[11px] font-semibold text-[#223F74]"
            >
              <Paperclip size={11} />
              {f.name}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-[#E2E8F0] mt-1">
        <div className="flex items-center gap-1.5 pt-3">
          <IconAction icon={Pencil} tooltip="Edit" onClick={() => onEdit(a)} />
          <IconAction icon={Copy} tooltip="Duplicate" onClick={() => onDuplicate(a)} />
          <IconAction
            icon={a.pinned ? PinOff : Pin}
            tooltip={a.pinned ? "Unpin" : "Pin"}
            active={a.pinned}
            onClick={() => onTogglePin(a)}
          />
          <IconAction
            icon={a.archived ? ArchiveRestore : Archive}
            tooltip={a.archived ? "Unarchive" : "Archive"}
            active={a.archived}
            onClick={() => onToggleArchive(a)}
          />
          <IconAction icon={Trash2} tooltip="Delete" danger onClick={() => onDelete(a)} />
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// NOTICE CARD
// ─────────────────────────────────────────────────────────────────────────
const NoticeCard = ({ notice: n, onDownload, onMarkRead }) => (
  <div
    onClick={() => n.unread && onMarkRead(n)}
    className="relative rounded-[24px] border border-[#E7E2DB] bg-white p-5 shadow-[0_6px_20px_rgba(0,0,0,.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col gap-3 cursor-default"
  >
    {n.unread && (
      <span className="absolute -top-2 -right-2 px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black shadow-md">
        NEW
      </span>
    )}

    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-bold text-[#1D1D1F] pr-6">{n.title}</p>
      <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${priorityBadgeCls(n.priority)}`}>
        {n.priority}
      </span>
    </div>

    <p className="text-xs text-[#6B7280] font-medium">{n.description}</p>

    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#223F74]">
      <span className="px-2.5 py-1 rounded-full bg-[#F4F7FB] border border-[#E2E8F0]">{n.department}</span>
      <span className="flex items-center gap-1 text-[#6B7280] font-medium">
        <Calendar size={12} /> {prettyDate(n.date)}
      </span>
    </div>

    {n.attachments.length > 0 && (
      <div className="flex flex-wrap gap-2">
        {n.attachments.map((f, i) => (
          <span
            key={`${f.name}-${i}`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F4F7FB] border border-[#E2E8F0] text-[11px] font-semibold text-[#223F74]"
          >
            <Paperclip size={11} />
            {f.name}
          </span>
        ))}
      </div>
    )}

    <div className="pt-1">
      <Button
        text="Download"
        variant="secondary"
        icon={<Download size={14} />}
        onClick={(e) => {
          e.stopPropagation();
          onDownload(n);
        }}
      />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────
const Toast = ({ message }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[10001] flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#223F74] text-white shadow-xl">
      <CheckCircle size={16} className="text-emerald-300" />
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENT FORM MODAL (Create / Edit)
// ─────────────────────────────────────────────────────────────────────────
function AnnouncementFormModal({ editingAnnouncement, managedClasses, onSave, onClose }) {
  const isEdit = !!editingAnnouncement;

  const [title, setTitle] = useState("");
  const [selectedClass, setSelectedClass] = useState("All Classes");
  const [selectedSection, setSelectedSection] = useState(SECTION_OPTIONS[0]);
  const [audience, setAudience] = useState("Entire Class");
  const [priority, setPriority] = useState("Medium");
  const [type, setType] = useState("General");
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [sendPush, setSendPush] = useState(true);
  const [emailParents, setEmailParents] = useState(false);
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [attachments, setAttachments] = useState([]);
  const descriptionRef = useRef("");

  // Prefill (or reset) whenever the target announcement changes
  useEffect(() => {
    setTitle(editingAnnouncement?.title ?? "");
    setSelectedClass(editingAnnouncement?.classId ?? "All Classes");
    setSelectedSection(editingAnnouncement?.section ?? SECTION_OPTIONS[0]);
    setAudience(editingAnnouncement?.audience ?? "Entire Class");
    setPriority(editingAnnouncement?.priority ?? "Medium");
    setType(editingAnnouncement?.type ?? "General");
    setScheduleLater(false);
    setScheduleDate("");
    setExpiryDate(editingAnnouncement?.expiryDate ?? "");
    setSendPush(true);
    setEmailParents(false);
    setNotifyStudents(true);
    setAttachments(editingAnnouncement?.attachments ?? []);
    descriptionRef.current = editingAnnouncement?.description ?? "";
  }, [editingAnnouncement, managedClasses]);

  const buildPayload = () => ({
    title,
    description: descriptionRef.current,
    classId: selectedClass,
    section: selectedSection,
    audience,
    priority,
    type,
    scheduleLater,
    scheduleDate,
    expiryDate,
    sendPush,
    emailParents,
    notifyStudents,
    attachments,
  });

  return (
    <Modal id="announcement-form-modal" title={isEdit ? "Edit Announcement" : "New Announcement"} size="2xl" onClose={onClose}>
      <Grid cols={12} gap={4}>
        <DataField
          label="Title"
          id="ann-title"
          size={12}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Science Fair Submission Deadline"
        />

        <div className="col-span-12">
          <RichTextEditor initialValue={descriptionRef.current} onChange={(html) => { descriptionRef.current = html; }} />
        </div>

        <div className="col-span-12">
          <FileUpload files={attachments} onFilesChange={setAttachments} />
        </div>

        <SelectField label="Class" id="ann-class" size={6} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
          <Option value="All Classes" label="All Classes" />
          {managedClasses.map((c) => (
            <Option key={c._id} value={c._id} label={c.name} />
          ))}
        </SelectField>

        <SelectField label="Section" id="ann-section" size={6} value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
          {SECTION_OPTIONS.map((s) => (
            <Option key={s} value={s} label={`Section ${s}`} />
          ))}
        </SelectField>

        <SelectField label="Audience" id="ann-audience" size={6} value={audience} onChange={(e) => setAudience(e.target.value)}>
          {AUDIENCE_OPTIONS.map((a) => (
            <Option key={a} value={a} label={a} />
          ))}
        </SelectField>

        <SelectField label="Priority" id="ann-priority" size={6} value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITY_OPTIONS.map((p) => (
            <Option key={p} value={p} label={p} />
          ))}
        </SelectField>

        <SelectField label="Announcement Type" id="ann-type" size={6} value={type} onChange={(e) => setType(e.target.value)}>
          {TYPE_OPTIONS.map((t) => (
            <Option key={t} value={t} label={t} />
          ))}
        </SelectField>

        <DataField
          label="Expiry Date"
          id="ann-expiry"
          type="date"
          size={6}
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
        />

        <div className={gridSpan(6)}>
          <ToggleButton checked={scheduleLater} onChange={setScheduleLater} label="Schedule Later" labelOff="Publish Now" />
        </div>

        {scheduleLater && (
          <DataField
            label="Schedule Date & Time"
            id="ann-schedule"
            type="datetime-local"
            size={6}
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
        )}

        <div className="col-span-12 rounded-2xl border border-[#E2E8F0] p-4 flex flex-col sm:flex-row gap-4 sm:gap-8">
          <ToggleButton checked={sendPush} onChange={setSendPush} label="Send Push Notification" size="sm" />
          <ToggleButton checked={emailParents} onChange={setEmailParents} label="Email Parents" size="sm" />
          <ToggleButton checked={notifyStudents} onChange={setNotifyStudents} label="Notify Students" size="sm" />
        </div>
      </Grid>

      <div className="flex flex-wrap justify-end gap-2 pt-6">
        <Button text="Cancel" variant="ghost" size={3} onClick={onClose} />
        <Button text="Save Draft" variant="secondary" size={3} onClick={() => onSave(buildPayload(), "draft")} />
        <Button text={isEdit ? "Update & Publish" : "Publish"} variant="primary" size={4} onClick={() => onSave(buildPayload(), "publish")} />
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ONLINE CLASS MODAL
// ─────────────────────────────────────────────────────────────────────────
function OnlineClassModal({ managedClasses, onSchedule, onClose }) {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [platform, setPlatform] = useState(PLATFORM_OPTIONS[0]);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedClass, setSelectedClass] = useState(managedClasses[0]?._id ?? "");
  const [selectedSection, setSelectedSection] = useState(SECTION_OPTIONS[0]);

  useEffect(() => {
    if (managedClasses.length > 0 && !selectedClass) {
      setSelectedClass(managedClasses[0]._id);
    }
  }, [managedClasses, selectedClass]);
  const [instructions, setInstructions] = useState("");

  const reset = () => {
    setSubject("");
    setTopic("");
    setMeetingLink("");
    setPlatform(PLATFORM_OPTIONS[0]);
    setDate("");
    setStartTime("");
    setEndTime("");
    setSelectedClass(managedClasses[0]?._id ?? "");
    setSelectedSection(SECTION_OPTIONS[0]);
    setInstructions("");
  };

  const handleSchedule = () => {
    onSchedule({
      subject,
      topic,
      meetingLink,
      platform,
      date,
      startTime,
      endTime,
      classId: selectedClass,
      section: selectedSection,
      instructions,
    });
    reset();
  };

  return (
    <Modal id="online-class-modal" title="Schedule Online Class" size="lg" onClose={onClose}>
      <Grid cols={12} gap={4}>
        <DataField label="Subject" id="oc-subject" size={6} value={subject} onChange={(e) => setSubject(e.target.value)} />
        <DataField label="Topic" id="oc-topic" size={6} value={topic} onChange={(e) => setTopic(e.target.value)} />
        <DataField
          label="Meeting Link"
          id="oc-link"
          size={12}
          value={meetingLink}
          onChange={(e) => setMeetingLink(e.target.value)}
          placeholder="https://meet.google.com/…"
        />
        <SelectField label="Platform" id="oc-platform" size={6} value={platform} onChange={(e) => setPlatform(e.target.value)}>
          {PLATFORM_OPTIONS.map((p) => (
            <Option key={p} value={p} label={p} />
          ))}
        </SelectField>
        <DataField label="Date" id="oc-date" type="date" size={6} value={date} onChange={(e) => setDate(e.target.value)} />
        <DataField label="Start Time" id="oc-start" type="time" size={6} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        <DataField label="End Time" id="oc-end" type="time" size={6} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        <SelectField label="Class" id="oc-class" size={6} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
          {managedClasses.map((c) => (
            <Option key={c._id} value={c._id} label={c.name} />
          ))}
        </SelectField>
        <SelectField label="Section" id="oc-section" size={6} value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
          {SECTION_OPTIONS.map((s) => (
            <Option key={s} value={s} label={`Section ${s}`} />
          ))}
        </SelectField>
        <DataField
          label="Instructions"
          id="oc-instructions"
          type="textarea"
          rows={3}
          size={12}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Any notes for students before joining…"
        />
      </Grid>

      <div className="flex justify-end gap-2 pt-6">
        <Button text="Cancel" variant="ghost" size={3} onClick={onClose} />
        <Button text="Schedule Class" variant="primary" size={4} icon={<Video size={14} />} onClick={handleSchedule} />
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────
export default function Announcements({
  isClassTeacher = true
}) {
  const [activeTab, setActiveTab] = useState("announcements");

  const [classesList, setClassesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Announcements state ──
  const [announcements, setAnnouncements] = useState([]);
  const [annSearch, setAnnSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState(SORT_OPTIONS[0]);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  // ── Notices state ──
  const [notices, setNotices] = useState([]);
  const [noticeSearch, setNoticeSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  const [toastMsg, setToastMsg] = useState("");
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2500);
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/teacher/announcements/classes');
      if (response.data && response.data.data) {
        setClassesList(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/teacher/announcements');
      if (response.data && response.data.data) {
        setAnnouncements(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOfficialNotices = async () => {
    try {
      const response = await api.get('/teacher/announcements/official-notices');
      if (response.data && response.data.data) {
        const mappedNotices = response.data.data.map(notice => ({
          id: notice._id,
          title: notice.title || notice.noticeTitle || "School Notice",
          description: notice.content || notice.description || "",
          priority: notice.priority || "Medium",
          department: notice.department || notice.visibleTo || "Administration",
          date: notice.createdAt || notice.date || new Date().toISOString(),
          attachments: notice.attachments || [],
          unread: notice.unread ?? false
        }));
        setNotices(mappedNotices);
      }
    } catch (error) {
      console.error('Failed to fetch notices:', error);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchAnnouncements();
    fetchOfficialNotices();
  }, []);

  // ── Announcement filtering / sorting ──
  const filteredAnnouncements = useMemo(() => {
    let result = announcements.filter((a) => !a.archived);
    if (annSearch.trim()) {
      const q = annSearch.trim().toLowerCase();
      result = result.filter((a) => a.title.toLowerCase().includes(q));
    }
    if (statusFilter !== "All") {
      result = result.filter((a) => a.status === statusFilter);
    }
    result = [...result].sort((a, b) => {
      const diff = new Date(a.createdDate) - new Date(b.createdDate);
      return sortOrder === "Latest First" ? -diff : diff;
    });
    // Pinned announcements always float to the top
    return [...result.filter((a) => a.pinned), ...result.filter((a) => !a.pinned)];
  }, [announcements, annSearch, statusFilter, sortOrder]);

  // ── Notice filtering ──
  const filteredNotices = useMemo(() => {
    let result = notices;
    if (noticeSearch.trim()) {
      const q = noticeSearch.trim().toLowerCase();
      result = result.filter((n) => n.title.toLowerCase().includes(q));
    }
    if (deptFilter !== "All") {
      result = result.filter((n) => n.department === deptFilter);
    }
    return result;
  }, [notices, noticeSearch, deptFilter]);

  const unreadNoticeCount = useMemo(() => notices.filter((n) => n.unread).length, [notices]);

  // ── Announcement handlers ──
  const openCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    openModal("announcement-form-modal");
  };

  const openEditAnnouncement = (ann) => {
    setEditingAnnouncement(ann);
    openModal("announcement-form-modal");
  };

  const handleSaveAnnouncement = async (data, mode) => {
    const isEdit = !!editingAnnouncement;
    const payload = {
      title: data.title,
      description: data.description,
      targetClassId: data.classId === "All Classes" ? null : data.classId,
      targetAudience: data.classId === "All Classes" ? "All Classes" : (classesList.find(c => c._id === data.classId)?.name || "Class"),
      section: data.section,
      type: data.type,
      expiryDate: data.expiryDate || null,
      status: data.scheduleLater ? "Scheduled" : "Active",
      priority: data.priority,
      attachments: data.attachments,
      isPinned: data.pinned || false,
      isArchived: data.archived || false,
      sendNotification: data.notifyStudents || data.sendPush
    };

    try {
      if (isEdit) {
        await api.put(`/teacher/announcements/${editingAnnouncement.id}`, payload);
        showToast("Announcement updated");
      } else {
        await api.post('/teacher/announcements', payload);
        showToast(mode === "draft" ? "Draft saved" : "Announcement published");
      }
      fetchAnnouncements();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to save announcement');
    }

    closeModal("announcement-form-modal");
    setEditingAnnouncement(null);
  };

  const handleDeleteAnnouncement = async (ann) => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      try {
        await api.delete(`/teacher/announcements/${ann.id}`);
        showToast("Announcement deleted");
        fetchAnnouncements();
      } catch (error) {
        toast.error(error.message || 'Failed to delete announcement');
      }
    }
  };

  const handleDuplicateAnnouncement = async (ann) => {
    try {
      const payload = {
        title: `${ann.title} (Copy)`,
        description: ann.description,
        targetClassId: ann.targetClassId || (ann.classId === "All Classes" ? null : ann.classId),
        targetAudience: ann.target || ann.classId || "All Classes",
        section: ann.section || "A",
        type: ann.type || "General",
        expiryDate: ann.expiryDate || null,
        status: ann.status || "Active",
        priority: ann.priority || "Medium",
        attachments: ann.attachments || [],
        isPinned: false,
        isArchived: false,
        sendNotification: false
      };
      await api.post('/teacher/announcements', payload);
      showToast("Announcement duplicated");
      fetchAnnouncements();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to duplicate announcement');
    }
  };

  const handleTogglePin = async (ann) => {
    try {
      const nextPinnedState = !ann.pinned;
      // Optimistic update
      setAnnouncements((prev) => prev.map((a) => (a.id === ann.id ? { ...a, pinned: nextPinnedState } : a)));
      await api.put(`/teacher/announcements/${ann.id}`, { isPinned: nextPinnedState });
      showToast(nextPinnedState ? "Announcement pinned" : "Announcement unpinned");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to pin announcement');
      fetchAnnouncements();
    }
  };

  const handleToggleArchive = async (ann) => {
    try {
      const nextArchivedState = !ann.archived;
      // Optimistic update
      setAnnouncements((prev) => prev.map((a) => (a.id === ann.id ? { ...a, archived: nextArchivedState } : a)));
      await api.put(`/teacher/announcements/${ann.id}`, { isArchived: nextArchivedState });
      showToast(nextArchivedState ? "Announcement archived" : "Announcement unarchived");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to archive announcement');
      fetchAnnouncements();
    }
  };

  // ── Online class handler ──
  const handleScheduleOnlineClass = async (data) => {
    const targetClassName = classesList.find(c => c._id === data.classId)?.name || "Class";
    const desc = `<p>Join via <strong>${data.platform}</strong> on ${data.date} from ${data.startTime} to ${data.endTime}.</p>${
      data.instructions ? `<p>${data.instructions}</p>` : ""
    }`;

    const payload = {
      title: `Online Class — ${data.subject}: ${data.topic}`,
      description: desc,
      targetClassId: data.classId,
      targetAudience: targetClassName,
      priority: "medium",
      attachments: [],
      isPinned: false,
      sendNotification: true
    };

    try {
      await api.post('/teacher/announcements', payload);
      showToast("Online class scheduled");
      closeModal("online-class-modal");
      fetchAnnouncements();
    } catch (error) {
      toast.error(error.message || 'Failed to schedule online class');
    }
  };

  // ── Notice handlers ──
  const handleDownloadNotice = (notice) => {
    if (notice.attachments && notice.attachments.length > 0) {
      notice.attachments.forEach((att) => {
        if (att.url) {
          window.open(att.url, '_blank');
        }
      });
      showToast(`Opening attachment(s) for “${notice.title}”…`);
    } else {
      toast.error(`No attachments available for this notice`);
    }
  };

  const handleMarkNoticeRead = async (notice) => {
    try {
      // Optimistic update
      setNotices((prev) => prev.map((n) => (n.id === notice.id ? { ...n, unread: false } : n)));
      await api.put(`/teacher/announcements/official-notices/${notice.id}/read`);
    } catch (error) {
      console.error('Failed to mark notice as read:', error);
      fetchOfficialNotices();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page heading ── */}
      <Heading primaryText="Announcements" secondaryText=" & Notices" size={12} />

      {/* ── Tabs ── */}
      <TabBar active={activeTab} onChange={setActiveTab} unreadNotices={unreadNoticeCount} />

      {/* ═══════════════════════ ANNOUNCEMENTS TAB ═══════════════════════ */}
      {activeTab === "announcements" && (
        <div className="flex flex-col gap-5">
          {/* Toolbar */}
          <Grid cols={12} gap={3}>
            <DataField
              size={5}
              id="ann-search"
              placeholder="Search announcements…"
              icon={Search}
              value={annSearch}
              onChange={(e) => setAnnSearch(e.target.value)}
            />
            <SelectField size={3} id="ann-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} searchable={false}>
              {STATUS_FILTER_OPTIONS.map((s) => (
                <Option key={s} value={s} label={s === "All" ? "All Statuses" : s} />
              ))}
            </SelectField>
            <SelectField size={2} id="ann-sort" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} searchable={false}>
              {SORT_OPTIONS.map((s) => (
                <Option key={s} value={s} label={s} />
              ))}
            </SelectField>
            {isClassTeacher && (
              <div className="col-span-12 sm:col-span-2 flex flex-col sm:flex-row gap-2">
                <Button text="New" icon={<Plus size={14} />} variant="primary" onClick={openCreateAnnouncement} />
              </div>
            )}
          </Grid>

          {isClassTeacher && (
            <div>
              <Button
                text="Schedule Online Class"
                variant="secondary"
                icon={<Video size={14} />}
                size={4}
                onClick={() => openModal("online-class-modal")}
              />
            </div>
          )}

          {/* Cards */}
          {filteredAnnouncements.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-[24px] border border-dashed border-[#E2E8F0] bg-white">
              <div className="w-14 h-14 rounded-2xl bg-[#F4F7FB] flex items-center justify-center">
                <Megaphone className="w-7 h-7 text-[#223F74]" />
              </div>
              <p className="text-sm font-bold text-[#223F74]">No Announcements Found</p>
              <p className="text-xs text-[#6B7280] max-w-[240px] text-center">
                Try adjusting your search or filters, or create a new announcement.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAnnouncements.map((a) => (
                <AnnouncementCard
                  key={a.id}
                  announcement={a}
                  onEdit={openEditAnnouncement}
                  onDelete={handleDeleteAnnouncement}
                  onDuplicate={handleDuplicateAnnouncement}
                  onTogglePin={handleTogglePin}
                  onToggleArchive={handleToggleArchive}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════ NOTICES TAB ═══════════════════════════ */}
      {activeTab === "notices" && (
        <div className="flex flex-col gap-5">
          {/* Toolbar */}
          <Grid cols={12} gap={3}>
            <DataField
              size={8}
              id="notice-search"
              placeholder="Search notices…"
              icon={Search}
              value={noticeSearch}
              onChange={(e) => setNoticeSearch(e.target.value)}
            />
            <SelectField size={4} id="notice-dept-filter" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} searchable={false}>
              <Option value="All" label="All Departments" />
              {DEPARTMENT_OPTIONS.map((d) => (
                <Option key={d} value={d} label={d} />
              ))}
            </SelectField>
          </Grid>

          {/* Cards */}
          {filteredNotices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-[24px] border border-dashed border-[#E2E8F0] bg-white">
              <div className="w-14 h-14 rounded-2xl bg-[#F4F7FB] flex items-center justify-center">
                <Bell className="w-7 h-7 text-[#223F74]" />
              </div>
              <p className="text-sm font-bold text-[#223F74]">No Notices Found</p>
              <p className="text-xs text-[#6B7280] max-w-[240px] text-center">
                Try adjusting your search or department filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotices.map((n) => (
                <NoticeCard key={n.id} notice={n} onDownload={handleDownloadNotice} onMarkRead={handleMarkNoticeRead} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <AnnouncementFormModal
        editingAnnouncement={editingAnnouncement}
        managedClasses={classesList}
        onSave={handleSaveAnnouncement}
        onClose={() => {
          closeModal("announcement-form-modal");
          setEditingAnnouncement(null);
        }}
      />
      <OnlineClassModal 
        managedClasses={classesList} 
        onSchedule={handleScheduleOnlineClass} 
        onClose={() => closeModal("online-class-modal")} 
      />

      <Toast message={toastMsg} />
    </div>
  );
}