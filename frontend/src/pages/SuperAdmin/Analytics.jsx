// import React from "react";

// import {
//   TrendingUp,
//   Users,
//   School,
//   IndianRupee,
//   Activity,
//   ArrowLeft,
//   Download,
//   PieChart as PieChartIcon,
//   BarChart3,
//   Calendar,
//   FileText,
// } from "lucide-react";

// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
//   CartesianGrid,
//   PieChart,
//   Pie,
//   Cell,
//   BarChart,
//   Bar,
//   AreaChart,
//   Area,
// } from "recharts";

// import { useNavigate } from "react-router-dom";

// const Analytics = () => {

//   const navigate = useNavigate();

//   // ================= DATA =================

//   const revenueData = [
//     { month: "Jan", revenue: 12000 },
//     { month: "Feb", revenue: 18000 },
//     { month: "Mar", revenue: 25000 },
//     { month: "Apr", revenue: 32000 },
//     { month: "May", revenue: 40000 },
//     { month: "Jun", revenue: 52000 },
//   ];

//   const schoolGrowth = [
//     { month: "Jan", schools: 10 },
//     { month: "Feb", schools: 25 },
//     { month: "Mar", schools: 40 },
//     { month: "Apr", schools: 65 },
//     { month: "May", schools: 90 },
//     { month: "Jun", schools: 120 },
//   ];

//   const studentData = [
//     { name: "Active", value: 75 },
//     { name: "Inactive", value: 25 },
//   ];

//   const COLORS = ["#2563eb", "#f59e0b"];

//   // ================= BUTTON FUNCTIONS =================

//   const handleExport = () => {
//     alert("Analytics Report Exported Successfully!");
//   };

//   const handleGenerateReport = () => {
//     alert("Analytics Report Generated!");
//   };

//   const handleRefresh = () => {
//     window.location.reload();
//   };

//   return (
//     <div className="min-h-screen bg-[#eef2f7] p-3 sm:p-5 md:p-8">

//       {/* ================= HEADER ================= */}

//       <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">

//         {/* TITLE */}

//         <div>

//           <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">
//             Analytics Dashboard
//           </h1>

//           <p className="text-gray-500 mt-2 text-sm sm:text-base">
//             Monitor ERP growth, reports, revenue and student analytics
//           </p>

//         </div>

//         {/* BUTTONS */}

//         <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">

//           {/* BACK */}

//           <button
//             onClick={() => navigate(-1)}
//             className="flex items-center justify-center gap-2 bg-white hover:bg-gray-100 border border-gray-200 px-6 py-3 rounded-2xl shadow-sm transition-all cursor-pointer w-full sm:w-auto"
//           >
//             <ArrowLeft size={18} />
//             Back
//           </button>

//           {/* REFRESH */}

//           <button
//             onClick={handleRefresh}
//             className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-2xl shadow-sm transition-all cursor-pointer w-full sm:w-auto"
//           >
//             Refresh
//           </button>

//           {/* EXPORT */}

//           <button
//             onClick={handleExport}
//             className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl shadow-sm transition-all cursor-pointer w-full sm:w-auto"
//           >
//             <Download size={18} />
//             Export
//           </button>

//         </div>

//       </div>

//       {/* ================= TOP CARDS ================= */}

//       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">

//         {/* CARD */}

//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">

//           <div className="flex items-center justify-between">

//             <div>

//               <p className="text-gray-400 text-sm">
//                 Total Revenue
//               </p>

//               <h2 className="text-3xl font-bold text-slate-800 mt-2">
//                 ₹5.2L
//               </h2>

//             </div>

//             <div className="bg-blue-100 p-4 rounded-2xl">
//               <IndianRupee className="text-blue-600" />
//             </div>

//           </div>

//         </div>

//         {/* CARD */}

//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">

//           <div className="flex items-center justify-between">

//             <div>

//               <p className="text-gray-400 text-sm">
//                 Total Schools
//               </p>

//               <h2 className="text-3xl font-bold text-green-600 mt-2">
//                 120
//               </h2>

//             </div>

//             <div className="bg-green-100 p-4 rounded-2xl">
//               <School className="text-green-600" />
//             </div>

//           </div>

//         </div>

//         {/* CARD */}

//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">

//           <div className="flex items-center justify-between">

//             <div>

//               <p className="text-gray-400 text-sm">
//                 Students
//               </p>

