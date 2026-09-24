import Sidebar from "../components/superAdmin/Sidebar.jsx";
import Navbar from "../components/superAdmin/Navbar.jsx";
import { Outlet, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useEffect, useState, useCallback } from "react";
import {
    getSuperAdmin,
    selectIsSuperAuthenticated,
} from "../features/auth/superAuthSlice.js";

export default function SuperAdminLayout() {
    const dispatch = useDispatch();
    const isAuthenticated = useSelector(selectIsSuperAuthenticated);
    const [initialized, setInitialized] = useState(() => isAuthenticated);

    // Desktop: expanded / collapsed
    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = localStorage.getItem('superadmin-sidebar-expanded');
        return saved !== null ? JSON.parse(saved) : true;
    });

    // Mobile: drawer open / closed
    const [isMobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('superadmin-sidebar-expanded', JSON.stringify(isExpanded));
    }, [isExpanded]);

    // Lock body scroll when mobile drawer is open
    useEffect(() => {
        document.body.style.overflow = isMobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isMobileOpen]);

    useEffect(() => {
        const init = async () => {
            try {
                if (!initialized) {
                    await dispatch(getSuperAdmin()).unwrap();
                } else {
                    dispatch(getSuperAdmin());
                }
            } catch (err) {
                console.log("Auth failed:", err);
            } finally {
                setInitialized(true);
            }
        };
        init();
    }, [dispatch, initialized]);

    const handleExpand = useCallback(() => setIsExpanded(true), []);
    const handleCollapse = useCallback(() => setIsExpanded(false), []);
    // onNavClick: close mobile drawer (on desktop this is a no-op)
    const handleNavClick = useCallback(() => setMobileOpen(false), []);

    if (!initialized) {
        return (
            <div className="flex items-center justify-center h-screen" style={{ background: '#F7F5F2' }}>
                <div className="w-10 h-10 border-4 border-[#E7E2DB] border-t-[#F59B87] rounded-full animate-spin" />
            </div>
        );
    }

    if (initialized && !isAuthenticated) {
        return <Navigate to="/organization/login" replace />;
    }

    // Sidebar widths
    const EXPANDED_W = 280;
    const COLLAPSED_W = 80;
    const desktopW = isExpanded ? EXPANDED_W : COLLAPSED_W;

    return (
        <div
            className="flex h-screen overflow-hidden"
            style={{
                background: 'radial-gradient(circle at top, #fff7ed 0%, #f7f8f0 40%, #eef4f7 100%)',
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            }}
        >
            {/* ── Mobile overlay ── */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/35 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ── Desktop Sidebar (always in layout flow, width animates) ── */}
            <aside
                className="hidden lg:flex flex-col flex-shrink-0 h-screen transition-all duration-300 overflow-hidden"
                style={{ width: desktopW }}
            >
                <Sidebar
                    expanded={isExpanded}
                    onExpand={handleExpand}
                    onCollapse={handleCollapse}
                    onNavClick={handleNavClick}
                />
            </aside>

            {/* ── Mobile Drawer (fixed, slides in from left) ── */}
            <aside
                className="fixed top-0 left-0 h-screen w-[280px] z-50 flex flex-col lg:hidden transition-transform duration-300"
                style={{ transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
            >
                <Sidebar
                    expanded={true}
                    onExpand={handleExpand}
                    onCollapse={handleCollapse}
                    onNavClick={handleNavClick}
                />
            </aside>

            {/* ── Main column ── */}
            <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
                {/* ── Sticky Navbar (outside overflow-hidden to prevent dropdown clipping) ── */}
                <div className="flex-shrink-0 border-b border-white/60 bg-white/50 shadow-sm backdrop-blur-xl" style={{ position: 'relative', zIndex: 50 }}>
                    <div className="px-4 py-1 md:px-6">
                        <Navbar isOpen={isExpanded} onMenuClick={() => setMobileOpen(true)} />
                    </div>
                </div>

                {/* ── Scrollable content area ── */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
                    <div className="min-h-full rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.88)_0%,_rgba(250,252,253,0.96)_100%)] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] md:p-6">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
}