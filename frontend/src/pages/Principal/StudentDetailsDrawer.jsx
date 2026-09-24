import React, { useState, useEffect } from 'react';
import {
  X, Phone, Mail, Calendar, User, BookOpen,
  FileText, ClipboardList, MessageSquare, History,
  Download, Loader2, AlertCircle, Edit2
} from 'lucide-react';
import {
  getStudentAttendance,
  getStudentPerformance,
  getStudentDocuments,
  getGuardianInfo,
  getCommunicationHistory,
  sendStudentNotice
} from '../../services/api/principalStudentApi';
import toast from 'react-hot-toast';
import { ModalProfile, ModalGrid, ModalData, Button } from '../../components/shared/Common_Components';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const StudentDetailsDrawer = ({ student, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [extraData, setExtraData] = useState({
    attendance: [],
    performance: [],
    documents: {},
    guardian: null,
    communication: []
  });

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [messageData, setMessageData] = useState({ subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!messageData.message.trim()) return toast.error("Please enter a message");
    try {
      setSending(true);
      await sendStudentNotice({
        studentProfileIds: [student._id || student.id],
        title: messageData.subject || "Important Notice from Principal",
        content: messageData.message,
        type: 'general'
      });
      toast.success("Message sent successfully!");
      setShowEmailModal(false);
      setMessageData({ subject: "", message: "" });
    } catch (err) {
      console.error("Send message error:", err);
      console.error("Response data:", err.response?.data);
      console.error("Response status:", err.response?.status);
      toast.error(err.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleDownload = (url, name) => {
    if (!url) return toast.error("File not available");
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.setAttribute('download', name || 'document');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadMarksheetPDF = (mark) => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Student Marksheet", 105, 20, { align: "center" });

      doc.setFontSize(12);
      doc.text(`Student Name: ${student.user?.name || "N/A"}`, 14, 40);
      doc.text(`Admission No: ${student.enrollmentNo || student.rollNo || "N/A"}`, 14, 50);
      doc.text(`Class: ${student.class?.name || student.class || "N/A"}`, 14, 60);

      doc.text(`Exam: ${mark.examStructure?.examName || 'N/A'}`, 120, 40);
      doc.text(`Academic Year: ${mark.examSchedule?.academicYear || 'N/A'}`, 120, 50);

      const tableColumn = ["Subject", "Max Marks", "Passing Marks", "Marks Obtained", "Result"];
      const tableRows = [];

      (mark.subjectMarks || []).forEach(sub => {
        tableRows.push([
          sub.subject?.name || sub.subject || "Unknown",
          sub.maxMarks,
          sub.passingMarks,
          sub.totalMarks || sub.theoryMarks || 0,
          sub.isPass ? "PASS" : "FAIL"
        ]);
      });

      doc.autoTable({
        startY: 70,
        head: [tableColumn],
        body: tableRows,
      });

      const finalY = doc.lastAutoTable.finalY || 70;
      doc.text(`Total Marks: ${mark.totalMarksObtained} / ${mark.totalMaxMarks}`, 14, finalY + 15);
      doc.text(`Percentage: ${mark.percentage}%`, 14, finalY + 25);
      doc.text(`Final Result: ${mark.isPass ? "PASSED" : "FAILED"}`, 14, finalY + 35);

      doc.save(`${student.user?.name || "Student"}_${mark.examStructure?.examName || "Exam"}_Marksheet.pdf`);
      toast.success("Marksheet downloaded successfully!");
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate Marksheet PDF");
    }
  };

  const studentId = student._id;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const calculateAge = (dobString) => {
    if (!dobString) return 'N/A';
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let res;
        switch (activeTab) {
          case 'overview':
            res = await getGuardianInfo(studentId);
            if (res.success) setExtraData(prev => ({ ...prev, guardian: res.data }));
            break;
          case 'attendance':
            res = await getStudentAttendance(studentId);
            if (res.success) setExtraData(prev => ({ ...prev, attendance: res.data }));
            break;
          case 'academic':
            res = await getStudentPerformance(studentId);
            if (res.success) setExtraData(prev => ({ ...prev, performance: res.data }));
            break;
          case 'documents':
            res = await getStudentDocuments(studentId);
            if (res.success) setExtraData(prev => ({ ...prev, documents: res.data }));
            break;
          case 'communication':
            res = await getCommunicationHistory(studentId);
            if (res.success) setExtraData(prev => ({ ...prev, communication: res.data }));
            break;
        }
      } catch (error) {
        console.error(`Error fetching ${activeTab} data:`, error);
        toast.error(`Failed to load ${activeTab} data`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, studentId]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'academic', label: 'Academic', icon: BookOpen },
    { id: 'attendance', label: 'Attendance', icon: ClipboardList },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'communication', label: 'History', icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header Profile */}
      <ModalProfile
        name={student.user?.name || "Unknown"}
        subtitle={`${student.enrollmentNo || student.rollNo || 'N/A'} · Class ${student.class?.name || student.class}`}
        meta={`Status: ${student.status || 'Active'}`}
        photoUrl={student.user?.photo}
      />

      {/* Tabs Navigation */}
      <div className="flex border-b overflow-x-auto no-scrollbar pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all whitespace-nowrap rounded-lg ${activeTab === tab.id
                ? 'bg-[#223F74] text-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="relative min-h-[300px]">
        {loading && (
          <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#223F74]" />
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <ModalGrid title="Basic Information" cols={2}>
              <ModalData label="Gender" value={student.gender || 'N/A'} />
              <ModalData label="Blood Group" value={student.bloodGroup || 'N/A'} />
              <ModalData label="Date of Birth" value={formatDate(student.dob)} />
              <ModalData label="Age" value={student.dob ? `${calculateAge(student.dob)} Years` : 'N/A'} />
            </ModalGrid>

            {extraData.guardian ? (
              <ModalGrid title="Guardian Details" cols={2}>
                <ModalData label="Primary Contact" value={extraData.guardian.user?.name || extraData.guardian.fullName || 'N/A'} />
                <ModalData label="Phone" value={extraData.guardian.primaryContact || 'N/A'} />
                <ModalData label="Email" value={extraData.guardian.user?.email || extraData.guardian.email || 'N/A'} />
              </ModalGrid>
            ) : student.parent ? (
              <ModalGrid title="Parent Details" cols={2}>
                <ModalData label="Father's Name" value={student.parent.fatherName || 'N/A'} />
                <ModalData label="Mother's Name" value={student.parent.motherName || 'N/A'} />
                <ModalData label="Phone" value={student.parent.primaryContact || student.user?.phone || 'N/A'} />
                <ModalData label="Email" value={student.parent.email || student.user?.email || 'N/A'} />
              </ModalGrid>
            ) : (
              <p className="text-gray-400 italic text-sm mt-4">No guardian info linked.</p>
            )}
          </div>
        )}

        {/* Keeping other tabs consistent but slightly cleaned up */}
        {activeTab === 'academic' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Marksheet History</h4>
            {(extraData.performance || []).length > 0 ? (extraData.performance || []).map((mark, idx) => (
              <div key={idx} className="border border-gray-100 p-4 rounded-xl hover:shadow-md transition-shadow bg-gray-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800">{mark.examStructure?.examName}</p>
                    <p className="text-xs text-gray-500">{mark.examSchedule?.academicYear}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-600">{mark.percentage}%</p>
                    <p className={`text-[10px] font-bold uppercase ${mark.isPass ? 'text-green-600' : 'text-red-600'}`}>
                      {mark.isPass ? 'Passed' : 'Failed'}
                    </p>
                  </div>
                </div>
                <Button
                  text="Download Marksheet"
                  variant="secondary"
                  size={12}
                  className="mt-4"
                  onClick={() => handleDownloadMarksheetPDF(mark)}
                />
              </div>
            )) : (
              <div className="text-center py-10 opacity-50">
                <ClipboardList size={40} className="mx-auto mb-2" />
                <p>No academic records found.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Recent Attendance</h4>
            <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center mb-4">
              <div>
                <p className="text-xs text-gray-500">Overall Percentage</p>
                <p className="text-2xl font-black text-gray-800">
                  {(() => {
                    const total = (extraData.attendance || []).length;
                    const present = (extraData.attendance || []).filter(r => r.status === 'present').length;
                    return total ? `${Math.round((present / total) * 100)}%` : 'N/A';
                  })()}
                </p>
              </div>
              <div className="flex gap-2">
                {(extraData.attendance || []).slice(0, 10).map((rec, i) => (
                  <div key={i} className={`w-2 h-10 rounded-full ${rec.status === 'present' ? 'bg-green-500' : 'bg-red-400'}`} />
                ))}
                {!(extraData.attendance || []).length && (
                  <span className="text-xs text-gray-400">No data</span>
                )}
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {(extraData.attendance || []).length > 0 ? (extraData.attendance || []).map((rec, idx) => (
                <div key={idx} className="py-3 flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-medium">{formatDate(rec.date)}</span>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${rec.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {rec.status}
                  </span>
                </div>
              )) : (
                <div className="text-center py-10 opacity-50">
                  <Calendar size={40} className="mx-auto mb-2" />
                  <p>No attendance logs found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 gap-3">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Student Dossier</h4>
            {Object.keys(extraData.documents || {}).length > 0 ? Object.entries(extraData.documents || {}).map(([type, url]) => (
              <div key={type} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg border border-gray-100 flex items-center justify-center text-red-500">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 capitalize">{type.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-[10px] text-gray-500">Verified Document</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(url, type)}
                  className="p-2 hover:bg-white rounded-lg transition-colors text-blue-600"
                >
                  <Download size={18} />
                </button>
              </div>
            )) : (
              <div className="text-center py-10 opacity-50">
                <FileText size={40} className="mx-auto mb-2" />
                <p>No documents uploaded.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'communication' && (
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Communication Log</h4>
            <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
              {(extraData.communication || []).length > 0 ? (extraData.communication || []).map((item, idx) => (
                <div key={idx} className="relative">
                  <div className="absolute -left-[21px] top-1 w-4 h-4 bg-[#223F74] rounded-full border-4 border-white ring-1 ring-[#223F74]/30" />
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{formatDate(item.createdAt)}</p>
                    <h5 className="text-sm font-bold text-gray-800">{item.title}</h5>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.content}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">
                      {item.category || item.type || "Notice"}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 opacity-50 -ml-6">
                  <History size={40} className="mx-auto mb-2" />
                  <p>No communication history.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Email/Message Modal overlay */}
      {showEmailModal && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 rounded-[24px]">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-[#223F74] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2 uppercase text-xs tracking-widest">
                <Mail size={16} /> Send Message
              </h3>
              <button onClick={() => setShowEmailModal(false)} className="text-white/60 hover:text-white transition">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Subject..."
                className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#223F74]"
                value={messageData.subject}
                onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
              />
              <textarea
                rows={5}
                placeholder="Type your message..."
                className="w-full p-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#223F74] resize-none"
                value={messageData.message}
                onChange={(e) => setMessageData({ ...messageData, message: e.target.value })}
              />
              <Button
                text={sending ? "Sending..." : "Send Message"}
                icon={sending ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
                variant="primary"
                onClick={handleSendMessage}
                disabled={sending}
                size={12}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          text="Message"
          icon={<Mail size={16} />}
          variant="ghost"
          onClick={() => setShowEmailModal(true)}
        />
      </div>
    </div>
  );
};

export default StudentDetailsDrawer;