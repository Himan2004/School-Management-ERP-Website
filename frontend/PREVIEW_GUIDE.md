# 📸 Dashboard Preview & Screenshots Guide

This document describes the visual layout and appearance of the Super Admin Dashboard and Profile pages.

---

## 🏠 Dashboard Page (`/dashboard`) - Layout Overview

### Top Section (Header)
```
┌─────────────────────────────────────────────────────────────┐
│  Welcome Back, Super Admin! 👋                              │
│  Here's what's happening with your ERP platform today       │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar (Left Side)
```
┌──────────────────────┐
│  ERP      [◀]        │
├──────────────────────┤
│ 📊 Dashboard   ◄─ Active/Highlighted │
│ 🏫 Schools           │
│ 👥 Users             │
│ 📈 Analytics         │
│ 💳 Subscriptions     │
│ 🎫 Support           │
│ ⚙️ Settings          │
│ 👤 Profile           │
├──────────────────────┤
│ 🚪 Logout            │
└──────────────────────┘
```

### Navbar (Top Right)
```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 [Search schools, users...]  🔔  💬  [Avatar] John Doe ▼│
└─────────────────────────────────────────────────────────────┘
```

### KPI Cards Section
```
┌────────────┬────────────┬────────────┬────────────┬────────────┐
│ 🏫 Total   │ ✅ Active  │ 👥 Total   │ 💰 Monthly │ 🎫 Support │
│ Schools    │ Schools    │ Students   │ Revenue    │ Tickets    │
│            │            │            │            │            │
│    52      │    47      │  12.5K     │  $156K     │    18      │
│ Registered │ Currently  │ Across all │ Last 30    │ Awaiting   │
│ on         │ operational│ schools    │ days       │ resolution │
│            │            │            │            │            │
│ 📈 12%up   │ 📈 8%up    │ 📈 15%up   │ 📈 22%up   │ 📉 5%down  │
└────────────┴────────────┴────────────┴────────────┴────────────┘
   Orange       Green         Blue        Pink       Yellow
```

### Quick Actions Section
```
┌──────────────────────────────────────────────┐
│ Quick Actions                                 │
├──────────────────────────────────────────────┤
│ [➕ Add New School] [📋 Manage Subscriptions]│
│ [📊 View Reports]   [🎯 Analytics]          │
└──────────────────────────────────────────────┘
```

### Charts Section
```
┌─────────────────────────────────┬──────────────────────────────┐
│ 📈 School Growth Trend          │ 💹 Revenue Analytics         │
├─────────────────────────────────┼──────────────────────────────┤
│   ║                             │   ║                          │
│   ║                ║            │   ║                ║         │
│   ║        ║       ║     ║      │   ║        ║       ║    ║    │
│   ║  ║     ║  ║    ║  ║  ║     │   ║  ║     ║  ║    ║ ║  ║    │
│   ║  ║  ║  ║  ║ ║  ║  ║  ║  ║  │   ║  ║  ║  ║  ║ ║  ║ ║  ║ ║ │
│ Jan Feb Mar Apr May Jun         │ Jan Feb Mar Apr May Jun      │
│  (Orange Bars)                  │  (Pink Bars)                 │
└─────────────────────────────────┴──────────────────────────────┘
```

### Recent Schools Table Section
```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Recent Schools                              [View All]    │
├─────────────────────────────────────────────────────────────┤
│ School Name              │Students│Status    │Revenue │Action│
├─────────────────────────────────────────────────────────────┤
│ B Bright Future Academy      450  │✓ Active │$12,500│[View]│
│ L Little Learners School     320  │✓ Active │$9,200 │[View]│
│ S Sunshine Kindergarten      280  │✓ Active │$8,100 │[View]│
│ R Rainbow Preschool          150  │⏳Pending│$4,500 │[View]│
│ S Smart Kids Academy         510  │✓ Active │$15,300│[View]│
└─────────────────────────────────────────────────────────────┘
```

---

## 👤 Profile Page (`/profile`) - Layout Overview

### Page Header
```
┌─────────────────────────────────────────────────────────────┐
│  My Profile                                                 │
│  Manage your account settings and preferences               │
└─────────────────────────────────────────────────────────────┘
```

### Left Column (Profile Card & Links)
```
┌──────────────────────────────────┐
│ ┌──────────────────────────────┐ │
│ │       👨‍💼 (Avatar)            │ │
│ │                              │ │
│ │  John Doe                    │ │
│ │  Super Administrator         │ │
│ │  john.doe@schoolerp.com      │ │
│ ├──────────────────────────────┤ │
│ │ Member Since: Jan 15, 2024  │ │
│ │ Total Schools: 52            │ │
│ │ Active Users: 127            │ │
│ ├──────────────────────────────┤ │
│ │ [✏️ Edit Profile]            │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Quick Links                  │ │
│ ├──────────────────────────────┤ │
│ │ [📊 Dashboard]               │ │
│ │ [⚙️ Settings]                │ │
│ │ [🛠️ Support]                 │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

