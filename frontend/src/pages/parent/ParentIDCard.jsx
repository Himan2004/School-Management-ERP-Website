import React, { useEffect, useState, useRef } from "react";
import { 
  IdCard, Info, AlertCircle, Printer, Download, RefreshCw 
} from "lucide-react";
import {
  Heading, Button, PanelModal, Select, Option
} from "../../components/shared/Common_Components";
import Card from "../../components/Parent/Card";
import {
  getParentStudentIdCardApi,
  requestParentIdCardReissueApi,
} from "../../services/api/parentIdCardApi";
import api from "../../services/api";
import { toPng } from "html-to-image";
import toast from "react-hot-toast";
import IDCardPreview from "../../components/common/IDCard/IDCardPreview";

// Custom Loading Skeleton for only the content area to prevent layout shift
const ParentIDCardContentSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-pulse w-full">
    {/* Left Column: Preview Box Skeleton */}
    <div className="flex flex-col items-center p-6 bg-slate-50 border border-slate-200/60 rounded-3xl shadow-inner h-[410px] justify-center">
      <div className="h-8 w-44 bg-slate-200 rounded-xl mb-6"></div>
      <div className="w-[340px] h-[220px] bg-slate-200 rounded-[20px] mb-6"></div>
      <div className="flex gap-3 w-full max-w-[340px] sm:max-w-[380px]">
        <div className="flex-1 h-10 bg-slate-200 rounded-xl"></div>
        <div className="flex-1 h-10 bg-slate-200 rounded-xl"></div>
      </div>
    </div>
    
    {/* Right Column: Details & Guidelines Skeleton */}
    <div className="space-y-6">
      {/* Details Box Skeleton */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 h-[282px] flex flex-col justify-between">
        <div className="h-6 w-48 bg-slate-200 rounded-md"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-8 bg-slate-100 rounded-lg"></div>
          <div className="h-8 bg-slate-100 rounded-lg"></div>
          <div className="h-8 bg-slate-100 rounded-lg"></div>
          <div className="h-8 bg-slate-100 rounded-lg"></div>
        </div>
      </div>
      
      {/* Guidelines Box Skeleton */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 h-[190px] flex flex-col justify-between">
        <div className="h-6 w-36 bg-slate-200 rounded-md"></div>
        <div className="space-y-2 mt-2">
          <div className="h-3 bg-slate-200 rounded w-full"></div>
          <div className="h-3 bg-slate-200 rounded w-5/6"></div>
          <div className="h-3 bg-slate-200 rounded w-4/5"></div>
        </div>
      </div>
    </div>
  </div>
);

// Empty State Component
const IDCardEmptyState = () => (
  <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 shadow-sm text-center max-w-lg mx-auto my-12">
    <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
      <IdCard size={48} />
    </div>
    <h3 className="text-lg font-bold text-slate-800">No ID Card Available</h3>
    <p className="text-sm text-slate-500 mt-1 mb-6">
      Your student's ID card is currently pending generation. Please contact school administration to activate and print the identity card.
    </p>
    <Button 
      text="Refresh Status" 
      icon={<RefreshCw size={16} />} 
      variant="secondary"
      onClick={() => window.location.reload()} 
    />
  </div>
);

// Error State Component
const IDCardErrorState = ({ message, onRetry }) => (
  <div className="flex items-center justify-center min-h-[300px] w-full">
    <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center max-w-md shadow-sm w-full">
      <AlertCircle className="mx-auto mb-3 text-red-500 w-12 h-12" />
      <p className="font-bold text-red-700 text-lg mb-2">Unable to Load ID Card</p>
      <p className="text-sm text-slate-500 mb-6">{message}</p>
      <Button text="Retry" icon={<RefreshCw size={16} />} variant="danger" onClick={onRetry} />
    </div>
  </div>
);

export default function ParentIDCard() {
  const [activeStudentId, setActiveStudentId] = useState(
    () => localStorage.getItem("studentId") || ""
  );
  const [parentProfile, setParentProfile] = useState(null);
  const [cardData, setCardData] = useState(() => {
    const defaultId = localStorage.getItem("studentId") || "";
    if (defaultId) {
      const cached = sessionStorage.getItem(`parent_idcard_data_${defaultId}`);
      return cached ? JSON.parse(cached) : null;
    }
    return null;
  });
  const [cardSide, setCardSide] = useState("front");
  const [isLoading, setIsLoading] = useState(!cardData);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch Parent profile (to populate student list in switcher)
  const fetchParentProfile = async () => {
    try {
      const res = await api.get("/auth/parent/me");
      if (res.data?.success) {
        setParentProfile(res.data.data);
        if (res.data.data.students?.length > 0) {
          const storedId = localStorage.getItem("studentId");
          const hasChild = res.data.data.students.some(s => s._id === storedId);
          if (!storedId || !hasChild) {
            const defaultId = res.data.data.students[0]._id;
            localStorage.setItem("studentId", defaultId);
            setActiveStudentId(defaultId);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load parent profile switcher", err);
    }
  };

  // Fetch Student ID Card details
  const fetchIdCard = async (forceRefetch = false) => {
    if (!activeStudentId) return;

    const cacheKey = `parent_idcard_data_${activeStudentId}`;
    const cached = sessionStorage.getItem(cacheKey);

    // If cache hits, populate instantly and do a silent background update
    if (cached && !forceRefetch) {
      setCardData(JSON.parse(cached));
      setIsLoading(false);
      setError(null);
      
      getParentStudentIdCardApi()
        .then((response) => {
          if (response?.success && response.data?.cardDetails) {
            const freshData = response.data.cardDetails;
            sessionStorage.setItem(cacheKey, JSON.stringify(freshData));
            setCardData(freshData);
          }
        })
        .catch((err) => console.log("Background card fetch failed", err));
        
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getParentStudentIdCardApi();
      if (response?.success) {
        const freshData = response.data?.cardDetails || null;
        if (freshData) {
          sessionStorage.setItem(cacheKey, JSON.stringify(freshData));
        }
        setCardData(freshData);
      } else {
        setError(response?.message || "Failed to load ID card data.");
      }
    } catch (err) {
      setError(err?.message || "Failed to fetch student ID card record.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParentProfile();
  }, []);

  useEffect(() => {
    if (activeStudentId) {
      fetchIdCard(false);
    }
  }, [activeStudentId]);

  const activeStudent = parentProfile?.students?.find(
    (s) => s._id === activeStudentId
  );

  const handleStudentChange = (e) => {
    const newStudentId = e.target.value;
    localStorage.setItem("studentId", newStudentId);
    setActiveStudentId(newStudentId);
  };

  const getActiveCardElement = () => {
    const id = cardSide === "front" ? "front-card-inner" : "back-card-inner";
    return document.getElementById(id);
  };

  // High-Resolution PNG download
  const handleDownload = async () => {
    try {
      const cardElement = getActiveCardElement();
      if (!cardElement) {
        toast.error("Card view not ready for download");
        return;
      }

      toast.loading("Exporting high-resolution card...", { id: "export-toast" });

      const dataUrl = await toPng(cardElement, {
        cacheBust: true,
        pixelRatio: 3, // High-res PVC print standard
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `student-id-card-${cardSide}-${activeStudent?.name || "identity"}.png`;
      link.click();
      toast.success("ID card downloaded successfully", { id: "export-toast" });
    } catch (error) {
      console.error("Download card error", error);
      toast.error("Failed to download ID card image", { id: "export-toast" });
    }
  };

  // High-Resolution Print output
  const handlePrint = () => {
    window.print();
  };



  // Helper to determine status badge classes
  const getStatusBadgeStyle = (status) => {
    const s = status ? status.toLowerCase() : "";
    if (s === "printed" || s === "distributed" || s === "active" || s === "approved") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (s === "rejected" || s === "inactive" || s === "expired") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    return "bg-amber-50 text-amber-700 border-amber-200"; // Pending / Generated
  };

  // Enrich student data with latest status for one source of truth
  const studentWithStatus = cardData?.studentData ? {
    ...cardData.studentData,
    idCardStatus: cardData.status,
    serialNumber: cardData.serialNumber
  } : null;

  return (
    <div className="w-full space-y-6 pb-10 text-left min-h-screen">
      {/* ========== COMMON HEADER ========== */}
      <Heading 
        primaryText="Student"
        secondaryText="ID Card"
        action={
          <div className="bg-white/20 text-white backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold shadow-sm whitespace-nowrap border border-white/25">
            {cardData?.studentData?.academicYear || "Active Session"}
          </div>
        }
        showAnimations={true}
        size={12}
      />

      <p className="text-sm text-slate-500 font-medium">
        View, download or request reissue of your identity card.
      </p>

      {/* ========== STUDENT SWITCHER BANNER ========== */}
      {parentProfile?.students?.length > 1 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50/50 text-[#223F74] flex items-center justify-center font-extrabold text-lg shadow-inner">
              {(cardData?.studentData?.name || activeStudent?.name || "S")?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Child Profile</p>
              <h4 className="text-sm font-black text-slate-800 tracking-tight">
                {cardData?.studentData?.name || activeStudent?.name}
              </h4>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <Select 
              value={activeStudentId} 
              onChange={handleStudentChange}
              placeholder="Switch Student"
              searchable={false}
            >
              {parentProfile.students.map((s) => (
                <Option key={s._id} value={s._id} label={s.name} />
              ))}
            </Select>
          </div>
        </div>
      )}

      {/* ========== CONTENT AREA ========== */}
      {isLoading ? (
        <ParentIDCardContentSkeleton />
      ) : error ? (
        <IDCardErrorState message={error} onRetry={() => fetchIdCard(true)} />
      ) : !cardData ? (
        <IDCardEmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column: Preview Box */}
          <div className="flex flex-col items-center p-6 bg-slate-50 border border-slate-200/60 rounded-3xl shadow-inner relative">
            
            {/* Visual Tabs */}
            <div className="flex bg-slate-200/60 p-1.5 rounded-2xl mb-6 shadow-sm">
              <button
                onClick={() => setCardSide("front")}
                className={`px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                  cardSide === "front"
                    ? "bg-white text-[#223F74] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Front Preview
              </button>
              <button
                onClick={() => setCardSide("back")}
                className={`px-5 py-2 rounded-xl font-bold text-xs transition-all ${
                  cardSide === "back"
                    ? "bg-white text-[#223F74] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Back Preview
              </button>
            </div>

            {/* Reusable Card Component Renders */}
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center max-w-full overflow-x-auto">
              <IDCardPreview 
                student={studentWithStatus} 
                template={cardData.template} 
                schoolInfo={cardData?.schoolData} 
                side={cardSide} 
              />
            </div>

            {/* Print and Download Controls */}
            <div className="grid grid-cols-2 gap-3 mt-6 w-full max-w-[340px] sm:max-w-[380px]">
              <Button
                text="Print ID Card"
                icon={<Printer size={16} />}
                variant="primary"
                onClick={handlePrint}
              />
              <Button
                text="Download"
                icon={<Download size={16} />}
                variant="secondary"
                onClick={handleDownload}
              />
            </div>


          </div>

          {/* Right Column: Card Registry Details & Guidelines (Stacked) */}
          <div className="space-y-6">
            {/* Card Registry Details Card */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <IdCard className="w-6 h-6 text-[#223F74]" />
                <h3 className="font-extrabold text-lg text-slate-800">Card Registry Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="pb-2 border-b border-slate-100 flex flex-col justify-center">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Card Number</span>
                  <span className="text-slate-800 font-extrabold mt-0.5 break-all">{cardData.serialNumber}</span>
                </div>
                <div className="pb-2 border-b border-slate-100 flex flex-col justify-center">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Issue Date</span>
                  <span className="text-slate-800 font-extrabold mt-0.5">
                    {cardData.generationDate ? new Date(cardData.generationDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="pb-2 border-b border-slate-100 flex flex-col justify-center">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Valid Until</span>
                  <span className="text-slate-800 font-extrabold mt-0.5">As per school policy</span>
                </div>
                <div className="pb-2 border-b border-slate-100 flex flex-col justify-center">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Card Type</span>
                  <span className="text-slate-800 font-extrabold mt-0.5">Student ID</span>
                </div>
                <div className="pb-2 border-b border-slate-100 flex flex-col justify-center">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Generated By</span>
                  <span className="text-slate-800 font-extrabold mt-0.5">School Administration</span>
                </div>
                <div className="pb-2 border-b border-slate-100 flex flex-col justify-center">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Card Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border w-fit mt-1 ${getStatusBadgeStyle(cardData.status)}`}>
                    {cardData.status}
                  </span>
                </div>
              </div>
            </Card>

            {/* Guidelines & Instructions */}
            <div className="bg-gradient-to-br from-[#F4F7FB] to-slate-100 rounded-3xl p-6 border border-slate-200/80">
              <div className="flex items-center gap-3 mb-4">
                <Info className="w-6 h-6 text-[#223F74]" />
                <h3 className="font-extrabold text-lg text-slate-800">Guidelines & Instructions</h3>
              </div>
              {cardData.instructions && cardData.instructions.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-600 font-medium">
                  {cardData.instructions.map((ins, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#223F74] font-bold">•</span>
                      <span>{ins}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2 text-sm text-slate-600 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="text-[#223F74] font-bold">•</span>
                    <span>Carry ID card to school every day</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#223F74] font-bold">•</span>
                    <span>Show ID card at school entrance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#223F74] font-bold">•</span>
                    <span>Report lost card immediately</span>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== HIDDEN PRINT SECTION (ONLY VISIBLE ON NATIVE PRINT) ========== */}
      <div id="parent-idcard-print-area" className="hidden">
        {studentWithStatus && (
          <IDCardPreview 
            student={studentWithStatus} 
            template={cardData.template} 
            schoolInfo={cardData?.schoolData} 
            side="both" 
            layout="column" 
          />
        )}
      </div>



      {/* Stylesheet specifically tailored for native printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Clean up the back side of the Student ID Card */
        #back-card-inner .p-1.px-3.text-center.text-white.flex.flex-col p {
          display: none !important;
        }
        #back-card-inner .p-1.px-3.text-center.text-white.flex.flex-col {
          min-height: 12px !important;
          height: 12px !important;
          padding: 0 !important;
        }

        @media print {
          body * {
            visibility: hidden !important;
          }
          #parent-idcard-print-area, #parent-idcard-print-area * {
            visibility: visible !important;
          }
          #parent-idcard-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 40px !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .p-4.bg-white.select-none.inline-block {
            padding: 0 !important;
          }
          @page {
            size: portrait;
            margin: 0;
          }
        }
      `}} />
    </div>
  );
}
