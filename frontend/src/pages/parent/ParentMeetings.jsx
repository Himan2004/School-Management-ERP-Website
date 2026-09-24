import React, { useState, useEffect, useMemo } from 'react';
import {
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Video,
  CalendarDays,
  BookOpen,
  Info,
  Loader2,
  MessageSquareText,
  GraduationCap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  DataTable,
  Modal,
  Button,
  ModalProfile,
  ModalGrid,
  ModalData,
  DataField,
  P,
  openModal,
  closeModal,
} from '../../components/shared/Common_Components';

// ─────────────────────────────────────────────────────────────────────────────
// API INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────
// Replace the bodies below with real API calls, e.g.:
//   const fetchPTMMeetings = () => ptmApi.getMyChildMeetings();
//   const acceptPTMMeeting = (id, payload) => ptmApi.acceptMeeting(id, payload);
//   const declinePTMMeeting = (id, payload) => ptmApi.declineMeeting(id, payload);
// Each should return a Promise resolving to the same shape used below so the
// rest of the component (state shape, handlers, UI) does not need to change.
// ─────────────────────────────────────────────────────────────────────────────
const fetchPTMMeetings = async () => {
  const response = await api.get('/parent/meetings');
  return response.data.data;
};

const acceptPTMMeeting = async (id, { selectedSlot, notes }) => {
  const response = await api.patch(`/parent/meetings/${id}/respond`, {
    response: 'yes',
    selectedSlot,
    notes,
  });
  return response.data;
};

