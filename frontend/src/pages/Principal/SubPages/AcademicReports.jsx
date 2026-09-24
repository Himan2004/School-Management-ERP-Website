import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, ChevronDown, Loader2, Users, TrendingUp, Award, BookOpen, CalendarDays, BarChart2, Eye } from 'lucide-react';
import api from '../../../services/api'; // DIRECT API IMPORT to bypass missing wrappers
import { DataTable, Grid, Heading, DashGrid, EnhancedDashCard, Select, SelectField, Option, GDoughnutChart, GColumnChart, GPieChart, Modal, openModal, closeModal } from '../../../components/shared/Common_Components';

// --- NO MOCK DATA USED ---

const AcademicReports = () => {
  // Generate dynamic years starting with the current year (same logic as Student Attendance)
  const generatedYears = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let startYear = currentMonth >= 5 ? currentYear : currentYear - 1;
    const years = [];
    for (let i = 0; i < 4; i++) {
      const sYear = startYear - i;
      const eYear = (sYear + 1) % 100;
      const eYearStr = eYear < 10 ? `0${eYear}` : `${eYear}`;
      years.push(`${sYear}-${eYearStr}`);
    }
    return years;
  }, []);

  const [filterOptions, setFilterOptions] = useState({
      classes: ['Class 9', 'Class 10'],
      sections: ['A', 'B'],
      academicYears: generatedYears,
      subjects: ['Math', 'Science', 'English'],
      comparisonTypes: ['Mid Term Examination vs Final Term Examination'],
      classSectionMap: { 'Class 9': ['A', 'B'], 'Class 10': ['A', 'B'] }
  });

  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedYear, setSelectedYear] = useState(generatedYears[0] || '');
  const [selectedSubjectDeepDive, setSelectedSubjectDeepDive] = useState('');
  const [selectedComparison, setSelectedComparison] = useState('');
  const [subjectMap, setSubjectMap] = useState({ idToName: {}, nameToId: {} });
  
  const [reportData, setReportData] = useState({
    overview: {
      totalStudents: 0,
      passPercentage: 0,
      failPercentage: 0,
      classAverage: 0,
      topScorer: null
    },
    students: [],
    gradeDistribution: [],
    subjectAverages: [],
    passFailData: []
  });

  const [comparisonReport1, setComparisonReport1] = useState(null);
  const [comparisonReport2, setComparisonReport2] = useState(null);

  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal State
  const [selectedStudent, setSelectedStudent] = useState(null);
  const closeDetailsModal = () => {
    setSelectedStudent(null);
    closeModal('student-details-modal');
  };
  const handleViewDetails = (student, isComparison = false) => {
    setSelectedStudent({ 
      ...student, 
      studentClass: selectedClass === 'all' ? (student.class || 'N/A') : selectedClass, 
      studentSection: selectedClass === 'all' ? (student.section || 'N/A') : selectedSection, 
      isComparison 
    });
    openModal('student-details-modal');
  };

  // 1. Fetch Dynamic Dropdowns from OUR Live DB on Page Load
  useEffect(() => {
      const loadFilters = async () => {
          try {
              const [classesRes, subjectsListRes, filtersRes] = await Promise.all([
                  api.get("/principal/academics/classes-sections").catch(() => ({ data: { data: [] } })),
                  api.get("/principal/academics/subjects").catch(() => ({ data: { data: [] } })),
                  api.get("/principal/academic/filters").catch(() => ({ data: { data: {} } }))
              ]);

              const fetchedClasses = classesRes.data?.data || [];
              const subjectsData = subjectsListRes.data?.data || [];
              const examsList = filtersRes.data?.data?.exams || ['Mid Term 1', 'Final Exam'];

              // Class & Section Map from Timetable/Academic Setup endpoint
              const finalClasses = fetchedClasses.map(c => c.name);
              // Sort descending: e.g. Class 12, Class 11, Class 10...
              finalClasses.sort((a, b) => {
                  const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
                  const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
                  return numB - numA;
              });
              const finalMap = {};
              fetchedClasses.forEach(c => {
                  finalMap[c.name] = c.sections?.map(s => s.name) || ['A', 'B'];
              });

              // Subjects Mapping
              const idToName = {};
              const nameToId = {};
              subjectsData.forEach(sub => {
                  if (sub._id && sub.subjectName) {
                      idToName[sub._id] = sub.subjectName;
                      nameToId[sub.subjectName] = sub._id;
                  }
              });
              setSubjectMap({ idToName, nameToId });

              const mappedSubjects = subjectsData.map(sub => sub.subjectName).filter(Boolean);
              const finalSubjects = mappedSubjects.length > 0 ? mappedSubjects : ['Math', 'Science', 'English', 'Computer', 'Hindi'];

              // Build Comparison Types
              // Detect mid term and final term
              let midTermExam = examsList.find(e => {
                  const name = e.toLowerCase();
                  return name.includes('mid') || name.includes('first') || name.includes('term 1') || name.includes('term-1') || name.includes('half') || name === 't1';
              });
              let finalTermExam = examsList.find(e => {
                  const name = e.toLowerCase();
                  return name.includes('final') || name.includes('annual') || name.includes('end') || name.includes('term 2') || name.includes('term-2') || name === 't2';
              });

              // Fallbacks if not found
              if (!midTermExam) {
                  midTermExam = examsList.find(e => e !== finalTermExam) || 'Mid Term Examination';
              }
              if (!finalTermExam) {
                  finalTermExam = examsList.find(e => e !== midTermExam) || 'Final Term Examination';
              }

              // Ensure they are not the same unless only 1 exam exists overall and we have no choice
              if (midTermExam === finalTermExam) {
                  if (midTermExam.toLowerCase().includes('mid') || midTermExam.toLowerCase().includes('first') || midTermExam.toLowerCase().includes('term 1') || midTermExam.toLowerCase().includes('term-1') || midTermExam.toLowerCase().includes('half') || midTermExam === 't1') {
                      finalTermExam = 'Final Term Examination';
                  } else {
                      midTermExam = 'Mid Term Examination';
                  }
              }

              const comparisonTypes = [`${midTermExam} vs ${finalTermExam}`];

              setFilterOptions({
                  classes: finalClasses.length > 0 ? finalClasses : ['Class 9', 'Class 10'],
                  sections: [],
                  academicYears: generatedYears,
                  subjects: finalSubjects,
                  comparisonTypes,
                  classSectionMap: Object.keys(finalMap).length > 0 ? finalMap : { 'Class 9': ['A', 'B'], 'Class 10': ['A', 'B'] }
              });

              // Smart Defaults
              setSelectedYear(generatedYears[0]);
              setSelectedClass('all');
              
              const defaultClass = finalClasses[0] || 'Class 9';
              const defaultMap = Object.keys(finalMap).length > 0 ? finalMap : { 'Class 9': ['A', 'B'], 'Class 10': ['A', 'B'] };
              const initialSections = defaultMap[defaultClass] || ['A', 'B'];
              setSelectedSection(initialSections[0] || 'A');

              const actualSubs = finalSubjects.filter(s => s !== 'All' && s !== 'Subject');
              setSelectedSubjectDeepDive(actualSubs[0] || finalSubjects[0]);
              setSelectedComparison(comparisonTypes[0]);

          } catch (err) {
              console.error("Failed to load filter options", err);
          } finally {
              setLoading(false);
          }
      };
      loadFilters();
  }, []);

  // 2. Automatically update "Sections" dropdown whenever "Class" changes
  useEffect(() => {
      if (!selectedClass || selectedClass === 'all' || !filterOptions.classSectionMap || Object.keys(filterOptions.classSectionMap).length === 0) return;
      
      const availableSections = filterOptions.classSectionMap[selectedClass] || ['A', 'B'];
      
      setFilterOptions(prev => ({ ...prev, sections: availableSections }));
      
      if (!availableSections.includes(selectedSection)) {
          setSelectedSection(availableSections[0] || 'A');
      }
  }, [selectedClass, filterOptions.classSectionMap]);

  // Derived exam names from comparison select
  const compareExam1 = useMemo(() => {
    if (!selectedComparison || !selectedComparison.includes(' vs ')) return '';
    return selectedComparison.split(' vs ')[0];
  }, [selectedComparison]);

  const compareExam2 = useMemo(() => {
    if (!selectedComparison || !selectedComparison.includes(' vs ')) return '';
    return selectedComparison.split(' vs ')[1];
  }, [selectedComparison]);

  // Fetch performance data dynamically
  const fetchReportData = async () => {
    const isAllClasses = selectedClass === 'all';
    if (!selectedClass || (!isAllClasses && !selectedSection) || !selectedYear || !compareExam1 || !compareExam2) return;
    
    setDataLoading(true);
    setError(null);
    try {
      const [res1, res2] = await Promise.all([
        api.get("/principal/reports/academic", {
          params: {
            className: isAllClasses ? undefined : selectedClass,
            section: isAllClasses ? undefined : selectedSection,
            academicYear: selectedYear,
            examName: compareExam1
          }
        }),
        api.get("/principal/reports/academic", {
          params: {
            className: isAllClasses ? undefined : selectedClass,
            section: isAllClasses ? undefined : selectedSection,
            academicYear: selectedYear,
            examName: compareExam2
          }
        })
      ]);

      const data1 = res1.data?.data || {};
      const data2 = res2.data?.data || {};

      setComparisonReport1(data1);
      setComparisonReport2(data2);
      
      setReportData({
        overview: data2.overview || {
          totalStudents: 0,
          passPercentage: 0,
          failPercentage: 0,
          classAverage: 0,
          topScorer: null
        },
        students: data2.students || [],
        gradeDistribution: data2.gradeDistribution || [],
        subjectAverages: data2.subjectAverages || [],
        passFailData: data2.passFailData || []
      });
    } catch (err) {
      console.error("Error fetching report data:", err);
      setError("Failed to fetch data from server");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedClass, selectedSection, selectedYear, compareExam1, compareExam2]);

  // Grade distribution formatted for the chart (ensuring all grades are present with 0 if no data)
  const gradeDistribution = useMemo(() => {
    const grades = ['A+', 'A', 'B+', 'B', 'C', 'D', 'F'];
    const distributionMap = new Map(reportData.gradeDistribution?.map(g => [g.name, g.value]) || []);
    return grades.map(g => ({
      name: g,
      value: distributionMap.get(g) || 0
    }));
  }, [reportData.gradeDistribution]);

  // Subject averages formatted for the chart (using standard defaults if no data)
  const subjectAverages = useMemo(() => {
    const averagesMap = new Map(reportData.subjectAverages?.map(s => [s.subject, s.average]) || []);
    const actualSubjects = filterOptions.subjects.filter(s => s !== 'All' && s !== 'Subject');
    const subjectsToUse = actualSubjects.length > 0 ? actualSubjects : ['Math', 'Science', 'English', 'Social Studies', 'Computer'];
    
    return subjectsToUse.map(sub => {
      const subId = subjectMap.nameToId[sub];
      const avg = averagesMap.get(subId) || averagesMap.get(sub) || 0;
      return {
        name: sub,
        average: avg
      };
    });
  }, [reportData.subjectAverages, filterOptions.subjects, subjectMap]);

  // Pass vs Fail data formatted for Doughnut chart
  const passFailData = useMemo(() => {
    const total = reportData.overview?.totalStudents || 0;
    const passed = Math.round((reportData.overview?.passPercentage || 0) * total / 100);
    return [
      { name: 'Passed', value: passed },
      { name: 'Failed', value: Math.max(0, total - passed) }
    ];
  }, [reportData.overview]);

  // Deep dive statistics for a selected subject
  const subjectDeepDive = useMemo(() => {
    const subjectName = selectedSubjectDeepDive;
    const subjectId = subjectMap.nameToId[subjectName] || subjectName;
    const students = reportData.students || [];
    
    if (!subjectName || !students.length) {
      return {
        highestMark: 0,
        lowestMark: 0,
        avgMark: 0,
        passRate: 0,
        topPerformers: [],
        bottomPerformers: []
      };
    }
    
    let highest = 0;
    let lowest = 100;
    let total = 0;
    let passed = 0;
    const subjectStudents = [];
    
    students.forEach(s => {
      const mark = s.marks?.[subjectId] ?? s.marks?.[subjectName] ?? 0;
      if (mark > highest) highest = mark;
      if (mark < lowest) lowest = mark;
      total += mark;
      if (mark >= 35) passed++;
      subjectStudents.push({ name: s.name, rollNo: s.rollNo, marks: mark });
    });
    
    const avg = Math.round(total / students.length);
    const passRate = Math.round((passed / students.length) * 100);
    
    subjectStudents.sort((a, b) => b.marks - a.marks);
    const topPerformers = subjectStudents.slice(0, 5);
    const bottomPerformers = [...subjectStudents].sort((a, b) => a.marks - b.marks).slice(0, 5);
    
    return { highestMark: highest, lowestMark: lowest, avgMark: avg, passRate, topPerformers, bottomPerformers };
  }, [reportData.students, selectedSubjectDeepDive, subjectMap]);

  // Comparison metrics calculated dynamically between compareExam1 and compareExam2
  const { comparisonData, comparisonSummary } = useMemo(() => {
    if (!comparisonReport1 || !comparisonReport2) {
      return { comparisonData: [], comparisonSummary: { avgExam1: 0, avgExam2: 0, hasExam1: false, hasExam2: false } };
    }

    const students1 = comparisonReport1.students || [];
    const students2 = comparisonReport2.students || [];

    const map1 = new Map(students1.map(s => [s.rollNo, s]));

    const compData = [];
    let avg1Sum = 0;
    let avg2Sum = 0;
    let count1 = 0;
    let count2 = 0;

    students2.forEach(s2 => {
      const s1 = map1.get(s2.rollNo);
      if (s1) {
        const hasExam1 = s1.totalMarks > 0;
        const hasExam2 = s2.totalMarks > 0;
        compData.push({
          id: s2.rollNo,
          name: s2.name,
          rollNo: s2.rollNo,
          exam1Percentage: s1.percentage,
          exam2Percentage: s2.percentage,
          change: Math.round((s2.percentage - s1.percentage) * 10) / 10,
          fullStudentInfo: {
            ...s2,
            exam1Marks: s1.marks,
            exam2Marks: s2.marks,
            exam1Percentage: s1.percentage,
            exam2Percentage: s2.percentage,
            exam1Grade: s1.grade,
            exam1GradeColor: s1.gradeColor,
            exam1Total: s1.totalMarks,
            exam2Grade: s2.grade,
            exam2GradeColor: s2.gradeColor,
            exam2Total: s2.totalMarks,
            change: Math.round((s2.percentage - s1.percentage) * 10) / 10
          }
        });
        if (hasExam1) {
          avg1Sum += s1.percentage;
          count1++;
        }
        if (hasExam2) {
          avg2Sum += s2.percentage;
          count2++;
        }
      }
    });

    return {
      comparisonData: compData,
      comparisonSummary: {
        avgExam1: count1 ? Math.round((avg1Sum / count1) * 10) / 10 : 0,
        avgExam2: count2 ? Math.round((avg2Sum / count2) * 10) / 10 : 0,
        hasExam1: count1 > 0,
        hasExam2: count2 > 0
      }
    };
  }, [comparisonReport1, comparisonReport2]);

  // Variables for rendering
  const sortedPerformance = reportData.students || [];
  const totalStudentsAppeared = reportData.overview?.totalStudents ?? 0;
  const passPercentage = reportData.overview?.passPercentage ?? 0;
  const classAverage = reportData.overview?.classAverage ?? 0;
  const topScorer = reportData.overview?.topScorer || null;

  const tableRows = useMemo(() => {
    return sortedPerformance.map((s, idx) => {
      const row = { ...s, rank: `#${idx + 1}` };
      const actualSubjects = filterOptions.subjects.filter(sub => sub !== 'Subject' && sub !== 'All');
      actualSubjects.forEach(sub => {
        const subId = subjectMap.nameToId[sub];
        row[sub] = s.marks?.[subId] ?? s.marks?.[sub] ?? 0;
      });
      return row;
    });
  }, [sortedPerformance, filterOptions.subjects, subjectMap]);

  const comparisonColumns = useMemo(() => {
    return [
      { key: 'name', label: 'Student Name', width: '25%' },
      { key: 'rollNo', label: 'Roll No', width: '15%' },
      {
        key: 'exam1Percentage',
        label: `${compareExam1} %`,
        width: '20%',
        align: 'center',
        render: (val, row) => {
          const hasExam1 = row.fullStudentInfo?.exam1Total > 0;
          return hasExam1 ? `${val}%` : 'N/A';
        }
      },
      {
        key: 'exam2Percentage',
        label: `${compareExam2} %`,
        width: '20%',
        align: 'center',
        render: (val, row) => {
          const hasExam2 = row.fullStudentInfo?.exam2Total > 0;
          return hasExam2 ? `${val}%` : 'N/A';
        }
      },
      {
        key: 'change',
        label: 'Change',
        width: '10%',
        align: 'center',
        render: (val, row) => {
          const hasExam1 = row.fullStudentInfo?.exam1Total > 0;
          const hasExam2 = row.fullStudentInfo?.exam2Total > 0;
          if (!hasExam1 || !hasExam2) return <span className="font-bold px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">N/A</span>;
          
          if (val > 0) return <span className="font-bold px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">↑ {Math.abs(val).toFixed(1)}%</span>;
          if (val < 0) return <span className="font-bold px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">↓ {Math.abs(val).toFixed(1)}%</span>;
          return <span className="font-bold px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">- 0.0%</span>;
        }
      }
    ];
  }, [compareExam1, compareExam2]);

  const tableColumns = useMemo(() => {
    return [
      { key: 'name', label: 'Student Name', width: '20%' },
      { key: 'rollNo', label: 'Roll No', width: '10%' },
      { key: 'totalMarks', label: 'Total Marks', width: '15%', align: 'center' },
      { key: 'percentage', label: 'Percentage', width: '15%', align: 'center', render: (val) => `${val}%` },
      { 
        key: 'grade', 
        label: 'Grade', 
        width: '10%', 
        align: 'center',
        render: (val, row) => <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.gradeColor}`}>{val}</span>
      },
      { 
        key: 'result', 
        label: 'Result', 
        width: '10%', 
        align: 'center',
        render: (val, row) => <span className={`px-2 py-1 rounded-full text-xs font-semibold ${row.resultColor}`}>{val}</span>
      },
      { key: 'rank', label: 'Rank', width: '10%', align: 'center' }
    ];
  }, []);

  return (
    <div className="custom-dashboard-styles w-full max-w-[1600px] mx-auto space-y-6">
      {/* View Details Modal */}
      <Modal id="student-details-modal" title={<span className="flex items-center gap-2"><BookOpen size={20} className="text-blue-600" />Student Academic Profile</span>} size="lg">
        {selectedStudent && (
          <div className="p-2 sm:p-6 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Student Details</p>
                  <p className="text-lg font-bold text-gray-900">{selectedStudent.name}</p>
                  <p className="text-sm text-gray-600">Roll No: <span className="font-semibold text-gray-900">{selectedStudent.rollNo}</span></p>
                </div>
                <div className="flex gap-4">
                  <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium mb-1">Class</p>
                    <p className="font-semibold text-gray-900">{selectedStudent.studentClass}</p>
                  </div>
                  <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 font-medium mb-1">Section</p>
                    <p className="font-semibold text-gray-900">{selectedStudent.studentSection}</p>
                  </div>
                </div>
              </div>
              
              {selectedStudent.isComparison ? (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col justify-center">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">{compareExam1}</p>
                      <p className="text-3xl font-bold text-blue-900">{selectedStudent.exam1Total > 0 ? `${selectedStudent.exam1Percentage}%` : 'N/A'}</p>
                      <div className="mt-2 flex items-center gap-2">
                        {selectedStudent.exam1Total > 0 && <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${selectedStudent.exam1GradeColor}`}>Grade {selectedStudent.exam1Grade}</span>}
                        <span className="text-xs text-gray-600 font-medium">{selectedStudent.exam1Total > 0 ? `${selectedStudent.exam1Total} / 500` : 'No Marks'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">{compareExam2}</p>
                      <p className="text-3xl font-bold text-blue-900">{selectedStudent.exam2Total > 0 ? `${selectedStudent.exam2Percentage}%` : 'N/A'}</p>
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <span className="text-xs text-gray-600 font-medium">{selectedStudent.exam2Total > 0 ? `${selectedStudent.exam2Total} / 500` : 'No Marks'}</span>
                        {selectedStudent.exam2Total > 0 && <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${selectedStudent.exam2GradeColor}`}>Grade {selectedStudent.exam2Grade}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-blue-200/50 text-center">
                    <p className="text-sm font-medium text-gray-600">Net Change: <span className={`font-bold px-2 py-1 rounded-full text-xs ${selectedStudent.exam1Total > 0 && selectedStudent.exam2Total > 0 ? (selectedStudent.change > 0 ? 'bg-green-100 text-green-700' : selectedStudent.change < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700') : 'bg-gray-100 text-gray-700'}`}>{selectedStudent.exam1Total > 0 && selectedStudent.exam2Total > 0 ? (selectedStudent.change > 0 ? `↑ ${selectedStudent.change}%` : selectedStudent.change < 0 ? `↓ ${Math.abs(selectedStudent.change)}%` : '- 0.0%') : 'N/A'}</span></p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col justify-center">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Overall Performance</p>
                      <p className="text-3xl font-bold text-blue-900">{selectedStudent.percentage}%</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-2 ${selectedStudent.gradeColor}`}>Grade {selectedStudent.grade}</span>
                      <p className="text-sm font-medium text-gray-600">Rank: <span className="font-bold text-gray-900">{selectedStudent.rank}</span></p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-200/50">
                    <p className="text-sm text-gray-600">Total Marks: <span className="font-bold text-gray-900">{selectedStudent.totalMarks}</span> <span className="text-xs text-gray-500">/ 500</span></p>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${selectedStudent.resultColor}`}>{selectedStudent.result}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                {selectedStudent.isComparison ? 'Subject Wise Comparison' : 'Subject Wise Marks'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filterOptions.subjects.filter(s => s !== 'Subject' && s !== 'All' && s !== 'All Subjects').map(sub => (
                  <div key={sub} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <span className="font-medium text-gray-700">{sub}</span>
                    {selectedStudent.isComparison ? (
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${selectedStudent.exam1Marks?.[subjectMap.nameToId[sub]] >= 35 || selectedStudent.exam1Marks?.[sub] >= 35 ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedStudent.exam1Marks?.[subjectMap.nameToId[sub]] ?? selectedStudent.exam1Marks?.[sub] ?? 0}
                        </span>
                        <span className="text-xs text-gray-400 font-bold">→</span>
                        <span className={`font-bold ${selectedStudent.exam2Marks?.[subjectMap.nameToId[sub]] >= 35 || selectedStudent.exam2Marks?.[sub] >= 35 ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedStudent.exam2Marks?.[subjectMap.nameToId[sub]] ?? selectedStudent.exam2Marks?.[sub] ?? 0}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${selectedStudent.marks?.[subjectMap.nameToId[sub]] >= 35 || selectedStudent.marks?.[sub] >= 35 ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedStudent.marks?.[subjectMap.nameToId[sub]] ?? selectedStudent.marks?.[sub] ?? 0}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">/ 100</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Page Header */}
      <Grid cols={12} gap={4}>
        <Heading
          primaryText={
            <span className="inline-flex items-center gap-2">
              <span className="flex items-center cursor-help px-1 -mx-1" title="Academic reports across all classes.">
                <BookOpen size={22} className="text-[#0ea5e9] hover:opacity-80 transition-opacity" />
              </span>
              <span>Academic</span>
            </span>
          }
          secondaryText="Reports"
          size={12}
          fontSize="2xl"
        />
      </Grid>
      
      {/* KPI Cards */}
      <DashGrid cols={12} gap={3}>
        <EnhancedDashCard title="Total Students" value={dataLoading ? "..." : totalStudentsAppeared} icon={<Users size={22} />} accentColor="#3b82f6" size={3} />
        <EnhancedDashCard title="Overall Pass %" value={dataLoading ? "..." : `${passPercentage}%`} icon={<TrendingUp size={22} />} accentColor="#10b981" size={3} />
        <EnhancedDashCard title="Class Average %" value={dataLoading ? "..." : `${classAverage}%`} icon={<Award size={22} />} accentColor="#8b5cf6" size={3} />
        <EnhancedDashCard title="Top Scorer" value={dataLoading ? "..." : (topScorer?.name || "N/A")} subValue={dataLoading ? "..." : `${topScorer?.percentage || 0}%`} icon={<Award size={22} />} accentColor="#f59e0b" size={3} />
      </DashGrid>

      {/* Global Filters */}
      <div className="bg-white rounded-[24px] border border-[#E7E2DB] shadow-[0_6px_20px_rgba(0,0,0,.06)] p-5 mb-6 z-30 relative">
        <Grid cols={12} gap={4}>
          <div className="col-span-12 md:col-span-4">
            <SelectField
              label="Academic Year"
              id="year-filter"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              searchable={false}
              size={12}
            >
              {filterOptions.academicYears.map(year => <Option key={year} value={year} label={year} />)}
            </SelectField>
          </div>
          <div className="col-span-12 md:col-span-4">
            <SelectField
              label="Class"
              id="class-filter"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              searchable={false}
              size={12}
            >
              <Option value="all" label="All Classes" />
              {filterOptions.classes.map(cls => <Option key={cls} value={cls} label={cls} />)}
            </SelectField>
          </div>
          <div className="col-span-12 md:col-span-4">
            <SelectField
              label="Section"
              id="sec-filter"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              searchable={false}
              disabled={!selectedClass || selectedClass === 'all'}
              size={12}
            >
              {filterOptions.sections.map(sec => <Option key={sec} value={sec} label={sec} />)}
            </SelectField>
          </div>
        </Grid>
      </div>

      {/* Charts Row */}
      <DashGrid cols={12} gap={4}>
        <div className="col-span-12 lg:col-span-6 relative">
          {dataLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20 rounded-lg">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          )}
          <GDoughnutChart 
            title="Grade Distribution" 
            data={gradeDistribution} 
            colors={['#166534', '#16a34a', '#2563eb', '#60a5fa', '#f97316', '#fbbf24', '#ef4444']}
            size={12} 
            height={300} 
          />
        </div>
        <div className="col-span-12 lg:col-span-6 relative">
          {dataLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20 rounded-lg">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          )}
          <GColumnChart 
            title="Subject Class Average" 
            data={subjectAverages} 
            bars={[{ key: 'average', label: 'Average', color: '#3b82f6' }]} 
            size={12} 
            height={300} 
          />
        </div>
      </DashGrid>

      {/* Subject Performance Insights */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 relative">
        {dataLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20 rounded-lg">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className="text-lg font-bold text-gray-900">Subject Performance Insights</h3>
          <div className="w-64">
            <SelectField
              id="subject-deep-dive"
              value={selectedSubjectDeepDive}
              onChange={(e) => setSelectedSubjectDeepDive(e.target.value)}
              searchable={false}
              size={12}
            >
              {filterOptions.subjects.map(sub => (
                <Option key={sub} value={sub} label={sub} />
              ))}
            </SelectField>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col justify-center">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Highest Score</p>
            <p className="text-3xl font-bold text-blue-700 mt-1">{subjectDeepDive?.highestMark || 0}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex flex-col justify-center">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">Lowest Score</p>
            <p className="text-3xl font-bold text-red-700 mt-1">{subjectDeepDive?.lowestMark || 0}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex flex-col justify-center">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Average Score</p>
            <p className="text-3xl font-bold text-purple-700 mt-1">{subjectDeepDive?.avgMark || 0}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex flex-col justify-center">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Pass Rate</p>
            <p className="text-3xl font-bold text-green-700 mt-1">{subjectDeepDive?.passRate || 0}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performers */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                <Award size={18} />
              </span>
              <h4 className="font-bold text-gray-900">🏆 Top 5 Performers</h4>
            </div>
            <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Student Name</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subjectDeepDive?.topPerformers?.length > 0 ? (
                    subjectDeepDive.topPerformers.map((student, idx) => (
                      <tr key={`${student.rollNo}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">{student.marks}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="2" className="px-4 py-4 text-center text-gray-500">No data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Performers */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                <TrendingUp size={18} className="rotate-180" />
              </span>
              <h4 className="font-bold text-gray-900">⚠️ Students Needing Attention</h4>
            </div>
            <div className="border border-gray-100 rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Student Name</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {subjectDeepDive?.bottomPerformers?.length > 0 ? (
                    subjectDeepDive.bottomPerformers.map((student, idx) => (
                      <tr key={`${student.rollNo}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-3 text-right font-bold text-orange-600">{student.marks}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="2" className="px-4 py-4 text-center text-gray-500">No data available</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100 p-6 relative">
        {dataLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20 rounded-lg">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        )}
        <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Summary</h2>
        <DataTable 
          columns={tableColumns} 
          rows={tableRows} 
          actions={[{ icon: <Eye size={18} />, tooltip: "View Details", variant: "ghost", onClick: (row) => handleViewDetails(row) }]}
          pageSize={10} 
          searchable={true}
          exportable={true}
          exportFileName={`Performance_Summary_${selectedClass}_${selectedYear}`}
        />
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-lg shadow-sm p-6 overflow-hidden border border-gray-100 relative">
        {dataLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-20 rounded-lg">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        )}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900">Performance Comparison</h3>
        </div>
        
        <DataTable 
          columns={comparisonColumns} 
          rows={comparisonData} 
          actions={[{ icon: <Eye size={18} />, tooltip: "View Details", variant: "ghost", onClick: (row) => handleViewDetails(row.fullStudentInfo, true) }]}
          pageSize={10} 
          searchable={true}
          exportable={true}
          exportFileName={`Comparison_${compareExam1}_vs_${compareExam2}`}
        />
      </div>
    </div>
  );
};

export default AcademicReports;