### Right Column (Forms & Activity)

#### Edit Profile Form (When Editing)
```
┌──────────────────────────────────────────┐
│ ✏️ Edit Profile Information               │
├──────────────────────────────────────────┤
│ First Name: [John            ]           │
│ Last Name:  [Doe             ]           │
├──────────────────────────────────────────┤
│ Email: [john.doe@schoolerp.com           ]
├──────────────────────────────────────────┤
│ Phone: [+1 (555) 123-4567               ]│
├──────────────────────────────────────────┤
│ Organization: [School ERP System         ]│
├──────────────────────────────────────────┤
│              [💾 Save Changes]            │
└──────────────────────────────────────────┘
```

#### Security Settings
```
┌──────────────────────────────────────────┐
│ 🔐 Security Settings    [🔄 Ch Password] │
├──────────────────────────────────────────┤
│ 🔒 Your password is secure               │
│ Last changed: 3 months ago               │
└──────────────────────────────────────────┘
```

#### Change Password Form (When Active)
```
┌──────────────────────────────────────────┐
│ Current Password: [••••••••••••         ]│
├──────────────────────────────────────────┤
│ New Password:     [••••••••••••         ]│
├──────────────────────────────────────────┤
│ Confirm Password: [••••••••••••         ]│
├──────────────────────────────────────────┤
│              [✓ Update Password]         │
└──────────────────────────────────────────┘
```

#### Activity Log
```
┌──────────────────────────────────────────┐
│ 📋 Activity Log                           │
├──────────────────────────────────────────┤
│ 🔓 Logged in              2 hours ago     │
│    From IP: 192.168.1.1                  │
│                                          │
│ 📝 Updated School Database  5 hours ago  │
│    Added 3 new schools to system         │
│                                          │
│ 📊 Generated Monthly Report  1 day ago   │
│    Revenue and user analytics June 2026  │
│                                          │
│ ⚙️ Changed System Settings   3 days ago  │
│    Updated subscription pricing plans    │
│                                          │
│ ✓ Approved Support Ticket   1 week ago   │
│    Resolved issue for Bright Future      │
├──────────────────────────────────────────┤
│      [📜 View Full Activity Log]         │
└──────────────────────────────────────────┘
```

---

## 🎨 Color Scheme Visual

### KPI Cards - Color Examples

**Orange Card** (Total Schools)
```
┌────────────────────────────────────┐
│ 🏫 in orange badge                 │ ← Orange background gradient
│                                    │
│ Total Schools                      │ ← White text
│                                    │
│       52                           │ ← Large value
│ Registered on platform             │ ← Secondary text
│                                    │
│ 📈 12% increase this month         │ ← Trend indicator
└────────────────────────────────────┘
```

**Green Card** (Active Schools)
```
┌────────────────────────────────────┐
│ ✅ in green badge                  │ ← Green background gradient
│       47                           │
│ Active Schools                     │
│ Currently operational              │
│ 📈 8% increase this month          │
└────────────────────────────────────┘
```

**Blue Card** (Total Students)
```
┌────────────────────────────────────┐
│ 👥 in blue badge                   │ ← Blue background gradient
│      12.5K                         │
│ Total Students                     │
│ Across all schools                 │
│ 📈 15% increase this month         │
└────────────────────────────────────┘
```

**Pink Card** (Monthly Revenue)
```
┌────────────────────────────────────┐
│ 💰 in pink badge                   │ ← Pink background gradient
│      $156K                         │
│ Monthly Revenue                    │
│ Last 30 days                       │
│ 📈 22% increase this month         │
└────────────────────────────────────┘
```

**Yellow Card** (Support Tickets)
```
┌────────────────────────────────────┐
│ 🎫 in yellow badge                 │ ← Yellow background gradient
│       18                           │
│ Support Tickets                    │
│ Awaiting resolution                │
│ 📉 5% decrease this month          │
└────────────────────────────────────┘
```

