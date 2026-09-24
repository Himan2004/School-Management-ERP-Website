import React, { useState, useEffect } from 'react'; 
import { X, AlertCircle, Check, ChevronRight, Download } from 'lucide-react';
import {
  getPromotionRules,
  updatePromotionRules,
  getClassMapping,
  updateClassMapping,
  getPromotionPreview,
  runPromotion,
  getPromotionHistory,
  getAcademicYears 
} from '../../../services/api/PrincipalSettingApi';

const PromotionSettings = () => {
  const schoolId = localStorage.getItem("schoolId") || "";  

  const [promotionRules, setPromotionRules] = useState({
    minAttendance: 75,
    strictAttendance: false,
    minPassingMarks: 33,
    minSubjectsToPass: 5,
    allowGraceMarks: false,
    graceMarksLimit: 5,
    compartmentAllowed: true,
    maxCompartmentSubjects: 1,
    failIfAbsentInExam: false
  });
  
  const [loading, setLoading] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [classMapping, setClassMapping] = useState([]);
  const [promotionHistory, setPromotionHistory] = useState([]);

  const [promotionStep, setPromotionStep] = useState(0); 
  const [selectedPromotionYear, setSelectedPromotionYear] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [targetPromotionYear, setTargetPromotionYear] = useState(''); 
  const [previewStudents, setPreviewStudents] = useState([]);
  const [promotionConfirm, setPromotionConfirm] = useState('');
  const [studentOverrides, setStudentOverrides] = useState({});

  useEffect(() => {
    fetchPromotionData();
  }, []);

  const fetchPromotionData = async () => {
    try {
      setLoading(true);

      const [rulesRes, mappingRes, historyRes, yearsRes] = await Promise.all([
        getPromotionRules(schoolId, null), 
        getClassMapping(schoolId),
        getPromotionHistory(schoolId),
        getAcademicYears() 
      ]);

      if (rulesRes?.success && rulesRes.data) setPromotionRules(rulesRes.data);
      if (mappingRes?.success && mappingRes.data) setClassMapping(mappingRes.data);
      if (historyRes?.success && historyRes.data) setPromotionHistory(historyRes.data);
      if (yearsRes?.success && yearsRes.data?.academicYears) {
          setAcademicYears(yearsRes.data.academicYears);
      }

    } catch (error) {
      console.error("Error fetching promotion settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRules = async () => {
    try {
      const response = await updatePromotionRules(schoolId, null, promotionRules);
      if (response?.success) {
        alert('Promotion rules saved successfully!');
      }
    } catch (error) {
      console.error("Error saving promotion rules:", error);
      alert(error?.response?.data?.message || "Failed to save promotion rules");
    }
  };

  const handleStartPromotion = () => {
    setPromotionStep(1);
  };

      const handleSelectYear = async () => {
        if (!selectedPromotionYear || !targetPromotionYear) return;

        try {
          // Pass the selected class and section to the API
          const response = await getPromotionPreview(schoolId, selectedPromotionYear, selectedClass, selectedSection);
          if (response?.success) {
            
            // Set default overrides for every student fetched so the stats calculate correctly immediately
            const initialOverrides = {};
            response.data.forEach(student => {
              initialOverrides[student.id] = student.status;
            });
            setStudentOverrides(initialOverrides);

            const preview = response.data.map(student => ({
              ...student,
              override: student.status
            }));
            setPreviewStudents(preview);
            setPromotionStep(2);
          }
        } catch (error) {
          console.error("Error getting promotion preview:", error);
        }
      };

  const handleConfirmPromotion = async () => {
    if (promotionConfirm !== 'PROMOTE') return;
    try {
      const response = await runPromotion({
        school_id: schoolId,
        fromAcademicYear: selectedPromotionYear,
        toAcademicYear: targetPromotionYear, 
        currentClass: selectedClass, // NEW
        section: selectedSection,    // NEW
        overrides: studentOverrides
      });

      if (response?.success) {
        setPromotionStep(4);
        fetchPromotionData();
      }
    } catch (error) {
      console.error("Error running promotion:", error);
      alert(error?.response?.data?.message || "Failed to run promotion");
    }
  };

  const handleUpdateOverride = (studentId, newStatus) => {
    setStudentOverrides({
      ...studentOverrides,
      [studentId]: newStatus
    });
    setPreviewStudents(previewStudents.map(s =>
      s.id === studentId ? { ...s, override: newStatus } : s
    ));
  };

  const handleDownloadReport = () => {
    if (previewStudents.length === 0) return;

    const colNames = ['Student Name', 'Class', 'Attendance %', 'Result', 'Final Status'];
    
    const rowData = previewStudents.map(student => [
      student.name,
      student.class,
      student.attendance,
      student.result,
      student.override
    ]);

    const csvText = [
      colNames.join(','),
      ...rowData.map(row => row.join(','))
    ].join('\n');

    const fileBlob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement('a');
    const fileUrl = URL.createObjectURL(fileBlob);
    
    downloadLink.setAttribute('href', fileUrl);
    downloadLink.setAttribute('download', `Promotion_Report_${selectedPromotionYear}_to_${targetPromotionYear}.csv`);
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const getStatusBadgeColor = (status) => {
    switch(status) {
      case 'Promote': return 'bg-green-100 text-green-700';
      case 'Compartment': return 'bg-yellow-100 text-yellow-700';
      case 'Hold': return 'bg-red-100 text-red-700';
      case 'Pass Out': return 'bg-blue-100 text-blue-700';
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'Partial': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Promote': return '✅';
      case 'Compartment': return '⚠';
      case 'Hold': return '❌';
      case 'Pass Out': return '🎓';
      default: return '•';
    }
  };

  const promotionStats = previewStudents.length > 0 ? {
    totalStudents: previewStudents.length,
    promote: previewStudents.filter(s => s.override === 'Promote').length,
    compartment: previewStudents.filter(s => s.override === 'Compartment').length,
    hold: previewStudents.filter(s => s.override === 'Hold').length,
    passOut: previewStudents.filter(s => s.override === 'Pass Out').length
  } : { totalStudents: 0, promote: 0, compartment: 0, hold: 0, passOut: 0 };

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pb-12 text-left">
      {/* Premium Header */}
      <div className="mb-6 rounded-2xl overflow-hidden bg-gradient-to-r from-[#223F74] via-[#2A4A82] to-[#1A2F56] shadow-lg shadow-[#223F74]/20 mx-6 mt-6">
        <div className="px-6 py-5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Promotion Settings
            </h1>
            <p className="text-sm text-slate-300 mt-0.5">
              Configure student promotion and fail rules
            </p>
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-[#F59B87] via-[#E0A04B] to-[#5B9A6A]"></div>
      </div>

      <main className="text-left px-6">

        <div className={`rounded-2xl p-6 mb-8 border-l-4 shadow-sm bg-white ${
          promotionStep === 0 ? 'border-amber-500 bg-amber-50/50' : 'border-emerald-500 bg-emerald-50/50'
        }`}>
          {promotionStep === 0 ? (
            <p className="text-gray-900 font-semibold">⏳ Ready to configure and run end-of-year promotion</p>
          ) : promotionStep === 4 ? (
            <p className="text-gray-900 font-semibold">✅ Promotion completed successfully!</p>
          ) : (
            <p className="text-gray-900 font-semibold">🔄 Promotion process in progress...</p>
          )}
        </div>

        {promotionStep === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-[#223F74] mb-6">Promotion Criteria</h2>
            <div className="space-y-8">
              
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Attendance Rule</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum attendance required to promote (%)</label>
                    <input type="number" min="0" max="100" value={promotionRules.minAttendance} onChange={(e) => setPromotionRules({...promotionRules, minAttendance: parseInt(e.target.value)})} className="w-full md:w-48 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#223F74]/20" />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={promotionRules.strictAttendance} onChange={(e) => setPromotionRules({...promotionRules, strictAttendance: e.target.checked})} className="w-5 h-5 rounded text-[#223F74] focus:ring-[#223F74]" />
                    <span className="text-gray-700 font-medium">Strict attendance rule<span className="block text-sm text-gray-600 font-normal">If off, attendance is just a warning</span></span>
                  </label>
                </div>
              </div>

              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Academic Rule</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum passing marks % per subject</label>
                    <input type="number" min="0" max="100" value={promotionRules.minPassingMarks} onChange={(e) => setPromotionRules({...promotionRules, minPassingMarks: parseInt(e.target.value)})} className="w-full md:w-48 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#223F74]/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Minimum subjects to pass</label>
                    <input type="number" min="1" max="10" value={promotionRules.minSubjectsToPass} onChange={(e) => setPromotionRules({...promotionRules, minSubjectsToPass: parseInt(e.target.value)})} className="w-full md:w-48 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#223F74]/20" />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={promotionRules.allowGraceMarks} onChange={(e) => setPromotionRules({...promotionRules, allowGraceMarks: e.target.checked})} className="w-5 h-5 rounded text-[#223F74] focus:ring-[#223F74]" />
                    <span className="text-gray-700 font-medium">Allow grace marks</span>
                  </label>
                  {promotionRules.allowGraceMarks && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Grace marks limit</label>
                      <input type="number" min="0" max="50" value={promotionRules.graceMarksLimit} onChange={(e) => setPromotionRules({...promotionRules, graceMarksLimit: parseInt(e.target.value)})} className="w-full md:w-48 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#223F74]/20" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Special Rules</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={promotionRules.compartmentAllowed} onChange={(e) => setPromotionRules({...promotionRules, compartmentAllowed: e.target.checked})} className="w-5 h-5 rounded text-[#223F74] focus:ring-[#223F74]" />
                    <span className="text-gray-700 font-medium">Compartment allowed<span className="block text-sm text-gray-600 font-normal">Student fails 1 subject → Compartment (not direct fail)</span></span>
                  </label>
                  {promotionRules.compartmentAllowed && (
                    <div className="ml-8">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max subjects for compartment</label>
                      <input type="number" min="1" max="10" value={promotionRules.maxCompartmentSubjects} onChange={(e) => setPromotionRules({...promotionRules, maxCompartmentSubjects: parseInt(e.target.value)})} className="w-full md:w-48 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#223F74]/20" />
                    </div>
                  )}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={promotionRules.failIfAbsentInExam} onChange={(e) => setPromotionRules({...promotionRules, failIfAbsentInExam: e.target.checked})} className="w-5 h-5 rounded text-[#223F74] focus:ring-[#223F74]" />
                    <span className="text-gray-700 font-medium">Fail if absent in exam</span>
                  </label>
                </div>
              </div>

              <button onClick={handleSaveRules} className="bg-[#223F74] hover:bg-[#1a3360] text-white px-8 py-3 rounded-xl font-bold transition transition-all active:scale-95">
                Save Promotion Rules
              </button>
            </div>
          </div>
        )}

        {promotionStep === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-[#223F74] mb-6">Class Promotion Mapping</h2>
            <p className="text-gray-600 mb-6">Define which class promotes to which</p>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Current Class</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Promotes To</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Section Mapping</th>
                  </tr>
                </thead>
                <tbody>
                  {classMapping.length > 0 ? (
                    classMapping.map((mapping, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-4 px-4 font-semibold text-gray-800">{mapping.currentClass || mapping.class}</td>
                        <td className="py-4 px-4 font-semibold text-gray-800">{mapping.promotesTo}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">{mapping.sectionMapping}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-4 px-4 text-center text-gray-500">No mapping data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {promotionStep === 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-[#223F74] mb-2">Run Promotion</h2>
            <p className="text-gray-600 mb-6">Process end of year promotion for all students</p>

            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 mb-6">
              <p className="font-semibold text-amber-900 mb-3">⚠️ Please ensure before running promotion:</p>
              <ul className="space-y-2 text-sm text-amber-800">
                <li className="flex items-center gap-2"><span className="text-emerald-600 font-bold">✓</span> All exam results are entered and locked</li>
                <li className="flex items-center gap-2"><span className="text-emerald-600 font-bold">✓</span> Academic year is ready to be locked</li>
                <li className="flex items-center gap-2"><span className="text-emerald-600 font-bold">✓</span> Fee dues are cleared or noted</li>
              </ul>
            </div>

            <button onClick={handleStartPromotion} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold transition transition-all active:scale-95">
              Start Promotion Process
            </button>
          </div>
        )}

        {promotionStep === 1 && (
          <div className="bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#223F74]/10 text-[#223F74] font-bold">1</div>
              <h2 className="text-2xl font-bold text-[#223F74]">Select Academic Years</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Promote From (Finished Year)</label>
                <select
                  value={selectedPromotionYear}
                  onChange={(e) => {
                    setSelectedPromotionYear(e.target.value);
                    if (e.target.value === targetPromotionYear) {
                      setTargetPromotionYear('');
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#223F74]/20"
                >
                  <option value="">Select Year...</option>
                  {academicYears.map(year => (
                    <option key={`from-${year._id}`} value={year.name}>{year.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Promote To (Next Target Year)</label>
                <select
                  value={targetPromotionYear}
                  onChange={(e) => setTargetPromotionYear(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#223F74]/20"
                >
                  <option value="">Select Year...</option>
                  {academicYears
                    .filter(year => year.name !== selectedPromotionYear)
                    .map(year => (
                      <option key={`to-${year._id}`} value={year.name}>{year.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Class (Optional)</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setSelectedSection(''); // Reset section when class changes
                      }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#223F74]/20"
                    >
                      <option value="">All Classes</option>
                      {/* Pull unique classes dynamically from classMapping */}
                      {[...new Set(classMapping.map(m => m.currentClass || m.class))].map(className => (
                        <option key={className} value={className}>{className}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Section (Optional)</label>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      disabled={!selectedClass} // Only allow section if class is selected
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 ${!selectedClass ? 'bg-gray-100 border-gray-200 cursor-not-allowed text-gray-400' : 'border-gray-300'}`}
                    >
                      <option value="">All Sections</option>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </div>
                </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setPromotionStep(0)} className="px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={handleSelectYear}
                disabled={!selectedPromotionYear || !targetPromotionYear}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition transition-all active:scale-95 ${
                  (selectedPromotionYear && targetPromotionYear) ? 'bg-[#223F74] hover:bg-[#1a3360] text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {promotionStep === 2 && (
          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold">2</div>
              <h2 className="text-2xl font-bold text-gray-900">Preview Results</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-gray-600 text-sm font-medium">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{promotionStats.totalStudents}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-green-600 text-sm font-medium">To Promote</p>
                <p className="text-3xl font-bold text-green-700 mt-2">{promotionStats.promote}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <p className="text-yellow-600 text-sm font-medium">Compartment</p>
                <p className="text-3xl font-bold text-yellow-700 mt-2">{promotionStats.compartment}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-red-600 text-sm font-medium">Hold Back</p>
                <p className="text-3xl font-bold text-red-700 mt-2">{promotionStats.hold}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-blue-600 text-sm font-medium">Pass Out</p>
                <p className="text-3xl font-bold text-blue-700 mt-2">{promotionStats.passOut}</p>
              </div>
            </div>

            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Student Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Class</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Attendance %</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Result</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Override</th>
                  </tr>
                </thead>
                <tbody>
                  {previewStudents.length > 0 ? (
                    previewStudents.map((student) => (
                      <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium">{student.name}</td>
                        <td className="py-4 px-4">{student.class}</td>
                        <td className="py-4 px-4">{student.attendance}%</td>
                        <td className="py-4 px-4">{student.result}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-block px-3 py-1 rounded-full font-medium text-xs ${getStatusBadgeColor(student.override)}`}>
                            {getStatusIcon(student.override)} {student.override}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <select
                            value={student.override}
                            onChange={(e) => handleUpdateOverride(student.id, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Promote">Promote</option>
                            <option value="Hold">Hold</option>
                            <option value="Compartment">Compartment</option>
                            {(student.class.includes('10') || student.class.includes('12')) && <option value="Pass Out">Pass Out</option>}
                          </select>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-4 px-4 text-center text-gray-500">No students found to preview</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-4">
              <button onClick={() => { setPromotionStep(1); setSelectedPromotionYear(''); setPromotionConfirm(''); }} className="px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition">Back</button>
              <button onClick={() => setPromotionStep(3)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition">Next <ChevronRight size={20} /></button>
            </div>
          </div>
        )}

        {promotionStep === 3 && (
          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold">3</div>
              <h2 className="text-2xl font-bold text-gray-900">Confirm & Run Promotion</h2>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="font-bold text-gray-900 mb-4">Summary of What Will Happen</h3>
              <div className="space-y-3 text-gray-700">
                <p>✅ <span className="font-medium">{promotionStats.promote}</span> students will be promoted to {targetPromotionYear}</p>
                <p>⚠️ <span className="font-medium">{promotionStats.compartment}</span> students will be in compartment</p>
                <p>❌ <span className="font-medium">{promotionStats.hold}</span> students will repeat their class in {targetPromotionYear}</p>
                <p>🎓 <span className="font-medium">{promotionStats.passOut}</span> students will be marked as Pass Out (Alumni)</p>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">Type "PROMOTE" to confirm and run the promotion process</label>
              <input type="text" value={promotionConfirm} onChange={(e) => setPromotionConfirm(e.target.value)} className="w-full md:w-96 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type PROMOTE" />
            </div>

            <div className="flex gap-4">
              <button onClick={() => { setPromotionStep(2); setPromotionConfirm(''); }} className="px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition">Back</button>
              <button onClick={handleConfirmPromotion} disabled={promotionConfirm !== 'PROMOTE'} className={`px-8 py-3 rounded-lg font-medium transition ${promotionConfirm === 'PROMOTE' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Run Promotion</button>
            </div>
          </div>
        )}

        {promotionStep === 4 && (
          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-6">
              <Check size={32} className="text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Promotion Completed Successfully!</h2>
            <div className="space-y-2 text-gray-600 mb-8">
              <p>✅ <span className="font-medium">{promotionStats.promote}</span> students promoted to {targetPromotionYear}</p>
              <p>❌ <span className="font-medium">{promotionStats.hold}</span> students held back</p>
              <p>🎓 <span className="font-medium">{promotionStats.passOut}</span> students passed out</p>
            </div>
            <div className="flex gap-4 flex-col md:flex-row justify-center">
              <button onClick={() => setPromotionStep(0)} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition">Done</button>
              <button onClick={handleDownloadReport} className="flex items-center justify-center gap-2 px-8 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"><Download size={20} /> Download Promotion Report</button>
            </div>
          </div>
        )}

        {promotionStep === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Promotion History</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Academic Year (From)</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Academic Year (To)</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date Run</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Run By</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Total Students</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Promoted</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Held Back</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Pass Out</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {promotionHistory.length > 0 ? (
                    promotionHistory.map((record, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium">{record.fromAcademicYear || record.year}</td>
                        <td className="py-4 px-4 font-medium">{record.toAcademicYear || "-"}</td>
                        <td className="py-4 px-4">{new Date(record.dateRun).toLocaleDateString()}</td>
                        <td className="py-4 px-4">{record.runBy}</td>
                        <td className="py-4 px-4">{record.totalStudents}</td>
                        <td className="py-4 px-4 text-green-600 font-medium">{record.promoted}</td>
                        <td className="py-4 px-4 text-red-600 font-medium">{record.heldBack}</td>
                        <td className="py-4 px-4 text-blue-600 font-medium">{record.passOut}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-block px-3 py-1 rounded-full font-medium text-xs ${getStatusBadgeColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" className="py-4 px-4 text-center text-gray-500">No promotion history recorded yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PromotionSettings;