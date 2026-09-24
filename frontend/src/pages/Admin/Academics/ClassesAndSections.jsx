import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  BookOpen,
  Users,
  GraduationCap,
  UserCheck,
  Eye,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
  X,
  ChevronRight,
  Loader2,
} from "lucide-react";

import {
  EnhancedDashCard,
  DashGrid,
  DataTable,
  Modal,
  openModal,
  closeModal,
  DataField,
  Button,
  Option,
  Select,
  SelectField,
  Grid,
  ModalData,
  ModalGrid,
  PanelModal,
  ModalProfile,
} from "../../../components/shared/Common_Components";

import Toast from "../../../components/common/Toast";

import {
  getAdminClassesSections,
  getAdminTeacherAssignments,
  createAdminClass,
  updateAdminClass,
  upsertAdminClassSection,
} from "../../../services/api/adminAcademicsApi";
import { sortGrades } from "../../../utils/gradeSorter";

const getDerivedAcademicYear = () => {
  const today = new Date();
  const currentYearNum = today.getFullYear();
  const isBeforeApril = today.getMonth() < 3;
  const startYear = isBeforeApril ? currentYearNum - 1 : currentYearNum;
  return `${startYear}-${startYear + 1}`;
};

export default function ClassesAndSections({ cache, refreshCache }) {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [sortOrder, setSortOrder] = useState("asc");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  // Modal / Drawer States
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [viewingRow, setViewingRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form States - Only Add/Edit Section
  const [addSectionForm, setAddSectionForm] = useState({ name: "", teacherId: "", roomNumber: "", capacity: "35" });
  const [editSectionForm, setEditSectionForm] = useState({ id: "", name: "", teacherId: "", roomNumber: "", capacity: "35" });

  const [showSectionDrawer, setShowSectionDrawer] = useState(false);

  // Fetch Data from Backend
  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setIsLoadingData(true);
        if (refreshCache) {
          await refreshCache();
        }
        return;
      }

      if (cache && !cache.loading && cache.classes && cache.classes.length > 0 && cache.teachers && cache.teachers.length > 0) {
        setClasses(cache.classes);
        setTeachers(cache.teachers);
        setIsLoadingData(false);
      } else {
        setIsLoadingData(true);
        const derivedAcademicYear = getDerivedAcademicYear();

        try {
          const classesRes = await getAdminClassesSections({ academicYear: derivedAcademicYear });
          const fetchedClasses = classesRes?.data || classesRes || [];
          setClasses(Array.isArray(fetchedClasses) ? fetchedClasses : []);
        } catch (err) {
          console.error("Failed to load classes:", err);
          setClasses([]);
        }

        try {
          const teachersRes = await getAdminTeacherAssignments();
          const fetchedTeachers = teachersRes?.data?.teachers || teachersRes?.teachers || [];
          setTeachers(Array.isArray(fetchedTeachers) ? fetchedTeachers : []);
        } catch (err) {
          console.error("Failed to load teachers:", err);
          setTeachers([]);
        }
        setIsLoadingData(false);
      }
    } catch (e) {
      console.error(e);
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (cache && !cache.loading && cache.classes && cache.classes.length > 0 && cache.teachers && cache.teachers.length > 0) {
      setClasses(cache.classes);
      setTeachers(cache.teachers);
      setIsLoadingData(false);
    } else {
      fetchData();
    }
  }, [cache]);

  // Toast Utility
  const showToast = (message) => {
    setToast({ message, type: "info" });
  };

  const authUser = useSelector((state) => state.adminAuth?.authUser);
  const allocatedGrades = useMemo(() => {
    const gradesString = authUser?.school?.gradesOffered || "";
    return gradesString ? gradesString.split(",").map(g => g.trim().toLowerCase()) : [];
  }, [authUser?.school?.gradesOffered]);

  const isClassAllowed = useCallback((clsName) => {
    if (!allocatedGrades.length) return false;
    let cleanName = clsName.trim().toLowerCase();
    if (allocatedGrades.includes(cleanName)) return true;
    if (cleanName.startsWith("class ")) {
      cleanName = cleanName.substring(6).trim();
    }
    return allocatedGrades.includes(cleanName);
  }, [allocatedGrades]);

  // Sort and Memoize Classes
  const sortedClasses = useMemo(() => {
    const allowed = classes.filter((cls) => isClassAllowed(cls.name || ""));
    const sorted = sortGrades(allowed, (cls) => cls.name);
    return sortOrder === "asc" ? sorted : [...sorted].reverse();
  }, [classes, sortOrder, isClassAllowed]);

  // Stats computation
  const stats = useMemo(() => {
    const totalClasses = sortedClasses.length;
    const totalSections = sortedClasses.reduce((sum, c) => sum + (c.sections?.length || 0), 0);
    const totalStudents = sortedClasses.reduce((sum, c) => sum + (c.totalStudents || 0), 0);
    const teacherNames = sortedClasses.flatMap(c => (c.sections || []).map(s => s.teacherName)).filter(name => name && name !== "Not Assigned");
    const totalTeachers = [...new Set(teacherNames)].length;

    return {
      totalClasses,
      totalSections,
      totalStudents,
      totalTeachers,
    };
  }, [sortedClasses]);

  // Handlers: Add Section to card
  const handleAddSectionClick = (classItem) => {
    setSelectedClass(classItem);
    setAddSectionForm({ name: "", teacherId: "", roomNumber: "", capacity: "35" });
    setErrors({});
    openModal("add-section-modal");
  };

  const handleAddSectionSave = async () => {
    const e = {};
    const trimmedName = addSectionForm.name.trim().toUpperCase();

    if (!trimmedName) {
      e.name = "Section name is required.";
    } else if (!/^[A-Z]+$/.test(trimmedName)) {
      e.name = "Only alphabets are allowed.";
    } else if (selectedClass) {
      const exists = (selectedClass.sections || []).some(
        s => s.name.trim().toUpperCase() === trimmedName
      );
      if (exists) {
        e.name = "This section already exists.";
      }
    }

    if (!addSectionForm.teacherId) {
      e.teacherId = "Class teacher is required";
    }
    if (!addSectionForm.capacity || isNaN(Number(addSectionForm.capacity)) || Number(addSectionForm.capacity) < 1) {
      e.capacity = "Enter a valid capacity (min 1)";
    }

    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setSaving(true);
    try {
      const derivedAcademicYear = getDerivedAcademicYear();
      const teacher = teachers.find(t => t._id === addSectionForm.teacherId);

      await upsertAdminClassSection({
        classId: selectedClass.id || selectedClass._id,
        className: selectedClass.name,
        section: trimmedName,
        academicYear: derivedAcademicYear,
        roomNumber: addSectionForm.roomNumber,
        maxCapacity: parseInt(addSectionForm.capacity),
        teacherId: teacher?._id,
        teacherName: teacher?.name
      });

      showToast("Section added successfully");
      closeModal("add-section-modal");
      setSelectedClass(null);
      fetchData(true);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to add section");
    } finally {
      setSaving(false);
    }
  };

  // Handlers: Section Drawer & Edit Section
  const handleOpenSectionDrawer = (section, classItem) => {
    setSelectedClass(classItem);
    setSelectedSection({ ...section, className: classItem.name });
    setShowSectionDrawer(true);
  };

  const handleOpenEditSectionModal = () => {
    setEditSectionForm({
      id: selectedSection.id,
      name: selectedSection.name,
      teacherId: selectedSection.teacherId || "",
      roomNumber: selectedSection.roomNumber || "",
      capacity: selectedSection.capacity || "35"
    });
    setErrors({});
    setShowSectionDrawer(false);
    openModal("edit-section-modal");
  };

  const handleEditSectionSave = async () => {
    const e = {};
    const trimmedName = editSectionForm.name.trim().toUpperCase();

    if (!trimmedName) {
      e.name = "Section name is required.";
    } else if (!/^[A-Z]+$/.test(trimmedName)) {
      e.name = "Only alphabets are allowed.";
    } else if (selectedClass && selectedSection) {
      const otherSections = (selectedClass.sections || []).filter(s => String(s.id) !== String(selectedSection.id));
      const exists = otherSections.some(
        s => s.name.trim().toUpperCase() === trimmedName
      );
      if (exists) {
        e.name = "This section already exists.";
      }
    }

    if (!editSectionForm.teacherId) {
      e.teacherId = "Class teacher is required";
    }
    if (!editSectionForm.capacity || isNaN(Number(editSectionForm.capacity)) || Number(editSectionForm.capacity) < 1) {
      e.capacity = "Enter a valid capacity (min 1)";
    }

    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    setSaving(true);
    try {
      const derivedAcademicYear = getDerivedAcademicYear();
      const teacher = teachers.find(t => t._id === editSectionForm.teacherId);

      await upsertAdminClassSection({
        sectionId: editSectionForm.id,
        classId: selectedClass.id || selectedClass._id,
        className: selectedClass.name,
        section: trimmedName,
        academicYear: derivedAcademicYear,
        roomNumber: editSectionForm.roomNumber,
        maxCapacity: parseInt(editSectionForm.capacity),
        teacherId: teacher?._id,
        teacherName: teacher?.name
      });

      showToast("Section updated successfully");
      closeModal("edit-section-modal");
      setSelectedClass(null);
      setSelectedSection(null);
      fetchData(true);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update section");
    } finally {
      setSaving(false);
    }
  };

  // Table structure mapping
  const tableRows = useMemo(() => {
    return sortedClasses.map(cls => {
      const teacherNames = cls.sections.map(s => s.teacherName).filter(name => name && name !== "Not Assigned");
      const uniqueTeachers = [...new Set(teacherNames)];
      const displayTeacher = uniqueTeachers.length > 0 ? uniqueTeachers.join(", ") : "Not Assigned";
      const totalCapacity = cls.sections.reduce((sum, s) => sum + (s.capacity || 40), 0);

      return {
        id: cls.id || cls._id,
        name: cls.name,
        sectionCount: cls.sections.length,
        teachers: displayTeacher,
        students: cls.totalStudents || 0,
        capacity: totalCapacity,
        subjects: cls.subjectsCount || 0,
        status: cls.active ? "Active" : "Inactive",
        description: cls.description,
        sections: cls.sections
      };
    });
  }, [sortedClasses]);

  const columns = [
    {
      key: "name",
      label: "Class",
      render: v => (
        <span className="font-black text-[#223F74] text-sm">{v}</span>
      ),
    },
    {
      key: "sectionCount",
      label: "Section Count",
      align: "center",
      render: v => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#EEF2FB] text-[#223F74] font-black text-sm">
          {v}
        </span>
      ),
    },
    { key: "teachers", label: "Teacher(s)" },
    {
      key: "students",
      label: "Students",
      align: "center",
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#223F74]"
              style={{ width: `${Math.min(100, (v / (row.capacity || 40)) * 100)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-[#1D1D1F]">{v}/{row.capacity || 40}</span>
        </div>
      ),
    },
    {
      key: "subjects",
      label: "Subjects",
      align: "center",
      render: v => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#F4F7FB] text-[#223F74] font-black text-xs">
          {v}
        </span>
      ),
    },
    { key: "status", label: "Status" },
  ];

  // Actions - Removed Edit Class, kept View and Delete/Deactivate
  const actions = [
    {
      icon: <Eye size={14} />,
      tooltip: "View Details",
      variant: "ghost",
      onClick: row => {
        setViewingRow(row);
        openModal("class-view-modal");
      },
    },
    {
      icon: <Trash2 size={14} />,
      tooltip: "Deactivate Class",
      variant: "danger",
      onClick: row => {
        setDeleteTarget(row);
        openModal("delete-confirm-modal");
      },
    },
  ];

  const filters = [
    { title: "Status", key: "status", type: "toggle", options: ["Active", "Inactive"] },
  ];

  if (isLoadingData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#223F74]" size={40} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 text-left animate-fadeIn">
      {/* Page Header with Sorting Dropdown - Removed Add Class Button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-block px-4 py-2 bg-[#223F74]/10 text-[#223F74] rounded-xl text-xs sm:text-sm font-bold border border-[#223F74]/20">
            Academic Year: {getDerivedAcademicYear()}
          </div>
          
          {/* Sorting Dropdown */}
          <div className="w-48">
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="Sort Classes..."
              searchable={false}
            >
              <Option value="asc" label="Class Name (A → Z)" />
              <Option value="desc" label="Class Name (Z → A)" />
            </Select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Classes"
          value={String(stats.totalClasses)}
          icon={<BookOpen size={20} />}
          accentColor="#7A8FC6"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Total Sections"
          value={String(stats.totalSections)}
          icon={<GraduationCap size={20} />}
          accentColor="#7A8FC6"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Total Students"
          value={String(stats.totalStudents)}
          icon={<Users size={20} />}
          accentColor="#E0A04B"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Teachers Assigned"
          value={String(stats.totalTeachers)}
          icon={<UserCheck size={20} />}
          accentColor="#F59B87"
          size={3}
          showAnimations
        />
      </DashGrid>

      {/* Class Cards Grid - Removed Edit Class and Add Class buttons */}
      {sortedClasses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4">
          {sortedClasses.map((classItem) => (
            <div key={classItem.id || classItem._id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-black text-[#223F74]">{classItem.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">{classItem.description || "No description provided"}</p>
                  </div>
                  {!classItem.active && <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg border border-slate-200">Inactive</span>}
                </div>
                <div className="flex items-center gap-2 text-sm sm:text-base text-[#223F74] font-bold">
                  <Users className="w-4.5 h-4.5" />
                  <span>{classItem.totalStudents || 0} Students</span>
                </div>
              </div>

              <div className="p-5 sm:p-6 flex-1 bg-slate-50/30">
                <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Sections</p>
                <div className="space-y-2 mb-4">
                  {(classItem.sections || []).map((section) => (
                    <button
                      key={section.id || section.name}
                      onClick={() => handleOpenSectionDrawer(section, classItem)}
                      className="w-full flex items-center gap-3.5 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition text-left group bg-white shadow-sm"
                    >
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-[#223F74]/10 text-[#223F74] rounded-lg font-black text-xs sm:text-sm group-hover:bg-[#223F74]/20 transition-colors">
                        {section.name}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-700 font-bold">{section.teacherName}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ))}
                  {(!classItem.sections || classItem.sections.length === 0) && (
                    <p className="text-xs text-slate-400 italic font-medium">No sections created yet.</p>
                  )}
                </div>
              </div>

              {/* Action buttons - Only Add Section, removed Edit Class */}
              <div className="p-5 bg-slate-50/50 border-t border-slate-100 mt-auto">
                <Button
                  text="Add Section"
                  variant="primary"
                  icon={<Plus size={14} />}
                  onClick={() => handleAddSectionClick(classItem)}
                  size={12}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center border-2 border-dashed border-slate-200">
          <h3 className="text-xl font-black text-[#223F74] mb-2">No Classes Assigned</h3>
          <p className="text-slate-500 font-medium mb-6">No classes have been assigned to this school yet.</p>
        </div>
      )}

      {/* Unified Data Table - Removed Edit action */}
      <DataTable
        title="Classes & Sections Inventory"
        columns={columns}
        rows={tableRows}
        actions={actions}
        pageSize={8}
        size={12}
        searchable={true}
        filters={filters}
        filterSize="xl"
        exportable={true}
        exportFileName="admin-classes-export"
      />

      {/* MODAL: ADD SECTION */}
      <Modal id="add-section-modal" title={selectedClass ? `Add Section to ${selectedClass.name}` : "Add Section"} size="md">
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">Section Name *</label>
            <input
              type="text"
              value={addSectionForm.name}
              onChange={(e) => {
                setAddSectionForm({ ...addSectionForm, name: e.target.value });
                setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="e.g. A, B, C"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition"
            />
            {errors.name && <p className="text-xs text-red-500 font-bold mt-1">{errors.name}</p>}
          </div>

          <SelectField
            label="Class Teacher *"
            id="add-sec-teacher"
            placeholder="Select teacher..."
            searchable={true}
            value={addSectionForm.teacherId}
            onChange={(e) => {
              setAddSectionForm({ ...addSectionForm, teacherId: e.target.value });
              setErrors((prev) => ({ ...prev, teacherId: "" }));
            }}
            error={errors.teacherId}
          >
            {teachers.map((t) => (
              <Option key={t._id} value={t._id} label={t.name} />
            ))}
          </SelectField>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">Room Number</label>
            <input
              type="text"
              value={addSectionForm.roomNumber}
              onChange={(e) => setAddSectionForm({ ...addSectionForm, roomNumber: e.target.value })}
              placeholder="e.g. 101"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">Max Student Capacity *</label>
            <input
              type="number"
              value={addSectionForm.capacity}
              onChange={(e) => {
                setAddSectionForm({ ...addSectionForm, capacity: e.target.value });
                setErrors((prev) => ({ ...prev, capacity: "" }));
              }}
              placeholder="35"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition"
            />
            {errors.capacity && <p className="text-xs text-red-500 font-bold mt-1">{errors.capacity}</p>}
          </div>

          <Grid cols={12} gap={3} className="pt-2">
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => closeModal("add-section-modal")}
              size={4}
            />
            <Button
              text="ADD SECTION"
              variant="primary"
              onClick={handleAddSectionSave}
              loading={saving}
              size={8}
            />
          </Grid>
        </div>
      </Modal>

      {/* MODAL: EDIT SECTION */}
      <Modal id="edit-section-modal" title="Edit Section details" size="md">
        <div className="space-y-4 text-left">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">Section Name *</label>
            <input
              type="text"
              value={editSectionForm.name}
              onChange={(e) => {
                setEditSectionForm({ ...editSectionForm, name: e.target.value });
                setErrors((prev) => ({ ...prev, name: "" }));
              }}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition"
            />
            {errors.name && <p className="text-xs text-red-500 font-bold mt-1">{errors.name}</p>}
          </div>

          <SelectField
            label="Class Teacher *"
            id="edit-sec-teacher"
            searchable={true}
            value={editSectionForm.teacherId}
            onChange={(e) => {
              setEditSectionForm({ ...editSectionForm, teacherId: e.target.value });
              setErrors((prev) => ({ ...prev, teacherId: "" }));
            }}
            error={errors.teacherId}
          >
            {teachers.map((t) => (
              <Option key={t._id} value={t._id} label={t.name} />
            ))}
          </SelectField>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">Room Number</label>
            <input
              type="text"
              value={editSectionForm.roomNumber}
              onChange={(e) => setEditSectionForm({ ...editSectionForm, roomNumber: e.target.value })}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">Max Student Capacity *</label>
            <input
              type="number"
              value={editSectionForm.capacity}
              onChange={(e) => {
                setEditSectionForm({ ...editSectionForm, capacity: e.target.value });
                setErrors((prev) => ({ ...prev, capacity: "" }));
              }}
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition"
            />
            {errors.capacity && <p className="text-xs text-red-500 font-bold mt-1">{errors.capacity}</p>}
          </div>

          <Grid cols={12} gap={3} className="pt-2">
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => closeModal("edit-section-modal")}
              size={4}
            />
            <Button
              text="SAVE CHANGES"
              variant="primary"
              onClick={handleEditSectionSave}
              loading={saving}
              size={8}
            />
          </Grid>
        </div>
      </Modal>

      {/* MODAL: VIEW DETAILS */}
      {viewingRow && (
        <Modal id="class-view-modal" title="Class Details" size="md">
          <div className="space-y-4 text-left">
            <ModalProfile
              name={viewingRow.name}
              subtitle={viewingRow.description || "No description provided"}
              meta={`${viewingRow.students} students enrolled`}
            />

            <ModalGrid title="Class Info" cols={2}>
              <ModalData label="Class Name" value={viewingRow.name} />
              <ModalData label="Total Sections" value={String(viewingRow.sectionCount)} />
              <ModalData label="Total Students" value={String(viewingRow.students)} />
              <ModalData label="Subjects Count" value={String(viewingRow.subjects)} />
              <ModalData label="Status" value={viewingRow.status} />
            </ModalGrid>

            <div className="space-y-3 mt-4">
              <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">Sections</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {viewingRow.sections && viewingRow.sections.map(sec => (
                  <div key={sec.id || sec.name} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-[#223F74]/10 text-[#223F74] rounded-lg font-black text-sm">
                        {sec.name}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">{sec.students}/{sec.capacity} students</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-2 font-bold">Teacher: {sec.teacherName}</p>
                    {sec.roomNumber && <p className="text-xs text-slate-400 mt-0.5">Room: {sec.roomNumber}</p>}
                  </div>
                ))}
                {(!viewingRow.sections || viewingRow.sections.length === 0) && (
                  <p className="text-xs text-slate-400 italic">No sections created yet.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                text="Close"
                variant="secondary"
                onClick={() => closeModal("class-view-modal")}
                size={4}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* SECTION DETAIL DRAWER */}
      <PanelModal
        id="section-drawer"
        title={selectedSection ? `${selectedSection.className} - Section ${selectedSection.name}` : ""}
        isVisible={showSectionDrawer}
        onClose={() => {
          setShowSectionDrawer(false);
          setSelectedSection(null);
        }}
        size="md"
      >
        {selectedSection && (
          <div className="space-y-6 text-left">
            <ModalProfile
              name={`Section ${selectedSection.name}`}
              subtitle={`Class Teacher: ${selectedSection.teacherName}`}
              meta={`Room Number: ${selectedSection.roomNumber || "Not assigned"}`}
            />

            <ModalGrid title="Section Details" cols={2}>
              <ModalData label="Homeroom Teacher" value={selectedSection.teacherName} />
              <ModalData label="Room Number" value={selectedSection.roomNumber || "Not assigned"} />
              <ModalData label="Max Capacity" value={String(selectedSection.capacity)} />
              <ModalData label="Enrolled Students" value={`${selectedSection.students}/${selectedSection.capacity}`} />
            </ModalGrid>

            <div className="pt-2">
              <Button
                text="Edit Section Profile"
                variant="secondary"
                onClick={handleOpenEditSectionModal}
                size={12}
              />
            </div>
          </div>
        )}
      </PanelModal>

      {/* MODAL: DELETE CONFIRMATION - Deactivate Class */}
      {deleteTarget && (
        <Modal id="delete-confirm-modal" title="Deactivate Class" size="sm">
          <div className="space-y-5">
            <div className="bg-red-50 p-5 rounded-2xl flex gap-3 border border-red-100">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={22} />
              <div>
                <p className="text-sm font-black text-red-700 uppercase tracking-tight">
                  Confirm Deactivation
                </p>
                <p className="text-xs text-red-500 font-medium mt-1 leading-relaxed">
                  You are about to deactivate class <span className="font-black">{deleteTarget.name}</span>.
                  It will be hidden from default views.
                </p>
              </div>
            </div>

            <Grid cols={12} gap={3}>
              <Button
                text="Cancel"
                variant="secondary"
                onClick={() => {
                  setDeleteTarget(null);
                  closeModal("delete-confirm-modal");
                }}
                size={4}
              />
              <Button
                text="YES, DEACTIVATE"
                variant="danger"
                onClick={handleDeleteConfirm}
                loading={saving}
                size={8}
              />
            </Grid>
          </div>
        </Modal>
      )}

      {/* Reusable Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}