//               <h2 className="text-3xl font-bold text-orange-600 mt-2">
//                 45K
//               </h2>

//             </div>

//             <div className="bg-orange-100 p-4 rounded-2xl">
//               <Users className="text-orange-600" />
//             </div>

//           </div>

//         </div>

//         {/* CARD */}

//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">

//           <div className="flex items-center justify-between">

//             <div>

//               <p className="text-gray-400 text-sm">
//                 Growth Rate
//               </p>

//               <h2 className="text-3xl font-bold text-purple-600 mt-2">
//                 +32%
//               </h2>

//             </div>

//             <div className="bg-purple-100 p-4 rounded-2xl">
//               <TrendingUp className="text-purple-600" />
//             </div>

//           </div>

//         </div>

//       </div>

//       {/* ================= CHARTS ================= */}

//       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">

//         {/* REVENUE CHART */}

//         <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-5 sm:p-8">

//           <div className="flex items-center justify-between mb-6">

//             <div>

//               <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
//                 <BarChart3 className="text-blue-600" />
//                 Revenue Analytics
//               </h2>

//               <p className="text-gray-500 text-sm mt-1">
//                 Monthly revenue growth analytics
//               </p>

//             </div>

//             <button
//               onClick={handleGenerateReport}
//               className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
//             >
//               Generate
//             </button>

//           </div>

//           <div className="h-[320px]">

//             <ResponsiveContainer width="100%" height="100%">

//               <AreaChart data={revenueData}>

//                 <defs>
//                   <linearGradient
//                     id="colorRevenue"
//                     x1="0"
//                     y1="0"
//                     x2="0"
//                     y2="1"
//                   >
//                     <stop
//                       offset="5%"
//                       stopColor="#2563eb"
//                       stopOpacity={0.8}
//                     />

//                     <stop
//                       offset="95%"
//                       stopColor="#2563eb"
//                       stopOpacity={0}
//                     />
//                   </linearGradient>
//                 </defs>

//                 <CartesianGrid strokeDasharray="3 3" />

//                 <XAxis dataKey="month" />

//                 <YAxis />

//                 <Tooltip />

//                 <Area
//                   type="monotone"
//                   dataKey="revenue"
//                   stroke="#2563eb"
//                   fillOpacity={1}
//                   fill="url(#colorRevenue)"
//                 />

//               </AreaChart>

//             </ResponsiveContainer>

//           </div>

//         </div>

//         {/* SCHOOL GROWTH */}

//         <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-5 sm:p-8">

//           <div className="flex items-center justify-between mb-6">

//             <div>

//               <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
//                 <TrendingUp className="text-green-600" />
//                 School Growth
//               </h2>

//               <p className="text-gray-500 text-sm mt-1">
//                 New schools registration analytics
//               </p>

//             </div>

//             <button
//               onClick={handleGenerateReport}
//               className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
//             >
//               Generate
//             </button>

//           </div>

//           <div className="h-[320px]">

//             <ResponsiveContainer width="100%" height="100%">

//               <BarChart data={schoolGrowth}>

//                 <CartesianGrid strokeDasharray="3 3" />

//                 <XAxis dataKey="month" />

//                 <YAxis />

//                 <Tooltip />

//                 <Bar
//                   dataKey="schools"
//                   fill="#16a34a"
//                   radius={[8, 8, 0, 0]}
//                 />

//               </BarChart>

//             </ResponsiveContainer>

//           </div>

//         </div>

//       </div>

//       {/* ================= LOWER SECTION ================= */}

//       <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

//         {/* PIE CHART */}

//         <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-5 sm:p-8">

//           <div className="flex items-center justify-between mb-6">

//             <div>

//               <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
//                 <PieChartIcon className="text-orange-500" />
//                 Student Status
//               </h2>

//               <p className="text-gray-500 text-sm mt-1">
//                 Active vs inactive students
//               </p>

//             </div>

//           </div>

//           <div className="h-[300px]">

//             <ResponsiveContainer width="100%" height="100%">

//               <PieChart>

//                 <Pie
//                   data={studentData}
//                   cx="50%"
//                   cy="50%"
//                   outerRadius={100}
//                   dataKey="value"
//                   label
//                 >

//                   {studentData.map((entry, index) => (
//                     <Cell
//                       key={`cell-${index}`}
//                       fill={COLORS[index % COLORS.length]}
//                     />
//                   ))}

