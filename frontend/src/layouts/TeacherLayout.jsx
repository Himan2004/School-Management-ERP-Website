/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
    getTeacherProfile,
    selectIsTeacherAuth,
    selectTeacherLoading,
    teacherLogout,
    selectTeacher
} from "../features/auth/teacherAuthSlice";
import MainLayout from "./MainLayout";
import Navbar from "../components/teacher/Navbar";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Briefcase,
  FileText,
  GraduationCap,
  Megaphone,
  MessageSquare,
  Calendar,
  User,
  Settings,
  Home,
  Menu,
  Wallet,
  FileCheck,
  CalendarRange,
  Banknote,
  Handshake,
  HandCoins
} from 'lucide-react';

export default function TeacherLayout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isAuthenticated = useSelector(selectIsTeacherAuth);
    const loading = useSelector(selectTeacherLoading);
    const teacher = useSelector(selectTeacher);
    const hasRequestedProfile = useRef(false);

    useEffect(() => {
        if (hasRequestedProfile.current) return;
        hasRequestedProfile.current = true;
        dispatch(getTeacherProfile());
    }, [dispatch]);

    const handleLogout = useCallback(() => {
        return dispatch(teacherLogout())
            .unwrap()
            .then(() => {
                navigate('/login', { replace: true });
            })
            .catch(() => {});
    }, [dispatch, navigate]);

    const menuItems = [
        {
            path: '/teacher/dashboard',
            icon: LayoutDashboard,
            label: 'Dashboard',
            matches: ['/teacher/dashboard'],
            end: true,
        },

        {
            path: '/teacher/students',
            icon: Users,
            label: 'Manage Students',
            matches: ['/teacher/students', '/teacher/student/:id'],
        },
        {
            path: '/teacher/events',
            icon: CalendarRange,
            label: 'Events & Activities',
            matches: ['/teacher/events'],
        },
        {
            icon: Wallet,
            label: 'HRM',
            children: [
                {
                    path: '/teacher/hrm/salary',
                    label: 'Salary & Resignation',
                    icon: Banknote,
                    matches: ['/teacher/hrm/salary'],
                },
                {
                    path: '/teacher/hrm/attendance',
                    label: 'My Attendance & Leave',
                    icon: Calendar,
                    matches: ['/teacher/hrm/attendance'],
                }
            ]
        },
        {
            path: '/teacher/marksheet',
            icon: FileCheck,
            label: 'Result & Marksheet',
            matches: ['/teacher/marksheet'],
        },
        {
            path: '/teacher/attendance',
            icon: UserCheck,
            label: 'Attendance',
            matches: ['/teacher/attendance'],
        },
        {
            path: '/teacher/leave',
            icon: Briefcase,
            label: 'Student Leave',
            matches: ['/teacher/leave'],
        },

        {
            path: '/teacher/exams-grades',
            icon: GraduationCap,
            label: 'Online Test',
            matches: ['/teacher/exams-grades'],
        },
        {
            path: '/teacher/PTM',
            icon: Handshake,
            label: 'PTM',
            matches: ['/teacher/PTM'],
        },
        {
            path: '/teacher/announcements',
            icon: Megaphone,
            label: 'Announcements & Notices',
            matches: ['/teacher/announcements'],
        },
         {
            path: '/teacher/complaints',
            icon: MessageSquare,
            label: 'Complaints & Query',
            matches: ['/teacher/complaints'],
        },
         {
            path: '/teacher/feedue',
            icon: HandCoins,
            label: 'Fee Dues',
            matches: ['/teacher/feedue'],
        },
        {
            path: '/teacher/profile',
            icon: User,
            label: 'Profile',
            matches: ['/teacher/profile'],
        },
        {
            path: '/teacher/settings',
            icon: Settings,
            label: 'Settings',
            matches: ['/teacher/settings'],
        },
        {
            path: '/',
            icon: Home,
            label: 'Back to Home',
            matches: ['/'],
        },
    ];

    if (!loading.profile && isAuthenticated && teacher?.profileId?.designation === "Subject Teacher") {
        return <Navigate to="/subject-teacher/dashboard" replace />;
    }

    return (
        <MainLayout
            isLoading={loading.profile && !teacher}
            isAuthenticated={isAuthenticated}
            menuItems={menuItems}
            roleName="Teacher"
            roleInitials="TE"
            badgeColors="from-blue-400 to-indigo-600"
            onLogout={handleLogout}
            navbarRender={(setMobileOpen) => (
                <>
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="lg:hidden absolute left-4 top-1/2 -translate-y-1/2 z-[60] p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        <Menu size={20} />
                    </button>
                    <Navbar onMenuClick={() => setMobileOpen(true)} />
                </>
            )}
        />
    );
}