---

## 📱 Responsive Layout

### Mobile View (< 768px)
```
Dashboard:
- Sidebar collapsed to icons only
- Navbar search bar simplified
- KPI cards: 1 per row
- Charts stacked vertically
- Table with horizontal scroll

Profile:
- Single column layout
- Card stacked on form
- Quick links vertical
- Full width inputs
```

### Tablet View (768px - 1024px)
```
Dashboard:
- Sidebar visible with labels
- KPI cards: 2 per row
- Charts: 1 per row
- Table fully visible

Profile:
- 2-column layout starts
- Side-by-side card and content
- Better spacing
```

### Desktop View (> 1024px)
```
Dashboard:
- Full sidebar visible
- KPI cards: 5 in one row
- Charts: 2 side by side
- Full table visibility
- Optimal spacing

Profile:
- Full 3-column layout (if needed)
- All content visible
- Perfect alignment
- Best user experience
```

---

## 🎯 Interactive Elements

### Hover Effects

**Dashboard Cards**
- Scale up slightly (hover:scale-105)
- Shadow increases (shadow-lg → shadow-2xl)
- Smooth transition (duration-300)

**Buttons**
- Background color darkens
- Scale up (transform hover:scale-105)
- Shadow increases
- Smooth transition

**Table Rows**
- Light orange background (hover:bg-orange-50)
- Row highlights on hover
- View button becomes interactive

**Sidebar Items**
- Highlight with white background
- Text color changes to purple
- Shadow appears on hover
- Smooth transition

**Navbar Dropdown**
- Appears on click
- Items highlight on hover
- Smooth fade-in effect

---

## 💾 Component Sizes

### Cards
- KPI Cards: Full width, responsive padding
- Chart Cards: Large container for visualizations
- Profile Card: ~300px width on desktop

### Buttons
- Action Buttons: Full width mobile, auto desktop
- Navbar Buttons: Rounded pill shape
- Sidebar Items: Full width with padding

### Text Sizes
- Headers (h1): text-4xl md:text-5xl
- Titles (h2): text-2xl font-bold
- Card Values: text-4xl md:text-5xl
- Body text: Regular font weight

---

## ✨ Visual Hierarchy

### Size Hierarchy
1. **Page Title** - Largest (5xl)
2. **Section Titles** - Large (2xl)
3. **Card Values** - Medium-Large (4xl)
4. **Card Titles** - Medium (base)
5. **Body Text** - Small (s/sm)

### Color Hierarchy
1. **Primary Color** - Orange (most important)
2. **Status Colors** - Green, Yellow, Pink
3. **Secondary Color** - Purple
4. **Neutral Colors** - Gray shades

### Visual Weight
- Gradient cards appear heavier (more prominent)
- White background cards appear lighter
- Shadows add depth to importance

---

## 🔤 Font Styling

### Font Family
- Primary: Poppins (Google Fonts)
- Fallback: sans-serif

### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700
- Extra Bold: 800

### Font Sizes
- Extra Large: 4xl, 5xl
- Large: 2xl, 3xl
- Base: base (1rem)
- Small: sm (0.875rem)
- Extra Small: xs (0.75rem)

---

## 📐 Spacing & Layout

### Padding
- Cards: p-6, p-8
- Buttons: py-2 to py-4, px-4 to px-6
- Sections: p-6 or p-8

### Gaps
- Component gaps: gap-4 to gap-8
- Grid gaps: gap-6 to gap-8
- Item spacing: space-y-2 to space-y-4

### Margins
- Section margins: mb-6 to mb-8
- Component margins: mb-2 to mb-4
- Title margins: mb-4 to mb-6

---

## 🎭 Visual Style Summary

✨ **Playful**: Emojis used in icons and headers  
🔄 **Smooth**: All transitions use duration-300  
💫 **Modern**: Gradient backgrounds and soft shadows  
🌈 **Colorful**: Bright pre-school color palette  
✅ **Clean**: Clear whitespace and organization  
📱 **Responsive**: Perfect on all screen sizes  
⭕ **Rounded**: radius-2xl and radius-3xl throughout  
🎨 **Themed**: Consistent pre-school design language  

---

**This preview gives you a complete visual understanding of how the dashboard and profile pages look and behave!**
