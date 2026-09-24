import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { Loader2, BookOpen, FlaskConical, Presentation, CalendarDays, Settings2 } from "lucide-react";

import { Heading } from "../../../components/shared/Common_Components";

// ── Sub-page imports ──────────────────────────────────────────────────────────
import ClassesAndSections from "./ClassesAndSections";
import Subjects from "./Subjects";
import Lecture from "./Lecture";
import Timetable from "./Timetable";
import AcademicConfigurations from "./AcademicConfigurations";

import {
  getAdminClassesSections,
  getAdminTeacherAssignments,
  getAdminSubjects,
  getAdminLectures,
  getAdminLectureDashboard,
  getAdminLectureFilterData,
  getAdminPeriods,
  getAdminTimetables,
  getAdminAcademicConfig,
  getAdminTimetableAcademicYears,
  getSchoolAcademicConfigs,
} from "../../../services/api/adminAcademicsApi";

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { key: "classes", label: "Classes & Sections", icon: BookOpen, component: ClassesAndSections },
  { key: "subjects", label: "Subjects", icon: FlaskConical, component: Subjects },
  { key: "lecture", label: "Lecture", icon: Presentation, component: Lecture },
  { key: "timetable", label: "Timetable", icon: CalendarDays, component: Timetable },
  { key: "config", label: "Academic Configurations", icon: Settings2, component: AcademicConfigurations },
];

// Module-level global cache to persist data across mounts (navigation)
let globalAcademicsCache = {
  classes: [],
  teachers: [],
  assignments: [],
  subjects: [],
  lectures: [],
  lectureDashboard: {},
  lectureFilters: {},
  config: null,
  schoolConfigs: [],
  orgClasses: [],
  orgSubjects: [],
  periods: [],
  timetables: [],
  academicYears: [],
  
  // Independent Tab Loading Flags
  classesLoading: true,
  subjectsLoading: true,
  lectureLoading: true,
  timetableLoading: true,
  configLoading: true,
};

