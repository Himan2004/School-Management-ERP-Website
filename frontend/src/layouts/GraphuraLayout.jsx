import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import GraphuraHeader from '../components/GraphuraAdmin/GraphuraHeader';
import GraphuraSidebar from '../components/GraphuraAdmin/GraphuraSidebar';
import { Menu, X } from 'lucide-react';
import {
  getGraphuraAdminProfile,
  selectIsGraphuraAuth,
  selectGraphuraLoading,
  graphuraAdminLogout,
  selectGraphuraAdmin,
} from '../features/auth/graphuraAuthSlice';
import { toast } from 'react-hot-toast';


const GraphuraLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('graphuraadmin-sidebar-expanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('graphuraadmin-sidebar-expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  const handleExpand = useCallback(() => setIsExpanded(true), []);
  const handleCollapse = useCallback(() => setIsExpanded(false), []);

  const navigate = useNavigate();
  const location = useLocation();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsGraphuraAuth);
  const loading = useSelector(selectGraphuraLoading);
  const graphuraAdmin = useSelector(selectGraphuraAdmin);
  const hasRequestedProfile = useRef(false);

  useEffect(() => {
    if (hasRequestedProfile.current) return;
    hasRequestedProfile.current = true;
    dispatch(getGraphuraAdminProfile());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(graphuraAdminLogout())
      .unwrap()
      .then(() => {
        toast.success('Logged out successfully');
        navigate('/graphura-admin/login');        // ← adjust to your login route
      })
      .catch(() => {
        toast.error('Logout failed');
      });
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on route change on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (loading.profile && !graphuraAdmin) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!loading.profile && !isAuthenticated) {
    return <Navigate to="/graphura-admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <span className="font-bold text-gray-800">Graphura Super Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={isMobile ? { x: -280 } : { x: 0 }}
        animate={{ x: sidebarOpen ? 0 : isMobile ? -280 : 0 }}
        transition={{ type: 'tween', duration: 0.3 }}
        className={`fixed top-0 left-0 bottom-0 z-40 bg-white shadow-2xl lg:shadow-lg overflow-y-auto ${!sidebarOpen && isMobile ? 'hidden' : ''
          } lg:block transition-all duration-300 ${!isMobile && !isExpanded ? 'w-20' : 'w-72'}`}
      >
        <GraphuraSidebar
          expanded={isMobile ? true : isExpanded}
          onExpand={handleExpand}
          onCollapse={handleCollapse}
          onClose={() => setSidebarOpen(false)}
          handleLogout={handleLogout}
        />
      </motion.div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${!isMobile && sidebarOpen ? (isExpanded ? 'lg:pl-72' : 'lg:pl-20') : 'lg:pl-0'}`}>
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md shadow-sm">
          <GraphuraHeader onMenuClick={() => setSidebarOpen(!sidebarOpen)} handleLogout={handleLogout} />
        </div>

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8">
          <div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default GraphuraLayout;