//                 </Pie>

//                 <Tooltip />

//               </PieChart>

//             </ResponsiveContainer>

//           </div>

//         </div>

//         {/* QUICK ACTIONS */}

//         <div className="xl:col-span-2 bg-white rounded-[32px] shadow-sm border border-gray-100 p-5 sm:p-8">

//           <div className="flex items-center justify-between mb-8">

//             <div>

//               <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
//                 <Activity className="text-red-500" />
//                 Quick Analytics Actions
//               </h2>

//               <p className="text-gray-500 text-sm mt-1">
//                 Export and manage analytics reports quickly
//               </p>

//             </div>

//           </div>

//           {/* BUTTONS */}

//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

//             {/* BUTTON */}

//             <button
//               onClick={handleGenerateReport}
//               className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-3xl transition-all shadow-md text-left"
//             >

//               <div className="flex items-center justify-between mb-4">

//                 <div className="bg-white/20 p-4 rounded-2xl">
//                   <FileText />
//                 </div>

//                 <BarChart3 />
//               </div>

//               <h3 className="text-xl font-bold">
//                 Generate Analytics Report
//               </h3>

//               <p className="text-blue-100 text-sm mt-2">
//                 Generate detailed ERP analytics report instantly
//               </p>

//             </button>

//             {/* BUTTON */}

//             <button
//               onClick={handleExport}
//               className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-3xl transition-all shadow-md text-left"
//             >

//               <div className="flex items-center justify-between mb-4">

//                 <div className="bg-white/20 p-4 rounded-2xl">
//                   <Download />
//                 </div>

//                 <Activity />
//               </div>

//               <h3 className="text-xl font-bold">
//                 Export Full Data
//               </h3>

//               <p className="text-green-100 text-sm mt-2">
//                 Download all ERP analytics and charts
//               </p>

//             </button>

//             {/* BUTTON */}

//             <button
//               onClick={() => alert("Monthly Analytics Generated!")}
//               className="bg-orange-500 hover:bg-orange-600 text-white p-6 rounded-3xl transition-all shadow-md text-left"
//             >

//               <div className="flex items-center justify-between mb-4">

//                 <div className="bg-white/20 p-4 rounded-2xl">
//                   <Calendar />
//                 </div>

//                 <TrendingUp />
//               </div>

//               <h3 className="text-xl font-bold">
//                 Monthly Analytics
//               </h3>

//               <p className="text-orange-100 text-sm mt-2">
//                 Generate complete monthly analytics report
//               </p>

//             </button>

//             {/* BUTTON */}

//             <button
//               onClick={() => alert("Performance Report Generated!")}
//               className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-3xl transition-all shadow-md text-left"
//             >

//               <div className="flex items-center justify-between mb-4">

//                 <div className="bg-white/20 p-4 rounded-2xl">
//                   <Users />
//                 </div>

//                 <PieChartIcon />
//               </div>

//               <h3 className="text-xl font-bold">
//                 Performance Report
//               </h3>

//               <p className="text-purple-100 text-sm mt-2">
//                 Analyze schools and students performance
//               </p>

//             </button>

//           </div>

//         </div>

//       </div>

//     </div>
//   );
// };

// export default Analytics;


// // ================= FULL ANALYTICS.JSX =================

// import React, { useEffect, useState } from "react";

// import {
//   TrendingUp,
//   Users,
//   School,
//   IndianRupee,
//   Activity,
//   ArrowLeft,
//   Download,
//   PieChart as PieChartIcon,
//   BarChart3,
//   Calendar,
//   FileText,
//   RefreshCcw,
// } from "lucide-react";

// import {
//   ResponsiveContainer,
//   CartesianGrid,
//   Tooltip,
//   XAxis,
//   YAxis,
//   AreaChart,
//   Area,
//   PieChart,
//   Pie,
//   Cell,
//   BarChart,
//   Bar,
// } from "recharts";

// import axios from "axios";

// import { useNavigate } from "react-router-dom";

// const Analytics = () => {

//   const navigate = useNavigate();

//   // ================= STATES =================

//   const [loading, setLoading] = useState(true);

//   const [analyticsData, setAnalyticsData] = useState({
//     totalRevenue: 0,
//     totalSchools: 0,
//     totalStudents: 0,
//     growthRate: 0,
//   });

