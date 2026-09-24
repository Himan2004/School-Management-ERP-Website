import React, { useEffect, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import SubjectTeacherNavbar from "../components/SubjectTeacher/SubjectTeacherNavbar";
import MainLayout from "./MainLayout";
import { teacherLogout, getTeacherProfile, selectTeacherLoading, selectIsTeacherAuth, selectTeacher } from "../features/auth/teacherAuthSlice";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Award,
  AlertTriangle,
  UserCheck,
  Clock,
  User,
  BarChart3,
  Plus,
  Edit2,
  Eye,
  DollarSign,
  Bell,
  ClipboardList,
  ClipboardCheck,
  BookOpen,
  FilePlus,
  PenTool,
  UserCog,
  UserCircle
} from 'lucide-react';

const SubjectTeacherLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loading = useSelector(selectTeacherLoading);
  const isAuthenticated = useSelector(selectIsTeacherAuth);
  const teacher = useSelector(selectTeacher);

  useEffect(() => {
    dispatch(getTeacherProfile());
  }, [dispatch]);

  const handleLogout = useCallback(() => {
    return dispatch(teacherLogout())
      .unwrap()
      .then(() => {
        localStorage.removeItem("studentId");
        localStorage.removeItem("schoolId");
        toast.success("Logged out successfully");
      })
      .catch(() => toast.error("Logout failed"));
  }, [dispatch]);

  const menuItems = [
    { label: "Dashboard", path: "/subject-teacher/dashboard", icon: LayoutDashboard },
    {
      label: "Attendance",
      icon: ClipboardList,
      children: [

        { label: "Subject-wise Attendance", path: "/subject-teacher/attendance/subject-wise", icon: UserCheck },
        { label: "My Attendance", path: "/subject-teacher/attendance/staff", icon: Clock },

      ],
    },
    {
      label: "Examinations",
      icon: BookOpen,
      children: [
        { label: "Online Test Creation", path: "/subject-teacher/examinations/create-test", icon: FilePlus },
        { label: "Marks Entry", path: "/subject-teacher/examinations/marks-entry", icon: PenTool },
        { label: "Results & Marksheet", path: "/subject-teacher/examinations/results", icon: Award },
      ],
    },
    {
      label: "Students",
      icon: Users,
      children: [
        { label: "Class Student Data", path: "/subject-teacher/students/class-data", icon: User },
        { label: "Performance Analysis", path: "/subject-teacher/students/performance", icon: BarChart3 },
      ],
    },
    {
      label: "Complaints",
      icon: AlertTriangle,
      children: [
        { label: "Complaints Management", path: "/subject-teacher/complaints/manage", icon: Eye },
      ],
    },
    {
      label: "HRM",
      icon: UserCog,
      children: [
        { label: "Salary & Payout", path: "/subject-teacher/hrm/salary", icon: DollarSign },
      ],
    },
    { label: "PTM Schedule", path: "/subject-teacher/ptm/schedule", icon: Calendar },
    { label: "Notifications", path: "/subject-teacher/notifications", icon: Bell },
    { label: "Profile", path: "/subject-teacher/profile", icon: UserCircle },
  ];

  if (!loading.profile && isAuthenticated && teacher && teacher.profileId?.designation !== "Subject Teacher") {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  return (
    <MainLayout
      isLoading={loading.profile && !teacher}
      isAuthenticated={isAuthenticated}
      menuItems={menuItems}
      roleName="Subject Teacher"
      roleInitials="ST"
      badgeColors="from-blue-400 to-indigo-600"
      onLogout={handleLogout}
      navbarRender={(setMobileOpen) => (
        <SubjectTeacherNavbar onMenuClick={() => setMobileOpen(true)} />
      )}
    />
  );
};

export default SubjectTeacherLayout;