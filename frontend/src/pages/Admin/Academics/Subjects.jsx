import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  FlaskConical,
  BookMarked,
  CheckCircle2,
  Eye,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
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
  SelectField,
  Grid,
  ModalData,
  ModalGrid,
  ModalProfile,
} from "../../../components/shared/Common_Components";

import Toast from "../../../components/common/Toast";

import {
  getAdminClassesSections,
  getAdminTeacherAssignments,
  getAdminSubjects,
  createAdminSubject,
  updateAdminSubject,
  deleteAdminSubject,
} from "../../../services/api/adminAcademicsApi";

const SUBJECT_TYPES = ["Theory", "Practical", "Both"];
const DEPARTMENTS = ["Science", "Commerce", "Arts", "Languages", "Mathematics", "Social Sciences"];

const getDerivedAcademicYear = () => {
  const today = new Date();
  const currentYearNum = today.getFullYear();
  const isBeforeApril = today.getMonth() < 3;
  const startYear = isBeforeApril ? currentYearNum - 1 : currentYearNum;
  return `${startYear}-${startYear + 1}`;
};

export default function Subjects({ cache, refreshCache }) {
  const [subjects, setSubjects] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  // Modal / Drawer States
  const [editingId, setEditingId] = useState(null);
  const [viewingSubject, setViewingSubject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "Theory",
    theoryMarks: 80,
    practicalMarks: 0,
    passMarks: 33,
    department: "Science",
    description: "",
    status: "Active",
    assignedClasses: [],
    assignedSections: {}, // classId -> array of section names
    teacherId: "",
  });

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

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

      if (cache && !cache.loading && cache.classes && cache.classes.length > 0 && cache.subjects && cache.subjects.length > 0 && cache.teachers && cache.teachers.length > 0) {
        const rawClasses = cache.classes;
        const rawSubjects = cache.subjects;
        const fetchedTeachers = cache.teachers;
        const fetchedAssignments = cache.assignments || [];

        const sortedClasses = [...rawClasses].sort((a, b) => {
          const nameA = a.name || "";
          const nameB = b.name || "";
          return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
        });
        setAllClasses(sortedClasses);
        setTeachers(fetchedTeachers);

        const formattedSubjects = rawSubjects.map((sub) => {
          const rawAssignedClasses = sub.assignedClasses || [];
          const sortedAssignedClasses = rawAssignedClasses
            .map((c) => {
              const classIdStr = String(c._id || c);
              const matchingClass = sortedClasses.find(
                (fc) => String(fc.id) === classIdStr || String(fc._id) === classIdStr
              );
              return matchingClass || { id: classIdStr, _id: classIdStr, name: String(c.name || classIdStr) };
            })
            .sort((a, b) => {
              const nameA = a.name || "";
              const nameB = b.name || "";
              return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
            });

          const assignedClassIds = sortedAssignedClasses.map((c) => c.id || c._id);
          const assignedClassNames = sortedAssignedClasses.map((c) => c.name);

          // Resolve teacher mapping and sections mapping
          const classTeachers = {};
          const classSectionsMap = {};
          let teacherId = "";
          let teacherName = "Not Assigned";

          fetchedAssignments.forEach((assign) => {
            if (assign.subject?._id === sub._id && assign.class?._id) {
              const matchingClass = sortedClasses.find(
                (fc) => String(fc.id) === String(assign.class._id) || String(fc._id) === String(assign.class._id)
              );
              if (matchingClass) {
                classTeachers[matchingClass.name] = assign.teacherUser?.name || "Not Assigned";

                const clsId = String(assign.class._id);
                if (!classSectionsMap[clsId]) classSectionsMap[clsId] = [];
                if (assign.section && !classSectionsMap[clsId].includes(assign.section)) {
                  classSectionsMap[clsId].push(assign.section);
                }
              }
            }
            if (assign.subject?._id === sub._id && assign.teacherUser) {
              teacherId = assign.teacherUser._id;
              teacherName = assign.teacherUser.name;
            }
          });

          // Sort sections alphabetically (ascending) for each class
          Object.keys(classSectionsMap).forEach((clsId) => {
            classSectionsMap[clsId].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
          });

          return {
            id: sub._id,
            name: sub.subjectName || "Unnamed",
            code: sub.subjectCode || "No Code",
            type: sub.type || "Theory",
            theoryMarks: sub.theoryMarks || 0,
            practicalMarks: sub.practicalMarks || 0,
            passMarks: sub.passMarks || 0,
            description: sub.description || "",
            status: sub.status || "Active",
            assignedClassNames,
            assignedClassIds,
            teacherId,
            teacherName,
            classTeachers,
            classSectionsMap,
            department: sub.description && DEPARTMENTS.includes(sub.description) ? sub.description : "Science",
          };
        });

        setSubjects(formattedSubjects);
        setIsLoadingData(false);
      } else {
        setIsLoadingData(true);
        const derivedAcademicYear = getDerivedAcademicYear();

        const [classesRes, subjectsRes, assignmentsRes] = await Promise.all([
          getAdminClassesSections({ academicYear: derivedAcademicYear }),
          getAdminSubjects(),
          getAdminTeacherAssignments(),
        ]);

        const rawClasses = classesRes?.data?.data || classesRes?.data || classesRes || [];
        const fetchedClasses = Array.isArray(rawClasses) ? rawClasses : [];
        const sortedClasses = fetchedClasses.sort((a, b) => {
          const nameA = a.name || "";
          const nameB = b.name || "";
          return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
        });
        setAllClasses(sortedClasses);

        const rawSubjects = subjectsRes?.data || subjectsRes || [];
        const fetchedSubjects = Array.isArray(rawSubjects) ? rawSubjects : [];

        const rawAssignments = assignmentsRes?.data?.assignments || assignmentsRes?.assignments || [];
        const fetchedAssignments = Array.isArray(rawAssignments) ? rawAssignments : [];

        const rawTeachersList = assignmentsRes?.data?.teachers || assignmentsRes?.teachers || [];
        const fetchedTeachers = Array.isArray(rawTeachersList) ? rawTeachersList : [];
        setTeachers(fetchedTeachers);

        const formattedSubjects = fetchedSubjects.map((sub) => {
          const rawAssignedClasses = sub.assignedClasses || [];
          const sortedAssignedClasses = rawAssignedClasses
            .map((c) => {
              const classIdStr = String(c._id || c);
              const matchingClass = sortedClasses.find(
                (fc) => String(fc.id) === classIdStr || String(fc._id) === classIdStr
              );
              return matchingClass || { id: classIdStr, _id: classIdStr, name: String(c.name || classIdStr) };
            })
            .sort((a, b) => {
              const nameA = a.name || "";
              const nameB = b.name || "";
              return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
            });

          const assignedClassIds = sortedAssignedClasses.map((c) => c.id || c._id);
          const assignedClassNames = sortedAssignedClasses.map((c) => c.name);

          // Resolve teacher mapping and sections mapping
          const classTeachers = {};
          const classSectionsMap = {};
          let teacherId = "";
          let teacherName = "Not Assigned";

          fetchedAssignments.forEach((assign) => {
            if (assign.subject?._id === sub._id && assign.class?._id) {
              const matchingClass = fetchedClasses.find(
                (fc) => String(fc.id) === String(assign.class._id) || String(fc._id) === String(assign.class._id)
              );
              if (matchingClass) {
                classTeachers[matchingClass.name] = assign.teacherUser?.name || "Not Assigned";

                const clsId = String(assign.class._id);
                if (!classSectionsMap[clsId]) classSectionsMap[clsId] = [];
                if (assign.section && !classSectionsMap[clsId].includes(assign.section)) {
                  classSectionsMap[clsId].push(assign.section);
                }
              }
            }
            if (assign.subject?._id === sub._id && assign.teacherUser) {
              teacherId = assign.teacherUser._id;
              teacherName = assign.teacherUser.name;
            }
          });

          // Sort sections alphabetically (ascending) for each class
          Object.keys(classSectionsMap).forEach((clsId) => {
            classSectionsMap[clsId].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
          });

          return {
            id: sub._id,
            name: sub.subjectName || "Unnamed",
            code: sub.subjectCode || "No Code",
            type: sub.type || "Theory",
            theoryMarks: sub.theoryMarks || 0,
            practicalMarks: sub.practicalMarks || 0,
            passMarks: sub.passMarks || 0,
            description: sub.description || "",
            status: sub.status || "Active",
            assignedClassNames,
            assignedClassIds,
            teacherId,
            teacherName,
            classTeachers,
            classSectionsMap,
            department: sub.description && DEPARTMENTS.includes(sub.description) ? sub.description : "Science",
          };
        });

        setSubjects(formattedSubjects);
        setIsLoadingData(false);
      }
    } catch (error) {
      console.error("Failed to fetch subjects data:", error);
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (cache && !cache.loading && cache.classes && cache.classes.length > 0 && cache.subjects && cache.subjects.length > 0 && cache.teachers && cache.teachers.length > 0) {
      fetchData();
    } else {
      fetchData();
    }
  }, [cache]);

  // Stats computation
  const stats = useMemo(() => {
    const total = subjects.length;
    const active = subjects.filter((s) => s.status === "Active" || s.status === "active").length;
    const practical = subjects.filter((s) => s.type === "Practical" || s.type === "Both").length;
    const theory = subjects.filter((s) => s.type === "Theory").length;

    return { total, active, practical, theory };
  }, [subjects]);

  // Validation
  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = "Subject name is required.";
    if (!formData.code.trim()) e.code = "Subject code is required.";
    if (formData.assignedClasses.length === 0) e.classes = "Select at least one class.";

    // Validate that at least one section is selected in the assigned classes
    let hasSectionSelected = false;
    formData.assignedClasses.forEach((clsId) => {
      const secs = formData.assignedSections[clsId];
      if (secs && secs.length > 0) {
        hasSectionSelected = true;
      }
    });

    if (formData.assignedClasses.length > 0 && !hasSectionSelected) {
      e.sections = "At least one Section must be selected.";
    }

    // Check duplicate code
    const duplicateCode = subjects.find(
      (s) => s.code.toUpperCase() === formData.code.trim().toUpperCase() && s.id !== editingId
    );
    if (duplicateCode) {
      e.code = "This subject code already exists.";
    }

    // Check duplicate name in selected classes
    const duplicateName = subjects.filter(
      (s) => s.name.toLowerCase() === formData.name.trim().toLowerCase() && s.id !== editingId
    );
    const overlapping = duplicateName.some((s) =>
      s.assignedClassIds.some((id) => formData.assignedClasses.includes(id))
    );
    if (overlapping) {
      e.name = "This subject name already exists in the selected class.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Handlers: Open Modals
  const handleAddClick = () => {
    setEditingId(null);
    setFormData({
      name: "",
      code: "",
      type: "Theory",
      theoryMarks: 80,
      practicalMarks: 0,
      passMarks: 33,
      department: "Science",
      description: "",
      status: "Active",
      assignedClasses: [],
      assignedSections: {},
      teacherId: "",
    });
    setErrors({});
    openModal("subject-modal");
  };

  const handleEditClick = (row) => {
    setEditingId(row.id);
    setFormData({
      name: row.name,
      code: row.code,
      type: row.type,
      theoryMarks: row.theoryMarks,
      practicalMarks: row.practicalMarks,
      passMarks: row.passMarks,
      department: row.department || "Science",
      description: row.description,
      status: row.status,
      assignedClasses: row.assignedClassIds || [],
      assignedSections: row.classSectionsMap || {},
      teacherId: row.teacherId || "",
    });
    setErrors({});
    openModal("subject-modal");
  };

  const handleViewClick = (row) => {
    setViewingSubject(row);
    openModal("subject-view-modal");
  };

  // Handlers: Save Subject (Add/Edit)
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        subjectName: formData.name.trim(),
        subjectCode: formData.code.trim().toUpperCase(),
        type: formData.type,
        theoryMarks: formData.type === "Practical" ? 0 : formData.theoryMarks,
        practicalMarks: formData.type === "Theory" ? 0 : formData.practicalMarks,
        passMarks: formData.passMarks,
        description: formData.description,
        status: formData.status,
        assignedClasses: formData.assignedClasses,
        assignedSections: formData.assignedSections,
        teacherId: formData.teacherId,
      };

      if (editingId) {
        await updateAdminSubject(editingId, payload);
        showToast("Subject updated successfully");
      } else {
        await createAdminSubject(payload);
        showToast("Subject created successfully");
      }
      closeModal("subject-modal");
      fetchData(true);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to save subject");
    } finally {
      setSaving(false);
    }
  };

  // Handlers: Delete Subject
  const handleDeleteConfirm = async () => {
    setSaving(true);
    try {
      await deleteAdminSubject(deleteTarget.id);
      showToast("Subject deleted successfully");
      closeModal("delete-confirm-modal");
      setDeleteTarget(null);
      fetchData(true);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to delete subject");
    } finally {
      setSaving(false);
    }
  };

  // Class selection list helper
  const handleClassCheckboxChange = (classId, checked) => {
    const currentList = [...formData.assignedClasses];
    const sectionsObj = { ...formData.assignedSections };

    if (checked) {
      if (!currentList.includes(classId)) {
        currentList.push(classId);
      }
    } else {
      const idx = currentList.indexOf(classId);
      if (idx > -1) {
        currentList.splice(idx, 1);
      }
      // Delete unselected class sections to prevent orphan maps
      delete sectionsObj[classId];
    }
    setFormData({ ...formData, assignedClasses: currentList, assignedSections: sectionsObj });
    setErrors((prev) => ({ ...prev, classes: "", sections: "" }));
  };

  // Section selection list helper
  const handleSectionCheckboxChange = (classId, sectionName, checked) => {
    const sectionsObj = { ...formData.assignedSections };
    const currentClassSecs = [...(sectionsObj[classId] || [])];

    if (checked) {
      if (!currentClassSecs.includes(sectionName)) {
        currentClassSecs.push(sectionName);
      }
    } else {
      const idx = currentClassSecs.indexOf(sectionName);
      if (idx > -1) {
        currentClassSecs.splice(idx, 1);
      }
    }

    sectionsObj[classId] = currentClassSecs;
    setFormData({ ...formData, assignedSections: sectionsObj });
    setErrors((prev) => ({ ...prev, sections: "" }));
  };

  // Form Fields setter
  const setField = (key) => (e) => {
    setFormData({ ...formData, [key]: e.target.value });
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  // Data Table Columns
  const columns = [
    {
      key: "code",
      label: "Subject Code",
      render: (v) => <span className="font-mono font-black text-[#223F74] text-sm">{v}</span>,
    },
    { key: "name", label: "Subject Name" },
    {
      key: "class",
      label: "Classes",
      searchValue: (row) => (row.assignedClassNames || []).join(" "),
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {(row.assignedClassNames || []).slice(0, 2).map((cls, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-[#223F74]/10 text-[#223F74] text-xs font-bold rounded-lg border border-[#223F74]/10"
            >
              {cls}
            </span>
          ))}
          {(row.assignedClassNames || []).length > 2 && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">
              +{(row.assignedClassNames || []).length - 2}
            </span>
          )}
          {(row.assignedClassNames || []).length === 0 && <span className="text-slate-400 text-xs italic">-</span>}
        </div>
      ),
    },
    { key: "department", label: "Department" },
    {
      key: "teacher",
      label: "Teacher",
      searchValue: (row) => row.teacherName,
      render: (_, row) => (
        <span
          className={
            row.assignedClassNames.length > 0 && row.teacherName !== "Not Assigned"
              ? "text-[#223F74] font-black text-xs"
              : "text-slate-400 font-medium text-xs"
          }
        >
          {row.teacherName}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (v) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            v === "Practical"
              ? "bg-amber-105 text-[#E0A04B] border border-amber-200"
              : v === "Theory"
              ? "bg-[#EEF2FB] text-[#223F74] border border-[#223F74]/10"
              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
          }`}
        >
          {v}
        </span>
      ),
    },
    { key: "status", label: "Status" },
  ];

  // Dynamic filter lists
  const classNamesOptions = useMemo(() => {
    return [...new Set(allClasses.map((c) => c.name))];
  }, [allClasses]);

  const teacherNamesOptions = useMemo(() => {
    return [...new Set(teachers.map((t) => t.name))];
  }, [teachers]);

  const filters = [
    {
      title: "Class",
      type: "toggle",
      key: "class",
      options: classNamesOptions,
      fn: (row, selected) => (row.assignedClassNames || []).some((cls) => selected.includes(cls)),
    },
    {
      title: "Teacher",
      type: "toggle",
      key: "teacher",
      options: teacherNamesOptions,
      fn: (row, selected) => selected.includes(row.teacherName),
    },
    {
      title: "Type",
      type: "toggle",
      key: "type",
      options: SUBJECT_TYPES,
      fn: (row, selected) => selected.includes(row.type),
    },
    {
      title: "Status",
      type: "toggle",
      key: "status",
      options: ["Active", "Inactive"],
      fn: (row, selected) => selected.includes(row.status),
    },
  ];

  const actions = [
    {
      icon: <Eye size={14} />,
      tooltip: "View Details",
      variant: "ghost",
      onClick: (row) => handleViewClick(row),
    },
    {
      icon: <Pencil size={14} />,
      tooltip: "Edit Subject",
      variant: "ghost",
      onClick: (row) => handleEditClick(row),
    },
    {
      icon: <Trash2 size={14} />,
      tooltip: "Delete Subject",
      variant: "danger",
      onClick: (row) => {
        setDeleteTarget(row);
        openModal("delete-confirm-modal");
      },
    },
  ];

  const selectedClassesWithSections = useMemo(() => {
    return allClasses.filter((cls) => formData.assignedClasses.includes(cls.id || cls._id));
  }, [allClasses, formData.assignedClasses]);

  if (isLoadingData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#223F74]" size={40} />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 text-left animate-fadeIn">
      {/* Header Panel */}
      <div className="flex justify-between items-center">
        <div className="inline-block px-4 py-2 bg-[#223F74]/10 text-[#223F74] rounded-xl text-xs sm:text-sm font-bold border border-[#223F74]/20">
          Academic Year: {getDerivedAcademicYear()}
        </div>
        <div className="w-auto flex-shrink-0">
          <Button
            text="Add Subject"
            onClick={handleAddClick}
            icon={<Plus size={15} />}
            variant="primary"
            size={12}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <DashGrid cols={12} gap={4}>
        <EnhancedDashCard
          title="Total Subjects"
          value={String(stats.total)}
          icon={<BookOpen size={20} />}
          accentColor="#7A8FC6"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Active Subjects"
          value={String(stats.active)}
          icon={<CheckCircle2 size={20} />}
          accentColor="#223F74"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Practical Subjects"
          value={String(stats.practical)}
          icon={<FlaskConical size={20} />}
          accentColor="#E0A04B"
          size={3}
          showAnimations
        />
        <EnhancedDashCard
          title="Theory Subjects"
          value={String(stats.theory)}
          icon={<BookMarked size={20} />}
          accentColor="#F59B87"
          size={3}
          showAnimations
        />
      </DashGrid>

      {/* Subject Inventory DataTable */}
      <DataTable
        title="Subjects Inventory"
        columns={columns}
        rows={subjects}
        actions={actions}
        pageSize={8}
        size={12}
        searchable={true}
        filters={filters}
        filterSize="xl"
        exportable={true}
        exportFileName="admin-subjects-export"
      />

      {/* MODAL: ADD / EDIT SUBJECT */}
      <Modal
        id="subject-modal"
        title={editingId !== null ? "Edit Subject Details" : "Add New Subject"}
        size="md"
      >
        <div className="space-y-5 text-left">
          <Grid cols={12} gap={4}>
            <DataField
              label="Subject Name *"
              id="subject-name"
              placeholder="e.g. Mathematics I"
              value={formData.name}
              onChange={setField("name")}
              size={6}
              error={errors.name}
            />

            <DataField
              label="Subject Code *"
              id="subject-code"
              placeholder="e.g. MATH-101"
              value={formData.code}
              onChange={setField("code")}
              size={6}
              error={errors.code}
            />

            <SelectField
              label="Subject Type *"
              id="subject-type"
              placeholder="Select Type..."
              searchable={false}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              size={6}
            >
              {SUBJECT_TYPES.map((t) => (
                <Option key={t} value={t} label={t} />
              ))}
            </SelectField>

            <SelectField
              label="Department"
              id="subject-dept"
              placeholder="Select Department..."
              searchable={false}
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              size={6}
            >
              {DEPARTMENTS.map((d) => (
                <Option key={d} value={d} label={d} />
              ))}
            </SelectField>

            <DataField
              label="Theory Max Marks"
              id="subject-theory-marks"
              type="number"
              value={formData.theoryMarks}
              onChange={(e) => setFormData({ ...formData, theoryMarks: parseInt(e.target.value) || 0 })}
              disabled={formData.type === "Practical"}
              size={4}
            />

            <DataField
              label="Practical Max Marks"
              id="subject-practical-marks"
              type="number"
              value={formData.practicalMarks}
              onChange={(e) => setFormData({ ...formData, practicalMarks: parseInt(e.target.value) || 0 })}
              disabled={formData.type === "Theory"}
              size={4}
            />

            <DataField
              label="Passing Marks"
              id="subject-pass-marks"
              type="number"
              value={formData.passMarks}
              onChange={(e) => setFormData({ ...formData, passMarks: parseInt(e.target.value) || 0 })}
              size={4}
            />

            <SelectField
              label="Teacher Assigned"
              id="subject-teacher"
              placeholder="Select Teacher..."
              searchable={true}
              value={formData.teacherId}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              size={8}
            >
              <Option value="" label="Not Assigned" />
              {teachers.map((t) => (
                <Option
                  key={t._id}
                  value={t._id}
                  label={`${t.name} ${t.staffId ? `(${t.staffId})` : ""} ${
                    t.qualification ? `- ${t.qualification}` : ""
                  }`}
                />
              ))}
            </SelectField>

            {/* Dynamic Class Checklist */}
            <div className="col-span-12 space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">Assign to Classes *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border p-4 rounded-xl border-slate-200 max-h-40 overflow-y-auto bg-white">
                {allClasses.map((cls) => (
                  <label
                    key={cls.id || cls._id}
                    className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.assignedClasses.includes(cls.id || cls._id)}
                      onChange={(e) => handleClassCheckboxChange(cls.id || cls._id, e.target.checked)}
                      className="w-4 h-4 text-[#223F74] border-slate-350 rounded focus:ring-[#223F74]/20"
                    />
                    <span className="text-xs sm:text-sm text-slate-700 font-medium">{cls.name}</span>
                  </label>
                ))}
              </div>
              {errors.classes && <p className="text-xs text-red-500 font-bold mt-1">{errors.classes}</p>}
            </div>

            {/* Available Sections mapping based on selected classes */}
            <div className="col-span-12 space-y-3">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">Available Sections *</label>
              {formData.assignedClasses.length === 0 ? (
                <div className="text-sm text-slate-400 italic font-semibold p-4 border border-dashed border-slate-200 rounded-xl">
                  Select at least one Class to assign Sections.
                </div>
              ) : (
                <div className="space-y-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                  {selectedClassesWithSections.map((cls) => {
                    const classId = cls.id || cls._id;
                    const classSecs = [...(cls.sections || [])].sort((a, b) =>
                      (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
                    );

                    return (
                      <div key={classId} className="space-y-2">
                        <p className="text-xs font-black text-[#223F74] uppercase tracking-wide">{cls.name}</p>
                        {classSecs.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No Sections available for selected Class.</p>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {classSecs.map((sec) => {
                              const isChecked = (formData.assignedSections[classId] || []).includes(sec.name);
                              return (
                                <label
                                  key={sec.id || sec.name}
                                  className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100/50 transition-colors bg-white border border-slate-200 px-3 py-2 shadow-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => handleSectionCheckboxChange(classId, sec.name, e.target.checked)}
                                    className="w-4 h-4 text-[#223F74] border-slate-350 rounded focus:ring-[#223F74]/20"
                                  />
                                  <span className="text-xs sm:text-sm text-slate-700 font-bold">Section {sec.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {errors.sections && <p className="text-xs text-red-500 font-bold mt-1">{errors.sections}</p>}
            </div>

            <div className="col-span-12">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the subject"
                rows="2"
                className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] transition bg-white"
              />
            </div>

            <div className="col-span-12 flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
              <input
                type="checkbox"
                id="editStatus"
                checked={formData.status === "Active" || formData.status === "active"}
                onChange={(e) => setFormData({ ...formData, status: e.target.checked ? "Active" : "Inactive" })}
                className="w-4 h-4 text-[#223F74] border-slate-300 rounded focus:ring-2 focus:ring-[#223F74]/20 cursor-pointer"
              />
              <label htmlFor="editStatus" className="text-xs sm:text-sm font-bold text-slate-700 cursor-pointer">
                Mark as Active
              </label>
            </div>
          </Grid>

          {/* Validation error summary */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 p-4 rounded-2xl flex gap-3 border border-red-100">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-[10px] font-black text-red-700 leading-normal uppercase">
                Please fill all required fields correctly before saving.
              </p>
            </div>
          )}

          <Grid cols={12} gap={3} className="pt-2">
            <Button
              text="Cancel"
              variant="secondary"
              onClick={() => closeModal("subject-modal")}
              size={4}
            />
            <Button
              text={editingId !== null ? "SAVE CHANGES" : "ADD SUBJECT"}
              variant="primary"
              onClick={handleSave}
              loading={saving}
              size={8}
            />
          </Grid>
        </div>
      </Modal>

      {/* MODAL: VIEW SUBJECT DETAILS */}
      {viewingSubject && (
        <Modal id="subject-view-modal" title="Subject Details" size="md">
          <div className="space-y-5 text-left">
            <ModalProfile
              name={viewingSubject.name}
              subtitle={viewingSubject.code}
              meta={`${viewingSubject.department} · ${viewingSubject.assignedClassNames.join(", ")}`}
            />

            <ModalGrid title="Subject Info" cols={2}>
              <ModalData label="Subject Name" value={viewingSubject.name} />
              <ModalData label="Subject Code" value={viewingSubject.code} />
              <ModalData label="Department" value={viewingSubject.department} />
              <ModalData label="Subject Type" value={viewingSubject.type} />
              <ModalData label="Status" value={viewingSubject.status} />
            </ModalGrid>

            <ModalGrid title="Marks Allocation" cols={3}>
              <ModalData label="Theory Max" value={String(viewingSubject.theoryMarks)} />
              <ModalData label="Practical Max" value={String(viewingSubject.practicalMarks)} />
              <ModalData label="Passing Score" value={String(viewingSubject.passMarks)} />
            </ModalGrid>

            {/* Display Assigned Classes & Sections */}
            <div className="space-y-3">
              <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">Assigned Classes & Sections</p>
              <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                {viewingSubject.assignedClassNames.map((clsName, idx) => {
                  const classId = viewingSubject.assignedClassIds[idx];
                  const secs = viewingSubject.classSectionsMap[classId] || [];

                  return (
                    <div
                      key={classId}
                      className="flex justify-between items-center text-sm font-medium border-b border-slate-100 last:border-0 pb-2 last:pb-0"
                    >
                      <span className="text-slate-500 font-bold">{clsName}</span>
                      <span className="font-bold text-[#223F74]">
                        {secs.length > 0 ? secs.join(", ") : "None Selected"}
                      </span>
                    </div>
                  );
                })}
                {viewingSubject.assignedClassNames.length === 0 && (
                  <p className="text-xs text-slate-400 italic">No classes or sections assigned</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">Assigned Class Teachers</p>
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Class</th>
                      <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-400">Teacher</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingSubject.assignedClassNames.map((cls, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs sm:text-sm text-slate-800 font-bold">{cls}</td>
                        <td
                          className={`px-4 py-3 text-xs sm:text-sm font-medium ${
                            viewingSubject.classTeachers[cls] === "Not Assigned"
                              ? "text-slate-400"
                              : "text-slate-800 font-bold"
                          }`}
                        >
                          {viewingSubject.classTeachers[cls] || "Not Assigned"}
                        </td>
                      </tr>
                    ))}
                    {viewingSubject.assignedClassNames.length === 0 && (
                      <tr>
                        <td colSpan="2" className="px-4 py-4 text-center text-xs text-slate-400 italic">
                          No classes assigned
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Grid cols={12} gap={3} className="pt-2">
              <Button
                text="Close"
                variant="secondary"
                onClick={() => closeModal("subject-view-modal")}
                size={4}
              />
              <Button
                text="EDIT SUBJECT"
                variant="primary"
                icon={<Pencil size={14} />}
                onClick={() => {
                  closeModal("subject-view-modal");
                  setTimeout(() => handleEditClick(viewingSubject), 350);
                }}
                size={8}
              />
            </Grid>
          </div>
        </Modal>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteTarget && (
        <Modal id="delete-confirm-modal" title="Delete Subject" size="sm">
          <div className="space-y-5 text-left">
            <div className="bg-red-50 p-5 rounded-2xl flex gap-3 border border-red-100">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={22} />
              <div>
                <p className="text-sm font-black text-red-700 uppercase tracking-tight">
                  This action is irreversible
                </p>
                <p className="text-xs text-red-500 font-medium mt-1 leading-relaxed">
                  Are you sure you want to permanently delete <span className="font-black">{deleteTarget.name}</span> (
                  {deleteTarget.code})? This will also remove the subject from all assigned classes.
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
                text="YES, DELETE"
                variant="danger"
                onClick={handleDeleteConfirm}
                loading={saving}
                size={8}
              />
            </Grid>
          </div>
        </Modal>
      )}

      {/* Shared Toast Notification */}
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