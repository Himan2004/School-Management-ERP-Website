import React, { useState } from "react";
import {
  Mail, Phone, User, FileText, Send, X
} from "lucide-react";
import { sendAdmissionEmail } from "../../services/api/principalAdmissionApi";
import { Button, ModalGrid, ModalData, DataField, PanelModal } from "../shared/Common_Components";
import toast from "react-hot-toast";

const tabItems = ["profile", "family", "academics", "documents"];

const normalizeDocuments = (docsObj) => {
  if (!docsObj) return [];
  return Object.entries(docsObj)
    .filter(([_, val]) => val && val.url)
    .map(([key, val]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      fileName: val.url.split("/").pop() || `${key}.pdf`,
      status: val.status || 'submitted',
      remarks: val.remarks || '',
      url: val.url,
    }));
};

const statusStyles = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  under_review: "bg-sky-100 text-sky-800",
  review: "bg-sky-100 text-sky-800",
  cancelled: "bg-slate-100 text-slate-800",
};

const StudentAdmissionDetailsModal = ({
  request, onClose, onApprove, onReject, actionLoadingId,
}) => {
  const [activeTab, setActiveTab] = useState("profile");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailData, setEmailData] = useState({ subject: "", message: "" });
  const [sendingEmail, setSendingEmail] = useState(false);

  // Dynamic student selection
  const rawStudents = request && Array.isArray(request.rawStudents) ? request.rawStudents : [];
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(request?.studentIndex || 0);

  // Sync selectedStudentIndex if request changes
  const [prevRequestId, setPrevRequestId] = useState(request?._id);
  if (request && request._id !== prevRequestId) {
    setPrevRequestId(request._id);
    setSelectedStudentIndex(request.studentIndex || 0);
  }

  if (!request) return null;

  // Resolve active student details
  const activeStudent = rawStudents[selectedStudentIndex] || {};

  const student = {
    fullName: activeStudent.fullName || request.student?.fullName || "Unnamed",
    dob: activeStudent.dob ? new Date(activeStudent.dob).toLocaleDateString('en-IN') : (request.student?.dob || ""),
    gender: activeStudent.gender || request.student?.gender || "",
    bloodGroup: activeStudent.bloodGroup || request.student?.bloodGroup || "",
    aadhaar: request.parent?.aadharNumber || request.student?.aadhaar || "",
    previousSchool: activeStudent.previousSchool || request.student?.previousSchool || "",
    photo: activeStudent.photo || request.student?.photo || null,
  };

  const academic = {
    appliedClass: activeStudent.class?.name || activeStudent.class || request.academic?.appliedClass || "",
    preferredSection: activeStudent.section || request.academic?.preferredSection || "",
    academicYear: activeStudent.academicYear || request.academic?.academicYear || "",
    rollNumber: activeStudent.rollNumber || request.academic?.rollNumber || "",
    transportRequired: activeStudent.transport?.required ? "Yes" : (activeStudent.transportRequired || request.academic?.transportRequired || "No"),
    busRoute: activeStudent.transport?.busRoute || request.academic?.busRoute || "",
    healthNotes: activeStudent.healthNotes || request.academic?.healthNotes || "",
  };

  const documents = activeStudent.documents ? normalizeDocuments(activeStudent.documents) : (request.documents || []);

  const handleSendEmail = async () => {
    if (!emailData.message.trim()) return toast.error("Please enter a message");
    try {
      setSendingEmail(true);
      const res = await sendAdmissionEmail(request.admissionRequestId || request._id, emailData.subject, emailData.message);
      if (res.success) {
        toast.success("Email sent successfully!");
        setShowEmailForm(false);
        setEmailData({ subject: "", message: "" });
      }
    } catch (err) {
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <PanelModal
      id="student-admission-details-modal"
      title="Student Admission Profile"
      isVisible={true}
      onClose={onClose}
      size="4xl"
    >
      <div className="space-y-6">

        {/* Email Composition Modal Overlay */}
        {showEmailForm && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 rounded-[24px]">
            <div className="w-full max-w-lg bg-white rounded-[24px] shadow-2xl overflow-hidden border border-[#E7E2DB] flex flex-col">
              <div className="bg-[#223F74] px-6 py-4 flex items-center justify-between">
                <h3 className="text-white font-bold flex items-center gap-2 uppercase text-xs tracking-widest">
                  <Mail size={16} /> Compose Email
                </h3>
                <button
                  onClick={() => setShowEmailForm(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-rose-500 transition-colors border border-transparent hover:border-rose-400"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4 text-left">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Recipient</label>
                  <div className="p-3.5 bg-slate-50 border border-[#E2E8F0] rounded-2xl text-sm font-bold text-[#223F74]">
                    {request.parent.fullName} ({request.contact.email})
                  </div>
                </div>

                <DataField
                  label="Subject"
                  id="email-subject"
                  placeholder="Enter subject (optional)..."
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                />

                <DataField
                  label="Message *"
                  id="email-message"
                  type="textarea"
                  rows={5}
                  placeholder="Type your message here..."
                  value={emailData.message}
                  onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                />

                <div className="pt-2">
                  <Button
                    text="Send Email"
                    variant="primary"
                    onClick={handleSendEmail}
                    loading={sendingEmail}
                    icon={<Send size={16} />}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Student Profile Info Header Card */}
        <div className="flex items-center gap-4 bg-[#223F74] p-6 rounded-2xl text-white">
          {/* Student Photo */}
          {student.photo ? (
            <img
              src={student.photo}
              alt={student.fullName}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 flex-shrink-0 shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 border-2 border-white/10">
              <User className="h-7 w-7 text-white/70" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold tracking-tight truncate">{student.fullName}</h2>
            <p className="text-xs text-slate-300 mt-0.5 truncate">{request.organizationName} — {request.branchName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-xl bg-white/10 border border-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">{request.applicationNo}</span>
              {academic.appliedClass && (
                <span className="rounded-xl bg-white/10 border border-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  Class {academic.appliedClass}
                  {academic.preferredSection && ` - ${academic.preferredSection}`}
                </span>
              )}
              <span className={`rounded-xl px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${statusStyles[request.status.toLowerCase()] || "bg-slate-200 text-slate-800"}`}>
                {request.status.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Student Switcher / Selector */}
        {rawStudents.length > 1 && (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <span className="block text-xs font-black uppercase tracking-wider text-slate-400">
                Application Students
              </span>
              <p className="text-sm font-bold text-[#223F74]">
                This application contains {rawStudents.length} students. Select a student to view details.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {rawStudents.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedStudentIndex(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-200 ${selectedStudentIndex === idx
                    ? "bg-[#223F74] text-white shadow-md border-transparent"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                    }`}
                >
                  {s.fullName || `Student ${idx + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200 gap-2 text-left">
          {tabItems.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-bold capitalize relative transition-all duration-200 border-b-2 -mb-[2px] ${isActive
                  ? "border-[#e8612c] text-[#223F74]"
                  : "border-transparent text-gray-500 hover:text-[#223F74]"
                  }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "profile" && (
            <div className="grid gap-6 md:grid-cols-2">
              <ModalGrid title="Personal Details" cols={2}>
                <ModalData label="Full Name" value={student.fullName} />
                <ModalData label="Gender" value={student.gender} />
                <ModalData label="Date of Birth" value={student.dob} />
                <ModalData label="Blood Group" value={student.bloodGroup} />
                <ModalData label="Aadhaar" value={student.aadhaar} />
                <ModalData label="Previous School" value={student.previousSchool} />
              </ModalGrid>
              <ModalGrid title="Contact Details" cols={1}>
                <ModalData label="Email" value={request.contact.email} />
                <ModalData label="Phone" value={request.contact.phone} />
                <ModalData label="City" value={request.contact.city} />
                <ModalData label="Full Address" value={request.contact.address} />
              </ModalGrid>
            </div>
          )}

          {activeTab === "family" && (
            <div className="grid gap-6 md:grid-cols-2">
              <ModalGrid title="Parent / Guardian Details" cols={2}>
                <ModalData label="Full Name" value={request.parent.fullName} />
                <ModalData label="Relation" value={request.parent.relation} />
                <ModalData label="Father Name" value={request.parent.fatherName || "N/A"} />
                <ModalData label="Mother Name" value={request.parent.motherName || "N/A"} />
                <ModalData label="Primary Phone" value={request.contact.phone} />
                <ModalData label="Alternate Phone" value={request.parent.guardianPhone} />

                <div className="sm:col-span-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">
                    Notifications
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {["sms", "email", "push"].map((type) => (
                      <span
                        key={type}
                        className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${request.parent.notifications?.[type]
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-500"
                          }`}
                      >
                        {type} {request.parent.notifications?.[type] ? "✓" : "✗"}
                      </span>
                    ))}
                  </div>
                </div>
              </ModalGrid>

              <ModalGrid title="Emergency Contact" cols={1}>
                <ModalData label="Name" value={request.parent.emergencyContact?.name || "N/A"} />
                <ModalData label="Relation" value={request.parent.emergencyContact?.relation || "N/A"} />
                <ModalData label="Phone Number" value={request.parent.emergencyContact?.phone || "N/A"} />
              </ModalGrid>
            </div>
          )}

          {activeTab === "academics" && (
            <div className="grid gap-6 md:grid-cols-2">
              <ModalGrid title="Academic Details" cols={2}>
                <ModalData label="Applied Class" value={academic.appliedClass ? `Class ${academic.appliedClass}` : "—"} />
                <ModalData label="Section" value={academic.preferredSection} />
                <ModalData label="Roll Number" value={academic.rollNumber} />
                <ModalData label="Academic Year" value={academic.academicYear} />
              </ModalGrid>
              <ModalGrid title="Transport & Health" cols={2}>
                <ModalData label="Transport Required" value={academic.transportRequired} />
                <ModalData label="Bus Route" value={academic.busRoute} />
                <ModalData label="Health Notes" value={academic.healthNotes} />
              </ModalGrid>
              {request.remarks && (
                <div className="md:col-span-2">
                  <ModalGrid title="Remarks" cols={1}>
                    <span className="text-[#223F74] font-medium bg-amber-50/50 p-3 rounded-xl block border border-amber-100">
                      {request.remarks}
                    </span>
                  </ModalGrid>
                </div>
              )}
            </div>
          )}

          {activeTab === "documents" && (
            <div className="bg-white p-6 rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] text-left">
              <h3 className="text-base font-bold text-[#223F74] mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                <FileText size={18} className="text-[#e8612c]" />
                Uploaded Documents
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(!documents || documents.length === 0) ? (
                  <div className="col-span-2 text-center py-12 text-gray-400">
                    <FileText size={48} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-bold text-sm">No Documents Available</p>
                    <p className="text-xs text-gray-400 mt-1">This profile does not contain any linked document files.</p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <div key={doc.fileName || doc.name} className="flex items-center justify-between p-4 rounded-[16px] bg-gray-50 border border-gray-100 hover:shadow-md transition gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-[#223F74] flex-shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{doc.name}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[200px]">{doc.fileName}</p>
                          {doc.status && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                              {doc.status}
                            </span>
                          )}
                          {doc.remarks && (
                            <p className="mt-1 text-[10px] italic text-slate-500 truncate max-w-[200px]">
                              Note: {doc.remarks}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="w-24 flex-shrink-0">
                        <Button
                          text="View"
                          variant="secondary"
                          onClick={() => window.open(doc.url, "_blank")}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
          <div className="w-full sm:w-32">
            <Button
              text="Close"
              variant="secondary"
              onClick={onClose}
            />
          </div>
          {(request.status === "pending" || request.status === "under_review") && onApprove && onReject && (
            <>
              <div className="w-full sm:w-36">
                <Button
                  text="Approve"
                  variant="success"
                  onClick={() => onApprove(request._id)}
                  loading={actionLoadingId === request._id}
                />
              </div>
              <div className="w-full sm:w-36">
                <Button
                  text="Reject"
                  variant="danger"
                  onClick={() => onReject(request._id)}
                  loading={actionLoadingId === request._id}
                />
              </div>
            </>
          )}
          {onApprove && (
            <div className="w-full sm:w-44">
              <Button
                text="Email Parent"
                variant="primary"
                onClick={() => setShowEmailForm(true)}
                icon={<Mail className="h-4 w-4" />}
              />
            </div>
          )}
          <div className="w-full sm:w-40">
            <Button
              text="Call Parent"
              variant="secondary"
              onClick={() => window.open(`tel:${request.contact.phone}`, "_blank")}
              icon={<Phone className="h-4 w-4" />}
            />
          </div>
        </div>
      </div>
    </PanelModal>
  );
};

export default StudentAdmissionDetailsModal;