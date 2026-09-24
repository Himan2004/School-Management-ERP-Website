export const adminMenuItems = [
    { label: 'Dashboard', path: '/admin/dashboard', keywords: ['dashboard', 'home', 'main', 'stats', 'overview'] },
    {
        label: 'Academic',
        children: [
            { label: 'Add Lectures', path: '/admin/classes', keywords: ['academic', 'classes', 'lectures', 'standard', 'add lectures', 'grade', 'schedule lectures'] },
            { label: 'Add Subject', path: '/admin/academics?tab=subjects', keywords: ['academic', 'subjects', 'subject', 'add subject'] },
            { label: 'Create Timetable', path: '/admin/academics?tab=timetable', keywords: ['timetable', 'academic', 'create timetable'] },
        ]
    },
    {
        label: 'User Management',
        children: [
            { label: 'Manage Student', path: '/admin/students/manage', keywords: ['students', 'manage', 'student list', 'search student'] },
            { label: 'Student Admission', path: '/admin/admissions/list', keywords: ['admission', 'list', 'admitted', 'students list'] },
            { label: 'Admission Requests', path: '/admin/admissions/request', keywords: ['requests', 'admission requests', 'pending admission'] },
            { label: 'Transfer / TC', path: '/admin/admissions/transfer', keywords: ['transfer', 'tc', 'tc hub', 'transfer student'] },
            { label: 'Staff Attendance', path: '/admin/attendance/manage', keywords: ['staff', 'attendance', 'mark attendance', 'employees'] },
            { label: 'Add Teachers', path: '/admin/teachers', keywords: ['staff', 'add teachers', 'teachers', 'register teacher', 'new teacher'] },
            { label: 'Manage Staff', path: '/admin/teachers/manage', keywords: ['staff', 'manage', 'all staff', 'edit staff'] },
        ],
    },
    { label: 'Tasks', path: '/admin/tasks', keywords: ['tasks', 'todo', 'assignments', 'work'] },
    { label: 'Exam Schedule', path: '/admin/exam', keywords: ['exam', 'schedule', 'test', 'grades', 'examination'] },
    { label: 'Notice Board', path: '/admin/notice', keywords: ['notice', 'board', 'announcements', 'notifications', 'news'] },
    { label: 'Finance', path: '/admin/finance/analytics', keywords: ['finance', 'analytics', 'revenue', 'money'] },
    {
        label: 'Reports',
        children: [
            { label: 'Academic Reports', path: '/admin/report/academic-reports', keywords: ['academic', 'reports', 'student grades', 'performance'] },
            { label: 'Staff Performance', path: '/admin/report/staff-performance', keywords: ['staff', 'performance', 'reports'] },
            { label: 'Attendance Reports', path: '/admin/report/attendance-reports', keywords: ['attendance', 'student attendance', 'reports'] },
            { label: 'Exam Reports', path: '/admin/report/exam-reports', keywords: ['exam', 'reports', 'test results'] }
        ]
    },
    { label: 'Schedule Meeting', path: '/admin/schedule-meeting', keywords: ['schedule', 'meeting', 'parent teacher', 'ptm'] },
    { label: 'Settings', path: '/admin/settings', keywords: ['settings', 'preferences', 'password', 'school settings'] },
    { label: 'My Profile', path: '/admin/profile', keywords: ['profile', 'my profile', 'me', 'account'] },
    { label: 'Back to Home', path: '/', keywords: ['home', 'landing', 'back'] },
];
