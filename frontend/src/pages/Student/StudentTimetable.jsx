import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, User, MapPin,
  Loader2, X, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { studentApi } from '../../services/api/studentApi';
import SharedTimetableViewer from '../../components/shared/SharedTimetableViewer';
import { Grid, Heading, Button } from '../../components/shared/Common_Components';

const StudentTimetable = () => {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [timetable, setTimetable] = useState({ subjects: [], schedule: [], days: [], timeSlots: [], breakSlots: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const res = await studentApi.getTimetable();
        const payload = res?.data || res;
        setTimetable({
          subjects: payload?.subjects || [],
          schedule: payload?.schedule || [],
          days: payload?.days || [],
          timeSlots: payload?.timeSlots || [],
          breakSlots: payload?.breakSlots || [],
        });
        setError(null);
      } catch (err) {
        console.error('Error fetching timetable:', err);
        setError(err?.message || 'Failed to load timetable');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleClassClick = (classItem) => {
    const subjectDetails = timetable.subjects?.find(s => s.id === classItem.subjectId);
    setSelectedClass({ ...classItem, subjectDetails });
    setShowDetailsModal(true);
  };

  const handleExport = () => {
    const exportData = { timetable, exportDate: new Date().toISOString() };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = `timetable_${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    toast.success('Timetable exported');
  };

  return (
    <div className="pr-4 sm:pr-6 pb-24">
      <Grid cols={12} gap={6}>
        <Heading
          primaryText="Timetable"
          secondaryText="& Schedule"
          size={12}
        />

        {loading ? (
          <div className="col-span-12 flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#223F74]" />
            <span className="ml-2 text-gray-500">Loading timetable...</span>
          </div>
        ) : error ? (
          <div className="col-span-12 flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-gray-500">{error}</p>
          </div>
        ) : (
          <div className="col-span-12">
            <SharedTimetableViewer
              data={timetable}
              onCellClick={handleClassClick}
              onExport={handleExport}
              readOnly={true}
              title="Weekly Slots Aggregate Load For Student"
            />
          </div>
        )}
      </Grid>

      {/* Class Details Modal */}
      {showDetailsModal && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowDetailsModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-[#223F74] px-6 py-5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Class Details</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: `${selectedClass.color || '#4f46e5'}20`, color: selectedClass.color || '#4f46e5' }}>
                  <BookOpen className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">{selectedClass.subject}</h2>
                <p className="text-sm text-gray-500 mt-1">Class ID: {selectedClass.id}</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Day & Time</span>
                  <span className="text-sm font-medium text-gray-800">{selectedClass.day}, {selectedClass.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Duration</span>
                  <span className="text-sm font-medium text-gray-800">{selectedClass.subjectDetails?.duration || '60 min'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Credits</span>
                  <span className="text-sm font-medium text-gray-800">{selectedClass.subjectDetails?.credits || 4}</span>
                </div>
              </div>
              <div className="bg-[#F8F9FE] rounded-2xl p-4 border border-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{selectedClass.teacher}</p>
                    <p className="text-xs text-gray-500">{selectedClass.subjectDetails?.teacherEmail || 'teacher@school.com'}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-indigo-100">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    <span className="text-gray-700 font-medium">Room: {selectedClass.room}</span>
                  </div>
                </div>
              </div>
              {selectedClass.topic && (
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                  <p className="text-sm font-medium text-amber-800 mb-1">Today's Topic</p>
                  <p className="text-sm text-gray-700">{selectedClass.topic}</p>
                </div>
              )}
              {selectedClass.notes && (
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                  <p className="text-sm font-medium text-blue-800 mb-1">Important Notes</p>
                  <p className="text-sm text-gray-700">{selectedClass.notes}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button text="Close" variant="secondary" onClick={() => setShowDetailsModal(false)} />
                <Button 
                  text="View Materials" 
                  variant="primary" 
                  onClick={() => { 
                    setShowDetailsModal(false);
                    navigate('/student/study-material', { state: { subject: selectedClass.subject } });
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentTimetable;