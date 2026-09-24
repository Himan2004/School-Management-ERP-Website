import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { getAdmin, logoutAdmin } from "../features/auth/adminAuthSlice.js";
import { getAllTeachers, getAdminSettings } from "../features/admin/adminSlice.js";
import MainLayout from './MainLayout';
import Header from "../components/admin/Header.jsx";
import { toast } from "react-hot-toast";
import { selectIsDarkMode } from "../features/theme/themeSlice.js";
import {
    LayoutDashboard,
    GraduationCap,
    Users,
    CheckSquare,
    CalendarDays,
    CalendarCheck,
    Bell,
    UserCircle2,
    DollarSign,
    Home,
    Menu,
    FileText,
    BarChart3,
    ClipboardList,
    LifeBuoyIcon,
    HelpCircle,
    AlertTriangle,
    TrendingUp,
    UserMinus,
    CreditCard,
    UserPlus,
    UserCheck,
    CalendarClock,
    BookOpen,
    User,
    Library
} from 'lucide-react';

export default function AdminLayout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isAuthenticated, loading } = useSelector((state) => state.adminAuth);
    const darkMode = useSelector(selectIsDarkMode);

    const [initialized, setInitialized] = useState(() => isAuthenticated);

    useEffect(() => {
        if (!initialized) {
            dispatch(getAdmin()).finally(() => setInitialized(true));
        } else {
            dispatch(getAdmin());
        }
        dispatch(getAllTeachers());
        dispatch(getAdminSettings());
    }, [dispatch, initialized]);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    const handleLogout = useCallback(() => {
        return dispatch(logoutAdmin()).unwrap().then(() => {
            toast.success("Logged out successfully");
        });
    }, [dispatch]);

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
        {
            icon: Users,
            label: 'Student management',
            children: [
                { label: 'Manage Student', path: '/admin/students/manage', icon: User },
                { label: 'Student Admission', path: '/admin/admissions/list', icon: ClipboardList },
                { label: 'Admission Requests', path: '/admin/admissions/request', icon: UserPlus },
                { label: 'Transfer / TC', path: '/admin/admissions/transfer', icon: FileText },
                { label: 'Student Attendance', path: '/admin/report/attendance-reports', icon: UserCheck },
                { label: 'ID Card Generation', path: '/admin/students/id-cards', icon: CreditCard },
                { icon: CalendarDays, label: 'PTM', path: '/admin/schedule-meeting' },
            ],
        },
        { 
            icon:GraduationCap,
            label:'Academics & Exams',
            children:[{ icon: BookOpen, label: 'Academics', path: '/admin/academics' },
            { icon: CalendarClock, label: 'Exam Schedule', path: '/admin/exam' },]
        },
        {
            icon: Users,
            label: 'Staff management',
            children: [
                { label: 'Staff Attendance', path: '/admin/attendance/manage', icon: CheckSquare },
                { label: 'Manage Staff', path: '/admin/teachers/manage', icon: Users },
                { label: 'ID Card Generation', path: '/admin/teachers/id-cards', icon: CreditCard },
                { label: 'Promotions & Demotions', path: '/admin/teachers/promotions', icon: TrendingUp },
            ],
        },
        { icon: CalendarCheck, label: 'HRM', path: '/admin/hrm' },
        { icon: HelpCircle, label: 'Support', path: '/admin/support' },
        { icon: Bell, label: 'Notices', path: '/admin/notice' },
        { icon: CalendarDays, label: 'Events', path: '/admin/events' },
        { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
        {label: 'Support Tickets', path: '/admin/support/tickets', icon: LifeBuoyIcon},
        { icon: DollarSign, label: 'Finance', path: '/admin/finance/analytics' },
        {
            icon: BarChart3,
            label: 'Reports',
            children: [
                { icon: TrendingUp, label: 'Admission Trends', path: '/admin/admission-trends' },
                { icon: UserMinus, label: 'Dropout Tracking', path: '/admin/dropout-tracking' },
                { label: 'Academic Reports', path: '/admin/report/academic-reports', icon: BarChart3 },
                { label: 'Staff Performance', path: '/admin/report/staff-performance', icon: Users },
                { label: 'Exam Reports', path: '/admin/report/exam-reports', icon: FileText }
            ]
        },
        { icon: UserCircle2, label: 'My Profile', path: '/admin/profile' },
        { label: 'Back to home', path: '/', icon: Home },
    ];

    return (
        <MainLayout
            isLoading={!initialized || loading}
            isAuthenticated={isAuthenticated}
            menuItems={menuItems}
            roleName="Admin"
            roleInitials="AD"
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
                    <Header setMobileSidebarOpen={setMobileOpen} mobileSidebarOpen={false} />
                </>
            )}
        />
    );
}
