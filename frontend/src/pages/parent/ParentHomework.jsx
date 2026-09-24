import React, { useState, useEffect } from "react";
import { 
  BookOpen, Download, Calendar, Eye, 
  GraduationCap, LoaderCircle, Paperclip
} from "lucide-react";
import { MdPending } from 'react-icons/md';
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  DataTable,
  PanelModal,
  Button
} from "../../components/shared/Common_Components";
import { parentHomeworkApi } from "../../services/api/parentHomeworkApi";

const ActionTooltip = ({ label, children }) => (
  <div className="relative group/tip flex justify-center">
    {children}
    <div className="pointer-events-none absolute bottom-full mb-2 z-[200] opacity-0 translate-y-1 group-hover/tip:opacity-100 group-hover/tip:translate-y-0 transition-[opacity,transform] duration-150 whitespace-nowrap">
      <div className="bg-[#1a2e3f] text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl ring-1 ring-white/10">
        {label}
      </div>
      <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 border-4 border-transparent border-t-[#1a2e3f]" />
    </div>
  </div>
);

const HomeworkSyllabus = () => {
  const [selectedHw, setSelectedHw] = useState(null);
  const [selectedSyllabus, setSelectedSyllabus] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalHomework: 0,
    completedHomework: 0,
    pendingHomework: 0,
    notSubmitted: 0,
  });
  const [homeworkList, setHomeworkList] = useState([]);
  const [syllabusList, setSyllabusList] = useState([]);

  useEffect(() => {
    fetchHomeworkData();
  }, []);

  const getIds = () => {
    const studentId = localStorage.getItem("studentId");
    const schoolId = localStorage.getItem("schoolId");
    return { studentId, schoolId };
  };

  const fetchHomeworkData = async () => {
    try {
      setLoading(true);
      const { studentId, schoolId } = getIds();

      if (!studentId || !schoolId) {
        setError("Student or School ID missing. Please return to dashboard.");
        setLoading(false);
        return;
      }

      const [statsRes, listRes, syllabusRes] = await Promise.all([
        parentHomeworkApi.getStats(studentId, schoolId),
        parentHomeworkApi.getList(studentId, schoolId),
        parentHomeworkApi.getSyllabus(studentId, schoolId),
      ]);

      if (statsRes?.success) setStats(statsRes.data);
      if (listRes?.success) setHomeworkList(listRes.data || []);
      if (syllabusRes?.success) setSyllabusList(syllabusRes.data || []);
    } catch (err) {
      console.error(err);
      setError(`Failed to fetch academic data. ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Functions ---

  const handleDownloadSyllabus = (item) => {
    if (item.fileUrl) {
      window.open(item.fileUrl, "_blank");
    } else {
      alert(`No file available for ${item.subject} Syllabus`);
    }
  };

  const handleDownloadAttachment = (url, name) => {
    if (url) {
      window.open(url, "_blank");
    }
  };

  const homeworkColumns = [
    { key: "subject", label: "Subject", align: "left", render: (val) => <span className="font-bold text-[#223F74]">{val}</span> },
    { key: "title", label: "Assignment", align: "left", render: (val) => <span className="text-slate-700 text-sm">{val}</span> },
    { key: "dueDate", label: "Due Date", align: "left", render: (val) => <span className="text-slate-500 text-sm">{val ? new Date(val).toLocaleDateString() : 'N/A'}</span> },
    { key: "status", label: "Status", align: "center", render: (val) => (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
        val === 'completed'
          ? 'bg-emerald-50 text-emerald-700'
          : val === 'pending'
            ? 'bg-amber-50 text-amber-700'
            : 'bg-rose-50 text-rose-700'
      }`}>{val}</span>
    )},
    {
      key: "actions",
      label: "Actions",
      align: "center",
      render: (_, hw) => (
        <div className="flex justify-center gap-1.5">
          <ActionTooltip label="View Details">
            <button
              onClick={() => setSelectedHw(hw)}
              className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Eye size={16} />
            </button>
          </ActionTooltip>
          {hw.attachments && hw.attachments.length > 0 && (
            <ActionTooltip label="View Attachments">
              <button
                onClick={() => setSelectedHw(hw)}
                className="p-2 text-slate-400 hover:text-[#223F74] hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Paperclip size={16} />
              </button>
            </ActionTooltip>
          )}
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoaderCircle className="w-8 h-8 animate-spin text-[#223F74]" />
        <span className="ml-3 font-semibold text-slate-500">Loading academic data...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-rose-500 font-bold bg-rose-50 rounded-[2rem] m-6">{error}</div>;
  }

  return (
    <div className="w-full space-y-8 pb-10 text-left min-h-screen">
      {/* Header */}
      <Heading 
        primaryText="Academic Tracking" 
        secondaryText="" 
        size={12} 
        showAnimations={true} 
        action={
          <div className="bg-[#F8EEE9] px-4 py-2 rounded-full border border-[#E7E2DB] text-[#223F74] font-black text-sm relative z-20">
            Session 2024-25
          </div>
        }
      />

      {/* Stats Cards */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Homework"
          value={String(stats.totalHomework)}
          icon={<GraduationCap size={22} />}
          size={3}
          accentColor="#3B82F6"
        />
        <EnhancedDashCard
          title="Completed"
          value={String(stats.completedHomework)}
          icon={<BookOpen size={22} />}
          size={3}
          accentColor="#10B981"
        />
        <EnhancedDashCard
          title="Pending"
          value={String(stats.pendingHomework)}
          icon={<MdPending size={22} />}
          size={3}
          accentColor="#F59E0B"
        />
        <EnhancedDashCard
          title="Not Submitted"
          value={String(stats.notSubmitted)}
          icon={<Calendar size={22} />}
          size={3}
          accentColor="#F43F5E"
        />
      </DashGrid>

      {/* Homework Table */}
      <DataTable
        title="Recent Homework"
        rows={homeworkList}
        columns={homeworkColumns}
        searchable={true}
        size={12}
        pageSize={5}
        emptyMessage="No homework found"
      />

      {/* Syllabus Section */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-6 bg-[#223F74] rounded-full" />
          <h3 className="text-lg font-black text-slate-800">Updated Syllabus</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {syllabusList.length > 0 ? (
            syllabusList.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedSyllabus(item)}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-[#223F74] text-white p-3 rounded-xl">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{item.subject} Syllabus</h4>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider mt-0.5">
                      {item.term} &bull; {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownloadSyllabus(item); }}
                  className="bg-white p-2.5 rounded-xl text-[#223F74] shadow-sm border border-slate-200 hover:bg-[#223F74] hover:text-white transition-all"
                >
                  <Download size={16} />
                </button>
              </div>
            ))
          ) : (
            <p className="col-span-2 text-center text-slate-400 text-sm py-8">No syllabus available yet.</p>
          )}
        </div>
      </div>

      {/* --- Homework Detail Modal --- */}
      <PanelModal
        id="homework-detail-modal"
        title="Homework Details"
        size="lg"
        isVisible={!!selectedHw}
        onClose={() => setSelectedHw(null)}
      >
        {selectedHw && (
          <div className="space-y-4 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Subject</p>
                <p className="font-bold text-[#223F74] mt-1">{selectedHw.subject}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Due Date</p>
                <p className="font-bold text-[#223F74] mt-1">
                  {selectedHw.dueDate ? new Date(selectedHw.dueDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assignment</p>
              <p className="font-bold text-slate-800 mt-1">{selectedHw.title}</p>
            </div>

            {selectedHw.description && (
              <div className="bg-white border border-[#E7E2DB] p-4 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-slate-600">{selectedHw.description}</p>
              </div>
            )}

            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <span className="text-slate-500 text-sm font-medium">Status</span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                selectedHw.status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : selectedHw.status === 'pending'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
              }`}>
                {selectedHw.status}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <span className="text-slate-500 text-sm font-medium">Marks Obtained</span>
              <span className="font-bold text-slate-800">{selectedHw.marks || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <span className="text-slate-500 text-sm font-medium">Result</span>
              <span className="font-bold text-[#223F74]">{selectedHw.result || 'N/A'}</span>
            </div>

            {selectedHw.improvement && (
              <div>
                <span className="text-slate-500 text-sm font-medium block mb-1">Teacher's Feedback</span>
                <p className="text-sm bg-slate-50 p-3 rounded-xl text-[#223F74] italic border border-[#E2E8F0]">
                  "{selectedHw.improvement}"
                </p>
              </div>
            )}

            {/* Attachments */}
            {selectedHw.attachments && selectedHw.attachments.length > 0 && (
              <div>
                <span className="text-slate-500 text-sm font-medium block mb-2">Attachments</span>
                <div className="space-y-2">
                  {selectedHw.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-[#E2E8F0] hover:bg-[#E2E8F0] transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Paperclip size={14} className="text-[#223F74]" />
                        <span className="text-sm text-slate-700 font-medium truncate max-w-[200px]">
                          {att.name || `Attachment ${idx + 1}`}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDownloadAttachment(att.url, att.name)}
                        className="p-1.5 bg-[#223F74] text-white rounded-lg hover:bg-[#1a3360] transition-all"
                        title="Download"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </PanelModal>

      {/* --- Syllabus Detail Modal --- */}
      <PanelModal
        id="syllabus-detail-modal"
        title="Syllabus Details"
        size="md"
        isVisible={!!selectedSyllabus}
        onClose={() => setSelectedSyllabus(null)}
      >
        {selectedSyllabus && (
          <div className="space-y-4 text-left">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Subject</p>
              <p className="font-bold text-[#223F74] mt-1 text-lg">{selectedSyllabus.subject}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Term</p>
                <p className="font-bold text-slate-800 mt-1 text-sm">{selectedSyllabus.term}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Last Updated</p>
                <p className="font-bold text-slate-800 mt-1 text-sm">
                  {selectedSyllabus.lastUpdated ? new Date(selectedSyllabus.lastUpdated).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {selectedSyllabus.description && (
              <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Description</p>
                <p className="text-sm text-slate-600">{selectedSyllabus.description}</p>
              </div>
            )}

            <Button
              text="Download Syllabus"
              onClick={() => handleDownloadSyllabus(selectedSyllabus)}
              icon={<Download size={18} />}
              variant="primary"
            />
          </div>
        )}
      </PanelModal>
    </div>
  );
};

export default HomeworkSyllabus;
