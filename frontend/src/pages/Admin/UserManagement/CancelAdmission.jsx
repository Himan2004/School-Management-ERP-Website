import React, { useState, useEffect } from 'react';
import { UserX, Search, AlertTriangle, Trash2, X, Info, CheckCircle2, Eye, User, Calendar, Phone, Loader2, UserCircle } from 'lucide-react';
import { getAllStudents, getClasses } from '../../../services/api/principalStudentApi';
import { cancelAdmission } from '../../../services/api/principalAdmissionApi';
import toast from 'react-hot-toast';
import { Heading } from '../../../components/shared/Common_Components';

const CancelAdmission = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [classesList, setClassesList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  const [selectedStudent, setSelectedStudent] = useState(null); 
  const [studentToCancel, setStudentToCancel] = useState(null); 
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [checklist, setChecklist] = useState({
    library: false,
    fees: false,
    inventory: false
  });

  // Fetch classes and sections on mount
  useEffect(() => {
    const fetchClassesList = async () => {
      try {
        const res = await getClasses();
        if (res.success) {
          setClassesList(res.data?.classes || res.data || []);
          setSectionsList(res.data?.sections || []);
        }
      } catch (error) {
        console.error('Failed to fetch classes:', error);
      }
    };
    fetchClassesList();
  }, []);

  // Fetch students based on filters & search query
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        limit: 50,
        status: 'active'
      };

      if (classFilter !== 'all') params.classId = classFilter;
      if (sectionFilter !== 'all') params.section = sectionFilter;
      if (searchTerm.trim()) params.search = searchTerm;

      const response = await getAllStudents(params);
      if (response.success) {
        setStudents(response.data || []);
      } else {
        setStudents([]);
      }
    } catch (error) {
      toast.error("Failed to load students");
      console.error(error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStudents();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [classFilter, sectionFilter, searchTerm]);

  const handleConfirmCancel = async () => {
    if (!cancelReason) return;

    try {
      setCancelLoading(true);
      await cancelAdmission(studentToCancel._id, {
        reason: cancelReason,
        remarks: "Cancelled via Admission Management dashboard",
        clearanceChecklist: checklist,
        isAdmissionRequest: !!studentToCancel.isAdmissionRequest 
      });
      
      toast.success(`Admission cancelled for ${studentToCancel.user?.name || studentToCancel.name}`);
      setStudents(students.filter(s => s._id !== studentToCancel._id));
      setStudentToCancel(null);
      setCancelReason("");
      setChecklist({ library: false, fees: false, inventory: false });
    } catch (error) {
      toast.error(error.response?.data?.message || "Cancellation failed");
      console.error(error);
    } finally {
      setCancelLoading(false);
    }
  };

  // Helpers to safely read properties
  const getStudentName = (stu) => {
    return stu.user?.name || stu.name || 'Unknown';
  };

  const getStudentPhoto = (stu) => {
    const name = getStudentName(stu);
    return stu.user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1e40af&color=fff`;
  };

  const getParentName = (stu) => {
    return stu.parent?.user?.name || stu.parent?.fatherName || stu.parentName || 'N/A';
  };

  const getClassName = (stu) => {
    return stu.class?.name || stu.class || 'N/A';
  };

  const getSectionName = (stu) => {
    return stu.section?.name || stu.section || 'N/A';
  };

  return (
    <div className="w-full space-y-6 text-left">
      {/* Header */}
      <Heading
        primaryText="Cancel"
        secondaryText="Admission"
        size={12}
        showAnimations={true}
      />

        {/* Filter Section */}
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-10 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                placeholder="Search by Roll No, Enrollment ID or Name..."
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-100 rounded-2xl focus:border-blue-600 outline-none transition-all font-bold text-gray-700 shadow-inner bg-gray-50/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Class Filter */}
            <div className="relative">
              <select
                className="w-full p-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-700 focus:border-blue-600 outline-none bg-gray-50/50 cursor-pointer appearance-none"
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setSectionFilter('all');
                }}
              >
                <option value="all">All Classes</option>
                {classesList.map(cls => (
                  <option key={cls._id} value={cls._id}>{cls.name}</option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div className="relative">
              <select
                className="w-full p-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-700 focus:border-blue-600 outline-none bg-gray-50/50 disabled:opacity-50 cursor-pointer appearance-none"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                disabled={classFilter === 'all'}
              >
                <option value="all">All Sections</option>
                {sectionsList.map((sec, idx) => (
                  <option key={idx} value={sec._id || sec}>{sec.name || sec}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                setSearchTerm('');
                setClassFilter('all');
                setSectionFilter('all');
              }}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-sm uppercase tracking-tighter"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Results Grid - Student Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative min-h-[250px]">
          {loading && (
            <div className="absolute inset-0 bg-gray-50/70 z-10 flex items-center justify-center rounded-[3rem]">
              <Loader2 className="animate-spin text-blue-600" size={40} />
            </div>
          )}

          {students.map((stu) => (
            <div key={stu._id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300">
              
              {/* Card Header: Student Identity */}
              <div className="p-6 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg overflow-hidden">
                    <img 
                      src={getStudentPhoto(stu)} 
                      className="w-full h-full object-cover rounded-2xl"
                      alt=""
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-800 uppercase truncate max-w-[200px]">{getStudentName(stu)}</h2>
                    <p className="text-blue-600 font-bold text-xs tracking-widest uppercase">Roll No: {stu.rollNo || 'N/A'}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase italic ${stu.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {stu.status}
                </span>
              </div>

              {/* Card Content: Details */}
              <div className="p-6 grid grid-cols-2 gap-4 bg-white">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-500">
                    <User size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Father's Name:</span>
                  </div>
                  <p className="text-xs font-black text-gray-800 ml-6 truncate">{getParentName(stu)}</p>

                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Class | Section:</span>
                  </div>
                  <p className="text-xs font-black text-gray-800 ml-6">{getClassName(stu)} - {getSectionName(stu)}</p>
                </div>

                <div className="space-y-3 border-l border-gray-50 pl-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Contact:</span>
                  </div>
                  <p className="text-xs font-black text-gray-800 ml-6">{stu.user?.phone || stu.phone || 'N/A'}</p>

                  <div className="flex items-center gap-2 text-gray-500">
                    <CheckCircle2 size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Blood Group:</span>
                  </div>
                  <p className="text-xs font-black text-red-600 ml-6">{stu.bloodGroup || 'N/A'}</p>
                </div>
              </div>

              {/* Card Footer: Action Buttons */}
              <div className="p-4 bg-gray-50 flex gap-3">
                <button 
                  onClick={() => setSelectedStudent(stu)}
                  className="flex-1 bg-white border border-gray-200 py-3 rounded-xl font-black text-gray-600 text-xs flex items-center justify-center gap-2 hover:bg-gray-100 transition-all uppercase tracking-tighter"
                >
                  <Eye size={16} /> View Profile
                </button>
                <button 
                  onClick={() => setStudentToCancel(stu)}
                  className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all uppercase tracking-tighter shadow-sm"
                >
                  <Trash2 size={16} /> Cancel Admission
                </button>
              </div>
            </div>
          ))}
          
          {students.length === 0 && !loading && (
             <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                <UserCircle size={64} className="mx-auto text-gray-100 mb-4" />
                <h3 className="text-xl font-black text-gray-400 uppercase tracking-tighter">No active students to display</h3>
                <p className="text-gray-400 font-medium">Try adjusting your filters or search query</p>
             </div>
          )}
        </div>

        {/* --- MODAL 1: FULL STUDENT DETAILS --- */}
        {selectedStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95">
              <button onClick={() => setSelectedStudent(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-800 transition-colors bg-gray-100 p-2 rounded-full">
                <X size={24} />
              </button>
              
              <div className="bg-blue-600 p-10 text-white flex items-center gap-6">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center font-black text-4xl shadow-2xl border border-white/30 overflow-hidden">
                    <img src={getStudentPhoto(selectedStudent)} className="w-full h-full object-cover" alt="" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tight">{getStudentName(selectedStudent)}</h2>
                  <p className="text-blue-100 font-bold tracking-widest uppercase text-xs opacity-80">Full Academic Profile • Joined {new Date(selectedStudent.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="p-10 grid grid-cols-2 gap-8">
                <div>
                   <p className="text-[10px] text-gray-400 font-black uppercase mb-2 tracking-widest">Parent's Information</p>
                   <p className="text-sm font-bold text-gray-700">Father: {getParentName(selectedStudent)}</p>
                   <p className="text-sm font-medium text-gray-500 mt-1">Phone: {selectedStudent.parent?.user?.phone || selectedStudent.parent?.primaryContact || 'N/A'}</p>
                </div>
                <div>
                   <p className="text-[10px] text-gray-400 font-black uppercase mb-2 tracking-widest">Identification</p>
                   <p className="text-sm font-bold text-gray-700">Enrollment: {selectedStudent.enrollmentNo || 'N/A'}</p>
                   <p className="text-sm font-medium text-gray-500 mt-1">Roll No: {selectedStudent.rollNo}</p>
                </div>
                <div className="col-span-2 border-t border-gray-100 pt-6 flex justify-between items-end">
                   <div>
                     <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-widest">Academic Status</p>
                     <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-black uppercase">{selectedStudent.status} Student</span>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] text-gray-400 font-black uppercase mb-1 tracking-widest">User ID</p>
                     <p className="text-sm font-black text-blue-600 font-mono">{selectedStudent._id}</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL 2: CANCELLATION WORKFLOW --- */}
        {studentToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full relative animate-in slide-in-from-top-10 shadow-2xl border border-white/20">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-8 border-red-50 shadow-inner">
                  <UserX size={36} />
                </div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase leading-none">Terminate Admission?</h3>
                <p className="text-gray-500 font-bold mt-2 uppercase text-[10px]">Student: {getStudentName(studentToCancel)}</p>
              </div>

              {/* Clearance Checklist */}
              <div className="bg-gray-50 p-4 rounded-3xl mb-6 space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Clearance Checklist</p>
                <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 cursor-pointer hover:border-blue-200 transition-all">
                  <input type="checkbox" checked={checklist.library} onChange={(e) => setChecklist({...checklist, library: e.target.checked})} className="w-5 h-5 rounded-md accent-blue-600" />
                  <span className="text-xs font-bold text-gray-700">Library Records Clear</span>
                </label>
                <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 cursor-pointer hover:border-blue-200 transition-all">
                  <input type="checkbox" checked={checklist.fees} onChange={(e) => setChecklist({...checklist, fees: e.target.checked})} className="w-5 h-5 rounded-md accent-blue-600" />
                  <span className="text-xs font-bold text-gray-700">Financial Dues Clear</span>
                </label>
                <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 cursor-pointer hover:border-blue-200 transition-all">
                  <input type="checkbox" checked={checklist.inventory} onChange={(e) => setChecklist({...checklist, inventory: e.target.checked})} className="w-5 h-5 rounded-md accent-blue-600" />
                  <span className="text-xs font-bold text-gray-700">Inventory Handover Complete</span>
                </label>
              </div>

              <div className="space-y-4 mb-8">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Primary Reason</label>
                <select 
                  className="w-full p-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-700 focus:border-red-600 outline-none appearance-none bg-gray-50 shadow-inner cursor-pointer"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                >
                  <option value="">Choose Reason...</option>
                  <option value="TC">Transfer Certificate (TC)</option>
                  <option value="Fees">Fee Defaulter</option>
                  <option value="Conduct">Disciplinary Action</option>
                  <option value="Personal">Personal Reasons</option>
                  <option value="Graduation">Course Completion</option>
                  <option value="Other">Other Reasons</option>
                </select>
                
                <div className="p-4 bg-red-50 rounded-2xl flex gap-3 border border-red-100">
                  <AlertTriangle className="text-red-600 flex-shrink-0" size={18} />
                  <p className="text-[9px] font-black text-red-700 leading-normal uppercase">
                    This action is final. Student portal access and ID cards will be invalidated immediately.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStudentToCancel(null)} className="flex-1 py-4 font-black text-gray-400 hover:text-gray-600 uppercase tracking-tighter transition-all">Cancel</button>
                <button 
                  disabled={!cancelReason || cancelLoading}
                  onClick={handleConfirmCancel}
                  className={`flex-1 py-4 rounded-2xl font-black text-white transition-all flex items-center justify-center gap-2 ${!cancelReason || cancelLoading ? 'bg-gray-200 cursor-not-allowed shadow-none' : 'bg-red-600 hover:bg-red-700 shadow-xl shadow-red-200 uppercase tracking-tighter'}`}
                >
                  {cancelLoading ? <Loader2 className="animate-spin" size={18} /> : "Confirm Exit"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default CancelAdmission;