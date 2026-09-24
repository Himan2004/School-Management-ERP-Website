import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, X, Users, ChevronRight, Loader2 } from 'lucide-react';
import { 
  getPrincipalClassesSections, 
  getPrincipalTeacherAssignments, 
  createPrincipalClass,
  updatePrincipalClass,
  upsertPrincipalClassSection 
} from "../../../services/api/principalAcademicsApi";
import { Heading, Button, PanelModal, Grid } from '../../../components/shared/Common_Components';  

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // Modal States - Only View Section Drawer
  const [showSectionDrawer, setShowSectionDrawer] = useState(false);

  // Selected Items
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);

  // THE FIX: Decoupled Fetch Data to prevent total UI collapse
  const fetchData = async () => {
    try {
      setIsLoadingData(true);
      const year = new Date().getFullYear();
      const derivedAcademicYear = `${year}-${String(year + 1).slice(-2)}`;

      // Fetch Classes Separately
      try {
        const classesRes = await getPrincipalClassesSections({ academicYear: derivedAcademicYear });
        const fetchedClasses = classesRes?.data || classesRes || [];
        setClasses(Array.isArray(fetchedClasses) ? fetchedClasses : []);
      } catch (err) {
        console.error("Failed to load classes:", err);
        setClasses([]);
      }

      // Fetch Teachers Separately
      try {
        const teachersRes = await getPrincipalTeacherAssignments();
        const fetchedTeachers = teachersRes?.data?.teachers || teachersRes?.teachers || [];
        setTeachers(Array.isArray(fetchedTeachers) ? fetchedTeachers : []);
      } catch (err) {
        console.error("Failed to load teachers:", err);
        setTeachers([]);
      }

    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // UI Handlers
  const openSectionDrawer = (section, classItem) => {
    setSelectedSection({ ...section, className: classItem.name });
  };

  const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [classes]);

  if (isLoadingData) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#223F74]" size={48} /></div>;
  }

  return (
    <div className="w-full space-y-6 text-left">
      {/* Page Header - No Action Button */}
      <Heading
        primaryText="Classes &"
        secondaryText="Sections"
        size={12}
        showAnimations={true}
      />

      {/* Academic Year Badge */}
      <div className="mb-6 flex items-center gap-2">
        <div className="inline-block px-4 py-2 bg-[#223F74]/10 text-[#223F74] rounded-xl text-xs sm:text-sm font-bold border border-[#223F74]/20">
          Academic Year: {new Date().getFullYear()}-{String(new Date().getFullYear() + 1).slice(-2)}
        </div>
        <div className="inline-block px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs sm:text-sm font-bold border border-emerald-200">
          {classes.reduce((acc, cls) => acc + cls.totalStudents, 0)} Total Students
        </div>
      </div>

      {/* Classes Grid */}
      {sortedClasses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sortedClasses.map((classItem) => (
            <div key={classItem.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col overflow-hidden">
              
              <div className="p-5 sm:p-6 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-black text-slate-800">{classItem.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">{classItem.description || "No description provided"}</p>
                  </div>
                  {!classItem.active && <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg border border-slate-200">Inactive</span>}
                </div>
                <div className="flex items-center gap-2 text-sm sm:text-base text-[#223F74] font-bold">
                  <Users className="w-4.5 h-4.5 text-[#223F74]" />
                  <span>{classItem.totalStudents} Students</span>
                </div>
              </div>

              <div className="p-5 sm:p-6 flex-1 bg-slate-50/30">
                <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Sections</p>
                <div className="space-y-2 mb-4 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                  {classItem.sections && classItem.sections.length > 0 ? (
                    classItem.sections.map((section) => (
                      <div key={section.id || section.name} className="flex items-center justify-between">
                        <button 
                          onClick={() => openSectionDrawer(section, classItem)} 
                          className="flex-1 flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition text-left group bg-white shadow-sm"
                        >
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-[#223F74]/10 text-[#223F74] rounded-lg font-black text-xs sm:text-sm group-hover:bg-[#223F74]/20 transition-colors">
                            {section.name}
                          </span>
                          <span className="text-xs sm:text-sm text-slate-700 font-bold truncate max-w-[120px]">
                            {section.teacherName || 'No teacher assigned'}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic font-medium">No sections created yet.</p>
                  )}
                </div>
              </div>

              {/* View Only Footer - No Action Buttons */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Total Sections: {classItem.sections?.length || 0}</span>
                  <span>Class ID: {classItem.id?.slice(0, 8) || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center border-2 border-dashed border-slate-200">
          <div className="w-20 h-20 bg-[#223F74]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-[#223F74]" />
          </div>
          <h3 className="text-xl font-black text-[#223F74] mb-2">No Classes Found</h3>
          <p className="text-slate-500 font-medium max-w-md mx-auto">
            There are currently no classes configured for your school in the database.
          </p>
        </div>
      )}

      {/* SECTION DETAIL MODAL - View Only */}
      <PanelModal 
        id="section-view-modal" 
        title={`${selectedSection?.className || 'N/A'} - Section ${selectedSection?.name || 'N/A'}`} 
        size="md"
        isVisible={!!selectedSection}
        onClose={() => setSelectedSection(null)}
      >
        {selectedSection && (
          <div className="space-y-6">
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Section Information</p>
              <Grid cols={12} gap={4}>
                <div className="col-span-12 sm:col-span-6 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Class Teacher</p>
                  <p className="text-sm sm:text-base font-bold text-slate-800 mt-1">{selectedSection.teacherName || 'N/A'}</p>
                </div>
                <div className="col-span-12 sm:col-span-6 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Room Number</p>
                  <p className="text-sm sm:text-base font-bold text-slate-800 mt-1">{selectedSection.roomNumber || 'N/A'}</p>
                </div>
                <div className="col-span-12 sm:col-span-6 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Capacity</p>
                  <p className="text-sm sm:text-base font-bold text-slate-800 mt-1">{selectedSection.capacity || 'N/A'}</p>
                </div>
                <div className="col-span-12 sm:col-span-6 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Students</p>
                  <p className="text-sm sm:text-base font-bold text-slate-800 mt-1">{selectedSection.students || '0'}</p>
                </div>
              </Grid>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-r from-[#223F74]/5 to-[#F59B87]/5 p-4 rounded-2xl border border-[#E2E8F0]">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Stats</p>
              <Grid cols={12} gap={3}>
                <div className="col-span-6 sm:col-span-3">
                  <p className="text-[10px] text-slate-400">Class</p>
                  <p className="text-sm font-bold text-[#223F74]">{selectedSection.className || 'N/A'}</p>
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <p className="text-[10px] text-slate-400">Section</p>
                  <p className="text-sm font-bold text-[#223F74]">{selectedSection.name || 'N/A'}</p>
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <p className="text-[10px] text-slate-400">Academic Year</p>
                  <p className="text-sm font-bold text-[#223F74]">{new Date().getFullYear()}-{String(new Date().getFullYear() + 1).slice(-2)}</p>
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <p className="text-[10px] text-slate-400">Status</p>
                  <p className="text-sm font-bold text-emerald-600">Active</p>
                </div>
              </Grid>
            </div>

            <div className="pt-4 flex justify-end">
              <Button 
                onClick={() => setSelectedSection(null)} 
                variant="primary"
                size={12}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </PanelModal>

      {/* Custom Animation */}
      <style jsx>{`
        @keyframes slideOver {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slideOver {
          animation: slideOver 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Classes;