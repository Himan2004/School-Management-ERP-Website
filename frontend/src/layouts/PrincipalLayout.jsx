import PrincipalHeader from "../components/principal/Header";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useCallback, useRef } from "react";
import {
    getPrincipalProfile,
    selectIsPrincipalAuth,
    selectPrincipalLoading,
    principalLogout,
    selectPrincipal,
} from "../features/auth/principalAuthSlice.js";
import { toast } from "react-hot-toast";
import MainLayout from "./MainLayout";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  FileText,
  UserCheck,
  MessageSquare,
  BarChart3,
  User,
  Settings,
  CreditCard,
  GraduationCap,
  Home,
  LifeBuoyIcon,
  Menu,
  LampDesk,
  ClipboardCheck,
  IdCard,
  ClipboardSignature,
  UserX,
  Layers,
  Book,
  CalendarClock,
  UserCog,
  UserMinus,
  Banknote,
  TrendingUp,
  FilePlus,
  PenTool,
  Award,
  FileSpreadsheet,
  Ticket,
  IndianRupee,
  HandCoins,
  FileWarning,
  ReceiptText
} from 'lucide-react';

export default function PrincipalLayout() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isAuthenticated = useSelector(selectIsPrincipalAuth);
    const loading = useSelector(selectPrincipalLoading);
    const principal = useSelector(selectPrincipal);
    const hasRequestedProfile = useRef(false);

    useEffect(() => {
        if (hasRequestedProfile.current) return;
        hasRequestedProfile.current = true;
        dispatch(getPrincipalProfile());
    }, [dispatch]);

    const handleLogout = useCallback(() => {
        return dispatch(principalLogout())
            .unwrap()
            .then(() => {
                toast.success("Logged out successfully");
                navigate('/login', { replace: true });
            })
            .catch(() => {
                toast.error("Logout failed");
            });
    }, [dispatch, navigate]);

    const menuItems = [
        { label: 'Dashboard', path: '/principal/dashboard', icon: LayoutDashboard },
        {
          label: 'Students', icon: Users,
          children: [
            { label: 'All Students', path: '/principal/students', icon: User },
            { label: 'Student Attendance', path: '/principal/students/attendance', icon: ClipboardCheck },
            { label: 'ID Card Generation', path: '/principal/admissions/id-cards', icon: IdCard },
          ],
        },
        {
          label: 'Admissions', icon: GraduationCap,
          children: [
            { label: 'Admission List', path: '/principal/admissions/list', icon: ClipboardSignature },
            { label: 'Cancel Admission', path: '/principal/admissions/cancel', icon: UserX },
            { label: 'Transfer / TC', path: '/principal/admissions/transfer', icon: FileText },
          ],
        },
        {
          label: 'Academic', icon: BookOpen,
          children: [
            { label: 'Classes & Sections', path: '/principal/academic/classes', icon: Layers },
            { label: 'Subjects', path: '/principal/academic/subjects', icon: Book },
            { label: 'Timetable', path: '/principal/academic/timetable', icon: CalendarClock },
            { label: 'Class Comparison', path: '/principal/academic/class-comparison', icon: BarChart3 },
          ],
        },
        {
          label: 'HRM', icon: UserCheck,
          children: [
            { label: 'All Staff', path: '/principal/teachers/all', icon: UserCog },
            { label: 'Staff Attendance', path: '/principal/attendance/mark', icon: ClipboardCheck },
            { label: 'Assign Subjects', path: '/principal/teachers/assign-subjects', icon: Book },
            { label: 'Staff Resignation', path: '/principal/hrm/resignations', icon: UserMinus },
            { label: 'Payroll Summary', path: '/principal/hrm/payroll', icon: Banknote },
            { label: 'Promotions/Demotions', path: '/principal/hrm/promotions', icon: TrendingUp },
          ],
        },
        {
          label: 'Examinations', icon: Award,
          children: [
            { label: 'Create Exam', path: '/principal/examinations/create', icon: FilePlus },
            { label: 'Marks Entry', path: '/principal/examinations/marks-entry', icon: PenTool },
            { label: 'Results', path: '/principal/examinations/results', icon: BarChart3 },
            { label: 'Marksheet Generation', path: '/principal/examinations/marksheet', icon: FileSpreadsheet },
            { label: 'Admit Card', path: '/principal/examinations/admit-card', icon: Ticket },
          ],
        },
        {
          label: 'Fees', icon: IndianRupee,
          children: [
            { label: 'Fee Structure', path: '/principal/fees/structure', icon: Layers },
            { label: 'Fee Collection', path: '/principal/fees/collection', icon: HandCoins },
            { label: 'Due Reports', path: '/principal/fees/due-reports', icon: FileWarning },
            { label: 'Transactions', path: '/principal/fees/transactions', icon: ReceiptText },
          ],
        },
        { label: 'Support Tickets', path: '/principal/support', icon: LifeBuoyIcon },
        {label:'Support desk', path:'/principal/support-desk',icon:
          LampDesk
        },
        {
          label: 'Communication', icon: MessageSquare,
          children: [
            { label: 'Notices', path: '/principal/communication/notices', icon: MessageSquare },
            { label: 'Events', path: '/principal/communication/events', icon: MessageSquare },
            { label: 'Meeting Schedule', path: '/principal/communication/meetings', icon: ClipboardList },
            { label: 'PTM Feedback', path: '/principal/communication/ptm-feedback', icon: FileText },
          ],
        },
        {
          label: 'Reports', icon: BarChart3,
          children: [
            { label: 'Academic Reports', path: '/principal/reports/academic', icon: GraduationCap },
            { label: 'Financial Reports', path: '/principal/reports/financial', icon: CreditCard },
            { label: 'Staff Performance', path: '/principal/staff-performance', icon: BarChart3 },
            { label: 'Attendance Reports', path: '/principal/reports/attendance', icon: BarChart3 },
          ],
        },
        { label: 'Profile', path: '/principal/profile', icon: User },
        { label: 'Back to Home', path: '/', icon: Home },
    ];

    return (
        <MainLayout
            isLoading={loading.profile && !principal}
            isAuthenticated={isAuthenticated}
            menuItems={menuItems}
            roleName="Principal"
            roleInitials="PR"
            badgeColors="from-blue-400 to-blue-600"
            onLogout={handleLogout}
            navbarRender={(setMobileOpen) => (
                <>
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="lg:hidden absolute left-4 top-1/2 -translate-y-1/2 z-[60] p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    <PrincipalHeader handleLogout={handleLogout} />
                </>
            )}
        />
    );
}

