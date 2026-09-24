import React, { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import MainLayout from './MainLayout';
import AccountantHeader from '../components/accountant/AccountantHeader';
import { accountantLogout, getAccountantProfile, selectAccountant, selectAccountantLoading, selectIsAccountantAuth } from '../features/auth/accountantAuthSlice';
import { toast } from "react-hot-toast";
import {
    LayoutDashboard,
    HandCoins,
    Users,
    TrendingDown,
    ClipboardList,
    Bell,
    FileBarChart,
    UserCircle,
    Briefcase,
    Sliders,
    Home,
    Menu
} from 'lucide-react';

const AccountantLayout = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const accountant = useSelector(selectAccountant);
    const loading = useSelector(selectAccountantLoading);
    const isAuthenticated = useSelector(selectIsAccountantAuth);

    useEffect(() => {
        dispatch(getAccountantProfile());
    }, [dispatch]);

    const handleLogout = useCallback(() => {
        return dispatch(accountantLogout())
            .unwrap()
            .then(() => {
                toast.success("Logged out successfully");
            })
            .catch(() => {
                toast.error("Logout failed");
            });
    }, [dispatch]);

    const menuItems = [
        { label: 'Dashboard', path: '/accountant', icon: LayoutDashboard },
        { label: 'Fee Entry', path: '/accountant/fees', icon: HandCoins },
        { label: 'Student Dues', path: '/accountant/students', icon: Users },
        { label: 'Fee Structure', path: '/accountant/structure', icon: Sliders },
        { label: 'Reports', path: '/accountant/reports', icon: FileBarChart },
        { label: 'Payroll', path: '/accountant/payroll', icon: ClipboardList },
        { label: 'Expenses', path: '/accountant/expenses', icon: TrendingDown },
        { label: 'My HRM', path: '/accountant/hrm', icon: Briefcase },
        { label: 'Profile', path: '/accountant/profile', icon: UserCircle },
        { label: 'Notifications', path: '/accountant/notifications', icon: Bell },
        { label: 'Back to Home', path: '/', icon: Home },
    ];

    return (
        <MainLayout
            isLoading={loading.profile && !accountant}
            isAuthenticated={isAuthenticated}
            menuItems={menuItems}
            roleName="Accountant"
            roleInitials="AC"
            badgeColors="from-indigo-400 to-blue-600"
            onLogout={handleLogout}
            navbarRender={(setMobileOpen) => (
                <>
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="lg:hidden absolute left-4 top-1/2 -translate-y-1/2 z-[60] p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    <AccountantHeader
                        onMenuOpen={() => setMobileOpen(true)}
                        accountant={accountant}
                        onLogout={handleLogout}
                    />
                </>
            )}
        />
    );
};

export default AccountantLayout;