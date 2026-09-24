import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Search,
  CheckCircle2,
  Clock,
  Printer,
  ArrowRightLeft,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Download,
  History,
  FileText,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── PDF GENERATION LIBRARIES ───
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// ─── API IMPORTS ───
import { searchStudents } from "../../../services/api/principalStudentApi";
import {
  transferStudent,
  getAllTransferRequests,
  getAllTCs,
  getTCData,
} from "../../../services/api/principalAdmissionApi";

// ─── COMMON COMPONENTS ───
import {
  Heading,
  EnhancedDashCard,
  DashGrid,
  DataTable,
  Modal,
  openModal,
  closeModal,
  DataField,
  Button,
  Option,
  SelectField,
  Grid,
} from "../../../components/shared/Common_Components";

const Transfer = () => {
  console.log("PRINCIPAL TRANSFER PAGE RENDERED");
  const [activeTab, setActiveTab] = useState("requests");
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transferRequests, setTransferRequests] = useState([]);
  const [tcHistory, setTcHistory] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [transferLoading, setTransferLoading] = useState(false);

  const [viewingTC, setViewingTC] = useState(null);
  const [downloadTC, setDownloadTC] = useState(null);
  const [loadingAction, setLoadingAction] = useState({ id: null, type: null });

  // Form State
  const [formData, setFormData] = useState({
    transferDate: new Date().toISOString().split("T")[0],
    reason: "",
    destinationSchool: "",
    lastAttendedDate: new Date().toISOString().split("T")[0],
    conduct: "Good",
    characterCertificate: true,
  });

  // Handle cross-page navigation (e.g. clicking "View TC" from the Students List)
  useEffect(() => {
    if (location.state?.studentId) {
      if (location.state?.activeTab === "history") {
        setActiveTab("history");
      } else {
        setActiveTab("search");
        setSearchTerm(location.state.studentId);
        const autoSearch = async () => {
          try {
            setLoading(true);
            const res = await searchStudents(location.state.studentId);
            setStudents(res.data || []);
          } catch (err) {
            toast.error("Auto-search failed");
          } finally {
            setLoading(false);
          }
        };
        autoSearch();
      }
    }
  }, [location]);

  // Load Tab Data
  useEffect(() => {
    if (activeTab === "requests") fetchRequests();
    if (activeTab === "history") fetchHistory();
  }, [activeTab]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await getAllTransferRequests();
      setTransferRequests(res.data || []);
    } catch (err) {
      toast.error("Failed to load transfer requests");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await getAllTCs();
      setTcHistory(res.data || []);
    } catch (err) {
      toast.error("Failed to load TC history");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    try {
      setLoading(true);
      const res = await searchStudents(searchTerm);
      setStudents(res.data || []);
    } catch (err) {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateTransfer = (stu) => {
    setSelectedStudent(stu);
    openModal("transfer-modal");
  };

  const handleProcessTransfer = async () => {
    if (!formData.reason || !formData.destinationSchool) {
      return toast.error("Please fill all required fields");
    }

    try {
      setTransferLoading(true);
      await transferStudent(selectedStudent._id, formData);
      toast.success("Transfer processed & TC generated!");

      closeModal("transfer-modal");
      setActiveTab("history");
      setStudents([]);
      setSearchTerm("");

      setFormData({
        transferDate: new Date().toISOString().split("T")[0],
        reason: "",
        destinationSchool: "",
        lastAttendedDate: new Date().toISOString().split("T")[0],
        conduct: "Good",
        characterCertificate: true,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  };

  // ─── TC Preview (Eye Icon) ───
  const handlePreviewTC = async (tc) => {
    // 1. Open modal immediately for instant feedback
    setViewingTC(tc);
    openModal("tc-preview-modal");

    // 2. Fetch full live data asynchronously in the background
    try {
      const studentId = tc.student?._id || tc.student;
      const res = await getTCData(studentId);
      const merged = {
        ...tc,
        ...res.data,
        student: {
          ...(typeof tc.student === "object" ? tc.student : {}),
          ...(res.data?.student || {}),
        },
      };
      // Update the modal with rich data once available
      setViewingTC(merged);
    } catch (err) {
      console.error("Error fetching full TC data:", err);
      // Silent fail, keep showing the cached base `tc` data
    }
  };

  // ─── Client-Side PDF Generation (jsPDF + html2canvas) ───
  const handleDownloadTC = async (tc) => {
    setLoadingAction({ id: tc._id, type: "download" });
    const toastId = toast.loading("Generating PDF...");

    try {
      const studentId = tc.student?._id || tc.student;
      const res = await getTCData(studentId);

      const merged = {
        ...tc,
        ...res.data,
        student: {
          ...(typeof tc.student === "object" ? tc.student : {}),
          ...(res.data?.student || {}),
        },
      };
      setDownloadTC(merged);

      setTimeout(async () => {
        try {
          const element = document.getElementById("tc-document-download");
          if (!element) throw new Error("TC Document element not found in DOM");

          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
          });

          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();

          let imgWidth = pageWidth;
          let imgHeight = (canvas.height * imgWidth) / canvas.width;

          // If image height exceeds page height, scale down to fit
          if (imgHeight > pageHeight) {
            imgHeight = pageHeight;
            imgWidth = (canvas.width * imgHeight) / canvas.height;
          }

          // Center the certificate on the A4 page
          const xOffset = (pageWidth - imgWidth) / 2;
          const yOffset = (pageHeight - imgHeight) / 2;

          pdf.addImage(imgData, "PNG", xOffset, yOffset, imgWidth, imgHeight);
          pdf.save(`TC_${tc.tcNumber || "Document"}.pdf`);

          toast.success("PDF Downloaded Successfully!", { id: toastId });
        } catch (pdfError) {
          console.error("PDF Generation Error:", pdfError);
          toast.error("Failed to generate PDF.", { id: toastId });
        } finally {
          setDownloadTC(null);
          setLoadingAction({ id: null, type: null });
        }
      }, 300);
    } catch (error) {
      console.error("TC Data Fetch Error:", error);
      toast.error("Failed to prepare TC data.", { id: toastId });
      setDownloadTC(null);
      setLoadingAction({ id: null, type: null });
    }
  };

  // ─── Table Mappings & Columns ───
  const requestColumns = [
    { key: "studentName", label: "Student Name" },
    { key: "admissionNo", label: "Admission Number" },
    { key: "class", label: "Class" },
    { key: "section", label: "Section" },
    { key: "transferType", label: "Transfer Type" },
    { key: "reason", label: "Reason" },
    { key: "requestedBy", label: "Requested By" },
  ];

  const mappedRequests = transferRequests.map((req) => ({
    ...req,
    studentName: req.student?.user?.name || "—",
    admissionNo: req.student?.enrollmentNo || "—",
    class: req.student?.class?.name || "—",
    section: req.student?.section?.name || "A",
    transferType: "Outgoing",
    reason: req.reason || "—",
    requestedBy: req.requestedBy || "—",
  }));

  const requestActions = [
    {
      icon: <ArrowRightLeft size={14} />,
      tooltip: "Process Transfer / Issue TC",
      variant: "primary",
      onClick: (row) => handleInitiateTransfer(row.student),
    },
  ];

  const searchColumns = [
    { key: "studentName", label: "Student Name" },
    { key: "admissionNo", label: "Admission Number" },
    { key: "class", label: "Class" },
    { key: "section", label: "Section" },
    { key: "rollNo", label: "Roll No" },
  ];

  const mappedSearchStudents = students.map((stu) => ({
    ...stu,
    studentName: stu.user?.name || "—",
    photoUrl: stu.user?.photo || null,
    admissionNo: stu.enrollmentNo || "—",
    class: stu.class?.name || "—",
    section: stu.section?.name || "A",
    rollNo: stu.rollNo || "—",
  }));

  const searchActions = [
    {
      label: "Issue TC",
      variant: "primary",
      onClick: (row) => handleInitiateTransfer(row),
    },
  ];

  const historyColumns = [
    {
      key: "tcNumber",
      label: "TC Number",
      render: (v) => <span className="font-mono font-black text-[#223F74] text-sm">{v}</span>,
    },
    { key: "studentName", label: "Student" },
    { key: "destinationSchool", label: "Destination" },
    { key: "issueDateDisplay", label: "Issue Date" },
  ];

  const mappedHistory = tcHistory.map((tc) => ({
    ...tc,
    studentName: tc.student?.user?.name || tc.student?.fullName || "—",
    photoUrl: tc.student?.user?.photo || null,
    destinationSchool: tc.destinationSchool || "N/A",
    issueDateDisplay: new Date(tc.issueDate || tc.createdAt || tc.transferDate).toLocaleDateString(),
  }));

  const historyActions = [
    {
      icon: <Eye size={14} />,
      tooltip: "Preview TC",
      variant: "ghost",
      loading: (row) => loadingAction.id === row._id && loadingAction.type === "preview",
      disabled: (row) => loadingAction.id === row._id,
      onClick: (row) => handlePreviewTC(row),
    },
    {
      icon: <Download size={14} />,
      tooltip: "Download TC PDF",
      variant: "ghost",
      loading: (row) => loadingAction.id === row._id && loadingAction.type === "download",
      disabled: (row) => loadingAction.id === row._id,
      onClick: (row) => handleDownloadTC(row),
    },
  ];

  const renderTCDocument = (tcData, targetId) => {
    if (!tcData) return null;
    const logoUrl = tcData.school?.organization?.organizationLogo || tcData.school?.logoUrl || tcData.school?.logo;
    const schoolName = tcData.school?.organization?.organizationName || tcData.school?.schoolName || tcData.school?.name || "School Name";
    const schoolAddress = tcData.school?.address || "";
    const contactInfo = [tcData.school?.officialPhone, tcData.school?.officialEmail, tcData.school?.website].filter(Boolean).join(" | ");

    return (
      <div
        id={targetId}
        className="border-[12px] border-double border-blue-900 p-12 w-full max-w-[210mm] min-h-[280mm] flex flex-col justify-between items-center bg-white text-left shadow-sm"
        style={{ boxSizing: "border-box" }}
      >
        {/* Header */}
        <div className="w-full flex flex-col items-center border-b-2 border-blue-900/10 pb-6 mb-8 text-center">
          {logoUrl ? (
            <img src={logoUrl} alt="Organization Logo" className="w-20 h-20 object-contain mb-3" />
          ) : (
            <div className="w-20 h-20 bg-blue-900 rounded-2xl mb-3 flex items-center justify-center text-white font-black text-2xl italic shadow-sm">
              {schoolName.substring(0, 1)}
            </div>
          )}
          <h1 className="text-3xl font-extrabold text-blue-950 uppercase tracking-tight">
            {schoolName}
          </h1>
          {schoolAddress && (
            <p className="text-xs text-gray-500 font-medium uppercase mt-1">
              {schoolAddress}
            </p>
          )}
          {contactInfo && (
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              {contactInfo}
            </p>
          )}
          <div className="mt-6 flex flex-col items-center">
            <h2 className="text-2xl font-black text-blue-900 tracking-tighter uppercase">
              Transfer Certificate
            </h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
              (Migration / School Leaving Certificate)
            </p>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="w-full grid grid-cols-2 gap-y-6 text-sm">
          {/* Metadata Block */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
              TC Number
            </span>
            <span className="text-xl font-mono font-black text-blue-700">
              {tcData.tcNumber}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 text-right">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
              Issue Date
            </span>
            <span className="text-base font-bold text-gray-800">
              {new Date(
                tcData.issueDate ||
                  tcData.transferDate ||
                  tcData.createdAt,
              ).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Details Grid */}
          <div className="col-span-2 border border-gray-150 rounded-3xl overflow-hidden bg-slate-50/50 p-6 grid grid-cols-2 gap-x-8 gap-y-5">
            <div className="flex flex-col gap-1 border-b border-gray-150/40 pb-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                Student Name
              </span>
              <span className="text-base font-black text-gray-800 uppercase">
                {tcData.student?.user?.name || tcData.student?.fullName || "—"}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-b border-gray-150/40 pb-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                Admission No
              </span>
              <span className="text-base font-black text-gray-750">
                {tcData.student?.enrollmentNo || "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 border-b border-gray-150/40 pb-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                Class
              </span>
              <span className="text-base font-bold text-gray-750 uppercase">
                {tcData.student?.class?.name || "—"}{tcData.student?.section?.name ? ` - ${tcData.student.section.name}` : ""}
              </span>
            </div>
            <div className="flex flex-col gap-1 border-b border-gray-150/40 pb-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                Date of Leaving
              </span>
              <span className="text-base font-bold text-gray-750">
                {new Date(tcData.transferDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="flex flex-col gap-1 border-b border-gray-150/40 pb-2 col-span-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                Reason for Leaving
              </span>
              <span className="text-base font-bold text-gray-750">
                {tcData.reason}
              </span>
            </div>

            <div className="flex flex-col gap-1 border-b border-gray-150/40 pb-2 col-span-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                Destination School
              </span>
              <span className="text-base font-bold text-gray-750">
                {tcData.destinationSchool || "—"}
              </span>
            </div>

            <div className="flex flex-col gap-1 col-span-2">
              <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">
                General Conduct
              </span>
              <span className="text-base font-bold text-green-700 uppercase">
                {tcData.conduct || "GOOD"}
              </span>
            </div>
          </div>

          {/* Legal Certification text */}
          <div className="col-span-2 pt-4">
            <p className="text-xs font-medium text-gray-600 leading-relaxed text-justify italic">
              Certified that the above mentioned student has been a
              student of this institution until{" "}
              <b>
                {new Date(
                  tcData.lastAttendedDate,
                ).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </b>
              . All dues to the school have been cleared. His/Her
              character is found to be <b>{tcData.conduct || "Good"}</b> during
              the period of stay. The student is now transferring to{" "}
              <b>
                {tcData.destinationSchool || "Another Institution"}
              </b>{" "}
              for further studies.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full grid grid-cols-3 gap-6 pt-12 mt-auto">
          <div className="text-center flex flex-col justify-end items-center h-20 border-t-2 border-gray-200/60 pt-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
              Class Teacher Signature
            </p>
          </div>
          <div className="text-center flex flex-col justify-end items-center h-20 pt-4">
            <ShieldCheck
              size={36}
              className="text-blue-900/20 mb-2"
            />
            <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.4em]">
              School Seal
            </p>
          </div>
          <div className="text-center flex flex-col justify-end items-center h-20 border-t-2 border-gray-200/60 pt-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
              Principal Signature
            </p>
          </div>
        </div>

        <p className="mt-12 text-[7px] font-bold text-gray-300 uppercase tracking-widest text-center w-full">
          Digital Certificate Issued by{" "}
          {tcData.issuedBy?.name || "Administrator"} • School Management System ERP
        </p>
      </div>
    );
  };

  console.log("selectedTC:", selectedStudent);
  console.log("previewTC:", viewingTC);
  console.log("certificateData:", viewingTC);
  console.log("tcDetails:", viewingTC);

  return (
    <div className="w-full space-y-6 text-left">
      {/* Heading */}
      <Heading
        primaryText="Transfer & TC"
        secondaryText="Hub"
        size={12}
        showAnimations={true}
      />

      {/* KPI Stats Cards */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Pending Requests"
          value={String(transferRequests.length)}
          icon={<Clock size={20} />}
          accentColor="#E0A04B"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Transfers Completed"
          value={String(tcHistory.length)}
          icon={<CheckCircle2 size={20} />}
          accentColor="#5B9A6A"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="TC Generated"
          value={String(tcHistory.length)}
          icon={<FileText size={20} />}
          accentColor="#7A8FC6"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Rejected Requests"
          value="0"
          icon={<AlertCircle size={20} />}
          accentColor="#D66B5F"
          size={3}
          showAnimations
        />
      </DashGrid>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 bg-gray-100 p-1.5 rounded-[2rem] w-fit shadow-inner">
        {[
          { id: "requests", label: "Pending Requests", icon: Clock },
          { id: "search", label: "New Transfer", icon: Search },
          { id: "history", label: "TC History", icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-8 py-3.5 rounded-full font-black text-xs uppercase tracking-tighter transition-all ${
              activeTab === tab.id
                ? "bg-white text-[#223F74] shadow-xl scale-105"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {/* TAB 1: PENDING REQUESTS */}
        {activeTab === "requests" && (
          loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-[#223F74]" size={40} />
            </div>
          ) : (
            <DataTable
              title="Pending Transfer Requests"
              columns={requestColumns}
              rows={mappedRequests}
              actions={requestActions}
              pageSize={5}
              size={12}
              searchable={true}
            />
          )
        )}

        {/* TAB 2: NEW TRANSFER SEARCH */}
        {activeTab === "search" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
              <form onSubmit={handleSearch}>
                <Grid cols={12} gap={4} className="items-end">
                  <DataField
                    label="Search Student"
                    id="search-input"
                    placeholder="Search Student to Transfer (Name/Roll No)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={Search}
                    size={10}
                  />
                  <div className="col-span-12 sm:col-span-2">
                    <Button
                      text="SEARCH"
                      type="submit"
                      variant="primary"
                      size={12}
                    />
                  </div>
                </Grid>
              </form>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="animate-spin text-[#223F74]" size={40} />
              </div>
            ) : students.length > 0 ? (
              <DataTable
                title="Search Results"
                columns={searchColumns}
                rows={mappedSearchStudents}
                actions={searchActions}
                pageSize={5}
                size={12}
                userProfile="studentName"
              />
            ) : searchTerm && (
              <div className="py-20 text-center bg-white rounded-[3rem] border border-gray-100">
                <Search size={64} className="mx-auto text-gray-200 mb-4" />
                <h3 className="text-xl font-black text-gray-400 uppercase tracking-tighter">
                  No Students Found
                </h3>
                <p className="text-gray-400 font-medium">
                  Try searching with another name or roll number
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TC HISTORY */}
        {activeTab === "history" && (
          loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-[#223F74]" size={40} />
            </div>
          ) : (
            <DataTable
              title="Transfer Certificate History"
              columns={historyColumns}
              rows={mappedHistory}
              actions={historyActions}
              pageSize={5}
              size={12}
              searchable={true}
              userProfile="studentName"
            />
          )
        )}
      </div>

      {/* --- MODAL: TRANSFER WORKFLOW --- */}
      <Modal id="transfer-modal" title="Issue Transfer Certificate" size="md">
        <div className="space-y-6 text-left">
          <div className="grid grid-cols-2 gap-6">
            <DataField
              label="Transfer Date"
              id="transfer-date"
              type="date"
              value={formData.transferDate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  transferDate: e.target.value,
                })
              }
              size={6}
            />
            <DataField
              label="Last Attended"
              id="last-attended"
              type="date"
              value={formData.lastAttendedDate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lastAttendedDate: e.target.value,
                })
              }
              size={6}
            />
          </div>

          <SelectField
            label="Reason for Transfer"
            id="transfer-reason"
            placeholder="Select Reason..."
            searchable={false}
            value={formData.reason}
            onChange={(e) =>
              setFormData({ ...formData, reason: e.target.value })
            }
            size={12}
          >
            <Option value="Relocation" label="Parent's Relocation" />
            <Option value="Higher Education" label="Higher Education" />
            <Option value="Personal" label="Personal Grounds" />
            <Option value="Course Completion" label="Course Completion" />
            <Option value="Other" label="Other" />
          </SelectField>

          <DataField
            label="Destination School / Institution"
            id="destination-school"
            placeholder="e.g. Cambridge International School"
            value={formData.destinationSchool}
            onChange={(e) =>
              setFormData({
                ...formData,
                destinationSchool: e.target.value,
              })
            }
            size={12}
          />

          <div className="bg-red-50 p-4 rounded-2xl flex gap-3 border border-red-100">
            <AlertCircle
              className="text-red-600 flex-shrink-0"
              size={20}
            />
            <p className="text-[10px] font-black text-red-700 leading-normal uppercase">
              WARNING: Processing this transfer will permanently
              deactivate the student profile and generate a legal TC
              document.
            </p>
          </div>

          <Button
            text="FINALIZE & ISSUE TC"
            onClick={handleProcessTransfer}
            loading={transferLoading}
            variant="primary"
            size={12}
          />
        </div>
      </Modal>

      {/* --- MODAL: TC PREVIEW / PRINT --- */}
      {viewingTC && (
        <Modal id="tc-preview-modal" title="Transfer Certificate Preview" size="xl">
          <div className="flex flex-col items-center">
            {/* TC Document Content - Targeted by html2canvas */}
            {renderTCDocument(viewingTC, "tc-document")}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 w-full justify-end print:hidden">
              <Button
                text="CLOSE"
                variant="secondary"
                onClick={() => closeModal("tc-preview-modal")}
                size={4}
              />
              <Button
                text="DOWNLOAD PDF"
                variant="success"
                icon={<Download size={14} />}
                onClick={() => handleDownloadTC(viewingTC)}
                size={4}
              />
              <Button
                text="PRINT TC"
                variant="primary"
                icon={<Printer size={14} />}
                onClick={() => window.print()}
                size={4}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Hidden container for background PDF capture */}
      {downloadTC && (
        <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "210mm", zIndex: -1 }}>
          {renderTCDocument(downloadTC, "tc-document-download")}
        </div>
      )}
    </div>
  );
};

export default Transfer;
