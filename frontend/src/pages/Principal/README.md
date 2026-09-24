# Principal (School Operations Admin) Dashboard

## Overview
A comprehensive school operations management dashboard for Principals, built with React.js and Tailwind CSS.

## Project Structure

```
/src/pages/Principal/
├── Dashboard.jsx          # Main dashboard home page
├── Sidebar.jsx           # Navigation sidebar with menu items
├── Header.jsx            # Top header with notifications & profile
├── StatCard.jsx          # Reusable stats card component
├── Students.jsx          # Student management (placeholder)
├── AcademicSetup.jsx     # Academic setup (placeholder)
├── Attendance.jsx        # Attendance management (placeholder)
├── Examinations.jsx      # Examination management (placeholder)
├── StaffManagement.jsx   # Staff management (placeholder)
├── Communication.jsx     # Communication features (placeholder)
├── Reports.jsx           # Reports generation (placeholder)
├── Complaints.jsx        # Complaints management (placeholder)
└── Profile.jsx           # Principal profile management (placeholder)
```

## Features Built

### ✅ Completed
1. **Responsive Sidebar**
   - Mobile collapsible navigation (toggle button on mobile)
   - Blue gradient background matching school theme
   - Active link highlighting
   - 10 main menu items with icons
   - Logout functionality

2. **Header Component**
   - Greeting message (Good Morning/Afternoon/Evening)
   - Current date display
   - Search bar (hidden on mobile)
   - Dark mode toggle
   - Notification bell with dropdown
   - Profile menu with quick actions

3. **Dashboard Home Page**
   - **4 Summary Stat Cards:**
     - Total Students Enrolled (2,845)
     - Today's Attendance % (94.5%)
     - Pending Approvals (12)
     - Upcoming Events (8)
   - Each card shows trend indicator (+/- percentage)

4. **Class-wise Attendance Table**
   - Shows attendance by class with visual progress bars
   - Displays: Total Students, Present, Absent, Late, Percentage
   - Color-coded attendance (green ✓, red ✗, orange ⚠)

5. **Pending Approvals Section**
   - Shows leave requests, exam results, event approvals
   - Priority indicators (high/medium)
   - Date information

6. **Upcoming Events Section**
   - Displays 4 scheduled events (PTM, Science Fair, Board Meeting, Sports Day)
   - Shows date, time, location, and event type

7. **Empty State Sections**
   - Recent Notices (No notices yet)
   - Low Attendance Alerts (No alerts)

### 🎯 Route Structure
```
/principal/dashboard              # Main dashboard
/principal/students               # Student management
/principal/academic-setup         # Academic setup
/principal/attendance             # Attendance management
/principal/examinations           # Examination management
/principal/staff-management       # Staff management
/principal/communication          # Communication
/principal/reports                # Reports
/principal/complaints             # Complaints
/principal/profile                # Principal profile
```

## Component Details

### Dashboard.jsx
- Main dashboard component
- Contains all summary cards and sections
- Uses dummy data (no API calls)
- Responsive grid layout

### Sidebar.jsx
- Fixed/collapsible sidebar
- Mobile responsive with overlay
- Active route highlighting
- Smooth transitions

### Header.jsx
- Sticky header at top
- Notification system with dropdown
- Time-based greeting
- Profile menu with logout

### StatCard.jsx
- Reusable card component
- Accepts props: title, value, icon, trend, color
- Shows trend indicators with icons

## Styling Overview
- **Color Scheme:** Blue (#3B82F6) primary color
- **Sidebar:** Gradient blue (from blue-600 to blue-700)
- **Cards:** White with hover shadow effects
- **Typography:** Using default font-sans from Tailwind
- **Responsive:** Mobile-first design with breakpoints (md, lg)

## Dummy Data
- All data is hardcoded for demonstration
- Replace `[data-here]` with API calls when backend ready
- No state management or Redux used yet

## Key Features

### Responsive Design
- **Mobile:** Collapsible sidebar, hamburger menu
- **Tablet:** Single column layout
- **Desktop:** Multi-column grid layout

### User Experience
- Active link highlighting in sidebar
- Smooth hover effects on cards and buttons
- Loading states ready for implementation
- Empty states for sections with no data

### Accessibility
- Semantic HTML elements
- Icon + text labels in sidebar
- Clear visual hierarchy
- Color contrast maintained

## Next Steps for Development

1. **API Integration**
   - Connect to backend endpoints
   - Replace dummy data with real data
   - Add loading states and error handling

2. **Features to Build**
   - Implement all placeholder pages with forms/tables
   - Add CRUD operations
   - Real-time updates for notifications

3. **Authentication**
   - Add role-based access control (RBAC)
   - Token verification
   - Session management

4. **Advanced Features**
   - Charts and graphs (using Recharts/Chart.js)
   - Export reports (PDF/Excel)
   - Notifications system
   - Search and filter functionality

## Icons Used
All icons from **lucide-react** package:
- LayoutDashboard, Users, BookOpen, ClipboardList
- FileText, UserCheck, MessageSquare, BarChart3
- AlertCircle, User, LogOut, Menu, Bell, Settings, etc.

## Installation & Setup

```bash
# Already integrated in project
# Just navigate to Principal dashboard
cd frontend
npm install
npm run dev

# Access at: http://localhost:5173/principal/dashboard
```

## Notes
- Uses functional components with React Hooks
- No external state management (yet)
- Tailwind CSS for styling
- React Router v7 for navigation
- Mobile-first responsive design
