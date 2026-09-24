import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Eye, Edit2, Trash2, CheckCircle, AlertTriangle, Users, X } from 'lucide-react';
import {
  Button,
  DashGrid,
  DataField,
  EnhancedDashCard,
  Grid,
  Heading,
  Modal,
  Option,
  PanelModal,
  SelectField,
  ToggleButton,
  closeModal,
  openModal,
  ModalGrid,
  ModalData,
} from '../../../components/shared/Common_Components.jsx';
import DatePicker from '../../../components/shared/DatePicker.jsx';
import {
  getPrincipalMeetingsApi,
  getPrincipalMeetingStatsApi,
  createPrincipalMeetingApi,
  updatePrincipalMeetingApi,
  cancelPrincipalMeetingApi
} from '../../../services/api/principalCommunicationApi';

const FORM_MODAL_ID = 'schedule-meeting-modal';
const ATTENDANCE_MODAL_ID = 'meeting-attendance-modal';
const DELETE_MODAL_ID = 'cancel-meeting-modal';
const MEETING_TYPES = ['PTM', 'Staff Meeting', 'Parent Meeting'];
const MEETING_STATUSES = ['Upcoming', 'Completed', 'Cancelled'];
const SLOT_DURATIONS = [
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
  { value: '20', label: '20 min' },
  { value: '30', label: '30 min' },
];

// Removed 'principal' from allowed roles
const ALLOWED_ROLES = ['all', 'admin', 'accountant', 'teacher', 'parents', 'students'];
const CARD = 'rounded-[28px] border border-slate-100 bg-white shadow-sm';

const SectionHeader = ({ title }) => (
  <div className="flex items-center gap-2 px-4 py-2.5 rounded-t-2xl bg-[#223F74]">
    <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
    <p className="text-xs font-black text-white uppercase tracking-[0.18em]">{title}</p>
  </div>
);

const typeColors = {
  PTM: 'bg-blue-100 text-blue-800 border-blue-200',
  'Staff Meeting': 'bg-purple-100 text-purple-800 border-purple-200',
  'Parent Meeting': 'bg-green-100 text-green-800 border-green-200',
  'Board Meeting': 'bg-orange-100 text-orange-800 border-orange-200',
};

const statusColors = {
  Upcoming: 'bg-amber-100 text-amber-800',
  Completed: 'bg-green-100 text-green-800',
  Cancelled: 'bg-rose-100 text-rose-800',
};