//   const [revenueData, setRevenueData] = useState([]);

//   const [schoolGrowth, setSchoolGrowth] = useState([]);

//   const [studentData, setStudentData] = useState([]);

//   // ================= COLORS =================

//   const COLORS = ["#2563eb", "#f59e0b"];

//   // ================= FETCH DATA =================

//   const fetchAnalytics = async () => {

//     try {

//       setLoading(true);

//       const response = await axios.get(
//         "http://localhost:5000/api/analytics/dashboard"
//       );

//       const data = response.data;

//       setAnalyticsData({
//         totalRevenue: data.totalRevenue,
//         totalSchools: data.totalSchools,
//         totalStudents: data.totalStudents,
//         growthRate: data.growthRate,
//       });

//       setRevenueData(data.revenueData);

//       setSchoolGrowth(data.schoolGrowth);

//       setStudentData(data.studentData);

//     } catch (error) {

//       console.log(error);

//       alert("Failed To Load Analytics");

//     } finally {

//       setLoading(false);

//     }
//   };

//   // ================= USE EFFECT =================

//   useEffect(() => {

//     fetchAnalytics();

//   }, []);

//   // ================= BUTTON FUNCTIONS =================

//   const handleExport = () => {

//     alert("Analytics Exported Successfully!");

//   };

//   const handleGenerateReport = () => {

//     alert("Analytics Report Generated!");

//   };

//   const handleRefresh = () => {

//     fetchAnalytics();

//   };

//   // ================= LOADING =================

//   if (loading) {

//     return (
//       <div className="min-h-screen flex items-center justify-center bg-[#eef2f7]">

//         <div className="text-center">

//           <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>

//           <h2 className="text-xl font-bold text-slate-700">
//             Loading Analytics...
//           </h2>

//         </div>

//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-[#eef2f7] p-3 sm:p-5 md:p-8">

//       {/* ================= HEADER ================= */}

//       <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">

//         <div>

//           <h1 className="text-3xl sm:text-4xl font-bold text-slate-800">
//             Analytics Dashboard
//           </h1>

//           <p className="text-gray-500 mt-2 text-sm sm:text-base">
//             Monitor ERP growth, reports, revenue and student analytics
//           </p>

//         </div>

//         {/* BUTTONS */}

//         <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">

//           {/* BACK */}

//           <button
//             onClick={() => navigate(-1)}
//             className="flex items-center justify-center gap-2 bg-white hover:bg-gray-100 border border-gray-200 px-6 py-3 rounded-2xl shadow-sm transition-all cursor-pointer w-full sm:w-auto"
//           >
//             <ArrowLeft size={18} />
//             Back
//           </button>

//           {/* REFRESH */}

//           <button
//             onClick={handleRefresh}
//             className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-2xl shadow-sm transition-all cursor-pointer w-full sm:w-auto"
//           >
//             <RefreshCcw size={18} />
//             Refresh
//           </button>

//           {/* EXPORT */}

//           <button
//             onClick={handleExport}
//             className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl shadow-sm transition-all cursor-pointer w-full sm:w-auto"
//           >
//             <Download size={18} />
//             Export
//           </button>

//         </div>

//       </div>

//       {/* ================= TOP CARDS ================= */}

//       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">

//         {/* REVENUE */}

//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">

//           <div className="flex items-center justify-between">

//             <div>

//               <p className="text-gray-400 text-sm">
//                 Total Revenue
//               </p>

//               <h2 className="text-3xl font-bold text-slate-800 mt-2">
//                 ₹{analyticsData.totalRevenue}
//               </h2>

//             </div>

//             <div className="bg-blue-100 p-4 rounded-2xl">
//               <IndianRupee className="text-blue-600" />
//             </div>

//           </div>

//         </div>

//         {/* SCHOOLS */}

//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">

//           <div className="flex items-center justify-between">

//             <div>

//               <p className="text-gray-400 text-sm">
//                 Total Schools
//               </p>

//               <h2 className="text-3xl font-bold text-green-600 mt-2">
//                 {analyticsData.totalSchools}
//               </h2>

//             </div>

//             <div className="bg-green-100 p-4 rounded-2xl">
//               <School className="text-green-600" />
//             </div>

//           </div>

//         </div>

//         {/* STUDENTS */}

//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">

