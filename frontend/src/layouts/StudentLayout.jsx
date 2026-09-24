import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import StudentHeader from '../components/Student/StudentHeader';
import StudentNotificationModal from '../components/Student/StudentNotificationModal';
import MainLayout from './MainLayout';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from "react-redux";
import { studentLogout, getStudentProfile, selectStudent, selectStudentLoading, selectIsStudentAuth } from "../features/auth/studentAuthSlice";
import { studentApi } from '../services/api/studentApi';
import {
  Home, BookOpen, Calendar, Award, Clock, Bus, Ticket,
  MessageSquare, Settings, FileText, Bell,
  Download, Users, HeartPulse, IdCard, Heart, Target,
  Megaphone, BarChart, Menu
} from 'lucide-react';

const StudentLayout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const student = useSelector(selectStudent);
  const loading = useSelector(selectStudentLoading);
  const isAuthenticated = useSelector(selectIsStudentAuth);

  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState([]);

  const getLinkFromType = (type, title = '', metadata = {}) => {
    const lowerTitle = title.toLowerCase();
    if (type === 'message') {
      const senderId = metadata?.senderId || metadata?.sender || '';
      return `/student/messages?conversation=${senderId}`;
    }
    if (lowerTitle.includes('homework')) return '/student/homework';
    if (lowerTitle.includes('announcement') || lowerTitle.includes('notice')) return '/student/dashboard';
    if (lowerTitle.includes('exam') || lowerTitle.includes('schedule')) return '/student/exams';
    if (type === 'attendance') return '/student/attendance';
    if (type === 'result') return '/student/marksheet';
    if (type === 'leave') return '/student/leave';
    return '/student/dashboard';
  };

  const loadNotifications = async () => {
    try {
      const res = await studentApi.getNotifications();
      const list = res?.data || res || [];
      setNotifications(list.map(n => ({
        id: n._id,
        title: n.title,
        message: n.message,
        type: n.type || 'info',
        read: n.read,
        timestamp: n.createdAt,
        link: getLinkFromType(n.type, n.title, n.metadata)
      })));
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const markNotificationRead = async (id) => {
    try {
      await studentApi.markNotificationRead(id);
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      await studentApi.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    dispatch(getStudentProfile());
  }, [dispatch]);

  const handleLogout = useCallback(() => {
    return dispatch(studentLogout())
      .unwrap()
      .then(() => {
        toast.success("Logged out successfully");
        navigate("/login");
      })
      .catch(() => toast.error("Logout failed"));
  }, [dispatch, navigate]);

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/student/dashboard' },
    { icon: Calendar, label: 'Attendance', path: '/student/attendance' },
    { icon: Award, label: 'Results', path: '/student/results' },
    { icon: BookOpen, label: 'Homework', path: '/student/homework' },
    { icon: Clock, label: 'Timetable', path: '/student/timetable' },
    { icon: Target, label: 'Exams', path: '/student/exams' },
    { icon: FileText, label: 'Marksheet', path: '/student/marksheet' },
    { icon: Download, label: 'Study Material', path: '/student/study-material' },
    { icon: Heart, label: 'Leave', path: '/student/leave' },
    { icon: BarChart, label: 'Performance', path: '/student/performance' },
    { icon: Users, label: 'Events', path: '/student/events' },
    { icon: Megaphone, label: 'Notices', path: '/student/notices' },
    { icon: Bell, label: 'Notifications', path: '/student/notifications' },
    { icon: IdCard, label: 'ID Card', path: '/student/id-card' },
    { icon: Ticket, label: 'Admit Card', path: '/student/admit-card' },
    { icon: MessageSquare, label: 'Support', path: '/student/support-ticket' },
    { icon: Settings, label: 'Settings', path: '/student/settings' }
  ];

  return (
    <MainLayout
      isLoading={loading.profile && !student}
      isAuthenticated={isAuthenticated}
      menuItems={menuItems}
      roleName="Student"
      roleInitials="ST"
      badgeColors="from-indigo-400 to-purple-600"
      onLogout={handleLogout}
      navbarRender={(setMobileOpen) => (
        <>
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden absolute left-4 top-1/2 -translate-y-1/2 z-[60] p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 transition-colors"
          >
            <Menu size={20} />
          </button>
          <StudentHeader
            studentData={student}
            currentTime={currentTime}
            notifications={notifications}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            handleLogout={handleLogout}
            markNotificationRead={markNotificationRead}
            markAllNotificationsRead={markAllNotificationsRead}
            deleteNotification={deleteNotification}
            setMobileSidebarOpen={setMobileOpen}
          />
        </>
      )}
    >
      <StudentNotificationModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        setNotifications={setNotifications}
        markNotificationRead={markNotificationRead}
        markAllNotificationsRead={markAllNotificationsRead}
        deleteNotification={deleteNotification}
        navigate={navigate}
      />
    </MainLayout>
  );
};

export default StudentLayout;
