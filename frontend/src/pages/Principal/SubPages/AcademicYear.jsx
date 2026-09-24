import React, { useState, useEffect } from 'react';
import { X, Lock,Unlock, Archive, Eye, Edit2, Plus, Trash2 } from 'lucide-react';
import {
  getAcademicYears,
  createAcademicYear,
  updateAcademicYearStatus,
  addTerm,
  updateAcademicYear,
  deleteAcademicYear
} from '../../../services/api/PrincipalSettingApi';

const AcademicYear = () => {
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(false);

  // We fallback to empty string so the app doesn't crash on null
  const schoolId = localStorage.getItem("schoolId") || "";

  const currentYear = academicYears.find(y => y.status === 'Active');
  const daysRemaining = currentYear
    ? Math.max(0, Math.ceil((new Date(currentYear.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  // State management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const [lockConfirm, setLockConfirm] = useState('');
  const [archiveConfirm, setArchiveConfirm] = useState('');
  const [showTermModal, setShowTermModal] = useState(false);
  const [selectedYearForTerms, setSelectedYearForTerms] = useState(currentYear);
  
  // Edit State
  const [editingId, setEditingId] = useState(null);

  // Form state
  const defaultYearState = {
    name: '',
    startDate: '',
    endDate: '',
    workingDays: 0,
    description: '',
    holidays: [],
    workingDaysConfig: {
      Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: false, Sunday: false
    }
  };
  
  const [newYear, setNewYear] = useState(defaultYearState);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', type: 'National' });
  const [newTerm, setNewTerm] = useState({ name: '', startDate: '', endDate: '', description: '' });

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  const fetchAcademicYears = async () => {
    try {
      setLoading(true);
      const response = await getAcademicYears();
      if (response.success) {
        setAcademicYears(response.data.academicYears || []);
        if (response.data.currentYear) {
          setSelectedYearForTerms(response.data.currentYear);
        }
      }
    } catch (error) {
      console.error("Error fetching academic years:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setNewYear(defaultYearState);
    setShowCreateModal(true);
  };

  const handleEditYear = (year) => {
    setEditingId(year._id);
    setNewYear({
      name: year.name,
      startDate: new Date(year.startDate).toISOString().split('T')[0],
      endDate: new Date(year.endDate).toISOString().split('T')[0],
      workingDays: year.workingDays,
      description: year.description || '',
      holidays: year.holidays || [],
      workingDaysConfig: year.workingDaysConfig || defaultYearState.workingDaysConfig
    });
    setShowCreateModal(true);
  };

  const handleDeleteYear = async (id) => {
    if (window.confirm("Are you sure you want to delete this academic year? This action cannot be undone.")) {
      try {
        await deleteAcademicYear(id);
        await fetchAcademicYears();
      } catch (error) {
        alert("Failed to delete. Ensure your API routes are correctly set up.");
      }
    }
  };

  const handleSaveYear = async () => {
    try {
      if (editingId) {
        await updateAcademicYear(editingId, newYear);
      } else {
        await createAcademicYear(schoolId, newYear);
      }
      
      await fetchAcademicYears();
      setShowCreateModal(false);
      setNewYear(defaultYearState);
    } catch (error) {
      console.error("Error saving academic year:", error);
      alert(error?.response?.data?.message || "Failed to save academic year");
    }
  };

  const handleAddHoliday = () => {
    if (newHoliday.name && newHoliday.date) {
      setNewYear({ ...newYear, holidays: [...newYear.holidays, { ...newHoliday }] });
      setNewHoliday({ name: '', date: '', type: 'National' });
    }
  };

  const handleRemoveHoliday = (index) => {
    setNewYear({ ...newYear, holidays: newYear.holidays.filter((_, i) => i !== index) });
  };

  const handleLockYear = (year) => { 
    setSelectedYear(year); 
    setShowLockModal(true); 
    setLockConfirm(''); 
  };
  
  const handleConfirmLock = async () => {
    if (lockConfirm === 'LOCK') {
      await updateAcademicYearStatus(selectedYear._id, 'Locked');
      await fetchAcademicYears();
      setShowLockModal(false); 
      setSelectedYear(null);
    }
  };
  
  const handleArchiveYear = (year) => { 
    setSelectedYear(year); 
    setShowArchiveModal(true); 
    setArchiveConfirm(''); 
  };
  
  const handleConfirmArchive = async () => {
    if (archiveConfirm === 'ARCHIVE') {
      await updateAcademicYearStatus(selectedYear._id, 'Archived');
      await fetchAcademicYears();
      setShowArchiveModal(false); 
      setSelectedYear(null);
    }
  };

  const handleUnlockYear = async (year) => {
    if (window.confirm(`Are you sure you want to unlock ${year.name}? This will make it the Active year again.`)) {
      try {
        await updateAcademicYearStatus(year._id, 'Active');
        await fetchAcademicYears();
      } catch (error) {
        alert("Failed to unlock the year.");
      }
    }
  };
  
  const handleAddTerm = async () => {
    if (newTerm.name && newTerm.startDate && newTerm.endDate) {
      await addTerm(selectedYearForTerms._id, newTerm);
      await fetchAcademicYears();
      setNewTerm({ name: '', startDate: '', endDate: '', description: '' });
      setShowTermModal(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return 'bg-green-100 text-green-700';
      case 'Locked': return 'bg-red-100 text-red-700';
      case 'Upcoming': return 'bg-yellow-100 text-yellow-700';
      case 'Archived': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pb-12">
      {loading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#223F74] blur-3xl opacity-20 animate-pulse"></div>
            <div className="relative bg-white/90 backdrop-blur-xl border border-white/30 shadow-2xl rounded-3xl px-10 py-8 flex flex-col items-center">
              <div className="relative w-20 h-20 mb-5">
                <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#223F74] animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-indigo-500 animate-spin [animation-direction:reverse] [animation-duration:1.5s]"></div>
                <div className="absolute inset-[26%] bg-gradient-to-r from-[#223F74] to-indigo-600 rounded-full animate-pulse shadow-lg"></div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 tracking-wide">Loading Academic Data</h3>
              <p className="text-sm text-gray-500 mt-1">Please wait while we fetch details...</p>
              <div className="flex gap-1 mt-4">
                <span className="w-2 h-2 bg-[#223F74] rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-[#223F74] rounded-full animate-bounce delay-150"></span>
                <span className="w-2 h-2 bg-[#223F74] rounded-full animate-bounce delay-300"></span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Premium Header */}
      <div className="mb-6 rounded-2xl overflow-hidden bg-gradient-to-r from-[#223F74] via-[#2A4A82] to-[#1A2F56] shadow-lg shadow-[#223F74]/20 mx-6 mt-6">
        <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Academic Year Settings
            </h1>
            <p className="text-sm text-slate-300 mt-0.5">
              Manage academic years and session configuration
            </p>
          </div>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20 active:scale-95"
          >
            <Plus size={16} />
            Create Academic Year
          </button>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-[#F59B87] via-[#E0A04B] to-[#5B9A6A]"></div>
      </div>

      <main className="text-left px-6">

        {currentYear && (
          <div className="bg-white border border-slate-200 border-l-4 border-l-[#223F74] rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">📅 Current Academic Year</p>
                <h2 className="text-2xl font-bold text-gray-900">{currentYear.name}</h2>
                <p className="text-gray-600 mt-1">
                  {new Date(currentYear.startDate).toLocaleDateString()} - {new Date(currentYear.endDate).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <span className={`inline-block px-4 py-2 rounded-full font-medium text-sm ${getStatusColor(currentYear.status)} w-fit`}>
                  {currentYear.status}
                </span>
                <p className="text-gray-700 font-medium">{daysRemaining} days remaining</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Academic Years</h2>
          <div className="space-y-4">
            {academicYears.map((year) => (
              <div key={year._id} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{year.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">
                      {new Date(year.startDate).toLocaleDateString()} - {new Date(year.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`inline-block px-4 py-2 rounded-full font-medium text-sm ${getStatusColor(year.status)} w-fit`}>
                    {year.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600 text-sm">Working Days</p>
                    <p className="text-2xl font-bold text-gray-900">{year.workingDays || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600 text-sm">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{year.totalStudents || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600 text-sm">Total Exams</p>
                    <p className="text-2xl font-bold text-gray-900">{year.totalExams || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600 text-sm">Holidays</p>
                    <p className="text-2xl font-bold text-gray-900">{year.holidays?.length || 0}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {year.status === 'Active' && (
                    <button onClick={() => handleLockYear(year)} className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm">
                      <Lock size={16} /> Lock Year
                    </button>
                  )}
                  {year.status === 'Locked' && (
                    <>
                      <button onClick={() => handleUnlockYear(year)} className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-2 rounded-lg transition text-sm">
                        <Unlock size={16} /> Unlock
                      </button>
                      <button onClick={() => handleArchiveYear(year)} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition text-sm">
                        <Archive size={16} /> Archive
                      </button>
                    </>
                  )}
                  <button onClick={() => { setSelectedYear(year); setShowDetailDrawer(true); }} className="flex items-center gap-2 bg-[#223F74]/10 text-[#223F74] px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95">
                    <Eye size={16} /> View Details
                  </button>
                  
                  {(year.status === 'Active' || year.status === 'Upcoming') && (
                    <>
                      <button onClick={() => handleEditYear(year)} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition text-sm">
                        <Edit2 size={16} /> Edit
                      </button>
                      <button onClick={() => handleDeleteYear(year._id)} className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg transition text-sm">
                        <Trash2 size={16} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedYearForTerms && (
          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Term Configuration for {selectedYearForTerms.name}</h2>
              </div>
              <button
                onClick={() => setShowTermModal(true)}
                className="flex items-center gap-2 bg-[#223F74] hover:bg-[#1a3360] text-white px-4 py-2 rounded-lg font-bold transition text-sm w-fit transition-all active:scale-95"
              >
                <Plus size={18} />
                Add Term
              </button>
            </div>

            {selectedYearForTerms.terms && selectedYearForTerms.terms.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedYearForTerms.terms.map((term) => (
                  <div key={term.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">{term.name}</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p><span className="font-medium">Start Date:</span> {new Date(term.startDate).toLocaleDateString()}</p>
                      <p><span className="font-medium">End Date:</span> {new Date(term.endDate).toLocaleDateString()}</p>
                      <p><span className="font-medium">Duration:</span> {calculateDays(term.startDate, term.endDate)} days</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No terms configured yet. Add a term to get started.</p>
            )}
          </div>
        )}

        {/* Modal/Drawer Overlays */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">{editingId ? 'Edit' : 'Create'} Academic Year</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year Name *</label>
                    <input type="text" placeholder="e.g., 2025-26" value={newYear.name} onChange={(e) => setNewYear({ ...newYear, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                      <input type="date" value={newYear.startDate} onChange={(e) => setNewYear({ ...newYear, startDate: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                      <input type="date" value={newYear.endDate} onChange={(e) => setNewYear({ ...newYear, endDate: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
                    <input type="number" value={newYear.workingDays} onChange={(e) => setNewYear({ ...newYear, workingDays: parseInt(e.target.value) })} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                    <textarea value={newYear.description} onChange={(e) => setNewYear({ ...newYear, description: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">Working Days Configuration</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(newYear.workingDaysConfig).map(([day, isWorking]) => (
                      <label key={day} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isWorking}
                          disabled={day === 'Sunday'}
                          onChange={(e) => setNewYear({
                            ...newYear,
                            workingDaysConfig: { ...newYear.workingDaysConfig, [day]: e.target.checked }
                          })}
                          className="w-5 h-5 rounded"
                        />
                        <span className="text-gray-700 font-medium">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-900">Configure Holidays</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input type="text" placeholder="Holiday Name" value={newHoliday.name} onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-lg" />
                      <input type="date" value={newHoliday.date} onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="flex gap-3">
                      <select value={newHoliday.type} onChange={(e) => setNewHoliday({ ...newHoliday, type: e.target.value })} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg">
                        <option>National</option>
                        <option>Religious</option>
                        <option>School</option>
                        <option>Summer Break</option>
                        <option>Winter Break</option>
                      </select>
                      <button onClick={handleAddHoliday} className="bg-[#223F74] hover:bg-[#1a3360] text-white px-6 py-3 rounded-lg font-medium transition-all active:scale-95">Add</button>
                    </div>
                  </div>

                  {newYear.holidays.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {newYear.holidays.map((holiday, index) => (
                        <div key={index} className="bg-[#223F74]/10 text-[#223F74] px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold">
                          <span>{holiday.name} ({new Date(holiday.date).toLocaleDateString()})</span>
                          <button onClick={() => handleRemoveHoliday(index)} className="hover:text-blue-900"><X size={18} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <button onClick={() => setShowCreateModal(false)} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={handleSaveYear} className="flex-1 px-6 py-3 bg-[#223F74] hover:bg-[#1a3360] text-white font-bold rounded-lg transition-all active:scale-95">{editingId ? 'Save Changes' : 'Create Year'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showDetailDrawer && selectedYear && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="absolute right-0 top-0 bottom-0 w-full md:w-96 bg-white shadow-xl overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">{selectedYear.name}</h2>
                <button onClick={() => setShowDetailDrawer(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={24} /></button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Session Details</h3>
                  <div className="space-y-3">
                    <div><p className="text-gray-600 text-sm">Start Date</p><p className="text-gray-900 font-medium">{new Date(selectedYear.startDate).toLocaleDateString()}</p></div>
                    <div><p className="text-gray-600 text-sm">End Date</p><p className="text-gray-900 font-medium">{new Date(selectedYear.endDate).toLocaleDateString()}</p></div>
                    <div><p className="text-gray-600 text-sm">Status</p><span className={`inline-block px-3 py-1 rounded-full font-medium text-sm ${getStatusColor(selectedYear.status)} mt-1`}>{selectedYear.status}</span></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between"><p className="text-gray-600">Working Days</p><p className="text-gray-900 font-medium">{selectedYear.workingDays || 0}</p></div>
                    <div className="flex justify-between"><p className="text-gray-600">Total Students</p><p className="text-gray-900 font-medium">{selectedYear.totalStudents || 0}</p></div>
                    <div className="flex justify-between"><p className="text-gray-600">Total Exams</p><p className="text-gray-900 font-medium">{selectedYear.totalExams || 0}</p></div>
                  </div>
                </div>

                {selectedYear.holidays && selectedYear.holidays.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-3">Holidays ({selectedYear.holidays.length})</h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {selectedYear.holidays.map((holiday, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-gray-900 font-medium text-sm">{holiday.name}</p>
                            <span className="text-xs bg-[#223F74]/10 text-[#223F74] px-2 py-1 rounded font-semibold">{holiday.type}</span>
                          </div>
                          <p className="text-gray-600 text-xs mt-1">{new Date(holiday.date).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lock Confirmation Modal */}
        {showLockModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Lock Academic Year</h2>
                <button onClick={() => setShowLockModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-gray-900 font-medium mb-3">
                    Are you sure you want to lock {selectedYear?.name}?
                  </p>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p className="flex items-center gap-2"><span className="text-red-600">✗</span> No new admissions can be added</p>
                    <p className="flex items-center gap-2"><span className="text-red-600">✗</span> Marks cannot be edited</p>
                    <p className="flex items-center gap-2"><span className="text-red-600">✗</span> Fee structure cannot be changed</p>
                    <p className="flex items-center gap-2"><span className="text-green-600">✓</span> Data will be preserved for records</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type "LOCK" to confirm</label>
                  <input
                    type="text"
                    value={lockConfirm}
                    onChange={(e) => setLockConfirm(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type LOCK"
                  />
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setShowLockModal(false)} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
                  <button
                    onClick={handleConfirmLock}
                    disabled={lockConfirm !== 'LOCK'}
                    className={`flex-1 px-6 py-3 font-medium rounded-lg transition ${
                      lockConfirm === 'LOCK' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Lock Year
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Archive Confirmation Modal */}
        {showArchiveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Archive Academic Year</h2>
                <button onClick={() => setShowArchiveModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-gray-900 font-medium">Are you sure you want to archive {selectedYear?.name}?</p>
                  <p className="text-sm text-gray-600 mt-2">This academic year will be moved to archived records and will not appear in active lists.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type "ARCHIVE" to confirm</label>
                  <input
                    type="text"
                    value={archiveConfirm}
                    onChange={(e) => setArchiveConfirm(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type ARCHIVE"
                  />
                </div>

                <div className="flex gap-4">
                  <button onClick={() => setShowArchiveModal(false)} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
                  <button
                    onClick={handleConfirmArchive}
                    disabled={archiveConfirm !== 'ARCHIVE'}
                    className={`flex-1 px-6 py-3 font-medium rounded-lg transition ${
                      archiveConfirm === 'ARCHIVE' ? 'bg-gray-600 hover:bg-gray-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Archive Year
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Term Modal */}
        {showTermModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
              <div className="border-b border-gray-200 p-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Add Term</h2>
                <button onClick={() => setShowTermModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Term Name *</label>
                  <input type="text" placeholder="e.g., First Term" value={newTerm.name} onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                    <input type="date" value={newTerm.startDate} onChange={(e) => setNewTerm({ ...newTerm, startDate: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                    <input type="date" value={newTerm.endDate} onChange={(e) => setNewTerm({ ...newTerm, endDate: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <textarea placeholder="Add notes..." value={newTerm.description} onChange={(e) => setNewTerm({ ...newTerm, description: e.target.value })} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowTermModal(false)} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition">Cancel</button>
                  <button onClick={handleAddTerm} className="flex-1 px-6 py-3 bg-[#223F74] hover:bg-[#1a3360] text-white font-bold rounded-lg transition-all active:scale-95">Add Term</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AcademicYear;