//           <div className="flex items-center justify-between">

//             <div>

//               <p className="text-gray-400 text-sm">
//                 Students
//               </p>

//               <h2 className="text-3xl font-bold text-orange-600 mt-2">
//                 {analyticsData.totalStudents}
//               </h2>

//             </div>

//             <div className="bg-orange-100 p-4 rounded-2xl">
//               <Users className="text-orange-600" />
//             </div>

//           </div>

//         </div>

//         {/* GROWTH */}

//         <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">

//           <div className="flex items-center justify-between">

//             <div>

//               <p className="text-gray-400 text-sm">
//                 Growth Rate
//               </p>

//               <h2 className="text-3xl font-bold text-purple-600 mt-2">
//                 +{analyticsData.growthRate}%
//               </h2>

//             </div>

//             <div className="bg-purple-100 p-4 rounded-2xl">
//               <TrendingUp className="text-purple-600" />
//             </div>

//           </div>

//         </div>

//       </div>

//       {/* ================= CHARTS ================= */}

//       <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">

//         {/* REVENUE CHART */}

//         <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-5 sm:p-8">

//           <div className="flex items-center justify-between mb-6">

//             <div>

//               <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
//                 <BarChart3 className="text-blue-600" />
//                 Revenue Analytics
//               </h2>

//               <p className="text-gray-500 text-sm mt-1">
//                 Monthly revenue growth analytics
//               </p>

//             </div>

//             <button
//               onClick={handleGenerateReport}
//               className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold"
//             >
//               Generate
//             </button>

//           </div>

//           <div className="h-[320px]">

//             <ResponsiveContainer width="100%" height="100%">

//               <AreaChart data={revenueData}>

//                 <defs>

//                   <linearGradient
//                     id="colorRevenue"
//                     x1="0"
//                     y1="0"
//                     x2="0"
//                     y2="1"
//                   >

//                     <stop
//                       offset="5%"
//                       stopColor="#2563eb"
//                       stopOpacity={0.8}
//                     />

//                     <stop
//                       offset="95%"
//                       stopColor="#2563eb"
//                       stopOpacity={0}
//                     />

//                   </linearGradient>

//                 </defs>

//                 <CartesianGrid strokeDasharray="3 3" />

//                 <XAxis dataKey="month" />

//                 <YAxis />

//                 <Tooltip />

//                 <Area
//                   type="monotone"
//                   dataKey="revenue"
//                   stroke="#2563eb"
//                   fillOpacity={1}
//                   fill="url(#colorRevenue)"
//                 />

//               </AreaChart>

//             </ResponsiveContainer>

//           </div>

//         </div>

//         {/* SCHOOL GROWTH */}

//         <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-5 sm:p-8">

//           <div className="mb-6">

//             <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
//               <TrendingUp className="text-green-600" />
//               School Growth
//             </h2>

//             <p className="text-gray-500 text-sm mt-1">
//               New school registrations
//             </p>

//           </div>

//           <div className="h-[320px]">

//             <ResponsiveContainer width="100%" height="100%">

//               <BarChart data={schoolGrowth}>

//                 <CartesianGrid strokeDasharray="3 3" />

//                 <XAxis dataKey="month" />

//                 <YAxis />

//                 <Tooltip />

//                 <Bar
//                   dataKey="schools"
//                   fill="#16a34a"
//                   radius={[8, 8, 0, 0]}
//                 />

//               </BarChart>

//             </ResponsiveContainer>

//           </div>

//         </div>

//       </div>

//       {/* ================= LOWER SECTION ================= */}

//       <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

//         {/* PIE */}

//         <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-5 sm:p-8">

//           <div className="mb-6">

//             <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
//               <PieChartIcon className="text-orange-500" />
//               Student Status
//             </h2>

//             <p className="text-gray-500 text-sm mt-1">
//               Active vs inactive students
//             </p>

//           </div>

//           <div className="h-[300px]">

//             <ResponsiveContainer width="100%" height="100%">

//               <PieChart>

//                 <Pie
//                   data={studentData}
//                   cx="50%"
//                   cy="50%"
//                   outerRadius={100}
//                   dataKey="value"
//                   label
//                 >

//                   {studentData.map((entry, index) => (

//                     <Cell
//                       key={`cell-${index}`}
//                       fill={COLORS[index % COLORS.length]}
//                     />

