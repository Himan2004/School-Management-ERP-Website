import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, Printer, X, UserCircle, Loader2, 
  CreditCard, Layout, CheckCircle2, History, RotateCcw,
  Eye, AlertCircle, Clock, Square, CheckSquare, Users
} from 'lucide-react';
import { getPrincipalClassesSections } from '../../../services/api/principalAcademicsApi';
import idCardApi from '../../../services/api/idCardApi';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { selectPrincipal } from '../../../features/auth/principalAuthSlice';
import api from '../../../services/api';
import IDCardDesign, { parseStudentIdCardData, getDisplayCardStatus } from '../../../components/shared/IDCardDesign';
import {
  Heading,
  DashGrid,
  EnhancedDashCard,
  Grid,
  DataField,
  SelectField,
  Option,
  Button,
  Modal,
  ModalData,
  ModalProfile,
  ModalGrid,
  openModal,
  closeModal,
  DataTable
} from '../../../components/shared/Common_Components';

// --- MAIN PAGE COMPONENT ---
const IDCards = () => {
  const principal = useSelector(selectPrincipal);
  const schoolInfo = principal?.school || {};

  const academicYearList = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list = [];
    for (let i = 0; i < 5; i++) {
      const start = currentYear - i;
      const end = String(start + 1).slice(-2);
      list.push(`${start}-${end}`);
    }
    return list;
  }, []);

  const defaultYear = academicYearList[0] || '';

  // State Management
  const [students, setStudents] = useState([]);
  const [classList, setClassList] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewStudent, setPreviewStudent] = useState(null);
  const [printTarget, setPrintTarget] = useState(null);
  
  // Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

  // Filters State
  const [filters, setFilters] = useState({
    classId: '',
    sectionId: '',
    academicYear: defaultYear,
    searchName: '',
    rollNo: '',
    status: ''
  });

  const componentRef = useRef();

  // Load Initial Data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [studentRes, templateData, classRes] = await Promise.all([
        api.get('/principal/id-cards/students', { params: { limit: 10000 } }),
        idCardApi.getTemplates(),
        getPrincipalClassesSections()
      ]);
      
      setStudents(studentRes.data?.data || []);
      
      // Parse Classes & Sections response structure correctly
      if (classRes && classRes.success && classRes.data) {
        const mappedClasses = classRes.data.map(cls => ({
          _id: cls.id || cls._id,
          name: cls.name,
          sections: cls.sections ? cls.sections.map(sec => ({
            _id: sec.id || sec._id,
            name: sec.name
          })) : []
        }));
        setClassList(mappedClasses);
      }
      
      // Set default template
      if (templateData && Array.isArray(templateData.data)) {
        const defaultTpl = templateData.data.find(t => t && t.isDefault) || templateData.data[0];
        setSelectedTemplate(defaultTpl);
      }
      
    } catch (error) {
      toast.error("Failed to load ID card data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Handle section auto-selection or reset when class changes
  useEffect(() => {
    if (filters.classId && Array.isArray(classList)) {
      const selectedClass = classList.find(c => c && c._id === filters.classId);
      if (selectedClass && Array.isArray(selectedClass.sections) && selectedClass.sections.length === 1) {
        setFilters(prev => ({ ...prev, sectionId: selectedClass.sections[0]._id }));
        return;
      }
    }
    setFilters(prev => ({ ...prev, sectionId: '' }));
  }, [filters.classId, classList]);

  // Sync state closing for custom preview modals
  useEffect(() => {
    const handleModalClosed = (e) => {
      if (e.detail?.id === "id-card-preview") {
        setPreviewStudent(null);
      }
    };
    window.addEventListener("close-modal", handleModalClosed);
    return () => window.removeEventListener("close-modal", handleModalClosed);
  }, []);

  // Print handler for single or bulk cards using hidden native container
  const triggerPrintFlow = useCallback((studentList) => {
    setPrintTarget(studentList);
    setTimeout(() => {
      window.print();
      setPrintTarget(null);
    }, 400);
  }, []);

  const handlePrintDirect = useCallback((student) => {
    triggerPrintFlow([student]);
  }, [triggerPrintFlow]);

  const handlePrintSelected = useCallback(() => {
    if (selectedStudentIds.size === 0) return toast.error("Select students to print");
    if (!Array.isArray(students)) return toast.error("No student data available");
    const selectedStudents = students.filter(s => s && selectedStudentIds.has(s._id));
    triggerPrintFlow(selectedStudents);
  }, [students, selectedStudentIds, triggerPrintFlow]);

  // Reset Filters
  const handleResetFilters = () => {
    setFilters({
      classId: '',
      sectionId: '',
      academicYear: defaultYear,
      searchName: '',
      rollNo: '',
      status: ''
    });
  };

  // Derive sections list based on selected class
  const availableSections = useMemo(() => {
    if (filters.classId && Array.isArray(classList)) {
      const selectedClass = classList.find(c => c && c._id === filters.classId);
      if (selectedClass && Array.isArray(selectedClass.sections)) {
        return selectedClass.sections;
      }
    }
    return [];
  }, [filters.classId, classList]);

  const matchAcademicYear = (studentYear, filterYear) => {
    if (!filterYear) return true;
    if (!studentYear) return false;
    const norm = (yr) => yr.trim().replace(/\s+/g, '').replace('-20', '-');
    return norm(studentYear) === norm(filterYear);
  };

  // Multi-Filter Matching Logic
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return [];
    return students.filter(student => {
      if (!student) return false;
      
      // 1. Class
      if (filters.classId) {
        const studentClassId = student.class?._id || student.class;
        if (studentClassId !== filters.classId) return false;
      }
      
      // 2. Section
      if (filters.sectionId) {
        const studentSecId = student.section?._id || student.section;
        if (studentSecId !== filters.sectionId) return false;
      }
      
      // 3. Academic Year
      if (filters.academicYear) {
        const studentAcadYear = student.academicYear || '';
        if (!matchAcademicYear(studentAcadYear, filters.academicYear)) return false;
      }

      // 4. Search Name
      if (filters.searchName) {
        const name = student.user?.name || student.name || '';
        if (!name.toLowerCase().includes(filters.searchName.toLowerCase())) return false;
      }

      // 5. Search Roll No
      if (filters.rollNo) {
        const roll = String(student.rollNo || '');
        if (!roll.toLowerCase().includes(filters.rollNo.toLowerCase())) return false;
      }

      // 6. Card Status Filter
      if (filters.status) {
        const mappedStatus = getDisplayCardStatus(student.idCardStatus);
        if (mappedStatus !== filters.status) return false;
      }

      return true;
    });
  }, [students, filters]);

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map(s => s._id)));
    }
  };

  const toggleStudentSelection = (id) => {
    const newSelected = new Set(selectedStudentIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedStudentIds(newSelected);
  };

  // Memoized Table Columns for Table View
  const tableColumns = useMemo(() => [
    {
      key: "select",
      label: (
        <button onClick={handleSelectAll} className="p-1 rounded-lg hover:bg-slate-100 transition active:scale-95">
          {Array.isArray(filteredStudents) && selectedStudentIds.size === filteredStudents.length ? (
            <CheckSquare className="text-[#223F74] fill-[#223F74]/10" size={18} />
          ) : (
            <Square className="text-slate-300 hover:text-slate-400" size={18} />
          )}
        </button>
      ),
      render: (val, row) => (
        <button onClick={() => toggleStudentSelection(row._id)} className="p-1 rounded-lg hover:bg-slate-100 transition active:scale-95">
          {selectedStudentIds.has(row._id) ? (
            <CheckSquare className="text-[#223F74] fill-[#223F74]/10" size={18} />
          ) : (
            <Square className="text-slate-300 hover:text-slate-400" size={18} />
          )}
        </button>
      )
    },
    {
      key: "photo",
      label: "Photo",
      render: (val, row) => {
        const photo = row.photo || row.user?.photo;
        return (
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner">
            {photo ? (
              <img src={photo} className="w-full h-full object-cover" alt={row.user?.name} />
            ) : (
              <div className="text-xs font-black text-[#223F74] uppercase">
                {row.user?.name ? row.user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'ST'}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: "name",
      label: "Student Name",
      render: (val, row) => <span className="font-bold text-slate-800 uppercase text-xs">{row.user?.name || "N/A"}</span>
    },
    {
      key: "rollNo",
      label: "Roll No",
      render: (val, row) => <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md text-[10px]">{row.rollNo || "N/A"}</span>
    },
    {
      key: "class",
      label: "Class",
      render: (val, row) => {
        const parsed = parseStudentIdCardData(row);
        return <span className="text-slate-700 text-xs font-semibold">{parsed.classNumber || "N/A"}</span>;
      }
    },
    {
      key: "section",
      label: "Section",
      render: (val, row) => {
        const parsed = parseStudentIdCardData(row);
        return <span className="text-slate-700 text-xs font-semibold">{parsed.sectionName || "N/A"}</span>;
      }
    },
    {
      key: "enrollmentNo",
      label: "Admission No",
      render: (val, row) => <span className="text-slate-700 font-mono text-xs">{row.enrollmentNo || "N/A"}</span>
    },
    {
      key: "idCardStatus",
      label: "ID Status",
      render: (val, row) => getStatusBadge(row.idCardStatus)
    },
    {
      key: "actions",
      label: "Actions",
      align: "center",
      render: (val, row) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => handlePreview(row)}
            className="p-1.5 text-[#223F74] hover:bg-[#223F74]/5 rounded-lg transition"
            title="Preview"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => handlePrintDirect(row)}
            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition"
            title="Print Card"
          >
            <Printer size={15} />
          </button>
        </div>
      )
    }
  ], [selectedStudentIds, filteredStudents]);

  // Display KPI Stats
  const displayStats = useMemo(() => {
    return {
      totalStudents: Array.isArray(students) ? students.length : 0,
      totalIDCards: Array.isArray(filteredStudents) ? filteredStudents.length : 0
    };
  }, [students, filteredStudents]);

  const getStatusBadge = (status) => {
    const s = getDisplayCardStatus(status);
    const map = {
      Active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      Pending: 'bg-amber-100 text-amber-700 border-amber-200'
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${map[s] || map.Pending}`}>
        {s}
      </span>
    );
  };

  // Open Preview Modal
  const handlePreview = (student) => {
    setPreviewStudent(student);
    openModal("id-card-preview");
  };

  return (
    <div className="space-y-6 text-left max-w-[1600px] mx-auto pb-12">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-section, #print-section * {
            visibility: visible !important;
          }
          #print-section {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .id-card-page {
            page-break-after: always !important;
            break-after: page !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            height: 100vh !important;
            box-sizing: border-box !important;
          }
          .id-card-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          @page {
            size: portrait;
            margin: 0;
          }
        }
      `}} />
      
      {/* 1. Header Section */}
      <Heading
        primaryText={
          <span className="inline-flex items-center gap-3">
            <CreditCard className="text-[#e8612c]" size={28} />
            <span>Student ID Cards</span>
          </span>
        }
        secondaryText="Management"
        size={12}
        fontSize="3xl"
        showAnimations={true}
      />

      {/* 2. KPI Stats Section */}
      <DashGrid cols={12} gap={3}>
        <EnhancedDashCard 
          title="Total Students" 
          value={displayStats.totalStudents} 
          icon={<Users size={22} />} 
          accentColor="#3b82f6" 
          size={6} 
        />
        <EnhancedDashCard 
          title="Total ID Cards" 
          value={displayStats.totalIDCards} 
          icon={<CreditCard size={22} />} 
          accentColor="#10b981" 
          size={6} 
        />
      </DashGrid>

      {/* 3. Advanced Filters Section */}
      <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
        <Grid cols={12} gap={4}>
          {/* Filters Row 1 */}
          <SelectField
            label="Class"
            id="filter-class"
            value={filters.classId}
            onChange={(e) => setFilters(prev => ({ ...prev, classId: e.target.value, sectionId: '' }))}
            placeholder="All Classes"
            size={4}
            searchable={true}
          >
            <Option value="" label="All Classes" />
            {Array.isArray(classList) && classList.map(cls => (
              <Option key={cls?._id} value={cls?._id} label={cls?.name} />
            ))}
          </SelectField>

          <SelectField
            label="Section"
            id="filter-section"
            value={filters.sectionId}
            onChange={(e) => setFilters(prev => ({ ...prev, sectionId: e.target.value }))}
            placeholder={
              !filters.classId 
                ? "Select Class First" 
                : availableSections.length === 0 
                   ? "No Sections Available" 
                   : "Select Section"
            }
            size={4}
            disabled={!filters.classId || availableSections.length === 0}
            searchable={false}
          >
            {filters.classId && availableSections.map(sec => (
              <Option 
                key={sec._id} 
                value={sec._id} 
                label={sec.name.toUpperCase().startsWith('SECTION') ? sec.name : `Section ${sec.name}`} 
              />
            ))}
          </SelectField>

          <SelectField
            label="Academic Year"
            id="filter-academic-year"
            value={filters.academicYear}
            onChange={(e) => setFilters(prev => ({ ...prev, academicYear: e.target.value }))}
            placeholder="Select Academic Year"
            size={4}
            searchable={false}
          >
            <Option value="" label="All Years" />
            {academicYearList.map(year => (
              <Option key={year} value={year} label={year} />
            ))}
          </SelectField>

          {/* Filters Row 2 */}
          <DataField
            label="Search Student Name"
            id="filter-search-name"
            placeholder="Search by student name..."
            value={filters.searchName}
            onChange={(e) => setFilters(prev => ({ ...prev, searchName: e.target.value }))}
            size={4}
            icon={Search}
          />

          <DataField
            label="Search Roll Number"
            id="filter-search-roll"
            placeholder="Search by roll number..."
            value={filters.rollNo}
            onChange={(e) => setFilters(prev => ({ ...prev, rollNo: e.target.value }))}
            size={4}
            icon={Search}
          />

          <SelectField
            label="Status"
            id="filter-status"
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            placeholder="All Status"
            size={4}
            searchable={false}
          >
            <Option value="" label="All Status" />
            <Option value="Pending" label="Pending" />
            <Option value="Active" label="Active" />
          </SelectField>

          {/* Action Row */}
          <div className="col-span-12 flex justify-end gap-3 border-t border-slate-100 pt-4 mt-2">
            <Button
              text="Reset Filters"
              variant="secondary"
              size={2}
              onClick={handleResetFilters}
              icon={<RotateCcw size={16} />}
            />
            <Button
              text="Reload Directory"
              variant="primary"
              size={2}
              onClick={fetchInitialData}
              loading={loading}
              icon={<Search size={16} />}
            />
          </div>
        </Grid>
      </div>

      {/* Action Bar for Bulk Printing */}
      {Array.isArray(filteredStudents) && filteredStudents.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-[#223F74] p-5 rounded-[2rem] shadow-xl text-white">
          <div className="flex items-center gap-6">
            <button onClick={handleSelectAll} className="flex items-center gap-3 group">
              {selectedStudentIds.size === filteredStudents.length ? (
                <CheckSquare size={22} className="text-[#F59B87]" />
              ) : (
                <Square size={22} className="text-white opacity-60 group-hover:opacity-100 transition" />
              )}
              <span className="font-bold text-xs uppercase tracking-widest">Select All ({filteredStudents.length})</span>
            </button>
            <div className="h-6 w-[1px] bg-white/20 hidden md:block" />
            <p className="font-bold text-xs uppercase tracking-widest text-[#F59B87]">
              {selectedStudentIds.size} Students Selected
            </p>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={handlePrintSelected}
              disabled={selectedStudentIds.size === 0}
              className="flex-1 md:flex-none bg-[#F59B87] hover:bg-[#ec856d] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 shadow-lg"
            >
              <Printer size={16} />
              Print Selected ID Cards
            </button>
          </div>
        </div>
      )}

      {/* Visual Separation Line */}
      <hr className="border-slate-100 my-2" />

      {/* View Mode Toggle Header */}
      {Array.isArray(filteredStudents) && filteredStudents.length > 0 && (
        <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest pl-2">
            Student Directory ({filteredStudents.length} Students)
          </h3>
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setViewMode('card')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                viewMode === 'card'
                  ? 'bg-white text-[#223F74] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Card View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                viewMode === 'table'
                  ? 'bg-white text-[#223F74] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Table View
            </button>
          </div>
        </div>
      )}

      {/* 4. Student Card / Table View Grid */}
      {Array.isArray(filteredStudents) && filteredStudents.length > 0 ? (
        viewMode === 'card' ? (
          <div 
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(360px, 100%), 1fr))' }}
            className="grid gap-6 w-full justify-items-center"
          >
            {filteredStudents.map(stu => (
              <div 
                key={stu._id} 
                style={{ minWidth: 'min(360px, 100%)', maxWidth: '420px' }}
                className={`relative bg-white rounded-2xl p-4 border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col gap-4 w-full h-auto ${
                  selectedStudentIds.has(stu._id) 
                    ? 'border-[#223F74] bg-[#223F74]/5 shadow-md shadow-[#223F74]/5' 
                    : 'border-slate-100 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* 1. Top Row: Checkbox & Status Badge */}
                <div className="flex justify-between items-center w-full">
                  <button 
                    onClick={() => toggleStudentSelection(stu._id)} 
                    className="p-1 rounded-lg hover:bg-slate-50 transition active:scale-95"
                  >
                    {selectedStudentIds.has(stu._id) ? (
                      <CheckSquare className="text-[#223F74] fill-[#223F74]/10" size={20} />
                    ) : (
                      <Square className="text-slate-300 hover:text-slate-400" size={20} />
                    )}
                  </button>
                  <div>
                    {getStatusBadge(stu.idCardStatus)}
                  </div>
                </div>

                {/* 2. Middle Row: Side-by-Side profile details and mini ID card graphic */}
                <div className="flex flex-row items-center justify-between gap-4 w-full">
                  {/* Left Column: Student details (Readable, no awkward wraps) */}
                  <div className="flex-1 text-left min-w-0 space-y-1.5">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide truncate" title={stu.user?.name}>
                      {stu.user?.name || 'N/A'}
                    </h4>
                    <div className="space-y-1 text-xs text-slate-500 font-bold uppercase tracking-wider">
                      <p className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">Roll No:</span>
                        <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md text-[10px]">{stu.rollNo || 'N/A'}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">Class:</span>
                        <span className="text-slate-700 truncate">{parseStudentIdCardData(stu).classSecDisplay}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">Adm No:</span>
                        <span className="text-slate-700 font-mono truncate">{stu.enrollmentNo || 'N/A'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Mini ID Card Preview Thumbnail (120px x 80px) */}
                  <div className="w-[120px] h-[80px] border border-slate-200 rounded-lg overflow-hidden flex flex-col relative bg-white shadow-sm flex-shrink-0">
                    {/* Tiny ID Card Header Bar */}
                    <div 
                      className="h-3.5 flex items-center px-1"
                      style={{ backgroundColor: selectedTemplate?.designConfig?.primaryColor || '#223F74' }}
                    >
                      <div className="w-1 h-1 bg-white rounded-full flex-shrink-0"></div>
                      <div className="text-[4px] text-white font-black uppercase tracking-wider truncate pl-1 flex-1 text-left">
                        {schoolInfo?.schoolName || 'Graphura Academy'}
                      </div>
                    </div>
                    {/* Tiny ID Card Body */}
                    <div className="flex flex-row p-1 gap-1 items-center flex-1 bg-slate-50/50">
                      {/* Photo Thumbnail */}
                      <div className="w-8 h-10 border border-slate-200 rounded-sm overflow-hidden bg-white flex-shrink-0 p-0.5">
                        {stu.photo || stu.user?.photo ? (
                          <img 
                            src={stu.photo || stu.user.photo} 
                            className="w-full h-full object-cover rounded-sm" 
                            alt={stu.user?.name} 
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 rounded-sm flex items-center justify-center font-black text-[6px] uppercase" style={{ color: selectedTemplate?.designConfig?.primaryColor || '#223F74' }}>
                            {stu.user?.name ? stu.user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'ST'}
                          </div>
                        )}
                      </div>
                      {/* Mockup card text lines */}
                      <div className="flex-1 flex flex-col gap-0.5 text-left">
                        <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
                        <div className="w-8 h-[3px] bg-slate-200 rounded-full"></div>
                        <div className="w-7 h-[3px] bg-slate-200 rounded-full"></div>
                      </div>
                    </div>
                    {/* Tiny ID Card Footer accent line */}
                    <div className="h-0.5 w-full" style={{ backgroundColor: selectedTemplate?.designConfig?.secondaryColor || '#F59B87' }} />
                  </div>
                </div>

                {/* 3. Actions Footer (2-Column Layout) */}
                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 mt-1 w-full">
                  {/* Preview */}
                  <button
                    onClick={() => handlePreview(stu)}
                    className="flex items-center justify-center gap-1 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#223F74] hover:bg-[#223F74]/5 border border-[#223F74]/10 rounded-xl transition active:scale-95"
                  >
                    <Eye size={12} />
                    <span>Preview</span>
                  </button>

                  {/* Print */}
                  <button
                    onClick={() => handlePrintDirect(stu)}
                    className="flex items-center justify-center gap-1 py-1.5 text-[10px] font-black uppercase tracking-wider text-purple-700 hover:bg-purple-50 border border-purple-100 rounded-xl transition active:scale-95"
                  >
                    <Printer size={12} />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <DataTable
            columns={tableColumns}
            rows={filteredStudents}
            searchable={false}
            pageSize={10}
            pageSizeOptions={[10, 20, 50]}
            hideRecordSummary={false}
          />
        )
      ) : (
        /* Empty State */
        !loading && (
          <div className="py-24 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
            <div className="w-16 h-16 bg-[#223F74]/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layout size={32} className="text-[#223F74]/40" />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">No Students Found</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 max-w-sm mx-auto">
              Try adjusting filters or searching for different criteria.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button 
                onClick={handleResetFilters}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95"
              >
                Reset Filters
              </button>
              <button 
                onClick={fetchInitialData}
                className="px-6 py-2.5 bg-[#223F74] hover:bg-[#1a3360] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                Load Students
              </button>
            </div>
          </div>
        )
      )}

      {/* --- PREMIUM PREVIEW MODAL --- */}
      <Modal id="id-card-preview" title="Student ID Card Preview" size="lg">
        {previewStudent && (
          <div className="space-y-6 text-left p-2">
            {/* Student Profile overview */}
            <ModalProfile
              name={previewStudent.user?.name}
              subtitle={`Class ${parseStudentIdCardData(previewStudent).classSecDisplay}`}
              meta={`Enrollment: ${previewStudent.enrollmentNo || 'N/A'} · Roll No: ${previewStudent.rollNo || 'N/A'}`}
              photoUrl={previewStudent.photo || previewStudent.user?.photo}
            />

            {/* Split content columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center justify-items-center">
              {/* Left Side Details */}
              <div className="w-full space-y-4">
                <ModalGrid title="Card Properties" cols={1}>
                  <ModalData label="Card Status" value={getDisplayCardStatus(previewStudent.idCardStatus)} />
                  <ModalData label="Academic Year" value={previewStudent.academicYear || '2025-2026'} />
                  <ModalData label="Configured Template" value={selectedTemplate?.name || 'Standard PVC Template'} />
                  <ModalData label="Admission Status" value={previewStudent.status || 'Active'} />
                </ModalGrid>
              </div>

              {/* Right Side ID Card Design Layout */}
              <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-3xl p-4 shadow-inner">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">PVC Card Render Output</h4>
                <IDCardDesign ref={componentRef} student={previewStudent} template={selectedTemplate} schoolInfo={schoolInfo} />
              </div>
            </div>

            {/* Actions Grid */}
            <Grid cols={12} gap={3} className="pt-4 border-t border-slate-100">
              <div className="col-span-12 sm:col-span-6">
                <Button
                  text="Print ID Card"
                  variant="primary"
                  onClick={() => handlePrintDirect(previewStudent)}
                  icon={<Printer size={16} />}
                />
              </div>
              <div className="col-span-12 sm:col-span-6">
                <Button
                  text="Close Preview"
                  variant="ghost"
                  onClick={() => {
                    setPreviewStudent(null);
                    closeModal("id-card-preview");
                  }}
                />
              </div>
            </Grid>
          </div>
        )}
      </Modal>
      {/* Hidden Print Container */}
      <div id="print-section" className="hidden print:block">
        {printTarget && printTarget.map((stu) => (
          <div key={stu._id} className="id-card-page">
            <IDCardDesign student={stu} template={selectedTemplate} schoolInfo={schoolInfo} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default IDCards;