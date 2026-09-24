import React, { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ParentNavbar from "../components/Parent/ParentNavbar";
import MainLayout from "./MainLayout";
import { useDispatch, useSelector } from "react-redux";
import { parentLogout, getParentProfile, selectParentLoading, selectIsParentAuth } from "../features/auth/parentAuthSlice";
import toast from "react-hot-toast";
import {

    LayoutDashboard, Calendar, BookOpen, CreditCard, CheckCircle, User,
    School, Award, Receipt, Bell, Heart, IdCard,
    Sparkles, Users, MessageSquare, Settings, Menu, Mail, CalendarRange

} from 'lucide-react';
import { FaUserNurse, FaUserShield } from 'react-icons/fa';
import { MdDescription } from 'react-icons/md';

export default function ParentLayout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const loading = useSelector(selectParentLoading);
    const isAuthenticated = useSelector(selectIsParentAuth);
    const parent = useSelector((state) => state.parentAuth.parent);

    useEffect(() => {
        dispatch(getParentProfile());
    }, [dispatch]);

    const handleLogout = useCallback(() => {
        return dispatch(parentLogout())
            .unwrap()
            .then(() => {
                localStorage.removeItem("studentId");
                localStorage.removeItem("schoolId");
                toast.success("Logged out successfully");
            })
            .catch(() => toast.error("Logout failed"));
    }, [dispatch]);

    const menuItems = [
        { label: "Dashboard", path: "/parent/dashboard", icon: LayoutDashboard },
        { label: "Student Attendance", path: "/parent/attendance", icon: CheckCircle },
        { label: "Homework", path: "/parent/homework", icon: BookOpen },
        { label: "Exam & Results", path: "/parent/exam", icon: Award },
        { label: "Fee Status", path: "/parent/fee-status", icon: Receipt },
        { label: "Pay Fee", path: "/parent/pay-fee", icon: CreditCard },
        { label: "Notices", path: "/parent/notices", icon: Bell },
        { label: "Notifications", path: "/parent/notifications", icon: Mail },
        { label: "Events & Activities", path: "/parent/events", icon: CalendarRange },
        { label: "Complaint & Query", path: "/parent/ticket-system", icon: MessageSquare },
        { label: "Meetings", path: "/parent/meetings", icon: Calendar },
        { label: "ID Card", path: "/parent/id-card", icon: IdCard },
        { label: "Student Profile", path: "/parent/profile", icon: User },

        { label: "Term & Condition", path: "/parent/term", icon: FaUserShield },
        { label: "Privacy & Policy", path: "/parent/policy", icon: MdDescription },
        { label: "Settings", path: "/parent/settings", icon: Settings },
    ];

    return (
        <MainLayout
            isLoading={loading.profile && !parent}
            isAuthenticated={isAuthenticated}
            menuItems={menuItems}
            roleName="Parent"
            roleInitials="PT"
            badgeColors="from-fuchsia-400 to-purple-600"
            onLogout={handleLogout}
            navbarRender={(setMobileOpen) => (
                <>
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="lg:hidden absolute left-4 top-1/2 -translate-y-1/2 z-[60] p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    <ParentNavbar onMenuClick={() => setMobileOpen(true)} />
                </>
            )}
        />
    );
}