//                   ))}

//                 </Pie>

//                 <Tooltip />

//               </PieChart>

//             </ResponsiveContainer>

//           </div>

//         </div>

//         {/* QUICK ACTIONS */}

//         <div className="xl:col-span-2 bg-white rounded-[32px] shadow-sm border border-gray-100 p-5 sm:p-8">

//           <div className="mb-8">

//             <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
//               <Activity className="text-red-500" />
//               Quick Actions
//             </h2>

//             <p className="text-gray-500 text-sm mt-1">
//               Generate and export analytics reports
//             </p>

//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

//             {/* BUTTON */}

//             <button
//               onClick={handleGenerateReport}
//               className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-3xl text-left transition-all"
//             >

//               <div className="flex items-center justify-between mb-4">

//                 <div className="bg-white/20 p-4 rounded-2xl">
//                   <FileText />
//                 </div>

//                 <BarChart3 />

//               </div>

//               <h3 className="text-xl font-bold">
//                 Generate Report
//               </h3>

//               <p className="text-blue-100 text-sm mt-2">
//                 Generate complete analytics report
//               </p>

//             </button>

//             {/* BUTTON */}

//             <button
//               onClick={handleExport}
//               className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-3xl text-left transition-all"
//             >

//               <div className="flex items-center justify-between mb-4">

//                 <div className="bg-white/20 p-4 rounded-2xl">
//                   <Download />
//                 </div>

//                 <Activity />

//               </div>

//               <h3 className="text-xl font-bold">
//                 Export Data
//               </h3>

//               <p className="text-green-100 text-sm mt-2">
//                 Export all analytics data
//               </p>

//             </button>

//             {/* BUTTON */}

//             <button
//               onClick={() =>
//                 alert("Monthly Analytics Generated")
//               }
//               className="bg-orange-500 hover:bg-orange-600 text-white p-6 rounded-3xl text-left transition-all"
//             >

//               <div className="flex items-center justify-between mb-4">

//                 <div className="bg-white/20 p-4 rounded-2xl">
//                   <Calendar />
//                 </div>

//                 <TrendingUp />

//               </div>

//               <h3 className="text-xl font-bold">
//                 Monthly Analytics
//               </h3>

//               <p className="text-orange-100 text-sm mt-2">
//                 Generate monthly analytics report
//               </p>

//             </button>

//             {/* BUTTON */}

//             <button
//               onClick={() =>
//                 alert("Performance Report Generated")
//               }
//               className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-3xl text-left transition-all"
//             >

//               <div className="flex items-center justify-between mb-4">

//                 <div className="bg-white/20 p-4 rounded-2xl">
//                   <Users />
//                 </div>

//                 <PieChartIcon />

//               </div>

//               <h3 className="text-xl font-bold">
//                 Performance Report
//               </h3>

//               <p className="text-purple-100 text-sm mt-2">
//                 Analyze student performance
//               </p>

//             </button>

//           </div>

//         </div>

//       </div>

//     </div>
//   );
// };

// export default Analytics;

// ======================================================
// ========= FULL AcademicConfiguration.jsx =============
// ========= WITH BACKEND CONNECTIVITY ==================
// ======================================================

import React, { useEffect, useState } from "react";

import axios from "axios";

import {
  Award,
  RefreshCcw,
  Edit,
  Calendar,
  BookOpen,
  Gift,
  FileText,
  Shield,
} from "lucide-react";

const AcademicConfiguration = () => {

  // ======================================================
  // ================= STATES =============================
  // ======================================================

  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("grading");

  const [config, setConfig] = useState(null);

  // ======================================================
  // ================= FETCH CONFIG =======================
  // ======================================================

  const fetchConfig = async () => {

    try {

      setLoading(true);

      const response = await axios.get(
        "http://127.0.0.1:5000/api/academic/config"
      );

      setConfig(response.data);

    } catch (error) {

      console.log("Academic Config Error:", error);

      if (error.request) {

        alert("Backend Server Not Running");

      } else {

        alert("Failed To Load Academic Configuration");

      }

    } finally {

      setLoading(false);

    }
  };

  // ======================================================
  // ================= USE EFFECT =========================
  // ======================================================

  useEffect(() => {

    fetchConfig();

  }, []);

  // ======================================================
  // ================= LOADING ============================
  // ======================================================

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eef2f7]">

        <div className="text-center">

          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-5"></div>

          <h2 className="text-xl font-bold text-slate-700">
            Loading Academic Configuration...
          </h2>

        </div>

      </div>
    );
  }

  // ======================================================
  // ================= MAIN UI ============================
  // ======================================================

  return (
    <div className="min-h-screen bg-[#eef2f7] p-4 md:p-8">

      {/* ======================================================
          ================= HEADER =============================
      ====================================================== */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">

        <div>

          <h1 className="text-3xl md:text-5xl font-bold text-slate-900">
            Academic Configuration
          </h1>

          <p className="text-gray-500 mt-2 text-lg">
            Configure academic settings for your organization
          </p>

        </div>

        {/* REFRESH BUTTON */}

        <button
          onClick={fetchConfig}
          className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-100 px-6 py-3 rounded-2xl shadow-sm transition-all"
        >
          <RefreshCcw size={18} />
          Refresh
        </button>

      </div>

      {/* ======================================================
          ================= TABS ===============================
      ====================================================== */}

      <div className="flex flex-wrap gap-3 mb-8 border-b border-gray-200 pb-4">

        {/* TAB */}

        <button
          onClick={() => setActiveTab("year")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all ${
            activeTab === "year"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Calendar size={18} />
          Academic Year
        </button>

        {/* TAB */}

        <button
          onClick={() => setActiveTab("classes")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all ${
            activeTab === "classes"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          <BookOpen size={18} />
          Classes & Subjects
        </button>

        {/* TAB */}

        <button
          onClick={() => setActiveTab("holidays")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all ${
            activeTab === "holidays"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Gift size={18} />
          Holidays
        </button>

        {/* TAB */}

        <button
          onClick={() => setActiveTab("exams")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all ${
            activeTab === "exams"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          <FileText size={18} />
          Exam Patterns
        </button>

        {/* TAB */}

        <button
          onClick={() => setActiveTab("grading")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all ${
            activeTab === "grading"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Award size={18} />
          Grading System
        </button>

        {/* TAB */}

        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl transition-all ${
            activeTab === "rules"
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          <Shield size={18} />
          Rules
        </button>

      </div>

      {/* ======================================================
          ================= GRADING SECTION ===================
      ====================================================== */}

      {activeTab === "grading" && (

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">

          {/* TOP */}

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">

            <div className="flex items-center gap-3">

              <Award className="text-indigo-600" />

              <h2 className="text-3xl font-bold text-slate-900">
                Grading System
              </h2>

            </div>

            {/* EDIT BUTTON */}

            <button
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl transition-all"
            >
              <Edit size={18} />
              Edit Grading System
            </button>

          </div>

          {/* INFO */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">

            {/* GRADING TYPE */}

            <div className="bg-gray-50 rounded-2xl p-5">

              <p className="text-gray-500 mb-2">
                Grading Type
              </p>

              <h3 className="text-3xl font-bold text-slate-800">
                {config?.gradingType}
              </h3>

            </div>

            {/* PASSING MARKS */}

            <div className="bg-gray-50 rounded-2xl p-5">

              <p className="text-gray-500 mb-2">
                Passing Marks
              </p>

              <h3 className="text-3xl font-bold text-slate-800">
                {config?.passingMarks}%
              </h3>

            </div>

          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">

            <table className="w-full min-w-[700px]">

              <thead className="bg-gray-100">

                <tr>

                  <th className="text-left px-5 py-4">
                    Grade
                  </th>

                  <th className="text-left px-5 py-4">
                    Min %
                  </th>

                  <th className="text-left px-5 py-4">
                    Max %
                  </th>

                  <th className="text-left px-5 py-4">
                    Grade Point
                  </th>

                  <th className="text-left px-5 py-4">
                    Remarks
                  </th>

                </tr>

              </thead>

              <tbody>

                {config?.gradeSlabs?.map((item, index) => (

                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-all"
                  >

                    <td className="px-5 py-4 font-semibold">
                      {item.grade}
                    </td>

                    <td className="px-5 py-4">
                      {item.min}
                    </td>

                    <td className="px-5 py-4">
                      {item.max}
                    </td>

                    <td className="px-5 py-4">
                      {item.point}
                    </td>

                    <td className="px-5 py-4">
                      {item.remarks}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      )}

    </div>
  );
};

export default AcademicConfiguration;