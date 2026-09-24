import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserX, Search, AlertTriangle, Trash2, X, Info, CheckCircle2, Eye, User, Calendar, Phone, Loader2, UserCircle } from 'lucide-react';
import { getAllStudents, getClasses } from '../../../services/api/principalStudentApi';
import { cancelAdmission } from '../../../services/api/principalAdmissionApi';
import toast from 'react-hot-toast';
import { Heading, DataTable, openModal, Modal, closeModal, SelectField, Select, Option, Grid } from '../../../components/shared/Common_Components';
import StudentDetailsDrawer from '../StudentDetailsDrawer';

const CancelAdmission = () => {
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
        limit: 1000
      };

      if (classFilter !== 'all') params.classId = classFilter;
      if (sectionFilter !== 'all') params.section = sectionFilter;

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
  }, [classFilter, sectionFilter]);

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
      setStudents(students.map(s => s._id === studentToCancel._id ? { ...s, status: 'inactive' } : s));
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
    return stu.user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=223F74&color=fff`;
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


        <div className="relative min-h-[250px]">
          {loading ? (
            <div className="absolute inset-0 bg-slate-50/70 z-10 flex items-center justify-center rounded-2xl">
              <Loader2 className="animate-spin text-[#223F74]" size={40} />
            </div>
          ) : (
            <DataTable
              title="Students"
              headerAction={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-[140px]">
                    <Select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setSectionFilter('all'); }} searchable={false}>
                      <Option value="all" label="All Classes" />
                      {classesList.map(cls => <Option key={cls._id} value={cls._id} label={cls.name} />)}
                    </Select>
                  </div>
                  <div className="w-[140px]">
                    <Select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} disabled={classFilter === 'all'} searchable={false}>
                      <Option value="all" label="All Sections" />
                      {(classFilter !== 'all' ? (classesList.find(c => c._id === classFilter)?.sections || []) : sectionsList).map((sec, idx) => (
                        <Option key={idx} value={sec._id || sec} label={sec.name || sec} />
                      ))}
                    </Select>
                  </div>
                </div>
              }
              columns={[
                { key: "studentName", label: "Student Name" },
                { key: "rollNo", label: "Roll No" },
                { key: "classSec", label: "Class & Section" },
                { key: "parent", label: "Parent Name" },
                { key: "contact", label: "Contact" },
                { key: "bloodGroup", label: "Blood Group" },
                { key: "status", label: "Status" }
              ]}
              rows={students.map((stu) => ({
                _original: stu,
                id: stu._id,
                studentName: getStudentName(stu),
                rollNo: stu.rollNo || 'N/A',
                classSec: `${getClassName(stu)} - ${getSectionName(stu)}`,
                parent: getParentName(stu),
                contact: stu.user?.phone || stu.phone || 'N/A',
                bloodGroup: stu.bloodGroup || 'N/A',
                status: stu.status || 'N/A'
              }))}
              actions={[
                {
                  icon: <Eye size={16} />,
                  tooltip: "View Profile",
                  variant: "ghost",
                  onClick: (row) => {
                    setSelectedStudent(row._original);
                    openModal("cancel-student-details-modal");
                  }
                },
                {
                  icon: <Trash2 size={16} />,
                  tooltip: "Cancel Admission",
                  variant: "danger",
                  onClick: (row) => setStudentToCancel(row._original),
                  show: (row) => {
                    const status = (row._original?.status || "").toLowerCase();
                    return status !== 'inactive' && status !== 'cancelled';
                  }
                }
              ]}
              searchable={true}
              filterable={false}
              exportable={true}
              hideRecordSummary={true}
            />
          )}
        </div>

        {/* --- MODAL 2: CANCELLATION WORKFLOW --- */}
        {studentToCancel && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full relative animate-in slide-in-from-top-10 shadow-2xl border border-slate-100">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <UserX size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">Terminate Admission?</h3>
                <p className="text-slate-500 font-bold mt-2 uppercase text-[10px]">Student: {getStudentName(studentToCancel)}</p>
              </div>

              {/* Clearance Checklist */}
              <div className="bg-slate-50 p-4 rounded-2xl mb-5 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 px-1">Clearance Checklist</p>
                <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-[#223F74]/20 transition-all">
                  <input type="checkbox" checked={checklist.library} onChange={(e) => setChecklist({...checklist, library: e.target.checked})} className="w-4 h-4 rounded text-[#223F74] focus:ring-[#223F74]" />
                  <span className="text-xs font-bold text-slate-700">Library Records Clear</span>
                </label>
                <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-[#223F74]/20 transition-all">
                  <input type="checkbox" checked={checklist.fees} onChange={(e) => setChecklist({...checklist, fees: e.target.checked})} className="w-4 h-4 rounded text-[#223F74] focus:ring-[#223F74]" />
                  <span className="text-xs font-bold text-slate-700">Financial Dues Clear</span>
                </label>
                <label className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 cursor-pointer hover:border-[#223F74]/20 transition-all">
                  <input type="checkbox" checked={checklist.inventory} onChange={(e) => setChecklist({...checklist, inventory: e.target.checked})} className="w-4 h-4 rounded text-[#223F74] focus:ring-[#223F74]" />
                  <span className="text-xs font-bold text-slate-700">Inventory Handover Complete</span>
                </label>
              </div>

              <div className="space-y-4 mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 px-1">Primary Reason</label>
                <select 
                  className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] bg-white transition cursor-pointer"
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
                
                <div className="p-3.5 bg-rose-50 rounded-xl flex gap-3 border border-rose-100">
                  <AlertTriangle className="text-rose-600 flex-shrink-0" size={16} />
                  <p className="text-[9px] font-bold text-rose-700 leading-normal uppercase">
                    This action is final. Student portal access and ID cards will be invalidated immediately.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStudentToCancel(null)} className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600 text-sm hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                <button 
                  disabled={!cancelReason || cancelLoading}
                  onClick={handleConfirmCancel}
                  className={`flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2 ${!cancelReason || cancelLoading ? 'bg-slate-200 cursor-not-allowed shadow-none' : 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-200'}`}
                >
                  {cancelLoading ? <Loader2 className="animate-spin" size={16} /> : "Confirm Exit"}
                </button>
              </div>
            </div>
          </div>, document.body
        )}

        <Modal id="cancel-student-details-modal" title="Student Insights" size="xl">
          {selectedStudent && (
            <StudentDetailsDrawer
              student={selectedStudent}
              onClose={() => closeModal("cancel-student-details-modal")}
            />
          )}
        </Modal>
    </div>
  );
};

export default CancelAdmission;