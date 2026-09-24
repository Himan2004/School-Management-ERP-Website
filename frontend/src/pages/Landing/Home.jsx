import React, { useState, useEffect } from "react";
import { motion as Motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import ConnectedSchools from "../../components/ConnectedSchools";
import { Building2 } from "lucide-react";
import {
  FaUserPlus,
  FaPlay,
  FaChartLine,
  FaEye,
  FaServer,
  FaShieldAlt,
  FaStar,
  FaLightbulb,
  FaUserGraduate,
  FaFingerprint,
  FaPenFancy,
  FaCreditCard,
  FaUsers as FaUsersGroup,
  FaMobileAlt,
  FaCheckCircle,
  FaChartBar,
  FaLock,
  FaPalette,
  FaGlobe,
  FaCheck,
  FaTimes,
  FaSun,
  FaBars,
  FaTimes as FaTimesIcon,
  FaUser,
  FaChevronDown,
  FaDatabase,
  FaCog,
  FaBuilding,
  FaInstagram,
  FaTwitter,
  FaLinkedin,
  FaMapPin,
  FaPhone,
  FaEnvelope,
  FaSchool,
} from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import RegisterSchoolModal from "../../components/school/RegisterSchoolModal";
import diamondImage from "../../assets/diamond.jpeg";
import globeImage from "../../assets/globe.jpeg";
import starImage from "../../assets/star.jpeg";
import "./Home.css";

function ModuleSmallCard({ module, delay, cardBase }) {
  return (
    <Motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay }}
      className={`${cardBase} relative overflow-hidden group`}
    >
      {/* Colored accent strip */}
      <div
        className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${module.bar}`}
      />
      {/* Icon */}
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center ${module.iconBg} ${module.iconText} text-xl mb-4 shadow-sm flex-shrink-0 transition-transform duration-300 group-hover:scale-110`}
      >
        <module.icon />
      </div>
      <h3 className="text-base font-bold text-gray-900 mb-2">{module.title}</h3>
      <p className="text-sm text-gray-500 leading-relaxed flex-1">
        {module.desc}
      </p>
      {/* Metric pill */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${module.dot}`}
        />
        <span
          className={`text-[11px] font-semibold ${module.metricText} leading-tight`}
        >
          {module.metric}
        </span>
      </div>
    </Motion.div>
  );
}

function HeroDashboardCard({ dashboard, index }) {
  let dashboardContent;

  if (dashboard.variant === "academics") {
    dashboardContent = (
      <>
        <div className="eduflow-dashboard-academic-hero">
          <div className="eduflow-dashboard-academic-score">
            <div className="eduflow-dashboard-academic-label">
              Term Performance
            </div>
            <div className="eduflow-dashboard-academic-value">
              {dashboard.heroValue}
            </div>
            <div className="eduflow-dashboard-academic-sub">
              {dashboard.heroSub}
            </div>
          </div>

          <div className="eduflow-dashboard-academic-highlights">
            {dashboard.highlights.map((item) => (
              <div
                key={item.label}
                className="eduflow-dashboard-highlight-card"
              >
                <div className="eduflow-dashboard-highlight-label">
                  {item.label}
                </div>
                <div className="eduflow-dashboard-highlight-value">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="eduflow-dashboard-subjects">
          {dashboard.subjects.map((item) => (
            <div key={item.label} className="eduflow-dashboard-subject-row">
              <div className="eduflow-dashboard-subject-meta">
                <span>{item.label}</span>
                <span>{item.value}</span>
              </div>
              <div className="eduflow-dashboard-subject-track">
                <span
                  className={`eduflow-dashboard-subject-fill ${item.fillClass}`}
                  style={{ width: `${item.width}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="eduflow-dashboard-insights is-academics">
          {dashboard.insights.map((item) => (
            <div key={item.label} className="eduflow-dashboard-insight-row">
              <span className="eduflow-dashboard-insight-text">
                {item.label}
              </span>
              <span className={`eduflow-dashboard-chip ${item.chipClass}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </>
    );
  } else if (dashboard.variant === "finance") {
    dashboardContent = (
      <>
        <div className="eduflow-dashboard-finance-top">
          {dashboard.totals.map((item) => (
            <div
              key={item.label}
              className={`eduflow-dashboard-finance-total ${item.totalClass}`}
            >
              <div className="eduflow-dashboard-finance-label">
                {item.label}
              </div>
              <div className="eduflow-dashboard-finance-value">
                {item.value}
              </div>
              <div className="eduflow-dashboard-finance-sub">{item.sub}</div>
            </div>
          ))}
        </div>

        <div className="eduflow-dashboard-finance-body">
          <div className="eduflow-dashboard-finance-meter-card">
            <div className="eduflow-dashboard-finance-meter-title">
              Collection Progress
            </div>
            <div className="eduflow-dashboard-finance-meter">
              <span
                className="eduflow-dashboard-finance-meter-fill"
                style={{ width: `${dashboard.collectionRate}%` }}
              />
            </div>
            <div className="eduflow-dashboard-finance-meter-legend">
              <span>{dashboard.collectionRate}% collected</span>
              <span>{100 - dashboard.collectionRate}% pending</span>
            </div>
          </div>

          <div className="eduflow-dashboard-finance-list">
            {dashboard.rows.map((item) => (
              <div key={item.label} className="eduflow-dashboard-finance-row">
                <div>
                  <div className="eduflow-dashboard-finance-row-label">
                    {item.label}
                  </div>
                  <div className="eduflow-dashboard-finance-row-sub">
                    {item.sub}
                  </div>
                </div>
                <div className="eduflow-dashboard-finance-row-side">
                  <span className="eduflow-dashboard-finance-row-value">
                    {item.value}
                  </span>
                  <span className={`eduflow-dashboard-chip ${item.chipClass}`}>
                    {item.state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  } else {
    dashboardContent = (
      <>
        <div className="grid grid-cols-3 gap-2.5">
          {dashboard.stats.map((item) => (
            <div
              key={item.label}
              className={`eduflow-dashboard-stat ${item.statClass}`}
            >
              <div className="eduflow-dashboard-stat-label">{item.label}</div>
              <div className="eduflow-dashboard-stat-value">{item.value}</div>
              <div className="eduflow-dashboard-stat-sub">{item.sub}</div>
            </div>
          ))}
        </div>

        <div className="eduflow-dashboard-bars">
          {dashboard.bars.map((bar, idx) => (
            <span
              key={`${dashboard.label}-${idx}`}
              className="eduflow-dashboard-bar"
              style={{ height: `${bar}%` }}
            />
          ))}
        </div>

        <div className="eduflow-dashboard-insights">
          {dashboard.insights.map((item) => (
            <div key={item.label} className="eduflow-dashboard-insight-row">
              <span className="eduflow-dashboard-insight-text">
                {item.label}
              </span>
              <span className={`eduflow-dashboard-chip ${item.chipClass}`}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <Motion.figure
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 + index * 0.12, duration: 0.55 }}
      className={`eduflow-dashboard-card eduflow-dashboard-card-${index + 1} is-${dashboard.variant}`}
    >
      <figcaption className="eduflow-dashboard-label">
        {dashboard.label}
      </figcaption>

      <div className="eduflow-dashboard-shell">
        <div className="eduflow-dashboard-chrome">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
          </div>
          <span className="eduflow-dashboard-domain">{dashboard.domain}</span>
        </div>
        {dashboardContent}
      </div>
    </Motion.figure>
  );
}

// ─── ModuleBentoGrid
function ModuleBentoGrid({ modules }) {
  // modules[0] = Student Management  (rectangle, row1 left)
  // modules[1] = Attendance           (square,    row1 mid)
  // modules[2] = Exams & Grading      (square,    row1 right)
  // modules[3] = Fee Management       (square,    row2 left)
  // modules[4] = HR & Payroll         (rectangle, row2 mid-right)
  // modules[5] = Parent Portal        (square,    row2 ?)
  // User wants: row1 → rectangle, square, square
  //             row2 → square (Parent Portal), square (Fee Mgmt), rectangle (HR & Payroll)
  const [
    studentMgmt,
    attendance,
    exams,
    feeManagement,
    hrPayroll,
    parentPortal,
  ] = modules;

  const cardBase =
    "rounded-2xl border border-slate-200 bg-white hover:border-sky-300 shadow-[0_4px_24px_rgba(15,23,42,0.08)] hover:shadow-[0_8px_32px_rgba(15,23,42,0.13)] transition-all duration-300 p-6 cursor-default flex flex-col";

  return (
    // 4-column grid so we can do col-span-2 for rectangles
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* ── ROW 1 ── */}

      {/* Student Management — rectangle (col-span-2) */}
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay: 0 }}
        className={`${cardBase} lg:col-span-2 bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200 hover:border-sky-300 hover:shadow-lg relative overflow-hidden`}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-400 to-blue-600" />
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white border border-sky-200 text-sky-600 text-xl mb-5 shadow-sm flex-shrink-0">
          <studentMgmt.icon />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {studentMgmt.title}
        </h3>
        <p className="text-base text-gray-500 leading-relaxed mb-5">
          {studentMgmt.desc}
        </p>

        {/* Mini UI preview */}
        <div className="mt-auto rounded-xl bg-white border border-sky-100 shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-3 pb-2 border-b border-gray-100">
            <div className="w-2 h-2 rounded-full bg-red-300" />
            <div className="w-2 h-2 rounded-full bg-yellow-300" />
            <div className="w-2 h-2 rounded-full bg-green-300" />
            <div className="ml-2 flex-1 bg-gray-100 rounded h-3.5 text-[9px] flex items-center px-2 text-gray-400">
              Student Dashboard
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total Students", val: "2,450", color: "text-sky-600" },
              { label: "Active Today", val: "94.2%", color: "text-green-600" },
              { label: "New Admissions", val: "+38", color: "text-slate-700" },
            ].map((s, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-2 text-center">
                <div className={`text-sm font-bold ${s.color}`}>{s.val}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Motion.div>

      {/* Attendance — square (col-span-1) */}
      <ModuleSmallCard module={attendance} delay={0.07} cardBase={cardBase} />

      {/* Exams & Grading — square (col-span-1) */}
      <ModuleSmallCard module={exams} delay={0.14} cardBase={cardBase} />

      {/* ── ROW 2 ── */}

      {/* Parent Portal — square */}
      <ModuleSmallCard module={parentPortal} delay={0.21} cardBase={cardBase} />

      {/* Fee Management — square */}
      <ModuleSmallCard
        module={feeManagement}
        delay={0.28}
        cardBase={cardBase}
      />

      {/* HR & Payroll — rectangle (col-span-2) */}
      <Motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay: 0.35 }}
        className={`${cardBase} lg:col-span-2 bg-gradient-to-br from-slate-50 to-gray-100 border-slate-200 hover:border-slate-400 hover:shadow-lg relative overflow-hidden`}
      >
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-slate-500 to-slate-700" />
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white border border-slate-200 text-slate-700 text-xl mb-5 shadow-sm flex-shrink-0">
          <hrPayroll.icon />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {hrPayroll.title}
        </h3>
        <p className="text-base text-gray-500 leading-relaxed mb-5">
          {hrPayroll.desc}
        </p>

        {/* Mini payroll preview */}
        <div className="mt-auto rounded-xl bg-white border border-slate-200 shadow-sm p-4">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Monthly Payroll Summary
          </div>
          <div className="space-y-2">
            {[
              { name: "Teaching Staff", amount: "₹3,20,000", pct: 78 },
              { name: "Admin Staff", amount: "₹90,000", pct: 22 },
            ].map((row, i) => (
              <div key={i}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-gray-600">{row.name}</span>
                  <span className="font-semibold text-gray-800">
                    {row.amount}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-slate-600 to-sky-500 rounded-full"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-[11px]">
            <span className="text-gray-500">Total Disbursed</span>
            <span className="font-bold text-slate-800">₹4,10,000</span>
          </div>
        </div>
      </Motion.div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openRegisterModal, setOpenRegisterModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = ["Home", "Features", "Modules", "Pricing"];

  const modules = [
    {
      icon: FaUserGraduate,
      title: "Student Management",
      desc: "Centralize all student-related information including admissions, profiles, academic records, and class assignments. This module helps institutions maintain organized and easily accessible student data.",
      highlight: "Admission to alumni lifecycle",
      metric: "30+ student attributes tracked",
      bar: "from-sky-400 to-sky-600",
      iconBg: "bg-sky-50",
      iconText: "text-sky-600",
      dot: "bg-sky-500",
      metricText: "text-sky-700",
    },
    {
      icon: FaFingerprint,
      title: "Attendance",
      desc: "Easily record and monitor student attendance in real time. The system helps teachers track daily attendance, identify patterns, and generate detailed reports to ensure accurate and transparent attendance management.",
      highlight: "Real-time entry/exit tracking",
      metric: "Instant alerts to guardians",
      bar: "from-violet-400 to-violet-600",
      iconBg: "bg-violet-50",
      iconText: "text-violet-600",
      dot: "bg-violet-500",
      metricText: "text-violet-700",
    },
    {
      icon: FaPenFancy,
      title: "Exams & Grading",
      desc: "Manage the complete examination process from creating exams to recording marks and publishing results. Analyze student performance with automated grading and detailed reports to support better academic decisions.",
      highlight: "Flexible exam patterns",
      metric: "Automated result publishing",
      bar: "from-amber-400 to-amber-600",
      iconBg: "bg-amber-50",
      iconText: "text-amber-600",
      dot: "bg-amber-500",
      metricText: "text-amber-700",
    },
    {
      icon: FaCreditCard,
      title: "Fee Management",
      desc: "Streamline the entire fee collection process with digital payment tracking, automated reminders, invoice generation, and detailed financial reports for better transparency and management.",
      highlight: "Multi-mode payment collection",
      metric: "Auto reminders and receipts",
      bar: "from-emerald-400 to-emerald-600",
      iconBg: "bg-emerald-50",
      iconText: "text-emerald-600",
      dot: "bg-emerald-500",
      metricText: "text-emerald-700",
    },
    {
      icon: FaUsersGroup,
      title: "HR & Payroll",
      desc: "Staff attendance, leave, digital payslips",
      highlight: "Unified staff operations",
      metric: "Payroll-ready attendance logs",
      bar: "from-slate-500 to-slate-700",
      iconBg: "bg-slate-100",
      iconText: "text-slate-700",
      dot: "bg-slate-500",
      metricText: "text-slate-700",
    },
    {
      icon: FaMobileAlt,
      title: "Parent Portal",
      desc: "Provide parents with a dedicated dashboard to stay informed about their child’s academic journey. Parents can check attendance, exam results, announcements, and communicate with the school easily.",
      highlight: "Anytime parent communication",
      metric: "Homework, fees, and notices in one app",
      bar: "from-rose-400 to-rose-600",
      iconBg: "bg-rose-50",
      iconText: "text-rose-600",
      dot: "bg-rose-500",
      metricText: "text-rose-700",
    },
  ];

  const features = [
    {
      icon: FaShieldAlt,
      title: "Secure by Design",
      description:
        "Protect student and campus data with layered access controls, reliable backups, and audit-ready security.",
      color: "from-slate-700 to-sky-700",
      image: diamondImage,
      imageAlt: "Enterprise security visual",
    },
    {
      icon: FaStar,
      title: "Designed for Daily Work",
      description:
        "Simple, guided workflows that help teachers and administrators complete tasks faster with fewer clicks.",
      color: "from-slate-800 to-slate-700",
      image: starImage,
      imageAlt: "Ease of use visual",
    },
    {
      icon: FaLightbulb,
      title: "Insights that Act",
      description:
        "Turn data into timely recommendations for attendance, performance, and planning across your campus.",
      color: "from-sky-600 to-slate-700",
      image: globeImage,
      imageAlt: "AI globe visual",
    },
  ];

  const plans = [
    {
      name: "Starter",
      price: "$49",
      period: "/month",
      description: "For small schools & academies",
      icon: <FaSchool />,
      features: [
        { name: "Up to 200 Students", included: true },
        { name: "Basic Management Modules", included: true },
        { name: "Mobile App for Parents", included: true },
        { name: "Advanced AI Analytics", included: false },
      ],
      buttonText: "Choose Plan",
      popular: false,
    },
    {
      name: "Professional",
      price: "$199",
      period: "/month",
      description: "For growing K-12 institutions",
      icon: <FaUserGraduate />,
      features: [
        { name: "Unlimited Students", included: true },
        { name: "Full Module Suite", included: true },
        { name: "AI Performance Analytics", included: true },
        { name: "API & Integration Support", included: true },
      ],
      buttonText: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large school networks",
      icon: <FaBuilding />,
      features: [
        { name: "Multi-Campus Dashboard", included: true },
        { name: "Dedicated Success Manager", included: true },
        { name: "On-premise Deployment Option", included: true },
        { name: "Custom AI Model Training", included: true },
      ],
      buttonText: "Contact Sales",
      popular: false,
    },
  ];

  //const schools = ["ST. MARY'S", "OXFORD", "GLOBAL", "BEACON", "METRO"];

  const heroDashboards = [
    {
      variant: "operations",
      label: "Campus Overview",
      domain: "ops.eduai.io",
      stats: [
        {
          label: "Students",
          value: "2,450",
          sub: "Up 12% this month",
          statClass: "is-sky",
        },
        {
          label: "Attendance",
          value: "94.2%",
          sub: "Up 2.3% this week",
          statClass: "is-green",
        },
        {
          label: "Revenue",
          value: "$45K",
          sub: "Up 8% MTD",
          statClass: "is-slate",
        },
      ],
      bars: [44, 60, 48, 80, 66, 86, 72, 90],
      insights: [
        {
          label: "Admission pipeline healthy",
          value: "Strong",
          chipClass: "is-positive",
        },
        {
          label: "Fee reminders pending",
          value: "26",
          chipClass: "is-warning",
        },
      ],
    },
    {
      variant: "academics",
      label: "Learning Progress",
      domain: "academics.eduai.io",
      heroValue: "81.6",
      heroSub: "Average score up 4.1 pts this term",
      highlights: [
        {
          label: "Assignments",
          value: "1,380",
        },
        {
          label: "Submitted",
          value: "96%",
        },
      ],
      subjects: [
        {
          label: "Mathematics",
          value: "88%",
          width: 88,
          fillClass: "is-indigo",
        },
        {
          label: "Science",
          value: "84%",
          width: 84,
          fillClass: "is-sky",
        },
        {
          label: "Languages",
          value: "79%",
          width: 79,
          fillClass: "is-green",
        },
        {
          label: "Social Studies",
          value: "76%",
          width: 76,
          fillClass: "is-amber",
        },
      ],
      insights: [
        {
          label: "At-risk students needing attention",
          value: "62",
          chipClass: "is-warning",
        },
        {
          label: "Math trend improving",
          value: "Rising",
          chipClass: "is-positive",
        },
      ],
    },
    {
      variant: "finance",
      label: "Fees and Finance",
      domain: "finance.eduai.io",
      totals: [
        {
          label: "Collected",
          value: "Rs 38L",
          sub: "92% this cycle",
          totalClass: "is-sky",
        },
        {
          label: "Pending",
          value: "Rs 3.2L",
          sub: "Auto reminders on",
          totalClass: "is-amber",
        },
        {
          label: "Payroll",
          value: "Rs 4.1L",
          sub: "Processed monthly",
          totalClass: "is-slate",
        },
      ],
      collectionRate: 92,
      rows: [
        {
          label: "Transport fees",
          sub: "Due today",
          value: "Rs 0.8L",
          state: "Due",
          chipClass: "is-warning",
        },
        {
          label: "Lab charges",
          sub: "Settled this week",
          value: "Rs 1.6L",
          state: "Paid",
          chipClass: "is-positive",
        },
        {
          label: "Scholarship approvals",
          sub: "Pending review",
          value: "18",
          state: "Review",
          chipClass: "is-neutral",
        },
      ],
    },
  ];

  const stakeholderRoles = [
    {
      name: "HQ Admin",
      icon: FaShieldAlt,
      subtitle: "Global controls, analytics, and system-wide governance",
      badge: "Master Access",
      accent: "from-orange-400 to-yellow-400",
      soft: "from-orange-50 via-white to-yellow-50 border-orange-100",
    },
    {
      name: "Principal",
      icon: FaBuilding,
      subtitle: "Campus oversight, approvals, and institutional reporting",
      badge: "Leadership",
      accent: "from-sky-500 to-cyan-400",
      soft: "from-sky-50 via-white to-cyan-50 border-sky-100",
    },
    {
      name: "Teacher",
      icon: FaPenFancy,
      subtitle: "Classroom workflows, grading, attendance, and tasks",
      badge: "Instruction",
      accent: "from-emerald-400 to-teal-400",
      soft: "from-emerald-50 via-white to-teal-50 border-emerald-100",
    },
    {
      name: "Parent",
      icon: FaUsersGroup,
      subtitle: "Progress tracking, fees, notices, and communication",
      badge: "Family Portal",
      accent: "from-violet-400 to-indigo-400",
      soft: "from-indigo-50 via-white to-violet-50 border-indigo-100",
    },
    {
      name: "Student",
      icon: FaUserGraduate,
      subtitle: "Assignments, schedules, results, and daily learning",
      badge: "Learner View",
      accent: "from-pink-400 to-rose-400",
      soft: "from-rose-50 via-white to-pink-50 border-rose-100",
    },
  ];

  const handleNavClick = () => setMobileMenuOpen(false);

  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    };
  }, [mobileMenuOpen]);

  return (
    <div
      className="eduflow-home min-h-screen scroll-smooth overflow-x-hidden"
      style={{ scrollPaddingTop: "100px" }}
    >
      {/* ── Header ── */}
      <header
        className={`eduflow-header fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? "bg-transparent"
          : "bg-transparent"
          }`}
      >
        <nav className="eduflow-nav max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 mt-5">
          <div className="flex items-center justify-between">
            <Motion.div
              className="flex items-center gap-2 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={handleNavClick}
            >
              <MdDashboard className="text-3xl text-slate-700" />
              <span className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-sky-700 bg-clip-text text-transparent">
                EduAI
              </span>
            </Motion.div>

            <div className="hidden lg:flex items-center gap-8">
              {navItems.map((item) => (
                <Motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  whileHover={{ y: -2 }}
                  className="text-gray-700 hover:text-slate-700 font-semibold transition-colors relative group"
                >
                  {item}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-slate-800 to-sky-700 group-hover:w-full transition-all duration-300" />
                </Motion.a>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <Motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/login")}
                className="header-secondary-cta flex items-center gap-2 text-gray-700 hover:text-slate-700 font-semibold transition-all px-4 py-2 rounded-lg hover:bg-slate-100"
              >
                <FaUser className="text-lg" /> Log In
              </Motion.button>
              <Motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/organization/signup")}
                className="header-primary-cta bg-gradient-to-r from-slate-800 to-sky-700 hover:from-slate-900 hover:to-sky-800 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-slate-300/50 transition-all flex items-center gap-2"
              >
                <Building2 className="text-sm" /> Register
              </Motion.button>
            </div>

            <Motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-2xl text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              {mobileMenuOpen ? <FaTimesIcon /> : <FaBars />}
            </Motion.button>
          </div>

          {mobileMenuOpen && (
            <Motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden mt-6 border-t border-gray-200/50 pt-6 pb-[max(env(safe-area-inset-bottom),24px)] max-h-[calc(100dvh-88px)] overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="space-y-2 mb-6">
                {navItems.map((item) => (
                  <Motion.a
                    key={item}
                    href={`#${item.toLowerCase()}`}
                    onClick={handleNavClick}
                    whileHover={{ x: 4 }}
                    className="block px-4 py-3 text-gray-700 hover:text-slate-700 hover:bg-slate-100 font-semibold rounded-lg transition-all"
                  >
                    {item}
                  </Motion.a>
                ))}
              </div>
              <div className="flex flex-col gap-3 pt-6 border-t border-gray-200/50">
                <Motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleNavClick();
                    navigate("/login");
                  }}
                  className="flex items-center justify-center gap-2 text-slate-700 py-3 font-semibold hover:text-slate-800"
                >
                  <FaUser /> Log In
                </Motion.button>
                <Motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    handleNavClick();
                    navigate("/super-admin/signup");
                  }}
                  className="header-primary-cta bg-gradient-to-r from-slate-800 to-sky-700 text-white px-6 py-3 rounded-xl font-bold w-full flex items-center justify-center gap-2 shadow-lg"
                >
                  <FaUserPlus /> Register Head Quarter
                </Motion.button>
              </div>
            </Motion.div>
          )}
        </nav>
      </header>

      {/* ── Hero ── */}
      <section
        id="home"
        className="eduflow-hero scroll-mt-28 relative overflow-hidden pt-20 md:pt-24 pb-0"
        style={{ minHeight: "100svh" }}
      >
        <div
          className="hero-base-bg absolute inset-0"
          style={{
            zIndex: 0,
            background:
              "linear-gradient(112deg, #ffffff 0%, #ffffff 25%, #edfbfd 40%, #c8f0f5 54%, #6dd8e8 70%, #1ec8de 84%, #00b8d4 100%)",
          }}
        />
        {/* <div className="absolute inset-0 bg-[url('/homejpg.jpg')] opacity-55 bg-cover bg-top bg-no-repeat z-0 pointer-events-none"></div>
        <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none"></div> */}

        <div className="absolute inset-0 bg-[url('/homejpg.jpg')] opacity-55 bg-cover bg-top bg-no-repeat z-0 pointer-events-none animate-bgMove"></div>

        {/* <div
          className="hero-grid absolute inset-0 pointer-events-none"
          style={{
            zIndex: 1,
            backgroundImage:
              "linear-gradient(rgba(16,126,214,0.44) 1px, transparent 1px), linear-gradient(90deg, rgba(16,126,214,0.44) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "linear-gradient(to right, rgba(0,0,0,0.74) 0%, rgba(0,0,0,0.82) 36%, rgba(0,0,0,0.92) 70%, rgba(0,0,0,1) 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, rgba(0,0,0,0.74) 0%, rgba(0,0,0,0.82) 36%, rgba(0,0,0,0.92) 70%, rgba(0,0,0,1) 100%)",
          }}
        /> */}
        <div
          className="absolute pointer-events-none"
          style={{
            zIndex: 1,
            bottom: "-120px",
            right: "-80px",
            width: "800px",
            height: "700px",
            background:
              "radial-gradient(ellipse at 50% 55%, rgba(0,235,255,0.55) 0%, rgba(0,195,220,0.30) 32%, transparent 62%)",
            filter: "blur(55px)",
          }}
        />
        <div
          className="absolute pointer-events-none hidden lg:block"
          style={{
            zIndex: 1,
            top: "-60px",
            right: "-40px",
            width: "600px",
            height: "550px",
            background:
              "radial-gradient(ellipse at 58% 28%, rgba(80,230,255,0.38) 0%, transparent 58%)",
            filter: "blur(45px)",
          }}
        />

        <div
          className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8"
          style={{ zIndex: 3 }}
        >
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="min-h-0 lg:min-h-[calc(100svh-96px)] flex items-center pt-4 pb-4 sm:pt-6 sm:pb-6 lg:py-3"
          >
            <div className="w-full flex flex-col items-start gap-8 xl:gap-10">
              <Motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="space-y-5 max-w-4xl text-center flex flex-col items-start bg-gray-300/10 p-5 rounded-3xl"
              >
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="mx-auto"
                >
                  <div className="inline-flex items-center gap-2 bg-amber-50 text-slate-700 px-5 py-3 rounded-full backdrop-blur-sm shadow-sm">
                    <Motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2.5 h-2.5 bg-slate-800 rounded-full"
                    />
                    <span className="text-sm font-semibold uppercase font-inter tracking-widest">
                      AI-POWERED SCHOOL MANAGEMENT
                    </span>
                  </div>
                </Motion.div>

                <Motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="text-left"
                >
                  <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl leading-[1.08] sm:leading-[1.05] drop-shadow-lg">
                    <span className="block mb-2 text-gray-700">
                      Transform Your
                    </span>
                    <span className="block bg-clip-text drop-shadow-lg text-gray-700">
                      School Operations
                    </span>
                    <span className="block text-gray-700">
                      with AI Intelligence
                    </span>
                  </h1>
                </Motion.div>

                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="text-left text-base xl:text-lg font-bold leading-relaxed max-w-2xl text-slate-500"
                >
                  Reduce administrative workload by 40% and boost student
                  outcomes by 25%. Our intelligent platform predicts challenges
                  before they arise.
                </Motion.div>

                <Motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-start gap-3 pt-2 w-full"
                >
                  <Motion.button
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setOpenRegisterModal(true)}
                    className="hero-primary-cta bg-gradient-to-r from-slate-900 to-slate-700 text-white px-7 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 w-full sm:w-auto"
                  >
                    Start Your School Setup
                  </Motion.button>
                  <Motion.button
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="hero-secondary-cta bg-white/90 border-2 border-slate-300 hover:border-slate-500 text-slate-700 hover:bg-white px-6 sm:px-7 py-3.5 rounded-xl font-bold flex items-center justify-center gap-3 transition-all w-full sm:w-auto backdrop-blur-sm"
                  >
                    <FaPlay className="text-lg" /> Watch Demo
                  </Motion.button>

                </Motion.div>
                <Motion.button
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/student-admission")}
                  className="relative overflow-hidden group hero-admission-cta px-8 py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-3 w-full sm:w-auto bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 shadow-[0_0_24px_rgba(192,38,211,0.5)] hover:shadow-[0_0_40px_rgba(192,38,211,0.75)] transition-shadow duration-300"
                >
                  <span
                    className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-in-out pointer-events-none"
                  />

                  {/* Icon with hop */}
                  <Motion.span
                    whileHover={{ y: -3, rotate: -10, scale: 1.2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <FaUserPlus className="text-xl drop-shadow" />
                  </Motion.span>

                  {/* Text */}
                  <span className="tracking-wide text-sm sm:text-base">
                    Student Admission Form
                  </span>
                </Motion.button>
              </Motion.div>

              <div className="flex flex-col mx-auto items-center justify-center py-12">
                <h2 className="text-3xl font-bold text-slate-800 mb-2">
                  Welcome to EduAI
                </h2>
                <p className="text-lg text-gray-600 max-w-xl text-center">
                  Empowering schools with smart, modern, and secure management
                  solutions.
                </p>
              </div>
            </div>
          </Motion.div>
        </div>
        {/* ── Bottom polygon transition ── */}
        <div
          className="section-bottom-polygon absolute bottom-0 left-0 w-full overflow-hidden leading-none"
          style={{ zIndex: 4 }}
        >
          <svg
            viewBox="200 0 800 80"
            preserveAspectRatio="none"
            className="w-full"
            style={{ display: "block", height: "80px" }}
          >
            <path
              d="M-1e2 15H550q20 0 30 10l50 45q10 10 30 10H8e2-1e2z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      <main className="eduflow-main max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Trusted ── */}
        <div className="eduflow-trusted my-8 md:my-12 w-screen relative left-1/2 right-1/2 -mx-[50vw]">
          <div className="bg-gradient-to-r from-white via-slate-50 to-white py-10 md:py-12 border-y border-slate-200/70">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <span className="text-slate-700 font-bold text-xs bg-white border border-slate-300 px-4 py-2 rounded-full uppercase tracking-widest shadow-sm">
                  Trusted Globally
                </span>
              </div>

              <div className="w-full py-8 bg-white/80 flex flex-wrap justify-center gap-8 border-y border-slate-200">
                <div className="flex flex-col items-center">
                  <span className="text-3xl text-sky-600 mb-2">
                    <FaLightbulb />
                  </span>
                  <span className="font-bold text-slate-800">AI Insights</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl text-indigo-600 mb-2">
                    <FaShieldAlt />
                  </span>
                  <span className="font-bold text-slate-800">Secure Cloud</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-3xl text-green-600 mb-2">
                    <FaChartLine />
                  </span>
                  <span className="font-bold text-slate-800">99.9% Uptime</span>
                </div>
              </div>

              {/* <div className="overflow-hidden mb-16">
                <Motion.div
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{
                    duration: 30,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="flex gap-8 md:gap-12 whitespace-nowrap"
                >
                  {[...schools, ...schools].map((s, i) => (
                    <span
                      key={i}
                      className="text-slate-400 font-bold text-lg md:text-2xl italic flex-shrink-0"
                    >
                      {s}
                    </span>
                  ))}
                </Motion.div>
              </div> */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 sm:gap-8">
                {[
                  { value: "200+", label: "Partner Schools" },
                  { value: "50k+", label: "Active Students" },
                  { value: "99.9%", label: "System Uptime" },
                  { value: "1000+", label: "Parent Reviews" },
                  { value: "800+", label: "Teacher " },
                ].map((stat, i) => (
                  <Motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className="text-center bg-white/70 border border-slate-200 rounded-xl py-5 px-3 sm:bg-transparent sm:border-0 sm:rounded-none sm:p-0"
                  >
                    <div className="font-black text-3xl md:text-5xl bg-gradient-to-r from-slate-800 to-sky-700 bg-clip-text text-transparent mb-2">
                      {stat.value}
                    </div>
                    <div className="text-sm md:text-base text-gray-600 font-medium">
                      {stat.label}
                    </div>
                  </Motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Intelligent Choice ── */}
        <section
          id="features"
          className="eduflow-features scroll-mt-28 my-8 md:my-12"
        >
          <div className="eduflow-unlike-panel">
            <Motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="eduflow-unlike-header text-center max-w-4xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 border border-slate-300 text-slate-600 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-[0.2em] mb-6 bg-white/80">
                <span className="w-2 h-2 bg-sky-500 rounded-sm inline-block" />
                BUILT FOR MODERN CAMPUSES
              </div>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight text-gray-900">
                Built to run smarter school operations
              </h2>
              <p className="mt-5 text-base md:text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto">
                Unify admissions, academics, finance, and communication in one
                connected platform with practical automation for everyday work.
              </p>
            </Motion.div>

            <div className="eduflow-unlike-grid mt-12 md:mt-14">
              {features.map((feature, idx) => (
                <Motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className={`eduflow-unlike-card eduflow-unlike-card-${idx + 1}`}
                >
                  <div className="eduflow-unlike-card-top">
                    <span className="eduflow-unlike-index">0{idx + 1}</span>
                    <div className="eduflow-unlike-icon">
                      <img
                        src={feature.image}
                        alt={feature.imageAlt}
                        className="eduflow-unlike-icon-image"
                      />
                    </div>
                  </div>
                  <h3 className="eduflow-unlike-title text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="eduflow-unlike-description text-sm text-gray-500 leading-relaxed">
                    {feature.description}
                  </p>
                </Motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comprehensive Modules ── */}
        <section
          id="modules"
          className="eduflow-modules scroll-mt-28 my-24 md:my-32"
        >
          {/* Section header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 bg-sky-50 border border-sky-200 text-sky-700 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
              <span className="w-1.5 h-1.5 bg-sky-500 rounded-full inline-block" />
              COMPREHENSIVE MODULES
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              Everything your{" "}
              <span className="bg-gradient-to-r from-sky-600 to-blue-700 bg-clip-text text-transparent">
                school needs
              </span>
            </h2>
            <p className="mt-3 text-gray-500 text-base max-w-xl">
              Six purpose-built modules, unified under one platform — designed
              for schools of every size.
            </p>
          </div>

          {/* Bento grid */}
          <ModuleBentoGrid modules={modules} />
        </section>

        {/* ── Stakeholders ── */}
        <section className="eduflow-stakeholders my-24 md:my-32">
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
              Tailored for Every Stakeholder
            </h2>
            <p className="text-gray-600 mt-4 text-lg">
              Customized dashboards and features for each user role.
            </p>
          </Motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 lg:gap-6">
            {stakeholderRoles.map((role, idx) => {
              const StakeholderIcon = role.icon;

              return (
                <Motion.div
                  key={role.name}
                  onClick={() => {
                    if (role.name === "Parent") navigate("/parent/dashboard");
                  }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.08 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className={`eduflow-stakeholder-card relative overflow-hidden rounded-[1.6rem] border bg-gradient-to-br ${role.soft}`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${role.accent}`}
                  />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`eduflow-stakeholder-icon flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${role.accent} text-xl text-white`}
                      >
                        <StakeholderIcon />
                      </span>
                      <span className="eduflow-stakeholder-badge">
                        {role.badge}
                      </span>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-xl font-bold text-slate-900">
                        {role.name}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {role.subtitle}
                      </p>
                    </div>
                  </div>
                </Motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Connected School ── */}
        <section>
          <ConnectedSchools />
        </section>
        {/* ── Command Center ── */}
        <section className="eduflow-command my-24 md:my-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left – Content */}
            <Motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="space-y-8"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-700 via-purple-600 to-sky-600 bg-clip-text text-transparent leading-tight">
                Command Center for Super Admins
              </h2>

              <p className="text-gray-700 text-lg leading-relaxed max-w-xl">
                A bird's-eye view of your entire school network. Manage multiple
                campuses, control global settings, and audit financial flows
                from a single unified cockpit.
              </p>

              <div className="space-y-5">
                {[
                  "RBAC Control & Permission Management",
                  "Institution-wide Financial Audit Trails",
                  "Bulk Data Import & Export Wizards",
                ].map((f, i) => (
                  <Motion.div
                    key={i}
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: i * 0.15 + 0.2,
                      duration: 0.6,
                      type: "spring",
                      stiffness: 120,
                    }}
                    whileHover={{ x: 8, scale: 1.02 }}
                    className="group flex items-center gap-5 bg-white/70 backdrop-blur-sm border border-gray-200/50 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300/50 transition-all duration-300"
                  >
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 group-hover:from-indigo-100 group-hover:to-purple-100 transition-colors">
                      <FaCheckCircle className="text-indigo-600 text-xl" />
                    </div>
                    <span className="text-gray-800 font-semibold text-lg group-hover:text-indigo-700 transition-colors">
                      {f}
                    </span>
                  </Motion.div>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                {[
                  { icon: FaShieldAlt, label: "Encrypted" },
                  { icon: FaDatabase, label: "Auto-backup" },
                ].map((item, i) => (
                  <Motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.15 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -4, scale: 1.05 }}
                    className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3.5 rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md hover:border-purple-300/50 transition-all duration-300"
                  >
                    <item.icon className="text-indigo-600 text-xl" />
                    <span className="text-sm font-semibold text-gray-900">
                      {item.label}
                    </span>
                  </Motion.div>
                ))}
              </div>
            </Motion.div>

            {/* Right – Dashboard Preview Card */}
            <Motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="relative"
            >
              <div className="bg-white/80 backdrop-blur-md border border-gray-200/50 rounded-3xl shadow-xl overflow-hidden p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-bold text-xl text-gray-900">
                    Financial Transactions
                  </span>
                  <Motion.div
                    animate={{ rotate: [0, 8, -8, 0] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <FaChartLine className="text-indigo-600 text-2xl" />
                  </Motion.div>
                </div>

                <div className="h-64 relative rounded-2xl overflow-hidden bg-gray-50/50 border border-gray-200/40 shadow-inner">
                  <svg
                    viewBox="0 0 400 180"
                    className="w-full h-full absolute inset-0"
                  >
                    <defs>
                      <linearGradient
                        id="gradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop
                          offset="0%"
                          stopColor="#6366f1"
                          stopOpacity="0.35"
                        />
                        <stop
                          offset="100%"
                          stopColor="#a855f7"
                          stopOpacity="0.35"
                        />
                      </linearGradient>
                    </defs>

                    {/* Subtle area fill */}
                    <Motion.path
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 0.3 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 2.5,
                        ease: "easeOut",
                        delay: 0.4,
                      }}
                      d="M0,130 L50,110 L100,70 L150,90 L200,40 L250,60 L300,20 L350,50 L380,10 L400,30 L400,180 L0,180 Z"
                      fill="url(#gradient)"
                    />

                    {/* Main line */}
                    <Motion.polyline
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        duration: 2.2,
                        ease: "easeInOut",
                        delay: 0.6,
                      }}
                      points="0,130 50,110 100,70 150,90 200,40 250,60 300,20 350,50 380,10"
                      stroke="#6366f1"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="none"
                      className="drop-shadow-[0_4px_12px_rgba(99,102,241,0.4)]"
                    />
                  </svg>

                  {/* Minimal floating accents – small and subtle */}
                  <div className="absolute top-10 left-1/4 w-2.5 h-2.5 bg-indigo-400 rounded-full blur-sm animate-pulse opacity-70" />
                  <div className="absolute bottom-16 right-1/4 w-3 h-3 bg-purple-400 rounded-full blur-sm animate-pulse delay-1000 opacity-70" />
                </div>

                <div className="flex justify-between mt-4 text-sm text-gray-600 font-medium">
                  <span>Jan 2023</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                </div>
              </div>
            </Motion.div>
          </div>
        </section>

        {/* ── AI Intelligence ── */}
        <div className="eduflow-ai my-24 md:my-32 relative">
          {/* Top polygon */}
          <div className="section-top-polygon w-screen relative left-1/2 right-1/2 -mx-[50vw]">
            <svg
              viewBox="200 0 800 80"
              preserveAspectRatio="none"
              className="w-full"
              style={{ display: "block", height: "80px" }}
            >
              <path
                d="M0 15H550q20 0 30 10l50 45q10 10 30 10H8e2 0z"
                fill="#0d1f42"
              />
            </svg>
          </div>

          <section className="relative overflow-hidden bg-gradient-to-br from-[#0d1f42] via-[#1a3668] to-[#0a1830] px-5 sm:px-6 md:px-12 py-10 md:py-16 text-slate-100 w-screen left-1/2 right-1/2 -mx-[50vw]">
            <div className="pointer-events-none absolute left-0 right-0 top-0 h-px bg-slate-300/20" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_40%,rgba(56,130,246,0.10)_0%,transparent_70%)]" />
            <div className="eduflow-ai-globe pointer-events-none absolute -right-48 top-1/2 -translate-y-1/2 hidden md:block">
              <div className="absolute inset-0 rounded-full bg-sky-300/10 blur-3xl" />
              <Motion.img
                src="https://www.zoho.com/erp/homepage/svgs/privacy-globeimg.svg"
                alt="Rotating Globe"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="eduflow-ai-globe-image relative z-10 h-[1000px] w-[1000px] object-contain opacity-100 drop-shadow-[0_0_95px_rgba(220,245,255,0.68)]"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-10 items-start relative z-10">
              <Motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <span className="text-sky-200 font-bold text-xs bg-white/10 border border-white/20 px-4 py-2 rounded-sm uppercase tracking-[0.18em] inline-block mb-6">
                  PROPRIETARY AI ENGINE
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight text-white max-w-xl">
                  AI Driven Academic Intelligence
                </h2>
                <p className="text-white text-base md:text-lg leading-relaxed mb-8 max-w-xl">
                  Our AI doesn't just store data; it predicts the future.
                  Identify at-risk students 3 months before their exams and
                  receive automated intervention recommendations.
                </p>
                <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
                  {[
                    {
                      title: "At-Risk Probabilities",
                      desc: "Maps behavioral and academic data to flag students needing extra attention.",
                    },
                    {
                      title: "Performance Trends",
                      desc: "Longitudinal analysis of performance across years and subjects.",
                    },
                  ].map((c, i) => (
                    <Motion.div
                      key={i}
                      whileHover={{ y: -3 }}
                      className="bg-white/[0.07] backdrop-blur-sm border border-white/15 p-5 rounded-xl hover:border-sky-400/50 hover:bg-white/[0.11] transition-all"
                    >
                      <h4 className="font-bold text-sky-200 mb-2">{c.title}</h4>
                      <p className="text-white text-sm leading-relaxed">
                        {c.desc}
                      </p>
                    </Motion.div>
                  ))}
                </div>
              </Motion.div>
              <div className="hidden md:block min-h-[320px]" />
            </div>

            <div className="relative z-10 mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
              {[
                {
                  label: "Predicted Risk",
                  value: "78%",
                  hint: "Model confidence high",
                },
                {
                  label: "At Risk Students",
                  value: "234",
                  hint: "Needs focused review",
                },
                {
                  label: "Intervention Rate",
                  value: "92%",
                  hint: "Actions completed",
                },
                {
                  label: "Trend Signal",
                  value: "Weekly",
                  hint: "Performance pulse active",
                },
                {
                  label: "Forecast Window",
                  value: "90 Days",
                  hint: "Early intervention timeline",
                },
              ].map((item, i) => (
                <Motion.div
                  key={i}
                  whileHover={{ y: -3 }}
                  className="bg-white/[0.07] backdrop-blur-sm border border-white/15 rounded-xl px-4 py-4 hover:bg-white/[0.11] transition-all"
                >
                  <div className="text-[10px] uppercase tracking-[0.22em] text-sky-200/80 mb-2">
                    {item.label}
                  </div>
                  <div className="text-xl font-bold text-white mb-1">
                    {item.value}
                  </div>
                  <div className="text-xs text-white/70">{item.hint}</div>
                </Motion.div>
              ))}
            </div>
          </section>

          {/*           */}
          {/* ── Bottom polygon transition ── */}
          {/*                  <div className="section-bottom-polygon absolute bottom-0 left-0 w-full overflow-hidden leading-none" style={{ zIndex: 1 }}> */}
          {/*                    <svg viewBox="0 0 800 80" preserveAspectRatio="none" className="w-full" style={{ display: 'block', height: '80px' }}> */}
          {/*                      <path d="M-1e2 15H550q20 0 30 10l50 45q10 10 70 10H8e2-1e2z" fill="white" /> */}
          {/*                    </svg> */}
          {/*                  </div> */}
        </div>

        {/* ── School Groups ── */}
        <section className="eduflow-groups my-24 md:my-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left column – text + feature cards */}
            <Motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl py-5 font-extrabold mb-6 bg-gradient-to-r from-purple-700 to-sky-600 bg-clip-text text-transparent">
                Designed for School Groups
              </h2>
              <p className="text-gray-700 text-lg leading-relaxed mb-10 max-w-xl">
                Whether you manage one campus or one hundred, our multi-tenant
                architecture ensures complete data isolation with global
                management capabilities.
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: FaLock,
                    title: "Isolated Data Architecture",
                    desc: "Each school's data in separate encrypted containers",
                  },
                  {
                    icon: FaPalette,
                    title: "White-Label Customization",
                    desc: "Custom sub-domains, logos, color schemes",
                  },
                ].map((item, i) => (
                  <Motion.div
                    key={i}
                    initial={{ opacity: 0, y: 25 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: i * 0.2,
                      duration: 0.7,
                      type: "spring",
                      stiffness: 100,
                    }}
                    viewport={{ once: true }}
                    whileHover={{
                      y: -8,
                      scale: 1.02,
                      transition: { duration: 0.3 },
                    }}
                    className="group relative bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-md hover:shadow-xl hover:border-purple-300/50 rounded-2xl p-6 transition-all duration-400"
                  >
                    <div className="flex items-start gap-5">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-sky-50 group-hover:from-purple-100 group-hover:to-sky-100 transition-colors duration-300">
                        <item.icon className="text-2xl text-purple-700" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg group-hover:text-purple-800 transition-colors">
                          {item.title}
                        </h4>
                        <p className="text-gray-600 mt-2 text-base group-hover:text-gray-700 transition-colors">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </Motion.div>
                ))}
              </div>
            </Motion.div>

            {/* Right column – feature tiles */}
            <Motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
              className="relative"
            >
              <div className="bg-white/85 backdrop-blur-md border border-gray-200/50 shadow-xl rounded-3xl p-10 md:p-12">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { icon: FaBuilding, label: "Multi-Campus", span: "" },
                    { icon: FaLock, label: "Data Isolation", span: "" },
                    {
                      icon: FaGlobe,
                      label: "Global Management",
                      span: "col-span-2",
                    },
                  ].map((c, i) => (
                    <Motion.div
                      key={i}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.3 + i * 0.15,
                        duration: 0.7,
                        type: "spring",
                      }}
                      viewport={{ once: true }}
                      whileHover={{
                        y: -10,
                        scale: 1.06,
                        transition: { duration: 0.4 },
                      }}
                      className={`group bg-white/90 border border-gray-200/50 rounded-2xl p-6 md:p-8 text-center shadow hover:shadow-lg hover:border-purple-300/50 transition-all duration-400 ${c.span}`}
                    >
                      <c.icon className="text-4xl md:text-5xl text-purple-600 mx-auto mb-4 group-hover:text-purple-700 transition-colors" />
                      <span className="text-base md:text-lg font-semibold text-gray-900 group-hover:text-purple-900 transition-colors">
                        {c.label}
                      </span>
                    </Motion.div>
                  ))}
                </div>
              </div>
            </Motion.div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section
          id="pricing"
          className="scroll-mt-28 my-24 md:my-32 px-4 lg:px-8 relative overflow-hidden"
        >
          {/* Very soft background accents — subtle & non-distracting */}
          <div className="absolute inset-0 pointer-events-none -z-10">
            <div className="absolute top-20 left-10 w-80 h-80 bg-indigo-50/40 rounded-full blur-3xl animate-float-slow opacity-70" />
            <div className="absolute bottom-20 right-10 w-72 h-72 bg-sky-50/30 rounded-full blur-3xl animate-float opacity-60" />
          </div>

          <Motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="text-center mb-16 md:mb-20"
          >
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-indigo-700 via-purple-600 to-sky-600 py-8 bg-clip-text text-transparent tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-gray-600 mt-5 text-lg md:text-xl max-w-3xl mx-auto font-medium">
              Choose the plan that fits your school — no hidden fees, no
              surprises.
            </p>
          </Motion.div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-10 max-w-7xl mx-auto">
            {plans.map((plan, idx) => {
              const isFeatured = plan.name === "Professional";

              return (
                <Motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: idx * 0.2,
                    duration: 0.7,
                    type: "spring",
                    stiffness: 90,
                    damping: 15,
                  }}
                  whileHover={{
                    y: -16,
                    scale: 1.03,
                    transition: { duration: 0.4, ease: "easeOut" },
                  }}
                  className={`relative rounded-3xl p-8 lg:p-10 flex flex-col transition-all duration-400 backdrop-blur-xl border
            ${isFeatured
                      ? "bg-white/95 border-indigo-300/60 shadow-xl z-10 scale-[1.04]"
                      : "bg-white/85 border-gray-200/60 shadow-lg"
                    } hover:shadow-2xl hover:border-indigo-300/50`}
                >
                  {/* Featured badge */}
                  {isFeatured && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold uppercase tracking-wider px-6 py-2 rounded-full shadow-lg">
                      Most Popular
                    </span>
                  )}

                  {/* Plan header */}
                  <div className="flex items-center gap-5 mb-10">
                    <div
                      className={`w-16 h-16 flex items-center justify-center rounded-2xl text-3xl flex-shrink-0 transition-transform duration-500
              ${isFeatured
                          ? "bg-indigo-600 text-white shadow-xl"
                          : "bg-gray-100 text-slate-700 shadow-md"
                        }`}
                    >
                      {plan.icon}
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-gray-900">
                        {plan.name}
                      </h3>
                      <p className="text-gray-500 mt-1 text-base">
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-10">
                    <div className="flex items-baseline">
                      <span className="text-6xl md:text-7xl font-black text-gray-900 tracking-tight">
                        {plan.price}
                      </span>
                      <span className="text-gray-500 text-2xl font-semibold ml-3">
                        {plan.period}
                      </span>
                    </div>
                  </div>

                  {/* Features list */}
                  <ul className="space-y-4 mb-12 flex-grow">
                    {plan.features.map((f, fi) => (
                      <li
                        key={fi}
                        className="flex items-center gap-4 text-base"
                      >
                        <div
                          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm
                  ${f.included
                              ? isFeatured
                                ? "bg-indigo-600 text-white"
                                : "bg-emerald-500 text-white"
                              : "bg-gray-200 text-gray-400"
                            }`}
                        >
                          {f.included ? (
                            <FaCheck size={14} />
                          ) : (
                            <FaTimes size={14} />
                          )}
                        </div>
                        <span
                          className={
                            f.included
                              ? "text-gray-800 font-medium"
                              : "text-gray-400"
                          }
                        >
                          {f.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA button */}
                  <button
                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-300 shadow-md
              ${isFeatured
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-300/40 hover:shadow-indigo-400/50"
                        : "bg-gray-800 hover:bg-gray-900 text-white shadow-gray-300/30 hover:shadow-gray-400/40"
                      }`}
                  >
                    {plan.buttonText}
                  </button>
                </Motion.div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="relative eduflow-footer mt-24 md:mt-32 pb-[max(env(safe-area-inset-bottom),32px)] md:pb-0 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 bg-[url('/footerbg.jpg')]  opacity-55 bg-cover bg-bottom bg-no-repeat"></div>

        {/* Gradient Overlay (THIS gives that soft blue fade) */}
        <div className="absolute inset-0 bg-gradient-to-r "></div>

        {/* Content */}
        <div className="relative  z-10">
          <div className="eduflow-footer-shell max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 ">
            <div className="bg-[#005eff56] rounded-xl border border-slate-200 px-6 py-6 md:px-8 md:py-8 mb-10 md:mb-14 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <p className="text-[#333232] text-[11px] font-bold uppercase tracking-[0.16em] mb-2">
                  Future-ready School ERP
                </p>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                  Built for operations, security, and growth.
                </h3>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#pricing"
                  className="eduflow-footer-btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold"
                >
                  View Pricing
                </a>
                <a
                  href="/contact-us"
                  className="eduflow-footer-btn-secondary px-5 py-2.5 rounded-xl text-sm font-semibold"
                >
                  Contact Us
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 p-11 bg-[#ffffff38] rounded-3xl  md:grid-cols-2 xl:grid-cols-4 gap-10 xl:gap-12">
              <div className="space-y-6">
                <div className="flex items-center gap-3 group cursor-pointer">
                  <div className="p-2.5 bg-slate-800 rounded-lg text-white shadow-lg shadow-slate-900/20">
                    <FaBuilding className="text-lg" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-gray-900 leading-none">
                      EduAI
                    </span>
                    <span className="text-[8px] font-bold text-gray-500 tracking-[0.15em] uppercase mt-1.5">
                      Smart Schools
                    </span>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-[#0b3d8c]  font-bold max-w-xs">
                  Intelligent school management platform for modern education.
                  Designed by Graphura India.
                </p>

                <div className="flex flex-wrap gap-2.5">
                  {["99.9% Uptime", "Secure Cloud", "AI Insights"].map(
                    (badge) => (
                      <span
                        key={badge}
                        className="eduflow-footer-badge text-[11px] font-semibold px-3 py-1.5 rounded-full"
                      >
                        {badge}
                      </span>
                    ),
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  {[
                    { icon: FaInstagram, label: "Instagram" },
                    { icon: FaTwitter, label: "Twitter" },
                    { icon: FaLinkedin, label: "LinkedIn" },
                  ].map((item) => {
                    const FooterIcon = item.icon;

                    return (
                      <a
                        key={item.label}
                        href="#"
                        aria-label={item.label}
                        className="eduflow-footer-social p-2.5 rounded-lg"
                      >
                        <FooterIcon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="eduflow-footer-title text-xs uppercase tracking-wider mb-5">
                  Quick Links
                </h4>
                <ul className="space-y-3 text-sm">
                  {[
                    { label: "Home", path: "#home" },
                    { label: "Features", path: "#features" },
                    { label: "Modules", path: "#modules" },
                    { label: "Pricing", path: "#pricing" },
                  ].map((item) => (
                    <li key={item.label}>
                      <a href={item.path} className="eduflow-footer-link group">
                        <span className="eduflow-footer-link-dot" />
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="eduflow-footer-title text-xs uppercase tracking-wider mb-5">
                  Resources
                </h4>
                <ul className="space-y-3 text-sm">
                  {[
                    { label: "Documentation", path: "#" },
                    { label: "Support", path: "/contact-us" },
                    { label: "Blog", path: "#" },
                    { label: "Community", path: "#" },
                  ].map((item) => (
                    <li key={item.label}>
                      <a href={item.path} className="eduflow-footer-link group">
                        <span className="eduflow-footer-link-dot" />
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="eduflow-footer-title text-xs uppercase tracking-wider mb-5">
                  Get in Touch
                </h4>
                <ul className="space-y-3.5 text-sm">
                  <li className="eduflow-footer-contact-item flex items-start gap-3 rounded-xl px-3 py-3">
                    <FaMapPin className="w-4 h-4 text-slate-700 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-xs leading-relaxed">
                      Pataudi, Gurgaon
                      <br />
                      Haryana 122503
                    </span>
                  </li>
                  <li className="eduflow-footer-contact-item flex items-center gap-3 rounded-xl px-3 py-3">
                    <FaPhone className="w-4 h-4 text-slate-700 flex-shrink-0" />
                    <a
                      href="tel:7378021327"
                      className="text-gray-600 hover:text-slate-700 transition-colors text-xs font-light"
                    >
                      +91 7378 021327
                    </a>
                  </li>
                  <li className="eduflow-footer-contact-item flex items-center gap-3 rounded-xl px-3 py-3">
                    <FaEnvelope className="w-4 h-4 text-slate-700 flex-shrink-0" />
                    <a
                      href="mailto:official@graphura.in"
                      className="text-gray-600 hover:text-slate-700 transition-colors text-xs font-light truncate"
                    >
                      official@graphura.in
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="eduflow-footer-bottom border-t border-slate-200 mt-10 pt-6 pb-2 md:pb-0">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 text-xs">
                <p className=" font-semibold">
                  © 2025 Graphura India Private Limited
                </p>
                <p className="font-medium">
                  Built in India for modern education teams.
                </p>
                <div className="flex flex-wrap gap-4 sm:gap-7">
                  {[
                    { label: "Privacy Policy", path: "/privacy-policy" },
                    {
                      label: "Terms & Conditions",
                      path: "/terms-and-conditions",
                    },
                    { label: "Cookies", path: "#" },
                  ].map((item) => (
                    <a
                      key={item.label}
                      href={item.path}
                      className="eduflow-footer-legal-link text-gray-500 transition-colors relative group"
                    >
                      {item.label}
                      <span className="absolute left-0 -bottom-1 h-px w-0 bg-slate-800 group-hover:w-full transition-all duration-300" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <RegisterSchoolModal
        isOpen={openRegisterModal}
        onClose={() => setOpenRegisterModal(false)}
      />
    </div>
  );
}

export default App;
