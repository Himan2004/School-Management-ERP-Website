import React, { useEffect, useMemo, useState } from "react";
import {
    Eye,
    Calendar,
    Filter,
    ArrowUpDown,
    Search,
    CheckCircle,
    XCircle,
    MoreVertical,
    ChevronLeft,
    CalendarPlus,
    Inbox
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsDarkMode } from "../../../features/theme/themeSlice.js";
import { fetchStaffLeaves, updateStaffLeaveStatus } from "../../../services/leaveApi";
import toast from "react-hot-toast";

const Leaves = () => {
    const [leaves, setLeaves] = useState([]);
    const [search, setSearch] = useState("");
    const [entries, setEntries] = useState(10);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [sortAsc, setSortAsc] = useState(true);
    const [sortDateDesc, setSortDateDesc] = useState(true);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [reasonModal, setReasonModal] = useState(null);
    const [reasonText, setReasonText] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [updating, setUpdating] = useState(false);
    const navigate = useNavigate();
    const darkMode = useSelector(selectIsDarkMode);

    // Load leaves from API
    const loadLeaves = async () => {
        try {
            setLoading(true);
            setError(false);
            const response = await fetchStaffLeaves({ limit: 100 });
            if (response.success) {
                // Transform staff leave data to match UI expectations
                const transformedLeaves = (response.data || []).map(leave => ({
                    _id: leave._id,
                    submittedBy: leave.staffId?.name || 'Unknown',
                    leaveType: leave.leaveType || 'Leave',
                    role: leave.staffId?.role || 'Staff',
                    leaveDate: `${new Date(leave.fromDate).toLocaleDateString()} - ${new Date(leave.toDate).toLocaleDateString()}`,
                    days: leave.numberOfDays || 1,
                    appliedOn: new Date(leave.createdAt).toLocaleDateString(),
                    authority: leave.approvedBy?.name || 'Pending',
                    status: leave.status.charAt(0).toUpperCase() + leave.status.slice(1),
                    reason: leave.rejectionReason || '',
                    ...leave // Include original data
                }));
                setLeaves(transformedLeaves.reverse());
            }
        } catch (error) {
            console.error('Failed to load leaves:', error);
            setError(true);
            toast.error('Failed to load leave requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLeaves();
    }, []);

    // 🔍 Search
    const filteredLeaves = useMemo(() => {
        return leaves
            .filter((leave) =>
                Object.values(leave)
                    .join(" ")
                    .toLowerCase()
                    .includes(search.toLowerCase())
            )
            .slice(0, entries);
    }, [leaves, search, entries]);

    // 🔤 Sort A-Z
    const handleSort = () => {
        const sorted = [...leaves].sort((a, b) =>
            sortAsc
                ? a.submittedBy.localeCompare(b.submittedBy)
                : b.submittedBy.localeCompare(a.submittedBy)
        );
        setLeaves(sorted);
        setSortAsc(!sortAsc);
    };

    // 📅 Date Sort
    const parseAppliedDate = (dateStr) => {
        const [day, month, year] = dateStr.split(" ");
        return new Date(`${day} ${month} ${year}`);
    };
    const handleDateSort = () => {
        const sorted = [...leaves].sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(a.appliedOn);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(b.appliedOn);
            return sortDateDesc ? dateB - dateA : dateA - dateB;
        });

        setLeaves(sorted);
        setSortDateDesc(!sortDateDesc);
    };

    // ✅ Update Status
    const updateStatus = async (id, newStatus) => {
        try {
            setUpdating(true);
            const response = await updateStaffLeaveStatus(id, { 
                status: newStatus.toLowerCase(),
                rejectionReason: newStatus === 'Disapproved' ? reasonText : undefined
            });
            
            if (response.success) {
                const updated = leaves.map((leave) =>
                    leave._id === id ? { ...leave, status: newStatus } : leave
                );
                setLeaves(updated);
                toast.success(`Leave ${newStatus.toLowerCase()} successfully`);
                
                if (newStatus === 'Disapproved') {
                    setReasonModal(null);
                    setReasonText("");
                }
            }
        } catch (error) {
            console.error('Failed to update leave status:', error);
            toast.error(error.response?.data?.message || 'Failed to update leave status');
        } finally {
            setUpdating(false);
        }
    };

    // 🎨 Status Style
    const getStatusStyle = (status) => {
        switch (status) {
            case "Approved":
                return darkMode ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-600";
            case "Pending":
                return darkMode ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-600";
            case "Disapproved":
                return darkMode ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600";
            default:
                return darkMode ? "bg-slate-700/50 text-slate-300" : "bg-gray-100 text-gray-600";
        }
    };

    // ❌ Open Disapprove Modal
    const openDisapproveModal = (leave) => {
        setReasonModal(leave);
        setReasonText("");
        setOpenMenuId(null);
    };

    // ❌ Submit Disapprove Reason
    const submitReason = async () => {
        if (!reasonText.trim()) {
            toast.error("Please provide a reason for disapproval");
            return;
        }
        await updateStatus(reasonModal._id, "Disapproved");
    };

    return (
        <div className={`p-4 sm:p-6 transition-colors duration-200 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {/* HEADER */}
            <div className={`flex flex-col lg:flex-row lg:justify-between lg:items-center mb-5 gap-4 p-5 backdrop-blur-md border shadow-lg rounded-xl transition-colors duration-200
                ${darkMode ? 'bg-[#1e293b]/70 border-[#334155]' : 'bg-white/70 border-white/40'}`}
            >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm">
                    {/* 🔙 Back Button */}
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className={`flex items-center gap-1 font-medium transition duration-200 ${darkMode ? 'text-slate-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'}`}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>

                    {/* Divider */}
                    <span className={`hidden sm:inline ${darkMode ? 'text-[#334155]' : 'text-gray-400'}`}>|</span>

                    {/* Current Page */}
                    <div className="flex items-center gap-2 text-blue-500 font-semibold text-base">
                        <span className="text-lg"> <CalendarPlus className="w-5 h-5" /></span>
                        Approved Leave Request List
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    <div className={`flex items-center justify-center gap-2 border px-3 py-1.5 rounded-md text-sm transition-colors duration-200 w-full sm:w-auto
                        ${darkMode ? 'bg-[#1e293b] border-[#334155] text-slate-300' : 'bg-white border-gray-200 text-gray-700'}`}
                    >
                        <Calendar size={16} />
                        03/11/2026 - 03/17/2026
                    </div>

                    <button
                        onClick={handleSort}
                        className={`flex items-center justify-center gap-2 border px-3 py-1.5 rounded-md text-sm transition-colors duration-200 w-full sm:w-auto
                            ${darkMode ? 'bg-[#1e293b] border-[#334155] text-slate-300 hover:bg-slate-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                        <ArrowUpDown size={16} />
                        Sort A-Z
                    </button>

                    <button
                        onClick={handleDateSort}
                        className={`flex items-center justify-center gap-2 border px-3 py-1.5 rounded-md text-sm transition-colors duration-200 w-full sm:w-auto
                            ${darkMode ? 'bg-[#1e293b] border-[#334155] text-slate-300 hover:bg-slate-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Calendar size={16} />
                        Sort by Date
                    </button>
                </div>
            </div>

            {/* CONTROLS */}
            <div className={`flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-3 gap-3 backdrop-blur-md p-3 rounded-xl shadow border transition-colors duration-200
                ${darkMode ? 'bg-[#1e293b]/70 border-[#334155]' : 'bg-white/70 border-gray-100'}`}
            >
                <div className="flex items-center gap-2 text-sm">
                    <span>Row Per Page</span>
                    <select
                        value={entries}
                        onChange={(e) => setEntries(Number(e.target.value))}
                        className={`border rounded-md px-2 py-1 transition-colors duration-200
                            ${darkMode ? 'bg-slate-800 border-[#334155] text-white' : 'bg-white border-gray-200 text-slate-700'}`}
                    >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={`w-full pl-8 pr-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200
                            ${darkMode ? 'bg-slate-800 border-[#334155] text-white placeholder-slate-400' : 'bg-white border-gray-200 text-slate-700'}`}
                    />
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            {loading ? (
                <div className="space-y-4">
                    {/* Desktop Table Skeleton */}
                    <div className={`hidden md:block backdrop-blur-md rounded-xl shadow border transition-colors duration-200 overflow-hidden
                        ${darkMode ? 'bg-[#1e293b]/80 border-[#334155]' : 'bg-white/80 border-gray-100'}`}
                    >
                        <div className={`h-10 transition-colors duration-200 ${darkMode ? 'bg-slate-800' : 'bg-gray-100'}`} />
                        <div className="divide-y divide-gray-100 dark:divide-slate-700">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="px-4 py-4 animate-pulse flex justify-between gap-4">
                                    <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-1/4"></div>
                                    <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-1/6"></div>
                                    <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-12"></div>
                                    <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-1/4"></div>
                                    <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-16"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Mobile Cards Skeleton */}
                    <div className="block md:hidden space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={`p-4 rounded-xl border shadow animate-pulse space-y-3
                                ${darkMode ? 'bg-[#1e293b]/80 border-[#334155]' : 'bg-white border-gray-100'}`}
                            >
                                <div className="flex justify-between">
                                    <div className="space-y-2 w-1/2">
                                        <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-3/4"></div>
                                        <div className="h-3 bg-gray-300 dark:bg-slate-700 rounded w-1/2"></div>
                                    </div>
                                    <div className="h-6 bg-gray-300 dark:bg-slate-700 rounded-full w-16"></div>
                                </div>
                                <div className="border-t border-dashed border-gray-200 dark:border-slate-700 pt-3 grid grid-cols-2 gap-2">
                                    <div className="h-3 bg-gray-300 dark:bg-slate-700 rounded w-2/3"></div>
                                    <div className="h-3 bg-gray-300 dark:bg-slate-700 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : error ? (
                <div className={`flex flex-col items-center justify-center p-10 text-center rounded-xl border shadow transition-colors duration-200
                    ${darkMode ? 'bg-[#1e293b]/70 border-[#334155] text-slate-300' : 'bg-white/70 border-gray-100 text-gray-600'}`}
                >
                    <XCircle className="w-16 h-16 text-red-500 mb-4" />
                    <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>Unable to load leave requests.</h3>
                    <p className={`text-sm mb-4 max-w-md ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        Please try again later.
                    </p>
                    <button
                        onClick={loadLeaves}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow active:scale-95 transition-all duration-200"
                    >
                        Retry
                    </button>
                </div>
            ) : filteredLeaves.length === 0 ? (
                <div className={`flex flex-col items-center justify-center p-10 text-center rounded-xl border shadow transition-colors duration-200
                    ${darkMode ? 'bg-[#1e293b]/70 border-[#334155] text-slate-300' : 'bg-white/70 border-gray-100 text-gray-600'}`}
                >
                    <Inbox className={`w-16 h-16 mb-4 ${darkMode ? 'text-slate-500' : 'text-slate-350'}`} />
                    <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-800'}`}>No Leave Requests Found</h3>
                    <p className={`text-sm mb-4 max-w-md ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        There are currently no leave requests available for the selected filters.
                    </p>
                    <button
                        onClick={() => {
                            setSearch("");
                            setEntries(10);
                        }}
                        className="text-sm font-semibold text-blue-500 hover:text-blue-600 focus:outline-none transition-colors"
                    >
                        Try changing filters or date range.
                    </button>
                </div>
            ) : (
                <>
                    {/* DESKTOP TABLE */}
                    <div className={`hidden md:block backdrop-blur-md rounded-xl shadow overflow-x-auto border transition-colors duration-200
                        ${darkMode ? 'bg-[#1e293b]/80 border-[#334155]' : 'bg-white/80 border-gray-100'}`}
                    >
                        <table className="min-w-full text-sm">
                            <thead className={`text-xs uppercase transition-colors duration-200
                                ${darkMode ? 'bg-slate-800 text-slate-300 border-b border-[#334155]' : 'bg-gray-100 text-gray-600'}`}
                            >
                                <tr>
                                    <th className="px-4 py-3 text-left">Submitted By</th>
                                    <th className="px-4 py-3 text-left">Leave Type</th>
                                    <th className="px-4 py-3 text-left">Role</th>
                                    <th className="px-4 py-3 text-left">Leave Date</th>
                                    <th className="px-4 py-3 text-left">Days</th>
                                    <th className="px-4 py-3 text-left">Applied On</th>
                                    <th className="px-4 py-3 text-left">Authority</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-center">Action</th>
                                </tr>
                            </thead>

                            <tbody className={`divide-y transition-colors duration-200 ${darkMode ? 'divide-[#334155]' : 'divide-gray-100'}`}>
                                {filteredLeaves.map((leave) => (
                                    <tr key={leave._id} className={`transition-colors duration-200 ${darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-gray-50'}`}>
                                        <td className="px-4 py-3 font-medium">{leave.submittedBy}</td>
                                        <td className={`px-4 py-3 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{leave.leaveType}</td>
                                        <td className={`px-4 py-3 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{leave.role}</td>
                                        <td className={`px-4 py-3 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{leave.leaveDate}</td>
                                        <td className={`px-4 py-3 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{leave.days}</td>
                                        <td className={`px-4 py-3 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{leave.appliedOn}</td>
                                        <td className={`px-4 py-3 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{leave.authority}</td>

                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(leave.status)}`}>
                                                {leave.status}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3 text-center relative">
                                            <button
                                                onClick={() =>
                                                    setOpenMenuId(openMenuId === leave._id ? null : leave._id)
                                                }
                                                className={`p-1 rounded transition-colors duration-200
                                                    ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-200 text-gray-600'}`}
                                            >
                                                <MoreVertical size={18} />
                                            </button>

                                            {openMenuId === leave._id && (
                                                <div className={`absolute right-4 mt-2 w-36 border rounded-md shadow-lg z-50 text-sm py-1 transition-all duration-200
                                                    ${darkMode ? 'bg-[#1e293b] border-[#334155] text-white shadow-slate-950/50' : 'bg-white border-gray-200 text-gray-700'}`}
                                                >
                                                    <button
                                                        onClick={() => {
                                                            setSelectedLeave(leave);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className={`flex items-center gap-2 px-3 py-2 w-full text-left transition-colors duration-200 ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}
                                                    >
                                                        <Eye size={16} /> View
                                                    </button>

                                                    {leave.status === "Pending" && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    updateStatus(leave._id, "Approved");
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className={`flex items-center gap-2 px-3 py-2 text-green-500 w-full text-left transition-colors duration-200 ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}
                                                            >
                                                                <CheckCircle size={16} /> Approve
                                                            </button>

                                                            <button
                                                                onClick={() => openDisapproveModal(leave)}
                                                                className={`flex items-center gap-2 px-3 py-2 text-red-500 w-full text-left transition-colors duration-200 ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}
                                                            >
                                                                <XCircle size={16} /> Disapprove
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE CARDS */}
                    <div className="block md:hidden space-y-4">
                        {filteredLeaves.map((leave) => (
                            <div
                                key={leave._id}
                                className={`p-4 rounded-xl border shadow transition-colors duration-200 relative
                                    ${darkMode ? 'bg-[#1e293b]/80 border-[#334155] text-white' : 'bg-white border-gray-100 text-slate-800'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-base">{leave.submittedBy}</h4>
                                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{leave.role}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(leave.status)}`}>
                                            {leave.status}
                                        </span>
                                        <button
                                            onClick={() =>
                                                setOpenMenuId(openMenuId === leave._id ? null : leave._id)
                                            }
                                            className={`p-1 rounded transition-colors duration-200
                                                ${darkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-200 text-gray-600'}`}
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                        {openMenuId === leave._id && (
                                            <div className={`absolute right-4 top-12 w-36 border rounded-md shadow-lg z-50 text-sm py-1 transition-all duration-200
                                                ${darkMode ? 'bg-[#1e293b] border-[#334155] text-white shadow-slate-950/50' : 'bg-white border-gray-200 text-gray-700'}`}
                                            >
                                                <button
                                                    onClick={() => {
                                                        setSelectedLeave(leave);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className={`flex items-center gap-2 px-3 py-2 w-full text-left transition-colors duration-200 ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}
                                                >
                                                    <Eye size={16} /> View
                                                </button>

                                                {leave.status === "Pending" && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                updateStatus(leave._id, "Approved");
                                                                setOpenMenuId(null);
                                                            }}
                                                            className={`flex items-center gap-2 px-3 py-2 text-green-500 w-full text-left transition-colors duration-200 ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}
                                                        >
                                                            <CheckCircle size={16} /> Approve
                                                        </button>

                                                        <button
                                                            onClick={() => openDisapproveModal(leave)}
                                                            className={`flex items-center gap-2 px-3 py-2 text-red-500 w-full text-left transition-colors duration-200 ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}
                                                        >
                                                            <XCircle size={16} /> Disapprove
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-gray-200 dark:border-slate-700 pt-3 mt-3 grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className={`text-xs block ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Leave Type</span>
                                        <span className="font-semibold">{leave.leaveType}</span>
                                    </div>
                                    <div>
                                        <span className={`text-xs block ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Duration</span>
                                        <span className="font-semibold">{leave.days} Day{leave.days > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="col-span-2 mt-1">
                                        <span className={`text-xs block ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Leave Date</span>
                                        <span className="font-semibold text-xs sm:text-sm">{leave.leaveDate}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* VIEW MODAL */}
            {selectedLeave && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className={`p-6 rounded-2xl w-full max-w-md shadow-2xl border transition-colors duration-200
                        ${darkMode ? 'bg-[#1e293b] border-[#334155] text-white shadow-slate-900/50' : 'bg-white border-gray-100 text-slate-800'}`}
                    >
                        <h3 className={`font-semibold text-lg mb-4 border-b pb-2 ${darkMode ? 'border-[#334155]' : 'border-gray-200'}`}>Leave Details</h3>

                        <div className="space-y-3">
                            <p className={`flex justify-between border-b border-dashed pb-1.5 transition-colors duration-200 ${darkMode ? 'border-[#334155]' : 'border-gray-100'}`}>
                                <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Submitted By:</span>
                                <span className="font-semibold">{selectedLeave.submittedBy}</span>
                            </p>
                            <p className={`flex justify-between border-b border-dashed pb-1.5 transition-colors duration-200 ${darkMode ? 'border-[#334155]' : 'border-gray-100'}`}>
                                <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Leave Type:</span>
                                <span className="font-semibold">{selectedLeave.leaveType}</span>
                            </p>
                            <p className={`flex justify-between border-b border-dashed pb-1.5 transition-colors duration-200 ${darkMode ? 'border-[#334155]' : 'border-gray-100'}`}>
                                <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Leave Date:</span>
                                <span className="font-semibold text-right">{selectedLeave.leaveDate}</span>
                            </p>
                            <p className={`flex justify-between border-b border-dashed pb-1.5 transition-colors duration-200 ${darkMode ? 'border-[#334155]' : 'border-gray-100'}`}>
                                <span className={darkMode ? 'text-slate-400' : 'text-gray-500'}>Status:</span>
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusStyle(selectedLeave.status)}`}>
                                    {selectedLeave.status}
                                </span>
                            </p>

                            {selectedLeave.status === "Disapproved" && (
                                <div className={`p-3 rounded-lg mt-3 ${darkMode ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-650'}`}>
                                    <p className="font-semibold text-sm mb-1">Reason for Disapproval:</p>
                                    <p className="text-sm">{selectedLeave.reason || "No reason provided"}</p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setSelectedLeave(null)}
                            className="mt-6 w-full bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all duration-200 text-sm font-medium"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* DISAPPROVE MODAL */}
            {reasonModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className={`p-6 rounded-2xl w-full max-w-md shadow-2xl border transition-colors duration-200
                        ${darkMode ? 'bg-[#1e293b] border-[#334155] text-white shadow-slate-900/50' : 'bg-white border-gray-100 text-slate-800'}`}
                    >
                        <h3 className="font-semibold text-lg mb-3 text-red-500">
                            Disapprove Reason
                        </h3>

                        <textarea
                            className={`w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200
                                ${darkMode ? 'bg-slate-800 border-[#334155] text-white placeholder-slate-400' : 'bg-white border-gray-200 text-slate-700'}`}
                            rows="4"
                            placeholder="Enter the reason why this leave is being disapproved..."
                            value={reasonText}
                            onChange={(e) => setReasonText(e.target.value)}
                        />

                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={submitReason}
                                disabled={!reasonText.trim()}
                                className="bg-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-red-700 active:scale-95 transition-all duration-200 disabled:opacity-50 flex-1"
                            >
                                Submit
                            </button>

                            <button
                                onClick={() => setReasonModal(null)}
                                className={`border px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 flex-1
                                    ${darkMode ? 'border-[#334155] text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaves;