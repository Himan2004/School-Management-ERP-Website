import React, { useState, useEffect } from 'react';
import { 
  Eye, Print, RotateCcw, Download, X, 
  CheckSquare, Square, Search, Filter, 
  Loader2, CreditCard, ChevronRight, Layout,
  CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { getAllStudents, getClasses } from '../../../services/api/principalStudentApi';
import idCardApi from '../../../services/api/idCardApi';
import toast from 'react-hot-toast';

const IDCardGeneration = () => {
  // State management
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [classList, setClassList] = useState([]);
  
  // Filters
  const [filters, setFilters] = useState({
    classId: '',
    sectionId: '',
    search: '',
    status: 'active'
  });

  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [generating, setGenerating] = useState(false);
  
  // Modals
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Initial Data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [classRes, templateRes] = await Promise.all([
        getClasses(),
        idCardApi.getTemplates()
      ]);
      
      if (classRes.success) setClassList(classRes.data);
      if (templateRes.success) {
        setTemplates(templateRes.data);
        if (templateRes.data.length > 0) setSelectedTemplate(templateRes.data[0]._id);
      }
    } catch (err) {
      toast.error("Failed to load initial data");
    }
  };

  const handleLoadStudents = async () => {
    try {
      setLoading(true);
      const res = await getAllStudents({
        classId: filters.classId,
        search: filters.search,
        status: filters.status,
        limit: 100 // Load more for bulk processing
      });
      if (res.success) {
        setStudents(res.data);
        setSelectedStudentIds(new Set());
      }
    } catch (err) {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map(s => s._id)));
    }
  };

  const toggleStudentSelection = (id) => {
    const newSelected = new Set(selectedStudentIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedStudentIds(newSelected);
  };

  const handleGenerateCards = async () => {
    if (selectedStudentIds.size === 0) return toast.error("Select students first");
    if (!selectedTemplate) return toast.error("Select a template first");

    try {
      setGenerating(true);
      const res = await idCardApi.generateCards(
        Array.from(selectedStudentIds),
        'student',
        selectedTemplate
      );
      if (res.success) {
        toast.success(`Successfully generated ${selectedStudentIds.size} ID cards!`);
        handleLoadStudents(); // Refresh to show updated status
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = (student) => {
    setSelectedStudent(student);
    setShowPreviewModal(true);
  };

import { Heading, Grid, SelectField, Option, InputField, Button } from '../../../components/shared/Common_Components';

const IDCardGeneration = () => {
...
  return (
    <div className="space-y-6 text-left">
        
      {/* Header */}
      <Heading 
        primaryText="ID Card" 
        secondaryText="Generation" 
        subtitle="Bulk generate and print official school identity cards"
        icon={<CreditCard size={24} className="text-blue-600" />}
      />

      {/* Search & Filters */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-5 mt-6 mb-6 z-30 relative">
          <Grid cols={12} gap={4}>
            <div className="col-span-12 md:col-span-3">
                <SelectField 
                  label="Class"
                  id="filter_class"
                  value={filters.classId}
                  onChange={(e) => setFilters({...filters, classId: e.target.value})}
                  searchable={false}
                  size={12}
                >
                  <Option value="" label="All Classes" />
                  {classList.map(cls => (
                    <Option key={cls._id} value={cls._id} label={cls.name} />
                  ))}
                </SelectField>
            </div>

            <div className="col-span-12 md:col-span-3">
                <InputField 
                  label="Search Name / Roll"
                  id="filter_search"
                  placeholder="Enter keyword..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  icon={<Search size={18} />}
                  size={12}
                />
            </div>

            <div className="col-span-12 md:col-span-3">
                <SelectField 
                  label="Select Template"
                  id="filter_template"
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  searchable={false}
                  size={12}
                >
                  {templates.length === 0 && <Option value="" label="No templates available" />}
                  {templates.map(t => (
                    <Option key={t._id} value={t._id} label={t.name} />
                  ))}
                </SelectField>
            </div>

            <div className="col-span-12 md:col-span-3 flex items-end">
                <Button 
                  text="Load Students"
                  onClick={handleLoadStudents}
                  disabled={loading}
                  loading={loading}
                  icon={!loading && <Filter size={18} />}
                  size={12}
                />
            </div>
          </Grid>
      </div>

      {/* Action Bar */}
      {students.length > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-blue-600 p-6 rounded-[2rem] shadow-2xl shadow-blue-200 text-white">
            <div className="flex items-center gap-6">
                <button onClick={handleSelectAll} className="flex items-center gap-3 group">
                  {selectedStudentIds.size === students.length ? <CheckSquare size={24} /> : <Square size={24} className="opacity-50 group-hover:opacity-100" />}
                  <span className="font-black text-xs uppercase tracking-widest">Select All ({students.length})</span>
                </button>
                <div className="h-8 w-[1px] bg-white/20 hidden md:block" />
                <p className="font-bold text-sm">{selectedStudentIds.size} Students Selected</p>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={handleGenerateCards}
                  disabled={generating || selectedStudentIds.size === 0}
                  className="flex-1 md:flex-none bg-white text-blue-600 px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 shadow-xl"
                >
                  {generating ? <Loader2 className="animate-spin" size={18} /> : <RotateCcw size={18} />}
                  Generate Cards
                </button>
                <button className="flex-1 md:flex-none bg-blue-700 text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-800 transition-all flex items-center justify-center gap-2 shadow-xl">
                  <Print size={18} />
                  Print Selected
                </button>
            </div>
          </div>
      )}

      {/* Student Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="p-6 w-16"></th>
                  <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Student</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Roll No</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Class</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID Status</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {students.map(stu => (
                  <tr key={stu._id} className={`hover:bg-blue-50/30 transition-all group ${selectedStudentIds.has(stu._id) ? 'bg-blue-50/50' : ''}`}>
                      <td className="p-6">
                        <button onClick={() => toggleStudentSelection(stu._id)}>
                            {selectedStudentIds.has(stu._id) ? <CheckSquare className="text-blue-600" size={20} /> : <Square className="text-gray-300" size={20} />}
                        </button>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-2xl overflow-hidden shadow-inner flex-shrink-0">
                              <img src={stu.user?.photo || `https://ui-avatars.com/api/?name=${stu.user?.name}&background=1e40af&color=fff`} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div>
                              <h4 className="font-black text-gray-800 uppercase text-xs">{stu.user?.name}</h4>
                              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Adm: {stu.enrollmentNo || "N/A"}</p>
                            </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="font-mono font-black text-gray-500 text-xs bg-gray-100 px-3 py-1 rounded-lg">{stu.rollNo}</span>
                      </td>
                      <td className="p-6 text-xs font-bold text-gray-600 uppercase">
                        {stu.class?.name} - {stu.section?.name || "A"}
                      </td>
                      <td className="p-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${stu.idCardStatus === 'Generated' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                            {stu.idCardStatus === 'Generated' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            {stu.idCardStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <button 
                            onClick={() => handlePreview(stu)}
                            className="p-3 text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm group-hover:shadow-md"
                        >
                            <Eye size={18} />
                        </button>
                      </td>
                  </tr>
                ))}
            </tbody>
          </table>
          
          {students.length === 0 && !loading && (
            <div className="py-32 text-center">
              <Layout size={64} className="mx-auto text-gray-100 mb-6" />
              <h3 className="text-xl font-black text-gray-300 uppercase tracking-tighter">No Students Loaded</h3>
              <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Select filters and click 'Load Students' to begin</p>
            </div>
          )}
      </div>

      {/* Empty State / Loading */}
      {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                <p className="font-black text-xs uppercase tracking-widest text-gray-500">Fetching Student Directory...</p>
            </div>
          </div>
      )}
    </div>
  );
};

export default IDCardGeneration;