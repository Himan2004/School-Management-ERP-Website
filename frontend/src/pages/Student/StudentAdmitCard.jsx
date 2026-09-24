import React, { useState, useEffect, useRef } from 'react';
import {
  Download, Eye, CheckCircle, Loader2, Copy, XCircle, History
} from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { studentApi } from '../../services/api/studentApi';
import { Heading } from '../../components/shared/Common_Components';

const placeholderSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="14">No Image</text></svg>')}`;

const StudentAdmitCard = () => {
  const [admitCard, setAdmitCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('preview'); // preview, history
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);
  
  const cardRef = useRef(null);

  // Mock Admit Card Data as fallback
  const mockAdmitCard = {
    id: 1,
    examName: 'Final Term Examination 2024',
    examType: 'Annual Examination',
    examCode: 'FTE-2024-01',
    academicYear: '2023-2024',
    term: 'Final Term',
    student: {
      name: 'John Doe',
      rollNumber: '2024001',
      class: '12th Grade',
      section: 'A',
      dateOfBirth: '2006-05-15',
      fatherName: 'Robert Doe',
      motherName: 'Sarah Doe',
      photo: placeholderSvg,
      signature: placeholderSvg
    },
    school: {
      name: 'Graphura School of Excellence',
      logo: placeholderSvg,
      address: '123 Education District, City, State - 123456',
      phone: '+1 234 567 8900',
      email: 'info@graphura.edu',
      website: 'www.graphura.edu',
      affiliation: 'CBSE Affiliated',
      established: '1995'
    },
    examDetails: {
      date: '2024-04-15',
      time: '09:00 AM - 12:00 PM',
      duration: '3 hours',
      venue: 'Main Examination Hall',
      reportingTime: '08:30 AM',
      instructions: [
        'Report at least 30 minutes before the exam',
        'Bring your own stationery',
        'No electronic devices allowed',
        'Write your roll number clearly on the answer sheet',
        'Use blue or black pen only',
        'Candidates must carry this admit card to the examination hall'
      ]
    },
    subjects: [
      { id: 1, name: 'Mathematics', date: '2024-04-15', time: '09:00 AM', duration: '3 hours', maxMarks: 100 },
      { id: 2, name: 'Physics', date: '2024-04-17', time: '09:00 AM', duration: '3 hours', maxMarks: 100 },
      { id: 3, name: 'Chemistry', date: '2024-04-19', time: '09:00 AM', duration: '3 hours', maxMarks: 100 },
      { id: 4, name: 'English', date: '2024-04-22', time: '09:00 AM', duration: '3 hours', maxMarks: 100 },
      { id: 5, name: 'Computer Science', date: '2024-04-24', time: '09:00 AM', duration: '3 hours', maxMarks: 100 }
    ],
    importantNotes: [
      'No candidate shall be allowed to enter the examination hall after the commencement of the examination',
      'Use of unfair means will result in immediate disqualification',
      'Mobile phones, smartwatches, and other electronic gadgets are strictly prohibited',
      'Candidates must maintain silence in the examination hall',
      'Write your roll number on the question paper and answer sheet'
    ],
    issuedDate: '2024-04-01',
    validUntil: '2024-04-30',
    status: 'active',
    qrCode: placeholderSvg,
    barCode: placeholderSvg,
    history: [
      {
        id: 1,
        examName: 'Mid-Term Examination 2024',
        issuedDate: '2024-01-15',
        examDate: '2024-02-01',
        status: 'completed'
      },
      {
        id: 2,
        examName: 'Pre-Board Examination 2024',
        issuedDate: '2024-02-20',
        examDate: '2024-03-01',
        status: 'completed'
      }
    ]
  };

  const data = admitCard && Object.keys(admitCard).length > 0 ? admitCard : mockAdmitCard;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const admitCardRes = await studentApi.getAdmitCard();
        setAdmitCard(admitCardRes?.data || admitCardRes || null);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(err?.message || 'Failed to load admit card');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleDownload = async (formatType = 'png') => {
    if (!cardRef.current) return;
    
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      let dataUrl;
      if (formatType === 'png') {
        dataUrl = canvas.toDataURL('image/png');
      } else if (formatType === 'jpeg') {
        dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      } else {
        throw new Error(`Unsupported format: ${formatType}`);
      }
      
      const studentName = data.student?.name
        ? data.student.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        : 'student';
      const extension = formatType === 'jpeg' ? 'jpg' : 'png';
      const filename = `admit-card-${data.examCode || 'code'}-${studentName}.${extension}`;
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      
      toast.success(`Admit Card downloaded as ${formatType.toUpperCase()}`);
    } catch (error) {
      console.error('Error downloading admit card:', error);
      toast.error('Failed to download admit card. Please try again.');
    } finally {
      setIsDownloading(false);
      setShowDownloadOptions(false);
    }
  };


  const handleCopyExamCode = () => {
    navigator.clipboard.writeText(data.examCode);
    toast.success('Exam code copied to clipboard');
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'expired': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDateSafe = (dateValue, formatStr = 'dd MMM yyyy') => {
    if (!dateValue) return "N/A";
    const parsedDate = new Date(dateValue);
    return !isNaN(parsedDate.getTime()) ? format(parsedDate, formatStr) : "N/A";
  };

  if (loading && !data.student) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-[#223F74]" />
        <span className="ml-2 text-[#6B7280]">Loading admit card data...</span>
      </div>
    );
  }

  const renderAdmitCardContent = () => {
    return (
      <div className="w-full h-full bg-white">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#223F74] to-[#1a2d54] text-white p-4 sm:p-6 text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-2">
            <img src={data.school?.logo || placeholderSvg} alt="School Logo" className="w-12 h-12 rounded-full bg-white p-1 flex-shrink-0" />
            <h2 className="text-xl sm:text-2xl font-bold break-words max-w-full px-2 text-white">{data.school?.name}</h2>
          </div>
          <p className="text-xs sm:text-sm text-white/80 break-words max-w-full px-2">{data.school?.address}</p>
          <p className="text-xs sm:text-sm text-white/80">{data.school?.affiliation}</p>
          <div className="mt-3 pt-3 border-t border-white/20">
            <h3 className="text-lg sm:text-xl font-bold text-white">{data.examName}</h3>
            <p className="text-xs sm:text-sm text-white/80">{data.examType} | {data.academicYear}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 w-full box-border">
          {/* Student Info */}
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mb-6 w-full">
            <div className="flex-1 min-w-0 w-full">
              <h4 className="font-semibold text-gray-800 mb-3 text-left">Student Information</h4>
              <div className="space-y-3 text-sm w-full">
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-0.5 border-b border-gray-100 pb-1.5">
                  <span className="text-gray-500 font-medium sm:font-normal whitespace-nowrap">Student Name:</span>
                  <span className="font-semibold text-gray-800 break-words max-w-full sm:text-right">{data.student?.name}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-0.5 border-b border-gray-100 pb-1.5">
                  <span className="text-gray-500 font-medium sm:font-normal whitespace-nowrap">Roll Number:</span>
                  <span className="font-semibold text-gray-800 break-words max-w-full sm:text-right">{data.student?.rollNumber}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-0.5 border-b border-gray-100 pb-1.5">
                  <span className="text-gray-500 font-medium sm:font-normal whitespace-nowrap">Class & Section:</span>
                  <span className="font-semibold text-gray-800 break-words max-w-full sm:text-right">{data.student?.class} - {data.student?.section}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-0.5 border-b border-gray-100 pb-1.5">
                  <span className="text-gray-500 font-medium sm:font-normal whitespace-nowrap">Date of Birth:</span>
                  <span className="font-semibold text-gray-800 break-words max-w-full sm:text-right">{formatDateSafe(data.student?.dateOfBirth)}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-0.5 border-b border-gray-100 pb-1.5">
                  <span className="text-gray-500 font-medium sm:font-normal whitespace-nowrap">Father's Name:</span>
                  <span className="font-semibold text-gray-800 break-words max-w-full sm:text-right">{data.student?.fatherName}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-0.5">
                  <span className="text-gray-500 font-medium sm:font-normal whitespace-nowrap">Mother's Name:</span>
                  <span className="font-semibold text-gray-800 break-words max-w-full sm:text-right">{data.student?.motherName}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center self-center sm:self-start flex-shrink-0 pt-2 sm:pt-0">
              <img
                src={data.student?.photo || placeholderSvg}
                alt="Student Photo"
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-lg object-cover border-2 border-gray-200"
              />
              <p className="text-[10px] sm:text-xs text-gray-500 mt-1.5">Student Photo</p>
            </div>
          </div>

          {/* Exam Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 w-full box-border text-left">
            <h4 className="font-semibold text-gray-800 mb-3">Examination Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm w-full">
              <div className="min-w-0">
                <span className="text-gray-600">Exam Code:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-medium text-gray-800 break-all">{data.examCode}</span>
                </div>
              </div>
              <div>
                <span className="text-gray-600">Term:</span>
                <div className="font-medium text-gray-800 mt-0.5">{data.term}</div>
              </div>
              <div>
                <span className="text-gray-600">Exam Date:</span>
                <div className="font-medium text-gray-800 mt-0.5">{formatDateSafe(data.examDetails?.date)}</div>
              </div>
              <div>
                <span className="text-gray-600">Duration:</span>
                <div className="font-medium text-gray-800 mt-0.5">{data.examDetails?.duration}</div>
              </div>
              <div>
                <span className="text-gray-600">Time:</span>
                <div className="font-medium text-gray-800 mt-0.5">{data.examDetails?.time}</div>
              </div>
              <div>
                <span className="text-gray-600">Reporting Time:</span>
                <div className="font-medium text-red-600 mt-0.5">{data.examDetails?.reportingTime}</div>
              </div>
              <div className="col-span-1 sm:col-span-2 min-w-0">
                <span className="text-gray-600">Venue:</span>
                <div className="font-medium text-gray-800 mt-0.5 break-words max-w-full">{data.examDetails?.venue}</div>
              </div>
            </div>
          </div>

          {/* Subject Schedule */}
          <div className="mb-6 w-full text-left">
            <h4 className="font-semibold text-gray-800 mb-3">Subject Schedule</h4>
            <div className="overflow-x-auto border border-gray-100 rounded-lg w-full">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Subject</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Duration</th>
                    <th className="px-4 py-2 text-left">Max Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.subjects?.map((subject) => (
                    <tr key={subject.id}>
                      <td className="px-4 py-2 font-medium text-gray-800">{subject.name}</td>
                      <td className="px-4 py-2 text-gray-600">{formatDateSafe(subject.date)}</td>
                      <td className="px-4 py-2 text-gray-600">{subject.time}</td>
                      <td className="px-4 py-2 text-gray-600">{subject.duration}</td>
                      <td className="px-4 py-2 text-gray-600">{subject.maxMarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* QR Code and Barcode */}
          <div className="flex flex-col sm:flex-row gap-6 justify-between items-center pt-4 border-t border-gray-200 w-full">
            <div className="text-center">
              <img src={data.qrCode || placeholderSvg} alt="QR Code" className="w-20 h-20 mx-auto object-contain" />
              <p className="text-xs text-gray-500 mt-1">Scan for verification</p>
            </div>
            <div className="text-center">
              <img src={data.barCode || placeholderSvg} alt="Barcode" className="h-12 mx-auto object-contain" />
              <p className="text-xs text-gray-500 mt-1">{data.examCode}</p>
            </div>
            <div className="text-center sm:text-right w-full sm:w-auto">
              <p className="text-xs text-gray-500">Issued on: {formatDateSafe(data.issuedDate)}</p>
              <p className="text-xs text-gray-500">Valid until: {formatDateSafe(data.validUntil)}</p>
              {data.student?.signature && data.student.signature !== "sign" ? (
                <div className="mt-2">
                  <img src={data.student.signature} alt="Signature" className="h-8 mx-auto sm:ml-auto object-contain" />
                  <p className="text-xs text-gray-500">Student Signature</p>
                </div>
              ) : (
                <div className="mt-2 border-t border-dashed border-slate-300 pt-1.5 w-24 mx-auto sm:ml-auto flex flex-col items-center">
                  <p className="text-[9px] text-slate-400 italic font-medium uppercase tracking-wider">No Signature</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-4 pt-4 border-t border-gray-200 text-center w-full">
            <p className="text-xs text-gray-500 leading-relaxed max-w-full">
              * This admit card is electronically generated and does not require a physical signature.
              Candidates must bring this admit card to the examination hall.
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* ── Page Heading ─────────────────────────────────────────────────────── */}
      <Heading
        primaryText="Student"
        secondaryText="Admit Card"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload('png')}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E7E2DB] rounded-xl text-[#1D1D1F] text-xs font-semibold hover:bg-[#F4F7FB] transition-colors shadow-sm disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              PNG
            </button>
            <button
              onClick={() => handleDownload('jpeg')}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E7E2DB] rounded-xl text-[#1D1D1F] text-xs font-semibold hover:bg-[#F4F7FB] transition-colors shadow-sm disabled:opacity-50"
            >
              {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              JPEG
            </button>
          </div>
        }
      />

      {error && (
        <p className="text-xs text-red-600 px-1">⚠ Failed to sync latest data. Showing cached results.</p>
      )}
      {admitCard && Object.keys(admitCard).length === 0 && (
        <p className="text-xs text-amber-600 px-1">Showing demo admit card. Connect to backend for live data.</p>
      )}
      {/* ── Tab Navigation ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[#F4F7FB] p-1 rounded-2xl w-fit">
        {[
          { key: 'preview', label: 'Admit Card Preview' },
          { key: 'history', label: 'Previous Admit Cards' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-white text-[#223F74] shadow-sm'
                : 'text-[#6B7280] hover:text-[#1D1D1F]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ADMIT CARD PREVIEW TAB                                                  */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          {/* ── The Admit Card ─────────────────────────────────────────────── */}
          <div className="flex justify-center items-center py-10 bg-gradient-to-br from-[#F4F7FB] to-[#E8EDF5] rounded-[24px] border border-[#E7E2DB] overflow-x-auto">
            <div
              ref={cardRef}
              className="w-full max-w-[800px] min-w-[280px] bg-white rounded-2xl shadow-2xl overflow-hidden transition-all"
              style={{ boxShadow: '0 20px 60px rgba(34,63,116,0.35)' }}
            >
              {renderAdmitCardContent()}
            </div>
          </div>

          {/* ── Quick Actions ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setShowFullScreen(true)}
              className="flex items-center justify-center gap-2 p-3 bg-white border border-[#E7E2DB] rounded-[16px] hover:bg-[#F4F7FB] transition-colors shadow-[0_2px_8px_rgba(0,0,0,.04)]"
            >
              <Eye className="w-4 h-4 text-[#223F74]" />
              <span className="text-sm font-semibold text-[#1D1D1F]">View Full Screen</span>
            </button>
            <button
              onClick={() => handleDownload('png')}
              disabled={isDownloading}
              className="flex items-center justify-center gap-2 p-3 bg-white border border-[#E7E2DB] rounded-[16px] hover:bg-[#F4F7FB] transition-colors shadow-[0_2px_8px_rgba(0,0,0,.04)] disabled:opacity-60"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin text-[#059669]" /> : <Download className="w-4 h-4 text-[#059669]" />}
              <span className="text-sm font-semibold text-[#1D1D1F]">{isDownloading ? 'Saving...' : 'Save as Image'}</span>
            </button>
          </div>
        </div>
      )}


      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* PREVIOUS ADMIT CARDS TAB                                                */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
          <h3 className="text-[15px] font-bold text-[#1D1D1F] mb-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
              <History className="w-4 h-4 text-[#223F74]" />
            </div>
            Previous Admit Cards
          </h3>
          <div className="space-y-3">
            {data.history && data.history.length > 0 ? (
              data.history.map((history) => (
                <div
                  key={history.id || history._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#F4F7FB] rounded-2xl border border-[#E2E8F0] gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-[#1D1D1F]">{history.examName}</p>
                    <p className="text-xs text-[#6B7280]">Issued: {formatDateSafe(history.issuedDate)}</p>
                    <p className="text-xs text-[#6B7280]">Exam Date: {formatDateSafe(history.examDate)}</p>
                  </div>
                  <div className="self-start sm:self-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 block text-center ${getStatusColor(history.status)}`}>
                      {history.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[#6B7280]">
                <div className="w-14 h-14 rounded-2xl bg-[#F4F7FB] flex items-center justify-center mb-3">
                  <History className="w-6 h-6 text-[#E2E8F0]" />
                </div>
                <p className="font-semibold text-sm">No previous admit cards found</p>
                <p className="text-xs mt-1">Your exam admit card records will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Full Screen Modal */}
      {showFullScreen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200" onClick={() => setShowFullScreen(false)}>
          <div className="max-w-4xl w-full max-h-[90vh] overflow-auto animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-xl shadow-2xl">
              <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center z-10">
                <h3 className="text-lg font-bold text-gray-800">Admit Card Preview</h3>
                <button
                  onClick={() => setShowFullScreen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  {renderAdmitCardContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Background sync indicator ────────────────────────────────────────── */}
      {loading && data.student && (
        <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#E7E2DB] p-3 flex items-center gap-3 z-50">
          <Loader2 className="w-4 h-4 animate-spin text-[#223F74]" />
          <span className="text-sm font-semibold text-[#1D1D1F]">Syncing admit card data…</span>
        </div>
      )}
    </div>
  );
};

export default StudentAdmitCard;