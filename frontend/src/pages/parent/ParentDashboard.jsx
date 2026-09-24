import React, { useEffect, useState } from "react";
import api from "../../services/api"; // Ensure this path points to your axios instance
import { fetchParentNotices, fetchParentDashboardStats } from "../../services/parentDashboardApi";
import PerformanceChart from "../../components/Parent/PerformanceChart";
import Notifications from "../../components/Parent/Notifications";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  BookOpen,
  CreditCard,
  CheckCircle,
  LoaderCircle
} from "lucide-react";
import {
  Heading,
  EnhancedDashCard,
  Grid,
  Select,
  Option
} from "../../components/shared/Common_Components";

export default function ParentDashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const storedId = localStorage.getItem("studentId");

        // 3. FETCH PROFILE AND NOTICES AT THE SAME TIME
        const [dashboardRes, noticesRes] = await Promise.all([
          fetchParentDashboardStats(storedId),
          fetchParentNotices()
        ]);

        if (dashboardRes?.success) {
          const profileData = dashboardRes.data;
          setDashboardData(profileData);

          if (profileData.students?.length > 0) {
            const hasChild = profileData.students.some(s => s._id === storedId);
            let activeChild = profileData.students[0];
            if (storedId && hasChild) {
              activeChild = profileData.students.find(s => s._id === storedId);
            } else {
              localStorage.setItem("studentId", activeChild._id);
            }
            if (activeChild.school) {
              localStorage.setItem("schoolId", activeChild.school._id || activeChild.school);
            } else if (profileData.school) {
              localStorage.setItem("schoolId", profileData.school._id || profileData.school);
            }
          } else if (profileData.school) {
            localStorage.setItem("schoolId", profileData.school._id || profileData.school);
          }
        }

        // Set the fetched notices!
        if (noticesRes.success) {
          setNotices(noticesRes.data.slice(0, 5)); // Just take the top 5 for the dashboard widget
        }

      } catch (err) {
        console.error("Failed to load dashboard data", err);
        setError("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-blue-600">
        <LoaderCircle className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-semibold text-slate-500">Loading your dashboard...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-rose-500 font-bold bg-rose-50 rounded-2xl m-8">{error}</div>;
  }

  const activeStudentId = localStorage.getItem("studentId") || (dashboardData?.students?.[0]?._id);
  const activeStudent = dashboardData?.students?.find(s => s._id === activeStudentId);

  const handleStudentChange = (e) => {
    const newStudentId = e.target.value;
    localStorage.setItem("studentId", newStudentId);

    // Update local schoolId for the newly selected student before reload
    const student = dashboardData?.students?.find(s => s._id === newStudentId);
    if (student && student.school) {
      localStorage.setItem("schoolId", student.school._id || student.school);
    }

    window.location.reload();
  };

  // Map real data to the dashboard cards
  const cards = [
    {
      title: "Attendance",
      value: (dashboardData?.attendance?.percentage || 0) + "%",
      route: "/parent/attendance",
      icon: <CheckCircle size={24} />,
    },
    {
      title: "Homework",
      value: dashboardData?.homework?.pending || 0,
      route: "/parent/homework",
      icon: <BookOpen size={24} />,
    },
    {
      title: "Fees Due",
      value: "₹" + (dashboardData?.fees?.due || 0),
      route: "/parent/pay-fee",
      icon: <CreditCard size={24} />,
    },
    {
      title: "Upcoming Exams",
      value: dashboardData?.exams?.upcoming || 0,
      route: "/parent/exam",
      icon: <Calendar size={24} />,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 text-left">
      {/* Animated Hero Header */}
      <Heading
        primaryText={`Welcome back, ${dashboardData?.name || 'Parent'}!`}
        action={
          <div className="bg-white/10 border border-white/15 text-white backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold shadow-sm whitespace-nowrap">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        }
      />

      {/* Student Switcher Banner */}
      {dashboardData?.students?.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-lg shadow-inner">
              {activeStudent?.name?.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Active Student Profile</p>
              <h4 className="text-base font-black text-slate-800 tracking-tight">{activeStudent?.name}</h4>
            </div>
          </div>
          {dashboardData.students.length > 1 && (
            <div className="w-full sm:w-64">
              <Select
                value={activeStudentId}
                onChange={handleStudentChange}
                placeholder="Switch Student"
                searchable={false}
              >
                {dashboardData.students.map(s => (
                  <Option key={s._id} value={s._id} label={s.name} />
                ))}
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Animated KPI Cards Grid */}
      <Grid cols={12} gap={6}>
        {cards.map((card) => (
          <EnhancedDashCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            size={3}
            accentColor="#F59B87"
            onClick={() => navigate(card.route)}
          />
        ))}
      </Grid>

      {/* Main Content Split Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl p-1 shadow-sm border border-slate-100/50 hover:shadow-md transition-shadow">
          <PerformanceChart />
        </div>
        <div className="bg-white rounded-3xl p-1 shadow-sm border border-slate-100/50 hover:shadow-md transition-shadow">
          <Notifications notifications={notices} />
        </div>
      </div>
    </div>
  );
}