const Meetings = () => {
  const [meetings, setMeetings] = useState([]);
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalMeetings: 0,
    upcomingMeetings: 0,
    totalSlots: 0,
    confirmedSlots: 0,
  });
  const [formData, setFormData] = useState({
    title: '',
    type: 'PTM',
    date: '',
    startTime: '14:00',
    endTime: '17:00',
    venue: '',
    participants: '',
    slotDuration: '15',
    sendNotification: true,
  });

  const selectedRoles = formData.participants
    ? formData.participants.split(',').map((r) => r.trim()).filter(Boolean)
    : [];

  const toggleRole = (role) => {
    const updated = selectedRoles.includes(role)
      ? selectedRoles.filter((r) => r !== role)
      : [...selectedRoles, role];
    setFormData({ ...formData, participants: updated.join(', ') });
  };

  const normalizeMeeting = (meeting) => ({
    id: meeting.id || meeting._id,
    title: meeting.title || '',
    type: meeting.type || 'PTM',
    date: meeting.date || new Date().toISOString().split('T')[0],
    startTime: meeting.startTime || '14:00',
    endTime: meeting.endTime || '17:00',
    venue: meeting.venue || 'School Campus',
    participants: meeting.participants || 'All Teachers',
    slotDuration: meeting.slotDuration || null,
    status: meeting.status || 'Upcoming',
    slots: meeting.slots || [],
  });

  const buildMeetingPayload = (payload) => ({
    title: payload.title,
    type: payload.type,
    date: payload.date,
    startTime: payload.startTime,
    endTime: payload.endTime,
    venue: payload.venue,
    participants: payload.participants,
    slotDuration: payload.slotDuration ? parseInt(payload.slotDuration, 10) : null,
  });

  const fetchMeetingData = async () => {
    setLoading(true);
    setError('');
    try {
      const [meetingsRes, statsRes] = await Promise.all([
        getPrincipalMeetingsApi(),
        getPrincipalMeetingStatsApi(),
      ]);
      const list = Array.isArray(meetingsRes?.data) ? meetingsRes.data : [];
      setMeetings(list.map(normalizeMeeting));
      setStats(statsRes?.data || {
        totalMeetings: 0,
        upcomingMeetings: 0,
        totalSlots: 0,
        confirmedSlots: 0,
      });
    } catch (err) {
      setError(err?.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMeetingData(); }, []);

  useEffect(() => {
    let filtered = meetings;
    if (searchTerm) filtered = filtered.filter((m) => m.title.toLowerCase().includes(searchTerm.toLowerCase()));
    if (typeFilter !== 'All') filtered = filtered.filter((m) => m.type === typeFilter);
    if (statusFilter !== 'All') filtered = filtered.filter((m) => m.status === statusFilter);
    if (dateFrom) filtered = filtered.filter((m) => new Date(m.date) >= new Date(dateFrom));
    if (dateTo) filtered = filtered.filter((m) => new Date(m.date) <= new Date(dateTo));
    setFilteredMeetings(filtered);
  }, [searchTerm, typeFilter, statusFilter, dateFrom, dateTo, meetings]);

  const statCards = useMemo(() => [
    { title: 'Total Meetings', value: String(stats.totalMeetings || 0), accentColor: '#223F74' },
    { title: 'Upcoming', value: String(stats.upcomingMeetings || 0), accentColor: '#E0A04B' },
    { title: 'Total Slots', value: String(stats.totalSlots || 0), accentColor: '#8B5CF6' },
    { title: 'Confirmations', value: String(stats.confirmedSlots || 0), accentColor: '#5B9A6A' },
  ], [stats]);

  const handleScheduleClick = () => {
    setEditingId(null);
    setFormData({
      title: '',
      type: 'PTM',
      date: '',
      startTime: '14:00',
      endTime: '17:00',
      venue: '',
      participants: '',
      slotDuration: '15',
      sendNotification: true,
    });
    openModal(FORM_MODAL_ID);
  };

  const handleEdit = (meeting) => {
    setEditingId(meeting.id);
    setFormData({
      title: meeting.title,
      type: meeting.type,
      date: meeting.date,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      venue: meeting.venue,
      participants: meeting.participants,
      slotDuration: meeting.slotDuration ? meeting.slotDuration.toString() : '15',
      sendNotification: true,
    });
    openModal(FORM_MODAL_ID);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.date || !formData.venue.trim()) {
      alert('Please fill all required fields');
      return;
    }
    try {
      setSubmitting(true);
      if (editingId) {
        await updatePrincipalMeetingApi(editingId, buildMeetingPayload(formData));
        alert('Meeting updated successfully');
      } else {
        await createPrincipalMeetingApi(buildMeetingPayload(formData));
        alert('Meeting scheduled successfully');
      }
      await fetchMeetingData();
      closeModal(FORM_MODAL_ID);
    } catch (err) {
      alert(err?.message || 'Failed to save meeting');
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = (meeting) => {
    setSelectedMeeting(meeting);
    openModal('view-meeting-modal');
  };

  const handleViewAttendance = (meeting) => {
    setSelectedMeeting(meeting);
    const attendanceObj = {};
    ['Ms. Priya', 'Mr. Raj', 'Ms. Anjali', 'Mr. Vikram', 'Mr. Dev', 'Ms. Rita', 'Mr. Arun', 'Ms. Neha'].forEach((teacher) => {
      attendanceObj[teacher] = true;
    });
    setAttendanceData(attendanceObj);
    openModal(ATTENDANCE_MODAL_ID);
  };

  const handleDelete = (meeting) => {
    setSelectedMeeting(meeting);
    openModal(DELETE_MODAL_ID);
  };

  const confirmDelete = async () => {
    try {
      await cancelPrincipalMeetingApi(selectedMeeting.id);
      await fetchMeetingData();
      closeModal(DELETE_MODAL_ID);
      alert('Meeting cancelled');
    } catch (err) {
      alert(err?.message || 'Failed to cancel meeting');
    }
  };

  const saveAttendance = () => {
    alert('Attendance saved successfully');
    closeModal(ATTENDANCE_MODAL_ID);
  };

  return (
    <div className="w-full space-y-6 text-left pb-10">
      {loading && (
        <div className="mb-6 flex items-center justify-center min-h-[120px]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#223F74] border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-2xl border border-red-200 bg-red-50 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Page Header (Removed Secondary Text) */}
      <div className="flex flex-col gap-4 mb-6">
        <Heading
          primaryText="Meeting Schedule"
          showAnimations={true}
        />
      </div>

      <DashGrid cols={12} gap={4}>
        {statCards.map((c) => (
          <EnhancedDashCard key={c.title} title={c.title} value={c.value} accentColor={c.accentColor} size={3} />
        ))}
      </DashGrid>

      {/* Moved Schedule Button here, directly below the cards */}
      <div className="flex justify-end mt-6">
        <div className="w-56">
          <Button text="Schedule Meeting" icon={<Plus size={16} />} onClick={handleScheduleClick} size={12} />
        </div>
      </div>

      <div className={`${CARD} p-4 mt-6 mb-6`}>
        <Grid cols={12} gap={4}>
          <div className="col-span-12 lg:col-span-4">
            <DataField
              label="Search"
              id="meeting_search"
              placeholder="Search by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size={12}
            />
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <SelectField
              label="Type"
              id="meeting_type_filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              searchable={false}
              size={12}
            >
              <Option value="All" label="All" />
              {MEETING_TYPES.map((t) => <Option key={t} value={t} label={t} />)}
            </SelectField>
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-4">
            <SelectField
              label="Status"
              id="meeting_status_filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              searchable={false}
              size={12}
            >
              <Option value="All" label="All" />
              {MEETING_STATUSES.map((s) => <Option key={s} value={s} label={s} />)}
            </SelectField>
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-6">
            <DatePicker
              label="From Date"
              value={dateFrom}
              onChange={(val) => setDateFrom(val)}
            />
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-6">
            <DatePicker
              label="To Date"
              value={dateTo}
              onChange={(val) => setDateTo(val)}
            />
          </div>
        </Grid>
      </div>

      <div className="space-y-4">
        {filteredMeetings.length === 0 ? (
          <div className={`${CARD} p-12 text-center`}>
            <p className="text-slate-500 font-semibold">No meetings found</p>
          </div>
        ) : (
          filteredMeetings.map((meeting) => (
            <div key={meeting.id} className={`${CARD} p-5 hover:shadow-md transition`}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${typeColors[meeting.type] || 'bg-slate-100 text-slate-700'}`}>
                    {meeting.type}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[meeting.status] || 'bg-slate-100 text-slate-700'}`}>
                    {meeting.status}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleView(meeting)} className="p-2 hover:bg-[#F8EEE9] rounded-xl text-[#223F74]" title="View"><Eye size={16} /></button>
                  <button onClick={() => handleEdit(meeting)} className="p-2 hover:bg-[#F8EEE9] rounded-xl text-[#223F74]" title="Edit"><Edit2 size={16} /></button>
                  {meeting.status === 'Completed' && (
                    <button onClick={() => handleViewAttendance(meeting)} className="p-2 hover:bg-green-50 rounded-xl text-green-600" title="Attendance"><CheckCircle size={16} /></button>
                  )}
                  <button onClick={() => handleDelete(meeting)} className="p-2 hover:bg-rose-50 rounded-xl text-rose-600" title="Cancel"><Trash2 size={16} /></button>
                </div>
              </div>

              <h3 className="text-lg font-black text-slate-800 mb-3">{meeting.title}</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 text-sm font-medium text-slate-500">
                <p>{new Date(meeting.date).toLocaleDateString()}</p>
                <p>{meeting.startTime} – {meeting.endTime}</p>
                <p>{meeting.venue}</p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 font-medium">
                {/* Replaced generic participant text to only show if participants exist and are not "0 staff" */}
                {meeting.participants && !meeting.participants.startsWith('0 ') && (
                   <span className="flex items-center gap-1.5"><Users size={14} /> {meeting.participants}</span>
                )}
                {meeting.type === 'PTM' && meeting.slots?.length > 0 && (
                  <span>
                    {meeting.slots.length} slots · {meeting.slots.filter((s) => s.status === 'Confirmed').length} confirmed
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* View Meeting Modal */}
      <Modal id="view-meeting-modal" title="Meeting Details" size="md">
        {selectedMeeting && (
          <div className="space-y-6 pt-2">
            <div>
              <h3 className="text-2xl font-black text-slate-800 mb-3">{selectedMeeting.title}</h3>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-black border ${typeColors[selectedMeeting.type]}`}>
                  {selectedMeeting.type}
                </span>
                <span className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-black border ${statusColors[selectedMeeting.status]}`}>
                  {selectedMeeting.status}
                </span>
              </div>
            </div>

            <ModalGrid cols={2}>
              <ModalData label="Meeting Title" value={selectedMeeting.title || 'N/A'} />
              <ModalData label="Meeting Type" value={selectedMeeting.type || 'N/A'} />
              <ModalData label="Date" value={selectedMeeting.date ? new Date(selectedMeeting.date).toLocaleDateString() : 'N/A'} />
              <ModalData label="Venue" value={selectedMeeting.venue || 'N/A'} />
              <ModalData label="Start Time" value={selectedMeeting.startTime || 'N/A'} />
              <ModalData label="End Time" value={selectedMeeting.endTime || 'N/A'} />
              {selectedMeeting.type === 'PTM' && (
                <ModalData label="Slot Duration" value={selectedMeeting.slotDuration ? `${selectedMeeting.slotDuration} minutes` : 'N/A'} />
              )}
              <ModalData label="Participants" value={selectedMeeting.participants && !selectedMeeting.participants.startsWith('0 ') ? selectedMeeting.participants : 'N/A'} />
            </ModalGrid>

            {selectedMeeting.type === 'PTM' && selectedMeeting.slots?.length > 0 && (
              <div>
                <p className="text-xs font-black uppercase text-[#223F74] tracking-widest mb-3 border-b border-slate-100 pb-2">PTM Slot Booking</p>
                <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F8EEE9] border-b border-[#E7E2DB]">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-[#6B7280]">Time</th>
                        <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-[#6B7280]">Student</th>
                        <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider text-[#6B7280]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMeeting.slots.map((slot, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="px-3 py-2 font-bold text-slate-700">{slot.time}</td>
                          <td className="px-3 py-2 font-medium text-slate-600">{slot.studentName}</td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full font-black ${slot.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                                slot.status === 'Pending' ? 'bg-amber-100 text-amber-800' :
                                  'bg-slate-100 text-slate-700'
                              }`}>{slot.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button text="Close" onClick={() => closeModal('view-meeting-modal')} variant="secondary" size={4} />
            </div>
          </div>
        )}
      </Modal>

      {/* Schedule Meeting Modal */}
      <Modal id={FORM_MODAL_ID} title={editingId ? 'Edit Meeting' : 'Schedule Meeting'} size="lg">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[#E2E8F0]">
            <SectionHeader title="Meeting Details" />
            <div className="p-4">
              <DashGrid cols={12} gap={4}>
                <DataField
                  label="Meeting Title *"
                  id="meeting_title"
                  placeholder="e.g. PTM - Class 6"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  size={12}
                />
                <SelectField
                  label="Meeting Type *"
                  id="meeting_type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  searchable={false}
                  size={6}
                >
                  {MEETING_TYPES.map((t) => <Option key={t} value={t} label={t} />)}
                </SelectField>
                <DataField
                  label="Date *"
                  id="meeting_date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  size={6}
                />
                <DataField
                  label="Venue *"
                  id="meeting_venue"
                  placeholder="Meeting venue or building location"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  size={12}
                />
              </DashGrid>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0]">
            <SectionHeader title="Schedule" />
            <div className="p-4">
              <DashGrid cols={12} gap={4}>
                <DataField label="Start Time" id="meeting_start" type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} size={6} />
                <DataField label="End Time" id="meeting_end" type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} size={6} />
                {formData.type === 'PTM' && (
                  <SelectField
                    label="Slot Duration"
                    id="meeting_slot"
                    value={formData.slotDuration}
                    onChange={(e) => setFormData({ ...formData, slotDuration: e.target.value })}
                    searchable={false}
                    size={6}
                  >
                    {SLOT_DURATIONS.map((d) => <Option key={d.value} value={d.value} label={d.label} />)}
                  </SelectField>
                )}
              </DashGrid>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0]">
            <SectionHeader title="Participants" />
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {ALLOWED_ROLES.map((role) => {
                  const selected = selectedRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleRole(role)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition ${selected ? 'bg-[#223F74] text-white shadow-md' : 'bg-[#F8EEE9] text-[#223F74] border border-[#E7E2DB] hover:bg-[#F59B87]/10'
                        }`}
                    >
                      {role.replace('_', ' ')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 px-1">
            <ToggleButton
              checked={formData.sendNotification}
              onChange={(checked) => setFormData({ ...formData, sendNotification: checked })}
              label="Send notification"
              labelOff="No notification"
              size="sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1 border-t border-slate-100">
            <Button text="Cancel" variant="secondary" onClick={() => closeModal(FORM_MODAL_ID)} size={3} />
            <Button
              text={submitting ? 'Saving…' : editingId ? 'Update Meeting' : 'Schedule Meeting'}
              loading={submitting}
              disabled={submitting}
              onClick={handleSave}
              size={3}
            />
          </div>
        </div>
      </Modal>

      {/* Attendance Modal */}
      <Modal id={ATTENDANCE_MODAL_ID} title={selectedMeeting?.title || 'Attendance'} size="md">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-slate-500">Mark teacher attendance</p>
          <div className="space-y-2">
            {Object.keys(attendanceData).map((teacher) => (
              <label key={teacher} className="flex items-center gap-3 p-3 border border-slate-100 rounded-2xl hover:bg-[#F8EEE9]/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={attendanceData[teacher]}
                  onChange={(e) => setAttendanceData({ ...attendanceData, [teacher]: e.target.checked })}
                  className="rounded border-[#E7E2DB] text-[#223F74] focus:ring-[#223F74]"
                />
                <span className="text-slate-800 font-semibold flex-1">{teacher}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${attendanceData[teacher] ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                  {attendanceData[teacher] ? 'Present' : 'Absent'}
                </span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button text="Cancel" variant="secondary" onClick={() => closeModal(ATTENDANCE_MODAL_ID)} size={3} />
            <Button text="Save Attendance" variant="success" onClick={saveAttendance} size={3} />
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal id={DELETE_MODAL_ID} title="Cancel Meeting" size="sm">
        {selectedMeeting && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 rounded-full"><AlertTriangle size={24} className="text-rose-600" /></div>
              <p className="text-slate-600 text-sm font-medium">
                Cancel <strong className="text-slate-800">{selectedMeeting.title}</strong>? This cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button text="Keep Meeting" variant="secondary" onClick={() => closeModal(DELETE_MODAL_ID)} size={3} />
              <Button text="Cancel Meeting" variant="danger" onClick={confirmDelete} size={3} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Meetings;