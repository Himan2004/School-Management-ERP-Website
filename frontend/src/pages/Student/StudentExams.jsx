/**
 * StudentExams.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Redesigned Student Exams page — schedules & admit cards ONLY.
 * All Results / Marks / Grades / Rank / Performance functionality has been
 * completely removed, per the redesign brief.
 *
 * Built strictly on top of the shared Common_Components library:
 *   Grid, InputField, SelectField, Option, Button, DataTable,
 *   Modal, ModalProfile, ModalGrid, ModalData, P, openModal, closeModal
 * ─────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import api from "../../services/api";
import {
  Grid,
  Heading,
  InputField,
  SelectField,
  Option,
  Button,
  DataTable,
  Modal,
  ModalProfile,
  ModalGrid,
  ModalData,
  openModal,
  closeModal,
} from "../../components/shared/Common_Components";
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  Download,
  Eye,
  CheckCircle,
  FileText,
  BookOpen,
  FlaskConical,
  Calculator,
  Globe2,
  Code2,
  ClipboardList,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// SUBJECT ICON MAP
// Maps a subject name to a Lucide icon shown on each exam card.
// Falls back to BookOpen for any subject not listed here (e.g. new subjects
// arriving dynamically from the API).
// ─────────────────────────────────────────────────────────────────────────
const SUBJECT_ICON = {
  Mathematics: Calculator,
  Science: FlaskConical,
  English: BookOpen,
  "Computer Science": Code2,
  "Social Studies": Globe2,
};

// Default subject filter options shown before the API's subject list loads.
// Replace/merge with `GET /subjects` once wired up.
const BASE_SUBJECT_OPTIONS = [
  "Mathematics",
  "Science",
  "English",
  "Computer Science",
  "Social Studies",
];

// ─────────────────────────────────────────────────────────────────────────
// STATUS HELPER
// ─────────────────────────────────────────────────────────────────────────
function getExamStatus(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const examDate = new Date(`${dateStr}T00:00:00`);
  const diffDays = Math.round((examDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: "Today", tone: "red" };
  if (diffDays === 1) return { label: "Tomorrow", tone: "orange" };
  if (diffDays > 1 && diffDays <= 3) return { label: `${diffDays} Days Left`, tone: "orange" };
  if (diffDays > 3) return { label: `${diffDays} Days Left`, tone: "blue" };
  return { label: "Completed", tone: "green" };
}

const STATUS_TONE_CLS = {
  green: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  orange: "bg-amber-100 text-amber-700",
  red: "bg-rose-100 text-rose-700",
};

// ─────────────────────────────────────────────────────────────────────────
// SKELETON COMPONENTS
// ─────────────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="rounded-[24px] border border-[#E7E2DB] bg-white p-5 shadow-[0_6px_20px_rgba(0,0,0,.06)] animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-slate-200" />
      <div className="h-4 w-28 bg-slate-200 rounded" />
    </div>
    <div className="h-3 w-full bg-slate-100 rounded mb-2" />
    <div className="h-3 w-3/4 bg-slate-100 rounded mb-2" />
    <div className="h-3 w-1/2 bg-slate-100 rounded mb-4" />
    <div className="flex gap-2">
      <div className="h-9 flex-1 bg-slate-200 rounded-2xl" />
      <div className="h-9 flex-1 bg-slate-200 rounded-2xl" />
    </div>
  </div>
);

const SkeletonTableRows = () => (
  <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="flex gap-4 px-5 py-4 border-b border-[#E2E8F0]/60 animate-pulse">
        {[...Array(6)].map((__, j) => (
          <div key={j} className="h-3 flex-1 bg-slate-100 rounded" />
        ))}
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
// EMPTY STATES
// ─────────────────────────────────────────────────────────────────────────
const EmptyUpcoming = () => (
  <div className="col-span-12 flex flex-col items-center justify-center gap-3 py-16 rounded-[24px] border border-dashed border-[#E2E8F0] bg-white">
    <div className="w-14 h-14 rounded-2xl bg-[#F4F7FB] flex items-center justify-center">
      <Calendar className="w-7 h-7 text-[#223F74]" />
    </div>
    <p className="text-sm font-bold text-[#223F74]">No Upcoming Exams</p>
    <p className="text-xs text-[#6B7280] max-w-[220px] text-center">
      There are no exams scheduled right now. Check back later for updates.
    </p>
  </div>
);

const EmptyCompleted = () => (
  <div className="flex flex-col items-center justify-center gap-3 py-14 rounded-2xl border border-dashed border-[#E2E8F0] bg-white">
    <div className="w-14 h-14 rounded-2xl bg-[#F4F7FB] flex items-center justify-center">
      <ClipboardList className="w-7 h-7 text-[#223F74]" />
    </div>
    <p className="text-sm font-bold text-[#223F74]">No Completed Exams</p>
    <p className="text-xs text-[#6B7280] max-w-[220px] text-center">
      Exams you've completed will show up here with their schedule details.
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────
// EXAM CARD
// ─────────────────────────────────────────────────────────────────────────
const ExamCard = ({ exam, onView, onDownload, downloading }) => {
  const status = getExamStatus(exam.date);
  const Icon = SUBJECT_ICON[exam.subject] ?? BookOpen;
  const day = new Date(`${exam.date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
  });
  const prettyDate = new Date(`${exam.date}T00:00:00`).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-[24px] border border-[#E7E2DB] bg-white p-5 shadow-[0_6px_20px_rgba(0,0,0,.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#F8EEE9] flex items-center justify-center text-[#223F74]">
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1D1D1F] truncate">{exam.subject}</p>
            <p className="text-xs text-[#6B7280]">{day}</p>
          </div>
        </div>
        <span
          className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors duration-200 ${STATUS_TONE_CLS[status.tone]}`}
        >
          {status.label}
        </span>
      </div>

      {/* Details */}
      <div className="flex flex-col gap-2 text-xs text-[#6B7280] font-medium">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-[#223F74]" />
          <span>{prettyDate}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[#223F74]" />
          <span>{exam.time} · {exam.duration}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-[#223F74]" />
          <span>{exam.hall} · {exam.room} · {exam.seat}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          text="View Details"
          variant="secondary"
          icon={<Eye size={14} />}
          onClick={() => onView(exam)}
        />
        <Button
          text={downloading ? "Downloading…" : "Admit Card"}
          variant="primary"
          icon={<Download size={14} />}
          loading={downloading}
          onClick={() => onDownload(exam)}
        />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────
const Toast = ({ message }) => {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[10001] flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#223F74] text-white shadow-xl animate-[fadeIn_0.2s_ease-out]">
      <CheckCircle size={16} className="text-emerald-300" />
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────
export default function StudentExams() {
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [completedExams, setCompletedExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const response = await api.get("/student/exams");
        if (response.data?.success) {
          setUpcomingExams(response.data.data.upcoming || []);
          setCompletedExams(response.data.data.completed || []);
        }
      } catch (err) {
        console.error("Error fetching student exams", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExams();
  }, []);

  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [selectedExam, setSelectedExam] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  // Subject list for the filter dropdown — merges the static defaults with
  // any subjects actually present in the fetched data (covers new subjects
  // the API returns that aren't in BASE_SUBJECT_OPTIONS yet).
  const subjectOptions = useMemo(() => {
    const fromData = [...upcomingExams, ...completedExams].map((e) => e.subject);
    return Array.from(new Set([...BASE_SUBJECT_OPTIONS, ...fromData]));
  }, [upcomingExams, completedExams]);

  const matchesFilters = useCallback(
    (exam) => {
      const matchesSearch = exam.subject.toLowerCase().includes(search.trim().toLowerCase());
      const matchesSubject = !subjectFilter || exam.subject === subjectFilter;
      return matchesSearch && matchesSubject;
    },
    [search, subjectFilter],
  );

  const filteredUpcoming = useMemo(
    () => upcomingExams.filter(matchesFilters),
    [upcomingExams, matchesFilters],
  );

  const filteredCompleted = useMemo(
    () => completedExams.filter(matchesFilters),
    [completedExams, matchesFilters],
  );

  const handleView = (exam) => {
    setSelectedExam(exam);
    openModal("exam-details-modal");
  };

  const handleDownload = (exam) => {
    setDownloadingId(exam.id);
    // Simulated download — replace with real "Download Admit Card" API call
    setTimeout(() => {
      setDownloadingId(null);
      setToastMsg(`Admit card for ${exam.subject} downloaded`);
      setTimeout(() => setToastMsg(""), 2500);
    }, 1200);
  };

  const completedColumns = [
    { key: "subject", label: "Subject" },
    { key: "date", label: "Exam Date" },
    { key: "time", label: "Time" },
    { key: "duration", label: "Duration" },
    { key: "room", label: "Room Number" },
    { key: "seat", label: "Seat Number" },
    { key: "status", label: "Status" },
  ];

  const completedActions = [
    {
      icon: <Eye size={14} />,
      tooltip: "View Details",
      variant: "ghost",
      onClick: (row) => handleView(row),
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* ── Page heading — Common_Components Heading (animated navy banner) ── */}
      <Heading primaryText="Exam" secondaryText=" Schedule" size={12} />

      {/* ── Search + Subject Filter ── */}
      <Grid cols={12} gap={3}>
        <InputField
          size={8}
          placeholder="Search by subject name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-4"
        />
        <SelectField
          size={4}
          placeholder="All Subjects"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          <Option value="" label="All Subjects" />
          {subjectOptions.map((s) => (
            <Option key={s} value={s} label={s} />
          ))}
        </SelectField>
      </Grid>

      {/* ── Section 1: Upcoming Exams (Cards) ── */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-[#223F74]">Upcoming Exams</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredUpcoming.length === 0 ? (
          <div className="grid grid-cols-1">
            <EmptyUpcoming />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUpcoming.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onView={handleView}
                onDownload={handleDownload}
                downloading={downloadingId === exam.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Section 2: Completed Exams (Table) ── */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-[#223F74]">Completed Exams</h2>

        {isLoading ? (
          <SkeletonTableRows />
        ) : filteredCompleted.length === 0 ? (
          <EmptyCompleted />
        ) : (
          <DataTable
            columns={completedColumns}
            rows={filteredCompleted}
            actions={completedActions}
            searchable={false}
            hidePagination={filteredCompleted.length <= 10}
            pageSize={10}
          />
        )}
      </div>

      {/* ── Exam Details Modal ── */}
      <Modal id="exam-details-modal" title="Exam Details" size="md" onClose={() => setSelectedExam(null)}>
        {selectedExam && (
          <div className="flex flex-col gap-4">
            <ModalProfile
              name={selectedExam.subject}
              subtitle={`${selectedExam.hall} · ${selectedExam.room}`}
              meta={`Seat: ${selectedExam.seat}`}
            />

            <ModalGrid title="Basic Information" cols={2}>
              <ModalData label="Subject" value={selectedExam.subject} />
              <ModalData label="Date" value={selectedExam.date} />
              <ModalData label="Time" value={selectedExam.time} />
              <ModalData label="Duration" value={selectedExam.duration} />
            </ModalGrid>

            <ModalGrid title="Exam Location" cols={3}>
              <ModalData label="Hall" value={selectedExam.hall} />
              <ModalData label="Room" value={selectedExam.room} />
              <ModalData label="Seat" value={selectedExam.seat} />
            </ModalGrid>

            <ModalGrid title="Syllabus" cols={1}>
              <ModalData label="Coverage" value={selectedExam.syllabus} />
            </ModalGrid>

            <div className="rounded-2xl border border-[#E2E8F0] p-4">
              <p className="text-xs font-black text-[#223F74] uppercase tracking-[0.18em] mb-3 flex items-center gap-2">
                <FileText size={14} /> Important Instructions
              </p>
              <ul className="flex flex-col gap-1.5">
                {selectedExam.instructions.map((line, i) => (
                  <li key={i} className="text-sm text-[#1D1D1F] font-medium flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#223F74] mt-1.5 flex-shrink-0" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                text="Close"
                variant="ghost"
                size={4}
                onClick={() => closeModal("exam-details-modal")}
              />
              <Button
                text={downloadingId === selectedExam.id ? "Downloading…" : "Download Admit Card"}
                variant="primary"
                size={6}
                icon={<Download size={14} />}
                loading={downloadingId === selectedExam.id}
                onClick={() => handleDownload(selectedExam)}
              />
            </div>
          </div>
        )}
      </Modal>

      <Toast message={toastMsg} />
    </div>
  );
}