import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  Search,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ExternalLink,
  BookOpen,
  Lock,
} from 'lucide-react';
import { getPrincipalPolicies } from '../../../services/api/principalPolicyApi';

// ─── Status badge component ─────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const configs = {
    Active: {
      icon: <CheckCircle size={12} />,
      cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    },
    Inactive: {
      icon: <XCircle size={12} />,
      cls: 'bg-red-100 text-red-700 border border-red-200',
    },
    Draft: {
      icon: <Clock size={12} />,
      cls: 'bg-amber-100 text-amber-700 border border-amber-200',
    },
  };
  const cfg = configs[status] || configs.Draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
      {cfg.icon}
      {status}
    </span>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </div>
  </div>
);

// ─── Policy Row Card ─────────────────────────────────────────────────────────
const PolicyCard = ({ policy, onView }) => {
  const uploadDate = policy.uploadedAt
    ? new Date(policy.uploadedAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date(policy.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const fileSizeKB = policy.bytes ? (policy.bytes / 1024).toFixed(1) : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5">
      <div className="flex items-start justify-between gap-4">
        {/* Left: icon + info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#223F74] to-[#2A4A82] flex items-center justify-center flex-shrink-0">
            <FileText size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 text-sm truncate mb-1">{policy.policyName}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {uploadDate}
              </span>
              {policy.uploadedBy && (
                <span className="flex items-center gap-1">
                  <Shield size={11} />
                  {policy.uploadedBy}
                </span>
              )}
              {fileSizeKB && (
                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-mono">
                  {fileSizeKB} KB
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Right: status + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={policy.status} />
          <button
            onClick={() => onView(policy)}
            className="p-2 rounded-xl hover:bg-[#223F74]/10 text-[#223F74] transition-colors group"
            title="View Policy"
          >
            <Eye size={16} className="group-hover:scale-110 transition-transform" />
          </button>
          {policy.pdfFile && (
            <a
              href={policy.pdfFile}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl hover:bg-emerald-50 text-emerald-600 transition-colors group"
              title="Download PDF"
            >
              <Download size={16} className="group-hover:scale-110 transition-transform" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Policy Detail Modal ──────────────────────────────────────────────────────
const PolicyModal = ({ policy, onClose }) => {
  if (!policy) return null;

  const uploadDate = new Date(policy.uploadedAt || policy.createdAt).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#223F74] via-[#2A4A82] to-[#1A2F56] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <FileText size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">{policy.policyName}</h2>
                <p className="text-white/70 text-xs mt-0.5">Policy Document</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white transition-colors text-lg font-semibold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <StatusBadge status={policy.status} />
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Uploaded By</p>
              <p className="text-sm font-semibold text-gray-800">{policy.uploadedBy || 'Administrator'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Upload Date</p>
              <p className="text-sm font-semibold text-gray-800">{uploadDate}</p>
            </div>
            {policy.bytes && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">File Size</p>
                <p className="text-sm font-semibold text-gray-800">{(policy.bytes / 1024).toFixed(1)} KB</p>
              </div>
            )}
          </div>

          {/* Read-only note */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
            <Lock size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              This policy is managed by your school administration. Contact your administrator for any changes.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            {policy.pdfFile && (
              <a
                href={policy.pdfFile}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#223F74] to-[#2A4A82] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <ExternalLink size={15} />
                Open PDF
              </a>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const PolicyApprovals = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPolicies = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await getPrincipalPolicies();
      setPolicies(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load policies. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = policies.filter((p) => {
    const matchesSearch =
      search === '' ||
      p.policyName.toLowerCase().includes(search.toLowerCase()) ||
      (p.uploadedBy && p.uploadedBy.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total: policies.length,
    active: policies.filter((p) => p.status === 'Active').length,
    inactive: policies.filter((p) => p.status === 'Inactive').length,
    draft: policies.filter((p) => p.status === 'Draft').length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#223F74] via-[#2A4A82] to-[#1A2F56] px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center">
                <Shield size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Policy Approvals</h1>
                <p className="text-white/70 text-sm mt-0.5">
                  View organization policies issued by your administrator
                </p>
              </div>
            </div>
            <button
              onClick={() => fetchPolicies(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-sm font-medium transition-colors backdrop-blur border border-white/20"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {/* Stat cards */}
          {!loading && !error && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {[
                { label: 'Total Policies', value: stats.total, color: 'bg-white/20', textColor: 'text-white' },
                { label: 'Active', value: stats.active, color: 'bg-emerald-400/30', textColor: 'text-emerald-100' },
                { label: 'Inactive', value: stats.inactive, color: 'bg-red-400/30', textColor: 'text-red-100' },
                { label: 'Draft', value: stats.draft, color: 'bg-amber-400/30', textColor: 'text-amber-100' },
              ].map((s) => (
                <div key={s.label} className={`${s.color} rounded-xl p-4 backdrop-blur border border-white/10`}>
                  <p className={`text-2xl font-bold ${s.textColor}`}>{s.value}</p>
                  <p className="text-white/60 text-xs font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Error state ─────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-700 text-sm">Failed to load policies</p>
              <p className="text-red-600 text-xs mt-1">{error}</p>
              <button
                onClick={() => fetchPolicies()}
                className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* ── Loading skeleton ─────────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-2/5" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                  <div className="h-6 bg-gray-100 rounded-full w-16" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Filters ────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search policies by name or uploader…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#223F74]/30 focus:border-[#223F74] transition-all"
                />
              </div>

              {/* Status filter */}
              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-8 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#223F74]/30 focus:border-[#223F74] transition-all cursor-pointer"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Draft">Draft</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* ── Results info ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of{' '}
                <span className="font-semibold text-gray-700">{policies.length}</span> policies
              </p>
              {(search || statusFilter !== 'All') && (
                <button
                  onClick={() => { setSearch(''); setStatusFilter('All'); }}
                  className="text-xs text-[#223F74] hover:underline font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* ── Policy list ───────────────────────────────────────────── */}
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {policies.length === 0 ? (
                    <BookOpen size={28} className="text-gray-300" />
                  ) : (
                    <Search size={28} className="text-gray-300" />
                  )}
                </div>
                <h3 className="text-gray-500 font-semibold mb-1">
                  {policies.length === 0 ? 'No Policies Found' : 'No Results'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {policies.length === 0
                    ? 'Your administrator has not uploaded any policies yet.'
                    : 'Try adjusting your search or filter criteria.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((policy) => (
                  <PolicyCard
                    key={policy._id}
                    policy={policy}
                    onView={setSelectedPolicy}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Policy Detail Modal ───────────────────────────────────────────── */}
      {selectedPolicy && (
        <PolicyModal
          policy={selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
        />
      )}
    </div>
  );
};

export default PolicyApprovals;
