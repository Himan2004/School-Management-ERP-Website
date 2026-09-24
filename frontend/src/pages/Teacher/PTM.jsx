import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Calendar, Users, Clock, MapPin, Search, Filter, MessageSquare, Plus, Check, CalendarDays, Send
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Heading } from '../../components/shared/Common_Components';

const TeacherPTM = () => {
  const [activeTab, setActiveTab] = useState('Upcoming PTM');
  const [newComment, setNewComment] = useState('');

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [upcomingPTMs, setUpcomingPTMs] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionName, setSelectedSectionName] = useState('All Sections');

  const fetchPTMs = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/subject-teacher/ptms');
      if (response.data && response.data.data) {
        setUpcomingPTMs(response.data.data);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch PTMs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClassesSections = async () => {
    try {
      const response = await api.get('/subject-teacher/ptms/classes-sections');
      if (response.data && response.data.data) {
        setClassesList(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedClassId(response.data.data[0].id);
          if (response.data.data[0].sections?.length > 0) {
            setSelectedSectionName(response.data.data[0].sections[0].name);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch classes/sections:', error);
    }
  };

  useEffect(() => {
    fetchPTMs();
    fetchClassesSections();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (time24) => {
    if (!time24) return '';
    const [h, m] = time24.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  const formatTimeRange = (startTime, endTime) => {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  const formatClassSection = (cls, sec) => {
    if (cls === 'all') return 'All Classes';
    const sectionStr = sec === 'all' ? 'All Sections' : sec;
    return `${cls} - ${sectionStr}`;
  };

  const activeClassObj = classesList.find(c => c.id === selectedClassId);
  const activeSections = activeClassObj ? activeClassObj.sections : [];

  const visitors = [
    { id: 1, parentName: 'Rajesh Kumar', studentName: 'Aarav Kumar', class: '10-A', date: 'Oct 25, 2026', timeSlot: '09:15 AM', status: 'Confirmed' },
    { id: 2, parentName: 'Anita Sharma', studentName: 'Priya Sharma', class: '10-A', date: 'Oct 25, 2026', timeSlot: '09:30 AM', status: 'Pending' },
    { id: 3, parentName: 'Vikram Gupta', studentName: 'Rohan Gupta', class: '10-A', date: 'Oct 25, 2026', timeSlot: '09:45 AM', status: 'Confirmed' },
    { id: 4, parentName: 'Sanjay Patel', studentName: 'Karan Patel', class: '10-A', date: 'Oct 25, 2026', timeSlot: '10:00 AM', status: 'Confirmed' },
  ];

  const updates = [
    { id: 1, title: 'Term 1 PTM Schedule Finalized', message: 'The schedule for the upcoming Term 1 PTM has been finalized. Please ensure your slots are open.', date: 'Oct 20, 2026, 10:00 AM', postedBy: 'Admin' },
    { id: 2, title: 'Room Allocation Changed', message: 'Due to renovation, the venue for Class 10-A PTM is moved to the Main Hall.', date: 'Oct 21, 2026, 02:30 PM', postedBy: 'Principal' }
  ];

  const [comments, setComments] = useState([
    { id: 1, author: 'You', text: 'I have shared the progress reports with the parents.', time: '2 hours ago' },
    { id: 2, author: 'Admin', text: 'Please ensure all feedback forms are collected.', time: '1 day ago' },
  ]);

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setComments([...comments, { id: Date.now(), author: 'You', text: newComment, time: 'Just now' }]);
    setNewComment('');
    toast.success('Comment added successfully');
  };

  const handleSchedulePTM = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const classObj = classesList.find(c => c.id === selectedClassId);
    
    const payload = {
      title: formData.get('title'),
      className: classObj ? classObj.name : 'All Classes',
      sectionName: selectedSectionName,
      mode: formData.get('mode'),
      date: formData.get('date'),
      startTime: formData.get('startTime'),
      endTime: formData.get('endTime'),
      venue: formData.get('venue'),
      description: formData.get('description')
    };

    try {
      setIsProcessing(true);
      await api.post('/subject-teacher/ptms', payload);
      toast.success('PTM scheduled successfully');
      setIsScheduleModalOpen(false);
      fetchPTMs();
    } catch (error) {
      toast.error(error.message || 'Failed to schedule PTM');
    } finally {
      setIsProcessing(false);
    }
  };

  const tabs = ['Upcoming PTM', 'Visitors List', 'Updates', 'Discussion'];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      
      {/* ── HERO HEADER ── */}
      <div className="w-full mb-8">
        <Heading 
          primaryText="Parent Teacher" 
          secondaryText="Meeting (PTM)" 
          showAnimation={true}
          action={
            <button 
              onClick={() => setIsScheduleModalOpen(true)}
              className="bg-white text-[#223F74] px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-gray-50 transition-all shadow border border-transparent hover:border-gray-200"
            >
              <Calendar size={16} strokeWidth={2.5} />
              Schedule PTM
            </button>
          }
        />
        <div className="mb-6 mt-4">
          <p className="text-sm text-[#6B7280]">View upcoming parent-teacher meetings, visitor details, updates, and comments.</p>
        </div>
      </div>

      {/* ── TAB SWITCHER ── */}
      <div className="w-full mb-6 flex overflow-x-auto custom-scrollbar bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === tab 
                ? 'bg-[#F4F7FB] text-[#223F74] shadow-sm' 
                : 'text-[#6B7280] hover:text-[#1D1D1F] hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── CONTENT AREA ── */}
      
      {/* 1. UPCOMING PTM */}
      {activeTab === 'Upcoming PTM' && (
        isLoading ? (
          <div className="flex justify-center items-center py-12 w-full bg-white border border-[#E2E8F0] rounded-2xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#223F74]"></div>
          </div>
        ) : upcomingPTMs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 w-full bg-white border border-[#E2E8F0] rounded-2xl text-slate-500">
            <CalendarDays size={48} className="text-slate-300 mb-2" />
            <p className="font-bold">No upcoming PTMs found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {upcomingPTMs.map(ptm => (
              <div key={ptm.id} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all">
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold bg-blue-50 text-blue-600">
                      {ptm.status}
                    </span>
                    <span className="text-xs font-bold text-[#6B7280] bg-gray-100 px-2 py-1 rounded-md">
                      {formatClassSection(ptm.class, ptm.section)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1D1D1F] mb-4">{ptm.title}</h3>
                  
                  <div className="space-y-3 text-sm text-[#4B5563] bg-[#F8F9FA] p-4 rounded-xl border border-[#E2E8F0]/50">
                    <div className="flex items-center gap-3">
                      <CalendarDays size={18} className="text-[#8b5cf6]"/> 
                      <span className="font-medium">{formatDate(ptm.date)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock size={18} className="text-[#3b82f6]"/> 
                      <span>{formatTimeRange(ptm.startTime, ptm.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin size={18} className="text-[#ef4444]"/> 
                      <span className="truncate">{ptm.mode} • {ptm.venue}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* 2. VISITORS LIST */}
      {activeTab === 'Visitors List' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] bg-[#F8F9FA] flex justify-between items-center">
            <h3 className="font-bold text-[#1D1D1F] flex items-center gap-2">
              <Users size={18} className="text-[#223F74]" /> Visitors List
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search visitor..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#223F74] transition-colors" />
              </div>
              <button className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                <Filter size={16} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#F8F9FA] border-b border-[#E2E8F0]">
                <tr>
                  <th className="p-4 text-sm font-bold text-[#6B7280]">Parent/Visitor</th>
                  <th className="p-4 text-sm font-bold text-[#6B7280]">Student</th>
                  <th className="p-4 text-sm font-bold text-[#6B7280]">Class/Section</th>
                  <th className="p-4 text-sm font-bold text-[#6B7280]">Scheduled Time</th>
                  <th className="p-4 text-sm font-bold text-[#6B7280]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {visitors.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-[#1D1D1F]">{v.parentName}</p>
                    </td>
                    <td className="p-4 text-sm font-medium text-[#4B5563]">{v.studentName}</td>
                    <td className="p-4 text-sm text-[#6B7280]">{v.class}</td>
                    <td className="p-4 text-sm text-[#4B5563]">{v.date}, {v.timeSlot}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                        v.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. UPDATES LIST */}
      {activeTab === 'Updates' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
          <h3 className="font-bold text-[#1D1D1F] mb-6 flex items-center gap-2">
            <CalendarDays size={20} className="text-[#223F74]"/>
            PTM Updates & Announcements
          </h3>
          <div className="space-y-6">
            {updates.map(update => (
              <div key={update.id} className="flex gap-4 border-l-2 border-[#223F74] pl-4 py-1">
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-[#1D1D1F]">{update.title}</h4>
                    <span className="text-xs text-[#9CA3AF]">{update.date}</span>
                  </div>
                  <p className="text-sm text-[#4B5563] mb-2">{update.message}</p>
                  <p className="text-xs font-medium text-[#6B7280]">Posted by: <span className="text-[#223F74]">{update.postedBy}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. DISCUSSION / COMMENTS */}
      {activeTab === 'Discussion' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col h-[600px] overflow-hidden">
          <div className="p-5 border-b border-[#E2E8F0] bg-[#F8F9FA]">
            <h3 className="font-bold text-[#1D1D1F] flex items-center gap-2">
              <MessageSquare size={20} className="text-[#223F74]" /> PTM Discussion & Follow-ups
            </h3>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto bg-gray-50/50 space-y-4">
            {comments.map(c => (
              <div key={c.id} className={`flex flex-col ${c.author === 'You' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-bold text-[#4B5563]">{c.author}</span>
                  <span className="text-[10px] text-[#9CA3AF]">{c.time}</span>
                </div>
                <div className={`px-4 py-2.5 rounded-2xl max-w-[80%] text-sm ${
                  c.author === 'You' 
                    ? 'bg-[#223F74] text-white rounded-tr-sm shadow-md' 
                    : 'bg-white text-[#1D1D1F] border border-[#E2E8F0] rounded-tl-sm shadow-sm'
                }`}>
                  {c.text}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#E2E8F0] bg-white">
            <form onSubmit={handleAddComment} className="flex items-center gap-3">
              <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Type your comment or follow-up note here..." 
                className="flex-1 px-4 py-3 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#223F74] transition-colors bg-[#F8F9FA] focus:bg-white text-sm"
              />
              <button 
                type="submit" 
                disabled={!newComment.trim()}
                className="p-3 bg-[#223F74] text-white rounded-xl hover:bg-[#1a3059] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex-shrink-0"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── SCHEDULE PTM MODAL ── */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 bg-[#1D1D1F]/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-[#E2E8F0] flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-10">
              <h2 className="text-xl font-bold text-[#223F74] flex items-center gap-2">
                <CalendarDays size={24} className="text-[#8b5cf6]" />
                Schedule New PTM
              </h2>
              <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="p-2 bg-gray-50 text-[#6B7280] hover:text-[#1D1D1F] rounded-full hover:bg-gray-100 transition-colors">
                <Plus size={20} className="transform rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSchedulePTM} className="p-6 space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="col-span-full">
                  <label className="block text-sm font-bold text-[#4B5563] mb-1.5">PTM Title *</label>
                  <input name="title" required type="text" className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#223F74] focus:ring-1 focus:ring-[#223F74] transition-all bg-[#F8F9FA] focus:bg-white" placeholder="E.g., Term 1 Parent Teacher Meeting" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-[#4B5563] mb-1.5">Class *</label>
                  <select 
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      const clsObj = classesList.find(c => c.id === e.target.value);
                      if (clsObj && clsObj.sections?.length > 0) {
                        setSelectedSectionName(clsObj.sections[0].name);
                      } else {
                        setSelectedSectionName('All Sections');
                      }
                    }}
                    name="classId" 
                    required 
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#223F74] focus:ring-1 focus:ring-[#223F74] transition-all bg-[#F8F9FA] focus:bg-white appearance-none"
                  >
                    <option value="">Select Class</option>
                    {classesList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#4B5563] mb-1.5">Section *</label>
                  <select 
                    value={selectedSectionName}
                    onChange={(e) => setSelectedSectionName(e.target.value)}
                    name="sectionName" 
                    required 
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#223F74] focus:ring-1 focus:ring-[#223F74] transition-all bg-[#F8F9FA] focus:bg-white appearance-none"
                  >
                    {activeSections.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                    <option value="All Sections">All Sections</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#4B5563] mb-1.5">Mode *</label>
                  <select name="mode" required className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#223F74] focus:ring-1 focus:ring-[#223F74] transition-all bg-[#F8F9FA] focus:bg-white appearance-none">
                    <option value="In-Person">In-Person</option>
                    <option value="Online">Online</option>
                  </select>
                </div>

                <div className="col-span-full">
                  <label className="block text-sm font-bold text-[#4B5563] mb-1.5">Date *</label>
                  <input name="date" required type="date" className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#223F74] focus:ring-1 focus:ring-[#223F74] transition-all bg-[#F8F9FA] focus:bg-white" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#4B5563] mb-1.5">Start Time *</label>
                  <input name="startTime" required type="time" className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#223F74] focus:ring-1 focus:ring-[#223F74] transition-all bg-[#F8F9FA] focus:bg-white" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#4B5563] mb-1.5">End Time *</label>
                  <input name="endTime" required type="time" className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#223F74] focus:ring-1 focus:ring-[#223F74] transition-all bg-[#F8F9FA] focus:bg-white" />
                </div>

                <div className="col-span-full">
                  <label className="block text-sm font-bold text-[#4B5563] mb-1.5">Venue or Meeting Link *</label>
                  <input name="venue" required type="text" className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#223F74] focus:ring-1 focus:ring-[#223F74] transition-all bg-[#F8F9FA] focus:bg-white" placeholder="E.g., Main Hall or Zoom Link" />
                </div>

                <div className="col-span-full">
                  <label className="block text-sm font-bold text-[#4B5563] mb-1.5">Note / Description (Optional)</label>
                  <textarea name="description" rows="3" className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] focus:outline-none focus:border-[#223F74] focus:ring-1 focus:ring-[#223F74] transition-all bg-[#F8F9FA] focus:bg-white resize-none" placeholder="Enter any extra details..."></textarea>
                </div>
              </div>

              <div className="flex justify-end pt-5 border-t border-[#E2E8F0] gap-3 mt-6">
                <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="px-5 py-2.5 text-[#6B7280] font-bold hover:bg-[#F8F9FA] rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 bg-[#223F74] text-white font-bold rounded-xl hover:bg-[#1a3059] transition-all shadow-md shadow-[#223F74]/20 flex items-center gap-2">
                  <Check size={18} />
                  Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Custom Styles for Animations & Scrollbar ── */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #C4D0E0;
        }
      `}</style>
    </div>
  );
};

export default TeacherPTM;
