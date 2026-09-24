import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, CheckCircle, XCircle, Clock, Building2, MapPin,
    Mail, Phone, FileText, UserCheck, Hash, CreditCard,
    Globe, GitBranch, Calendar, Download, ExternalLink,
    Shield, Image, Award, Briefcase, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusConfig = (status) => {
    switch (status) {
        case 'pending':
            return { icon: Clock, label: 'Pending Review', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' };
        case 'approved':
            return { icon: CheckCircle, label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' };
        case 'rejected':
        case 'deactivated':
            return { icon: XCircle, label: 'Deactivated', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400' };
        default:
            return { icon: Clock, label: status, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-400' };
    }
};

const Section = ({ icon: Icon, title, children }) => (
    <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{title}</h3>
        </div>
        {children}
    </div>
);

const Field = ({ label, value, className = '' }) => (
    <div className={className}>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-800 break-words">{value || <span className="text-gray-300 font-normal">—</span>}</p>
    </div>
);

const DocumentRow = ({ label, url, icon: Icon = FileText }) => {
    const handleDownload = async () => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            // Derive filename from URL
            const ext = url.split('.').pop().split('?')[0] || 'png';
            a.download = `${label.replace(/\s+/g, '_')}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch {
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
    };

    return (
        <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-colors group">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm group-hover:border-indigo-200 transition-colors">
                    <Icon className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">Click to view or download</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                    title="Open in new tab"
                >
                    <ExternalLink className="w-4 h-4" />
                </a>
                <button
                    onClick={handleDownload}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                    title="Download"
                >
                    <Download className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'overview', label: 'Overview', icon: Building2 },
    { id: 'contact', label: 'Contact', icon: MapPin },
    { id: 'admin', label: 'Admin', icon: UserCheck },
    { id: 'legal', label: 'Legal', icon: Shield },
    { id: 'documents', label: 'Documents', icon: FileText },
];

// ─── Main Component ───────────────────────────────────────────────────────────

const OrganizationDetailsModal = ({ request, onClose, onApprove, onReject }) => {
    const [activeTab, setActiveTab] = useState('overview');

    if (!request) return null;

    const statusConfig = getStatusConfig(request.status);
    const StatusIcon = statusConfig.icon;

    const documents = [
        { label: 'Registration Certificate', url: request.registrationCertificate, icon: Award },
        { label: 'Admin ID Proof', url: request.adminIdProof, icon: UserCheck },
        { label: 'Address Proof', url: request.addressProof, icon: MapPin },
        { label: 'Affiliation Certificate', url: request.affiliationCertificate, icon: FileText },
        { label: 'Organization Logo', url: request.organizationLogo, icon: Image },
    ].filter(doc => doc.url);

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                layout
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' , layout: { duration: 0.25, ease: 'easeInOut' }}}
                className="bg-white rounded-2xl w-full max-w-3xl max-h-screen overflow-hidden shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >

                {/* ── Header ── */}
                <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-6 pt-5 pb-0">
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {/* Logo or fallback */}
                            <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {request.organizationLogo
                                    ? <img src={request.organizationLogo} alt="logo" className="w-full h-full object-cover" />
                                    : <Building2 className="w-6 h-6 text-white" />
                                }
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white leading-tight">{request.organizationName}</h2>
                                <p className="text-indigo-200 text-xs mt-0.5 flex items-center gap-1">
                                    <Hash className="w-3 h-3" />
                                    {request.registrationNumber}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Status pill */}
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                                {statusConfig.label}
                            </span>
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-4 text-indigo-200 text-xs mb-4">
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {request.city}, {request.state}
                        </span>
                        <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {request.organizationType} · Current Schools: {request.currentBranches ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(request.createdAt), 'dd MMM yyyy')}
                        </span>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-0.5">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all relative ${activeTab === tab.id
                                    ? 'bg-white text-indigo-700'
                                    : 'text-indigo-200 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                                {tab.id === 'documents' && (
                                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-white/20 text-white'
                                        }`}>
                                        {documents.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Body ── */}
                <motion.div
                    layout className="overflow-y-auto p-6"
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            layout
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8 }}
                            transition={{ duration: 0.15 , layout: { duration: 0.25, ease: 'easeInOut' }}}
                        >

                            {/* OVERVIEW TAB */}
                            {activeTab === 'overview' && (
                                <>
                                    <Section icon={Building2} title="Organization Information">
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                            <Field label="Organization Name" value={request.organizationName} />
                                            <Field label="Organization Type" value={request.organizationType} />
                                            <Field label="Current Schools" value={request.currentBranches ?? 0} />
                                            <Field label="Max Schools Allowed" value={request.maxBranches ?? 1} />
                                            <Field label="Year Established" value={request.yearEstablished} />
                                            <Field label="Registration No." value={request.registrationNumber} />
                                            <Field label="Country" value={request.country} />
                                        </div>
                                    </Section>

                                    {request.rejectionReason && (
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                                            <p className="text-xs font-semibold text-red-600 mb-1 uppercase tracking-wide">Deactivation Reason</p>
                                            <p className="text-sm text-red-700">{request.rejectionReason}</p>
                                        </div>
                                    )}

                                    <div className="mt-4 p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Organization Status</p>
                                            <p className={`text-base font-bold mt-1 ${
                                                request.status === 'approved' ? 'text-emerald-600' :
                                                request.status === 'pending' ? 'text-amber-600' : 'text-red-600'
                                            }`}>
                                                {request.status === 'approved' ? 'Activated' :
                                                 request.status === 'pending' ? 'Pending Approval' : 'Deactivated'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                                {request.status === 'approved' ? 'Activated On' :
                                                 request.status === 'pending' ? 'Submitted On' : 'Deactivated On'}
                                            </p>
                                            <p className="text-sm font-medium text-gray-700 mt-1">
                                                {format(new Date(request.status === 'pending' ? request.createdAt : (request.processedAt || request.updatedAt || request.createdAt)), 'PPPp')}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* CONTACT TAB */}
                            {activeTab === 'contact' && (
                                <>
                                    <Section icon={Mail} title="Contact Details">
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                            <Field label="Official Email" value={request.officialEmail} />
                                            <Field label="Contact Number" value={request.contactNumber} />
                                        </div>
                                    </Section>

                                    <Section icon={MapPin} title="Address">
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                            <Field label="Full Address" value={request.address} className="col-span-2" />
                                            <Field label="City" value={request.city} />
                                            <Field label="State" value={request.state} />
                                            <Field label="Pincode" value={request.pincode} />
                                            <Field label="Country" value={request.country} />
                                        </div>
                                    </Section>
                                </>
                            )}

                            {/* ADMIN TAB */}
                            {activeTab === 'admin' && (
                                <Section icon={UserCheck} title="Super Admin / Contact Person">
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                        <Field label="Admin Name" value={request.adminName} />
                                        <Field label="Admin Phone" value={request.adminPhone} />
                                        <Field label="Admin Email" value={request.adminEmail} className="col-span-2" />
                                    </div>
                                </Section>
                            )}

                            {/* LEGAL TAB */}
                            {activeTab === 'legal' && (
                                <Section icon={Shield} title="Government Identifiers">
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                        <Field label="PAN Number" value={request.panNumber} />
                                        <Field label="GST Number" value={request.gstNumber || 'Not provided'} />
                                        <Field label="Registration Number" value={request.registrationNumber} />
                                    </div>
                                </Section>
                            )}

                            {/* DOCUMENTS TAB */}
                            {activeTab === 'documents' && (
                                <Section icon={FileText} title="Uploaded Documents">
                                    {documents.length > 0 ? (
                                        <div className="space-y-2">
                                            {documents.map((doc, idx) => (
                                                <DocumentRow key={idx} label={doc.label} url={doc.url} icon={doc.icon} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-400">
                                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p className="text-sm">No documents uploaded</p>
                                        </div>
                                    )}
                                </Section>
                            )}

                        </motion.div>
                    </AnimatePresence>
                </motion.div>

                {/* ── Footer ── */}
                {request.status === 'pending' && (
                    <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => { onApprove(request); onClose(); }}
                            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                        </button>
                        <button
                            onClick={() => { onClose(); onReject(request); }}
                            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <XCircle className="w-4 h-4" />
                            Deactivate
                        </button>
                    </div>
                )}

                {request.status !== 'pending' && (
                    <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-white transition-colors"
                        >
                            Close
                        </button>
                    </div>
                )}

            </motion.div>
        </div>,
        document.body
    );
};

export default OrganizationDetailsModal;