export default function AcademicsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "classes";
  const setActiveTab = (tab) => setSearchParams({ tab });

  const authUser = useSelector((state) => state.adminAuth?.authUser);
  const schoolId = authUser?.school?._id || authUser?.school || 'global';

  // Academics Shared Cache
  const [academicsCache, setAcademicsCacheState] = useState(globalAcademicsCache);

  const setAcademicsCache = (updater) => {
    setAcademicsCacheState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      globalAcademicsCache = next;
      return next;
    });
  };

  useEffect(() => {
    const cachedClasses = sessionStorage.getItem(`${schoolId}_academics_classes`);
    const cachedSubjects = sessionStorage.getItem(`${schoolId}_academics_subjects`);
    if (cachedClasses && globalAcademicsCache.classes.length === 0) {
      setAcademicsCache((prev) => ({
        ...prev,
        classes: JSON.parse(cachedClasses),
        orgClasses: JSON.parse(cachedClasses),
        classesLoading: false,
      }));
    }
    if (cachedSubjects && globalAcademicsCache.subjects.length === 0) {
      setAcademicsCache((prev) => ({
        ...prev,
        subjects: JSON.parse(cachedSubjects),
        orgSubjects: JSON.parse(cachedSubjects),
        subjectsLoading: false,
      }));
    }
  }, [schoolId]);

  const triggerProgressiveLoad = () => {
    setAcademicsCache((prev) => ({
      ...prev,
      classesLoading: true,
      subjectsLoading: true,
      lectureLoading: true,
      timetableLoading: true,
      configLoading: true,
    }));

    const today = new Date();
    const currentYearNum = today.getFullYear();
    const isBeforeApril = today.getMonth() < 3;
    const startYear = isBeforeApril ? currentYearNum - 1 : currentYearNum;
    const derivedAcademicYear = `${startYear}-${startYear + 1}`;

    // 1. Classes & Teachers Flow
    const loadClassesFlow = async () => {
      try {
        const [classesRes, teachersRes] = await Promise.all([
          getAdminClassesSections({ academicYear: derivedAcademicYear }).catch((err) => {
            console.error("Classes load error:", err);
            return null;
          }),
          getAdminTeacherAssignments().catch((err) => {
            console.error("Teachers load error:", err);
            return null;
          })
        ]);

        const rawClasses = classesRes?.data?.data || classesRes?.data || classesRes || [];
        const fetchedClasses = Array.isArray(rawClasses) ? rawClasses : [];

        const rawTeachersList = teachersRes?.data?.teachers || teachersRes?.teachers || [];
        const fetchedTeachers = Array.isArray(rawTeachersList) ? rawTeachersList : [];

        const rawAssignments = teachersRes?.data?.assignments || teachersRes?.assignments || [];
        const fetchedAssignments = Array.isArray(rawAssignments) ? rawAssignments : [];

        sessionStorage.setItem(`${schoolId}_academics_classes`, JSON.stringify(fetchedClasses));
        setAcademicsCache((prev) => ({
          ...prev,
          classes: fetchedClasses,
          teachers: fetchedTeachers,
          assignments: fetchedAssignments,
          orgClasses: fetchedClasses,
          classesLoading: false,
        }));
      } catch (err) {
        console.error("Classes flow load failed:", err);
        setAcademicsCache((prev) => ({ ...prev, classesLoading: false }));
      }
    };

    // 2. Subjects Flow
    const loadSubjectsFlow = async () => {
      try {
        const subjectsRes = await getAdminSubjects().catch((err) => {
          console.error("Subjects load error:", err);
          return null;
        });

        const rawSubjects = subjectsRes?.data || subjectsRes || [];
        const fetchedSubjects = Array.isArray(rawSubjects) ? rawSubjects : [];

        sessionStorage.setItem(`${schoolId}_academics_subjects`, JSON.stringify(fetchedSubjects));
        setAcademicsCache((prev) => ({
          ...prev,
          subjects: fetchedSubjects,
          orgSubjects: fetchedSubjects,
          subjectsLoading: false,
        }));
      } catch (err) {
        console.error("Subjects flow load failed:", err);
        setAcademicsCache((prev) => ({ ...prev, subjectsLoading: false }));
      }
    };

    // 3. Lecture Flow
    const loadLectureFlow = async () => {
      try {
        const [lecturesRes, lecDashboardRes, lecFiltersRes] = await Promise.all([
          getAdminLectures().catch((err) => {
            console.error("Lectures load error:", err);
            return null;
          }),
          getAdminLectureDashboard().catch((err) => {
            console.error("Lectures Dashboard load error:", err);
            return null;
          }),
          getAdminLectureFilterData().catch((err) => {
            console.error("Lectures Filters load error:", err);
            return null;
          })
        ]);

        const rawLectures = lecturesRes?.data || lecturesRes || [];
        const fetchedLectures = Array.isArray(rawLectures) ? rawLectures : [];

        const statsData = lecDashboardRes?.data || lecDashboardRes || {};
        const filterData = lecFiltersRes?.data || lecFiltersRes || {};

        setAcademicsCache((prev) => ({
          ...prev,
          lectures: fetchedLectures,
          lectureDashboard: statsData,
          lectureFilters: filterData,
          lectureLoading: false,
        }));
      } catch (err) {
        console.error("Lecture flow load failed:", err);
        setAcademicsCache((prev) => ({ ...prev, lectureLoading: false }));
      }
    };

    // 4. Timetable Flow
    const loadTimetableFlow = async () => {
      try {
        const [periodsRes, timetablesRes, yearsRes] = await Promise.all([
          getAdminPeriods().catch(() => null),
          getAdminTimetables().catch(() => null),
          getAdminTimetableAcademicYears().catch(() => null)
        ]);

        const fetchedPeriods = periodsRes?.data || [];
        const fetchedTimetables = timetablesRes?.data || [];
        const fetchedYears = yearsRes?.data || [];

        setAcademicsCache((prev) => ({
          ...prev,
          periods: fetchedPeriods,
          timetables: fetchedTimetables,
          academicYears: fetchedYears,
          timetableLoading: false,
        }));
      } catch (err) {
        console.error("Timetable flow load failed:", err);
        setAcademicsCache((prev) => ({ ...prev, timetableLoading: false }));
      }
    };

    // 5. Academic Configurations Flow
    const loadConfigFlow = async () => {
      try {
        const [configRes, schoolConfigsRes] = await Promise.all([
          getAdminAcademicConfig().catch(() => null),
          getSchoolAcademicConfigs().catch(() => null)
        ]);
        let configData = configRes?.data || configRes || null;
        let schoolConfigsData = schoolConfigsRes?.data || [];

        setAcademicsCache((prev) => ({
          ...prev,
          config: configData,
          schoolConfigs: schoolConfigsData,
          configLoading: false,
        }));
      } catch (err) {
        console.error("Config flow load failed:", err);
        setAcademicsCache((prev) => ({ ...prev, configLoading: false }));
      }
    };

    // Run all data fetch threads concurrently
    loadClassesFlow();
    loadSubjectsFlow();
    loadLectureFlow();
    loadTimetableFlow();
    loadConfigFlow();
  };

  const loadSharedData = async (partialUpdate = null) => {
    if (partialUpdate && typeof partialUpdate === "object" && partialUpdate.type) {
      setAcademicsCache((prev) => ({
        ...prev,
        [partialUpdate.type]: partialUpdate.data,
      }));
      return;
    }
    triggerProgressiveLoad();
  };

  useEffect(() => {
    // Only fetch if no module data has been loaded yet
    const hasLoadedAny =
      !globalAcademicsCache.classesLoading ||
      !globalAcademicsCache.subjectsLoading ||
      !globalAcademicsCache.lectureLoading ||
      !globalAcademicsCache.timetableLoading ||
      !globalAcademicsCache.configLoading;

    if (!hasLoadedAny || globalAcademicsCache.teachers.length === 0 || globalAcademicsCache.classes.length === 0) {
      triggerProgressiveLoad();
    }
  }, []);

  return (
    <div className="w-full space-y-0 text-left">
      {/* Banner Heading */}
      <Heading primaryText="Academics" secondaryText="Management" size={12} showAnimations={true} />

      {/* Tab Switcher */}
      <div className="pt-2 pb-1">
        <nav className="flex items-center gap-1 border-b border-slate-200/60 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="relative group outline-none shrink-0"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div
                  className={`
                    flex items-center gap-2 px-5 py-3 text-sm font-semibold tracking-wide
                    transition-colors duration-200 cursor-pointer
                    ${isActive ? "text-[#223F74]" : "text-slate-400 hover:text-slate-600"}
                  `}
                >
                  <Icon
                    size={16}
                    className={`transition-colors duration-200 ${
                      isActive ? "text-[#e8612c]" : "text-slate-400 group-hover:text-slate-500"
                    }`}
                  />
                  {tab.label}
                </div>

                {/* Active underline indicator */}
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full"
                    style={{ background: "#223F74" }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="academics-tab-content relative mt-4">
        {TABS.map((tab) => {
          const Component = tab.component;
          const isActive = activeTab === tab.key;

          // Determine loading state for this specific tab
          let isTabLoading = false;
          if (tab.key === "classes") {
            isTabLoading = academicsCache.classesLoading;
          } else if (tab.key === "subjects") {
            isTabLoading = academicsCache.subjectsLoading || academicsCache.classesLoading;
          } else if (tab.key === "lecture") {
            isTabLoading = academicsCache.lectureLoading;
          } else if (tab.key === "timetable") {
            isTabLoading = academicsCache.timetableLoading || academicsCache.classesLoading;
          } else if (tab.key === "config") {
            isTabLoading = academicsCache.configLoading || academicsCache.classesLoading || academicsCache.subjectsLoading;
          }

          return (
            <div key={tab.key} style={{ display: isActive ? "block" : "none" }} className="w-full">
              {isTabLoading ? (
                <div className="min-h-[300px] flex flex-col items-center justify-center space-y-4">
                  <Loader2 className="animate-spin text-[#223F74]" size={42} />
                  <p className="text-xs font-black text-[#223F74] uppercase tracking-widest animate-pulse">
                    Loading {tab.label}...
                  </p>
                </div>
              ) : (
                <Component cache={academicsCache} refreshCache={loadSharedData} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
