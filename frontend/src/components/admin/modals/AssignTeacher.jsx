import React, { useState, useEffect, useMemo } from 'react';
import { User, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAdminClassesSections,
  getAdminSubjects
} from '../../../services/api/adminAcademicsApi.js';
import {
  Modal,
  Button,
  SelectField,
  Option,
  DashGrid,
  openModal
} from '../../shared/Common_Components.jsx';

const AssignTeacherModal = ({
    teacher,
    onClose,
    onSave,
    assignSaving
}) => {
    const [classesList, setClassesList] = useState([]);
    const [subjectsList, setSubjectsList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedSubjects, setSelectedSubjects] = useState([]);

    // Open modal on mount
    useEffect(() => {
        openModal("assign-teacher-modal");
    }, []);

    // Fetch classes and subjects for this school
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [classesRes, subjectsRes] = await Promise.all([
                    getAdminClassesSections(),
                    getAdminSubjects()
                ]);

                const fetchedClasses = classesRes?.data || [];
                const fetchedSubjects = subjectsRes?.data || [];

                setClassesList(fetchedClasses);
                setSubjectsList(fetchedSubjects);

                // Pre-populate if teacher already has assignment details
                if (teacher?.assignedClass) {
                    const parts = teacher.assignedClass.split(" - ");
                    const classNameOnly = parts[0]?.trim();
                    const sectionName = parts[1]?.trim() || "";

                    const matchedClass = fetchedClasses.find(c => c.name?.toLowerCase().trim() === classNameOnly.toLowerCase().trim());
                    if (matchedClass) {
                        setSelectedClassId(matchedClass.id);
                        if (sectionName) {
                            setSelectedSection(sectionName);
                        } else if (matchedClass.sections && matchedClass.sections.length > 0) {
                            setSelectedSection(matchedClass.sections[0].name);
                        } else {
                            setSelectedSection("A");
                        }
                    }
                }

                if (teacher?.subjects) {
                    const initialSubjects = teacher.subjects.map(s => typeof s === 'string' ? s : (s.subjectName || s.name || '')).filter(Boolean);
                    setSelectedSubjects(initialSubjects);
                }
            } catch (err) {
                console.error("Failed to load classes and subjects for assignment modal:", err);
                setError("Failed to fetch latest academic data.");
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, [teacher]);

    // Sorting Helper for Class order Nursery -> Jr KG -> Sr KG -> Class 1 ... Class 12
    const getClassPriority = (className) => {
      if (!className) return 999;
      const name = className.toLowerCase().trim();
      if (name.includes('nursery')) return 0;
      if (name.includes('junior kg') || name.includes('jr kg')) return 1;
      if (name.includes('senior kg') || name.includes('sr kg')) return 2;
      const match = name.match(/class\s+(\d+)/);
      if (match) {
        return 2 + parseInt(match[1], 10);
      }
      return 999;
    };

    const sortClasses = (list) => {
      return [...list].sort((a, b) => {
        const aName = a.name || '';
        const bName = b.name || '';
        const priorityA = getClassPriority(aName);
        const priorityB = getClassPriority(bName);
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return aName.localeCompare(bName, undefined, { numeric: true });
      });
    };

    // Filter subjects by the selected Class ID
    const classSubjects = useMemo(() => {
      if (!selectedClassId) return [];
      return subjectsList.filter(subject => {
        const matchClassId = subject.classId && String(subject.classId) === String(selectedClassId);
        const matchAssignedClasses = subject.assignedClasses && subject.assignedClasses.map(String).includes(String(selectedClassId));
        return matchClassId || matchAssignedClasses;
      });
    }, [subjectsList, selectedClassId]);

    // Handle class selection changes
    const handleClassChange = (e) => {
        const newClassId = e.target.value;
        setSelectedClassId(newClassId);
        setSelectedSubjects([]); // Reset subjects on class change

        const matchedClass = classesList.find(c => String(c.id) === String(newClassId));
        if (matchedClass && matchedClass.sections && matchedClass.sections.length > 0) {
            setSelectedSection(matchedClass.sections[0].name);
        } else {
            setSelectedSection("A");
        }
    };

    // Validate and submit changes
    const handleSave = () => {
        if (!selectedClassId) {
            toast.error("Please select a class.");
            return;
        }
        if (selectedSubjects.length === 0) {
            toast.error("Please select at least one subject.");
            return;
        }

        const matchedClass = classesList.find(c => String(c.id) === String(selectedClassId));
        if (!matchedClass) return;

        const assignedClass = selectedSection 
            ? `${matchedClass.name} - ${selectedSection}` 
            : matchedClass.name;

        onSave({ assignedClass, subjects: selectedSubjects });
    };

    if (!teacher) return null;

    return (
        <Modal id="assign-teacher-modal" title="Assign Class & Subjects" size="lg" onClose={onClose}>
            <div className="p-4 space-y-6 text-left">
                {/* Teacher details banner */}
                <div className="flex items-center gap-3 p-4 bg-violet-50 dark:bg-violet-950/20 rounded-2xl border border-violet-100 dark:border-violet-900/30">
                    <div className="w-10 h-10 bg-violet-100 dark:bg-violet-950/40 rounded-xl flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">{teacher.name}</p>
                        <p className="text-xs text-violet-600 dark:text-violet-400 font-bold font-mono">
                            {teacher.teacherId || teacher.empId || teacher.staffId}
                        </p>
                    </div>
                    {teacher.assignedClass && (
                        <div className="ml-auto flex flex-col items-end gap-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Assignment</span>
                            <span className="px-2.5 py-1 bg-violet-600 text-white text-xs rounded-lg font-bold">
                                {teacher.assignedClass}
                            </span>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-10 h-10 border-4 border-slate-200 border-t-violet-600 rounded-full animate-spin mb-3" />
                        <span className="text-sm text-slate-500 dark:text-slate-400 font-semibold">Loading academic data...</span>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-sm font-semibold">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <DashGrid cols={12} gap={4}>
                            <div className="col-span-12 sm:col-span-6">
                                <SelectField
                                    label="Class"
                                    id="assign_class"
                                    value={selectedClassId}
                                    onChange={handleClassChange}
                                    placeholder="Select class"
                                    searchable={false}
                                    size={12}
                                >
                                    <Option value="" label="Select Class" />
                                    {sortClasses(classesList).map(cls => (
                                        <Option key={cls.id} value={cls.id} label={cls.name} />
                                    ))}
                                </SelectField>
                                {classesList.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-1 font-semibold">No classes available.</p>
                                )}
                            </div>

                            <div className="col-span-12 sm:col-span-6">
                                <SelectField
                                    label="Section"
                                    id="assign_section"
                                    value={selectedSection}
                                    onChange={(e) => setSelectedSection(e.target.value)}
                                    placeholder="Select section"
                                    searchable={false}
                                    disabled={!selectedClassId}
                                    size={12}
                                >
                                    {(() => {
                                        const selectedClassObj = classesList.find(c => String(c.id) === String(selectedClassId));
                                        const sections = selectedClassObj?.sections || [];
                                        if (sections.length === 0) {
                                            return [
                                                <Option key="placeholder" value="" label="Select Section" />,
                                                <Option key="default-A" value="A" label="A" />
                                            ];
                                        }
                                        return [
                                            <Option key="placeholder" value="" label="Select Section" />,
                                            ...sections.map(sec => (
                                                <Option key={sec.id || sec.name} value={sec.name} label={sec.name} />
                                            ))
                                        ];
                                    })()}
                                </SelectField>
                            </div>
                        </DashGrid>

                        {/* Subjects Selection */}
                        <div className="space-y-3">
                            <label className="block text-xs font-bold text-gray-700 dark:text-slate-300">
                                Select Subjects
                                <span className="text-gray-600 dark:text-slate-400 font-normal ml-1">(Multiple selections allowed)</span>
                            </label>

                            {!selectedClassId ? (
                                <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 dark:text-slate-500 text-sm font-semibold">
                                    Please select a class to view subjects.
                                </div>
                            ) : classSubjects.length === 0 ? (
                                <div className="p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 dark:text-slate-500 text-sm font-semibold">
                                    No subjects available for this class.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-1">
                                    {classSubjects.map(subj => {
                                        const name = subj.subjectName || subj.name;
                                        const isChecked = selectedSubjects.includes(name);
                                        return (
                                            <label
                                                key={subj._id || subj.id}
                                                className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all ${
                                                    isChecked
                                                        ? 'bg-violet-50/65 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900/40 text-violet-750 dark:text-violet-400 font-bold'
                                                        : 'bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-150 dark:border-slate-800 text-gray-700 dark:text-slate-300'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        if (isChecked) {
                                                            setSelectedSubjects(prev => prev.filter(s => s !== name));
                                                        } else {
                                                            setSelectedSubjects(prev => [...prev, name]);
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 accent-violet-600"
                                                />
                                                <span className="text-sm">{name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Chips for Selected Subjects */}
                        {selectedSubjects.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                                {selectedSubjects.map(subjName => (
                                    <span
                                        key={subjName}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-violet-100 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 text-xs font-bold rounded-full border border-violet-200/50 dark:border-violet-900/40"
                                    >
                                        {subjName}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedSubjects(prev => prev.filter(s => s !== subjName))}
                                            className="w-4 h-4 bg-violet-200 dark:bg-violet-900 hover:bg-violet-300 dark:hover:bg-violet-850 rounded-full flex items-center justify-center transition-all text-violet-800 dark:text-violet-300"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button
                        text="Cancel"
                        variant="secondary"
                        onClick={onClose}
                    />
                    <Button
                        text="Save Assignment"
                        variant="primary"
                        onClick={handleSave}
                        loading={assignSaving}
                        disabled={loading || classesList.length === 0}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default AssignTeacherModal;