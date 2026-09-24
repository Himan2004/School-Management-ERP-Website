import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard, Download, User, MapPin, CheckCircle,
  Loader2, Shield, Copy, History,
} from 'lucide-react';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import toast from 'react-hot-toast';
import { studentApi } from '../../services/api/studentApi';
import { QRCodeSVG } from 'qrcode.react';
import {
  Heading,
} from '../../components/shared/Common_Components';

// ── Placeholder SVG for missing images ────────────────────────────────────────
const placeholderSvg = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="14">No Image</text></svg>')}`;

// ── Signature placeholder SVG ──────────────────────────────────────────────────
const signaturePlaceholder = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><path d="M10,30 Q30,10 50,30 T90,20" fill="none" stroke="%233b82f6" stroke-width="2"/></svg>')}`;

const StudentIdCard = () => {
  const [idCard, setIdCard]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'history'
  const [isDownloading, setIsDownloading] = useState(false);

  const cardRef = useRef(null);
  const data    = idCard || {};

  // ── Data Mapper ─────────────────────────────────────────────────────────────
  const mapBackendResponseToUI = (apiResponse) => {
    if (!apiResponse) return null;
    const payload = apiResponse.data || apiResponse;

    const hasCard  = payload.hasCard ?? false;
    const source   = payload.cardDetails || payload.studentData || {};

    const validFrom  = source.generationDate || new Date();
    const validUntil = source.validUntil || new Date(
      new Date(validFrom).setFullYear(new Date(validFrom).getFullYear() + 1)
    );

    return {
      hasCard,
      status:     source.status      || 'active',
      cardNumber: source.serialNumber || 'PENDING',
      studentId:  source.cardId       || 'PENDING',
      validFrom,
      validUntil,
      version:  source.version || 1,
      features: ['Library Access', 'Bus Access', 'Campus Entry'],
      school: {
        name:        source.schoolName    || 'St. Xavier, Patna',
        logo:        source.schoolLogo    || `https://ui-avatars.com/api/?name=${encodeURIComponent(source.schoolName || 'School')}&background=1e40af&color=fff`,
        address:     source.schoolAddress || '',
        phone:       source.schoolPhone   || '',
        website:     source.schoolWebsite || (source.schoolName
          ? `${source.schoolName.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu.in`
          : 'stxavierpatna.edu.in'),
        affiliation: 'CBSE Affiliated',
      },
      student: {
        name:        source.name        || '',
        rollNumber:  source.rollNumber  || '',
        class:       source.class       || '',
        section:     source.section     || 'A',
        dateOfBirth: source.dateOfBirth || null,
        bloodGroup:  source.bloodGroup  || 'N/A',
        gender:      source.gender      || '',
        fatherName:  source.fatherName  || '',
        motherName:  source.motherName  || '',
        address:     source.address     || '',
        phone:       source.phone       || '',
        email:       source.email       || '',
        photo:       source.photo       || `https://ui-avatars.com/api/?name=${encodeURIComponent(source.name || 'Student')}&background=1e40af&color=fff`,
        qrCode:      source.qrCodeData  || '',
        signature:   signaturePlaceholder,
      },
    };
  };

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [idCardRes, historyRes] = await Promise.all([
          studentApi.getIdCard(),
          studentApi.getIdCardHistory().catch(() => ({ success: true, data: { records: [] } })),
        ]);

        const mappedData = mapBackendResponseToUI(idCardRes);
        if (mappedData) {
          mappedData.cardHistory = historyRes?.data?.records || [];
        }

        setIdCard(mappedData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(err?.message || 'Failed to load ID card');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const formatIdCardDate = (dateValue, formatStr = 'dd MMM yyyy') => {
    if (!dateValue) return 'N/A';
    const parsedDate = new Date(dateValue);
    return !isNaN(parsedDate.getTime()) ? format(parsedDate, formatStr) : 'N/A';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':    return 'text-green-700 bg-green-100';
      case 'expired':   return 'text-red-700 bg-red-100';
      case 'suspended': return 'text-orange-700 bg-orange-100';
      default:          return 'text-gray-600 bg-gray-100';
    }
  };

  // ── Download ────────────────────────────────────────────────────────────────
  const handleDownload = async (formatType = 'png') => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: null,
      });

      const dataUrl = formatType === 'jpeg'
        ? canvas.toDataURL('image/jpeg', 0.95)
        : canvas.toDataURL('image/png');

      const studentName = data.student?.name
        ? data.student.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        : 'student';
      const ext      = formatType === 'jpeg' ? 'jpg' : 'png';
      const filename = `student-id-card-${studentName}.${ext}`;

      const link    = document.createElement('a');
      link.download = filename;
      link.href     = dataUrl;
      link.click();

      toast.success(`ID Card downloaded as ${formatType.toUpperCase()}`);
    } catch (err) {
      console.error('Error downloading card:', err);
      toast.error('Failed to download ID card. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyCardNumber = () => {
    navigator.clipboard.writeText(data.cardNumber);
    toast.success('Card number copied to clipboard');
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading && !idCard) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-[#223F74]" />
        <span className="ml-2 text-[#6B7280]">Loading ID card data...</span>
      </div>
    );
  }

  // ── ID Card visual (fixed read-only design) ───────────────────────────────────
  const IdCardVisual = () => (
    <div className="min-h-[inherit] flex flex-col justify-between h-full bg-white">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-[#223F74] to-[#1a2d54] p-4 flex items-center gap-3">
        <img
          src={data.school?.logo || placeholderSvg}
          alt="School Logo"
          className="w-11 h-11 rounded-full object-cover bg-white p-0.5 flex-shrink-0"
        />
        <div className="text-left min-w-0 flex-1">
          <p className="text-xs font-bold leading-tight break-words text-white">
            {data.school?.name}
          </p>
          <p className="text-[9px] text-white/80 mt-0.5">{data.school?.affiliation}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-[9px] text-white/80 font-mono">STUDENT ID</p>
          <p className="text-[9px] text-white font-mono font-bold">{data.cardNumber}</p>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex gap-3 flex-1 items-start min-w-0 p-4">
        {/* Student Photo */}
        <div className="flex-shrink-0">
          <img
            src={data.student?.photo || placeholderSvg}
            alt="Student"
            className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200 shadow-sm"
          />
        </div>

        {/* Student Details */}
        <div className="flex-1 text-left min-w-0">
          <h3 className="font-black text-sm break-words leading-tight mb-1 text-gray-800">
            {data.student?.name}
          </h3>
          <div className="space-y-0.5 text-[10px] text-gray-600">
            <p><span className="text-gray-500">Roll No:</span> <span className="font-semibold text-gray-800">{data.student?.rollNumber}</span></p>
            <p><span className="text-gray-500">Class:</span> <span className="font-semibold text-gray-800">{data.student?.class} – {data.student?.section}</span></p>
            <p><span className="text-gray-500">DOB:</span> <span className="font-semibold text-gray-800">{formatIdCardDate(data.student?.dateOfBirth)}</span></p>
            <p><span className="text-gray-500">Blood:</span> <span className="font-semibold text-gray-800">{data.student?.bloodGroup}</span></p>
            {data.student?.fatherName && (
              <p className="break-words"><span className="text-gray-500">Father:</span> <span className="font-semibold text-gray-800">{data.student.fatherName}</span></p>
            )}
            {data.student?.motherName && (
              <p className="break-words"><span className="text-gray-500">Mother:</span> <span className="font-semibold text-gray-800">{data.student.motherName}</span></p>
            )}
          </div>
        </div>

        {/* QR Code */}
        <div className="flex-shrink-0 w-16 h-16 bg-white rounded-lg p-1 flex items-center justify-center shadow-sm border border-gray-100">
          <QRCodeSVG
            value={data.student?.qrCode || data.studentId || 'N/A'}
            size={54}
          />
        </div>
      </div>

      {/* Card Footer */}
      <div className="pt-2 pb-3 px-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-end justify-between text-[9px]">
          <div className="text-gray-500 space-y-0.5">
            <p>Valid: {formatIdCardDate(data.validFrom, 'MM/yy')} – {formatIdCardDate(data.validUntil, 'MM/yy')}</p>
            <p className="font-mono text-gray-400">{data.school?.website}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <img
              src={data.student?.signature}
              alt="Signature"
              className="h-6 inline-block mb-0.5"
            />
            <p className="text-gray-400">Authorised Signature</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Tab nav labels ───────────────────────────────────────────────────────────
  const TABS = [
    { key: 'preview', label: 'ID Card Preview' },
    { key: 'history', label: 'Card History'    },
  ];

  // ── Info row helper ──────────────────────────────────────────────────────────
  const InfoRow = ({ label, children }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F4F7FB] last:border-0 text-sm gap-2">
      <span className="text-[#6B7280] flex-shrink-0">{label}</span>
      <span className="font-semibold text-[#1D1D1F] text-right">{children || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Page Heading ──────────────────────────────────────────────────────── */}
      <Heading
        primaryText="Student"
        secondaryText="ID Card"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload('jpeg')}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E7E2DB] rounded-xl text-[#1D1D1F] text-xs font-semibold hover:bg-[#F4F7FB] transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Download JPEG
            </button>
          </div>
        }
      />

      {error && (
        <p className="text-xs text-red-600 px-1">⚠ Failed to sync latest data. Showing cached results.</p>
      )}

      {/* ── Tab Navigation ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[#F4F7FB] p-1 rounded-2xl w-fit">
        {TABS.map(tab => (
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
      </div>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ID CARD PREVIEW TAB                                                     */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'preview' && (
        <div className="space-y-6">

          {/* ── The ID Card ──────────────────────────────────────────────────── */}
          <div className="flex justify-center items-center py-10 bg-gradient-to-br from-[#F4F7FB] to-[#E8EDF5] rounded-[24px] border border-[#E7E2DB]">
            <div
              ref={cardRef}
              className="w-[440px] min-h-[275px] h-auto bg-white rounded-2xl shadow-2xl overflow-hidden transition-all"
              style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}
            >
              <IdCardVisual />
            </div>
          </div>

          {/* ── Info Grid ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Student Information */}
            <div className="bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
              <h3 className="text-[15px] font-bold text-[#1D1D1F] mb-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
                  <User className="w-4 h-4 text-[#223F74]" />
                </div>
                Student Information
              </h3>
              <div>
                <InfoRow label="Full Name">{data.student?.name}</InfoRow>
                <InfoRow label="Roll Number">{data.student?.rollNumber}</InfoRow>
                <InfoRow label="Class &amp; Section">{data.student?.class} – {data.student?.section}</InfoRow>
                <InfoRow label="Date of Birth">{formatIdCardDate(data.student?.dateOfBirth)}</InfoRow>
                <InfoRow label="Blood Group">{data.student?.bloodGroup}</InfoRow>
                <InfoRow label="Gender">{data.student?.gender}</InfoRow>
                <InfoRow label="Father's Name">{data.student?.fatherName}</InfoRow>
                <InfoRow label="Mother's Name">{data.student?.motherName}</InfoRow>
              </div>
            </div>

            {/* Right column: Card Info + Features */}
            <div className="space-y-5">

              {/* Card Information */}
              <div className="bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
                <h3 className="text-[15px] font-bold text-[#1D1D1F] mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-[#223F74]" />
                  </div>
                  Card Information
                </h3>
                <div>
                  {/* Card number with copy */}
                  <div className="flex items-center justify-between py-2.5 border-b border-[#F4F7FB] text-sm gap-2">
                    <span className="text-[#6B7280]">Card Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1D1D1F] font-mono">{data.cardNumber}</span>
                      <button
                        onClick={handleCopyCardNumber}
                        className="p-1.5 hover:bg-[#F4F7FB] rounded-lg transition-colors"
                        title="Copy card number"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#6B7280]" />
                      </button>
                    </div>
                  </div>
                  <InfoRow label="Student ID">{data.studentId}</InfoRow>
                  <InfoRow label="Valid From">{formatIdCardDate(data.validFrom)}</InfoRow>
                  <InfoRow label="Valid Until">{formatIdCardDate(data.validUntil)}</InfoRow>
                  <InfoRow label="Version">v{data.version}</InfoRow>
                  <div className="flex items-center justify-between py-2.5 text-sm gap-2">
                    <span className="text-[#6B7280]">Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(data.status)}`}>
                      {data.status?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Features & Access */}
              <div className="bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
                <h3 className="text-[15px] font-bold text-[#1D1D1F] mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[#059669]" />
                  </div>
                  Features &amp; Access
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {(data.features || []).map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-[#F4F7FB] rounded-xl"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#ECFDF5] flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-3.5 h-3.5 text-[#059669]" />
                      </div>
                      <span className="text-sm font-medium text-[#1D1D1F]">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
            <h3 className="text-[15px] font-bold text-[#1D1D1F] mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FFF7ED] flex items-center justify-center">
                <MapPin className="w-4 h-4 text-[#D97706]" />
              </div>
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {[
                { label: 'Address',        value: data.student?.address },
                { label: 'Phone',          value: data.student?.phone   },
                { label: 'Email',          value: data.student?.email   },
                { label: 'School Website', value: data.school?.website  },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">{label}</p>
                  <p className="text-sm font-semibold text-[#1D1D1F] break-words">{value || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* CARD HISTORY TAB                                                        */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-[24px] p-6 border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)]">
          <h3 className="text-[15px] font-bold text-[#1D1D1F] mb-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
              <History className="w-4 h-4 text-[#223F74]" />
            </div>
            Card Issuance History
          </h3>

          {data.cardHistory && data.cardHistory.length > 0 ? (
            <div className="space-y-3">
              {data.cardHistory.map((history) => (
                <div
                  key={history.id || history._id}
                  className="flex items-center justify-between p-4 bg-[#F4F7FB] rounded-2xl border border-[#E2E8F0]"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-[#1D1D1F]">Version {history.version}</p>
                    <p className="text-xs text-[#6B7280]">
                      Issued: {formatIdCardDate(history.issuedDate)}
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      Valid Until: {formatIdCardDate(history.validUntil)}
                    </p>
                    {history.reason && (
                      <p className="text-xs text-[#9CA3AF]">Reason: {history.reason}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${getStatusColor(history.status)}`}>
                    {history.status?.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-[#6B7280]">
              <div className="w-14 h-14 rounded-2xl bg-[#F4F7FB] flex items-center justify-center mb-3">
                <History className="w-6 h-6 text-[#E2E8F0]" />
              </div>
              <p className="font-semibold text-sm">No card history found</p>
              <p className="text-xs mt-1">Your card issuance records will appear here</p>
            </div>
          )}
        </div>
      )}

      {/* ── Background sync indicator ────────────────────────────────────────── */}
      {loading && data.student && (
        <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-[#E7E2DB] p-3 flex items-center gap-3 z-50">
          <Loader2 className="w-4 h-4 animate-spin text-[#223F74]" />
          <span className="text-sm font-semibold text-[#1D1D1F]">Syncing ID card data…</span>
        </div>
      )}
    </div>
  );
};

export default StudentIdCard;