const declinePTMMeeting = async (id, { declineReason }) => {
  const response = await api.patch(`/parent/meetings/${id}/respond`, {
    response: 'no',
    declineReason,
  });
  return response.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE — custom colours per PTM status (kept separate from DataTable's
// built-in "status" auto-badge so the exact labels from the spec can be used)
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  'Pending Response': ['bg-amber-100', 'text-amber-700'],
  Accepted: ['bg-emerald-100', 'text-emerald-700'],
  Declined: ['bg-rose-100', 'text-rose-700'],
  Completed: ['bg-blue-100', 'text-blue-700'],
  Cancelled: ['bg-slate-200', 'text-slate-600'],
};

const StatusBadge = ({ status }) => {
  const [bg, text] = STATUS_STYLES[status] ?? ['bg-slate-100', 'text-slate-600'];
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${bg} ${text}`}>
      {status}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SLOT PICKER CHIP — reused in both the details view and the Accept modal
// ─────────────────────────────────────────────────────────────────────────────
const SlotChip = ({ slot, selected, onClick, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`flex items-center gap-2 w-full text-left px-4 py-3 rounded-2xl border text-sm font-bold transition-all duration-150 ${
      selected
        ? 'border-[#223F74] text-[#223F74] bg-[#F4F7FB] shadow-sm'
        : 'border-[#E2E8F0] text-[#334155] bg-white hover:border-[#7A8FC6] hover:bg-[#F8FAFC]'
    } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span
      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
        selected ? 'bg-[#223F74] border-[#223F74]' : 'bg-white border-[#94A3B8]'
      }`}
    >
      {selected && (
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
    <Clock size={14} className="flex-shrink-0 opacity-60" />
    {slot}
  </button>
);

const ParentMeeting = () => {
  // ── Data state ──────────────────────────────────────────────────────────
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Selected meeting for each modal ─────────────────────────────────────
  const [detailsMeeting, setDetailsMeeting] = useState(null);
  const [acceptMeeting, setAcceptMeeting] = useState(null);
  const [declineMeeting, setDeclineMeeting] = useState(null);

  // ── Accept modal local form state ───────────────────────────────────────
  const [acceptSlot, setAcceptSlot] = useState('');
  const [acceptNote, setAcceptNote] = useState('');
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);

  // ── Decline modal local form state ──────────────────────────────────────
  const [declineReason, setDeclineReason] = useState('');
  const [declineError, setDeclineError] = useState('');
  const [declineSubmitting, setDeclineSubmitting] = useState(false);

  // ── Initial load ─────────────────────────────────────────────────────────

  const loadData = (isMounted = { current: true }) => {
    setLoading(true);
    setError('');
    fetchPTMMeetings()
      .then((data) => {
        if (isMounted.current) {
          setMeetings(data ?? []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted.current) {
          setError(err.message || 'Something went wrong while loading meetings');
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    const isMounted = { current: true };
    loadData(isMounted);
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ── Helper: patch a single meeting in local state ───────────────────────
  const updateMeetingRecord = (id, updates) => {
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    return {
      total: meetings.length,
      pending: meetings.filter((m) => m.status === 'Pending Response').length,
      accepted: meetings.filter((m) => m.status === 'Accepted').length,
      declined: meetings.filter((m) => m.status === 'Declined').length,
    };
  }, [meetings]);

  // ── View details ─────────────────────────────────────────────────────────
  const handleViewDetails = (meeting) => {
    setDetailsMeeting(meeting);
    openModal('ptm-details-modal');
  };

  // ── Accept flow ──────────────────────────────────────────────────────────
  const handleOpenAccept = (meeting) => {
    setAcceptMeeting(meeting);
    setAcceptSlot('');
    setAcceptNote('');
    openModal('ptm-accept-modal');
  };

  const handleSubmitAccept = async () => {
    if (!acceptSlot) {
      toast.error('Please select a meeting slot to continue');
      return;
    }
    setAcceptSubmitting(true);
    try {
      await acceptPTMMeeting(acceptMeeting.id, { selectedSlot: acceptSlot, notes: acceptNote.trim() });
      updateMeetingRecord(acceptMeeting.id, {
        status: 'Accepted',
        selectedSlot: acceptSlot,
        notes: acceptNote.trim(),
      });
      closeModal('ptm-accept-modal');
      toast.success(`Meeting with ${acceptMeeting.teacherName} accepted`);
      setAcceptMeeting(null);
    } catch (err) {
      toast.error(err.message || 'Failed to accept meeting');
    } finally {
      setAcceptSubmitting(false);
    }
  };

  // ── Decline flow ─────────────────────────────────────────────────────────
  const handleOpenDecline = (meeting) => {
    setDeclineMeeting(meeting);
    setDeclineReason('');
    setDeclineError('');
    openModal('ptm-decline-modal');
  };

  const handleSubmitDecline = async () => {
    if (!declineReason.trim()) {
      setDeclineError('Please provide a reason for declining this meeting');
      toast.error('Decline reason is required');
      return;
    }
    setDeclineSubmitting(true);
    try {
      await declinePTMMeeting(declineMeeting.id, { declineReason: declineReason.trim() });
      updateMeetingRecord(declineMeeting.id, {
        status: 'Declined',
        declineReason: declineReason.trim(),
      });
      closeModal('ptm-decline-modal');
      toast.success(`Meeting with ${declineMeeting.teacherName} declined`);
      setDeclineMeeting(null);
    } catch (err) {
      toast.error(err.message || 'Failed to decline meeting');
    } finally {
      setDeclineSubmitting(false);
    }
  };

  // ── Table config ─────────────────────────────────────────────────────────
  const columns = [
    { key: 'teacherName', label: 'Teacher' },
    { key: 'subject', label: 'Subject' },
    { key: 'title', label: 'Meeting Title' },
    {
      key: 'meetingDate',
      label: 'Date',
      render: (val) =>
        val ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    },
    { key: 'time', label: 'Time' },
    { key: 'mode', label: 'Mode' },
    { key: 'statusLabel', label: 'Status', render: (_, row) => <StatusBadge status={row.status} /> },
  ];

  const actions = [
    {
      icon: <Eye size={14} />,
      tooltip: 'View Details',
      variant: 'ghost',
      show: (row) => !row.isSkeleton,
      onClick: (row) => handleViewDetails(row),
    },
    {
      icon: <CheckCircle2 size={14} />,
      tooltip: 'Accept',
      variant: 'success',
      show: (row) => !row.isSkeleton && row.status === 'Pending Response',
      onClick: (row) => handleOpenAccept(row),
    },
    {
      icon: <XCircle size={14} />,
      tooltip: 'Decline',
      variant: 'danger',
      show: (row) => !row.isSkeleton && row.status === 'Pending Response',
      onClick: (row) => handleOpenDecline(row),
    },
    {
      icon: <Video size={14} />,
      tooltip: 'Join Meeting',
      variant: 'primary',
      show: (row) => !row.isSkeleton && row.status === 'Accepted' && row.mode === 'Online' && row.meetingLink,
      onClick: (row) => window.open(row.meetingLink.startsWith('http') ? row.meetingLink : `https://${row.meetingLink}`, '_blank', 'noopener,noreferrer'),
    },
  ];

  const formatDate = (val) =>
    val ? new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6 text-left">

      {/* Header */}
      <Heading primaryText="Parent-Teacher " secondaryText="Meetings" size={12} />

      {/* Stat Cards */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard title="Total Invitations" value={String(stats.total)} icon={<GraduationCap size={22} />} accentColor="#7A8FC6" size={3} />
        <EnhancedDashCard title="Pending Response" value={String(stats.pending)} icon={<Clock size={22} />} accentColor="#E0A04B" size={3} />
        <EnhancedDashCard title="Accepted" value={String(stats.accepted)} icon={<CheckCircle2 size={22} />} accentColor="#5B9A6A" size={3} />
        <EnhancedDashCard title="Declined" value={String(stats.declined)} icon={<XCircle size={22} />} accentColor="#D66B5F" size={3} />
      </DashGrid>

      {error && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-rose-50 border border-rose-100 text-rose-800">
          <div className="flex items-center gap-3">
            <XCircle className="text-rose-500 flex-shrink-0" size={20} />
            <div className="text-sm font-semibold text-left">
              <p className="font-bold">Failed to load meeting invitations</p>
              <p className="text-xs text-rose-600/80 mt-0.5">{error}</p>
            </div>
          </div>
          <Button 
            text="Retry Loading" 
            variant="danger" 
            size={3} 
            onClick={() => loadData()} 
          />
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 bg-[#F4F7FB] border border-[#E2E8F0] rounded-3xl w-full">
          <Loader2 className="animate-spin text-[#223F74]" size={36} />
          <span className="text-sm font-bold text-[#223F74]">Loading meetings...</span>
        </div>
      )}

      {/* PTM Table */}
      {!loading && !error && (
        <DataTable
          title="My PTM Invitations"
          columns={columns}
          rows={meetings}
          actions={actions}
          size={12}
          pageSize={5}
          searchable={true}
          date={true}
          defaultSortKey="meetingDate"
          defaultSortDir="desc"
          emptyMessage="No meeting invitations yet"
          filters={[
            {
              title: 'Status',
              type: 'toggle',
              key: 'status',
              options: ['Pending Response', 'Accepted', 'Declined', 'Completed', 'Cancelled'],
            },
            {
              title: 'Meeting Type',
              type: 'select',
              key: 'subject',
              options: ['PTM'],
            },
          ]}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          DETAILS MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal id="ptm-details-modal" title="Meeting Details" size="lg">
        {detailsMeeting && (
          <div className="flex flex-col gap-5">
            <ModalProfile
              name={detailsMeeting.teacherName}
              subtitle={`${detailsMeeting.subject} · ${detailsMeeting.title}`}
              meta={`Meeting Date: ${formatDate(detailsMeeting.meetingDate)}`}
            />

            <div className="flex items-center justify-center">
              <StatusBadge status={detailsMeeting.status} />
            </div>

            <ModalGrid title="Meeting Agenda" cols={1}>
              <ModalData label="Description" value={detailsMeeting.description} />
            </ModalGrid>

            <ModalGrid title="Venue / Online Link" cols={2}>
              <ModalData
                label="Location"
                value={
                  detailsMeeting.location ? (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} className="flex-shrink-0" />
                      {detailsMeeting.location}
                    </span>
                  ) : (
                    'Not applicable'
                  )
                }
              />
              <ModalData
                label="Online Meeting Link"
                value={
                  detailsMeeting.meetingLink ? (
                    <a
                      href={detailsMeeting.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-[#223F74] underline underline-offset-2"
                    >
                      <Video size={13} className="flex-shrink-0" />
                      Join Online
                    </a>
                  ) : (
                    'Not applicable'
                  )
                }
              />
            </ModalGrid>

            {/* Confirmed slot — accepted meetings only */}
            {detailsMeeting.status === 'Accepted' && (
              <ModalGrid title="Selected Slot" cols={2}>
                <ModalData label="Confirmed Slot" value={detailsMeeting.selectedSlot} />
                <ModalData label="Meeting Date" value={formatDate(detailsMeeting.meetingDate)} />
              </ModalGrid>
            )}

            {/* Available slots — shown for pending meetings as read-only reference */}
            {detailsMeeting.status === 'Pending Response' && (
              <ModalGrid title="Available Time Slots" cols={1}>
                <div className="flex flex-col gap-2">
                  {(detailsMeeting.availableSlots ?? []).map((slot) => (
                    <SlotChip key={slot} slot={slot} selected={false} disabled onClick={() => {}} />
                  ))}
                </div>
              </ModalGrid>
            )}

            {/* Decline reason */}
            {detailsMeeting.status === 'Declined' && (
              <ModalGrid title="Decline Reason" cols={1}>
                <ModalData label="Reason" value={detailsMeeting.declineReason} />
              </ModalGrid>
            )}

            {/* Additional notes */}
            {detailsMeeting.notes && (
              <ModalGrid title="Additional Notes" cols={1}>
                <ModalData label="Notes" value={detailsMeeting.notes} />
              </ModalGrid>
            )}

            {/* Instructions — supplied per-meeting by the API */}
            {detailsMeeting.instructions && detailsMeeting.instructions.length > 0 && (
              <ModalGrid title="Instructions for This Meeting" cols={1}>
                <div className="flex flex-col gap-1.5">
                  {detailsMeeting.instructions.map((line, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-[#1D1D1F] font-medium">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#223F74] flex-shrink-0" />
                      {line}
                    </div>
                  ))}
                </div>
              </ModalGrid>
            )}

            {/* Actions — only for Pending Response meetings */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button text="Close" variant="ghost" size={3} onClick={() => closeModal('ptm-details-modal')} />
              {detailsMeeting.status === 'Pending Response' && (
                <>
                  <Button
                    text="Decline"
                    variant="danger"
                    icon={<XCircle size={16} />}
                    size={3}
                    onClick={() => {
                      closeModal('ptm-details-modal');
                      handleOpenDecline(detailsMeeting);
                    }}
                  />
                  <Button
                    text="Accept Meeting"
                    variant="success"
                    icon={<CheckCircle2 size={16} />}
                    size={4}
                    onClick={() => {
                      closeModal('ptm-details-modal');
                      handleOpenAccept(detailsMeeting);
                    }}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          ACCEPT MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal id="ptm-accept-modal" title="Accept Meeting Invitation" size="md">
        {acceptMeeting && (
          <div className="flex flex-col gap-5">
            <ModalProfile
              name={acceptMeeting.teacherName}
              subtitle={`${acceptMeeting.subject} · ${acceptMeeting.title}`}
              meta={`Meeting Date: ${formatDate(acceptMeeting.meetingDate)}`}
            />

            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-[#6B7280] uppercase tracking-[0.3em]">
                Select a Slot <span className="text-[#D66B5F]">*</span>
              </label>
              <div className="flex flex-col gap-2">
                {(acceptMeeting.availableSlots ?? []).map((slot) => (
                  <SlotChip
                    key={slot}
                    slot={slot}
                    selected={acceptSlot === slot}
                    onClick={() => setAcceptSlot(slot)}
                  />
                ))}
              </div>
              {!acceptSlot && (
                <p className="text-xs font-semibold text-[#E0A04B] flex items-center gap-1 ml-1">
                  <Info size={12} />
                  Selecting a slot is required to accept this meeting
                </p>
              )}
            </div>

            <DataField
              label="Note to Teacher (Optional)"
              id="accept-note"
              type="textarea"
              rows={3}
              placeholder="Add any note for the teacher, e.g. a specific concern you'd like to discuss..."
              value={acceptNote}
              onChange={(e) => setAcceptNote(e.target.value)}
            />

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button text="Cancel" variant="ghost" size={3} onClick={() => closeModal('ptm-accept-modal')} />
              <Button
                text="Confirm Acceptance"
                variant="success"
                icon={<CheckCircle2 size={16} />}
                size={5}
                disabled={!acceptSlot || acceptSubmitting}
                loading={acceptSubmitting}
                onClick={handleSubmitAccept}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════
          DECLINE MODAL
      ══════════════════════════════════════════════════════════════════ */}
      <Modal id="ptm-decline-modal" title="Decline Meeting Invitation" size="md">
        {declineMeeting && (
          <div className="flex flex-col gap-5">
            <ModalProfile
              name={declineMeeting.teacherName}
              subtitle={`${declineMeeting.subject} · ${declineMeeting.title}`}
              meta={`Meeting Date: ${formatDate(declineMeeting.meetingDate)}`}
            />

            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-100">
              <MessageSquareText size={16} className="text-[#D66B5F] flex-shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-[#D66B5F]">
                Please let the teacher know why you're unable to attend so the meeting can be rescheduled if needed.
              </p>
            </div>

            <DataField
              label="Reason for Declining"
              id="decline-reason"
              type="textarea"
              rows={4}
              placeholder="Please share your reason for declining this meeting..."
              value={declineReason}
              onChange={(e) => {
                setDeclineReason(e.target.value);
                if (declineError) setDeclineError('');
              }}
              error={declineError}
            />

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <Button text="Cancel" variant="ghost" size={3} onClick={() => closeModal('ptm-decline-modal')} />
              <Button
                text="Confirm Decline"
                variant="danger"
                icon={<XCircle size={16} />}
                size={4}
                disabled={declineSubmitting}
                loading={declineSubmitting}
                onClick={handleSubmitDecline}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ParentMeeting;