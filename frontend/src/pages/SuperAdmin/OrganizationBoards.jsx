import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  MapPin,
  Eye,
  Power,
  X,
  Building2,
  Check,
  GraduationCap,
  ChevronDown,
  MoreVertical,
  TrendingUp,
  Users,
  AlertCircle,
  Trash2,
  Edit2,
  Share2,
  Archive,
  Download,
} from "lucide-react";

const OrganizationBoards = () => {
  // 1. Initial State
  const [branches, setBranches] = useState([
    {
      id: "BRN-7227",
      name: "SVIS",
      location: "Mumbai, Maharashtra",
      board: "State Board",
      status: "Inactive",
      students: 450,
      growth: "+12%",
      principal: "Himanshu Patil",
      email: "svis@edu.in",
    },
    {
      id: "BRN-8451",
      name: "Central Modern",
      location: "Patna, Bihar",
      board: "CBSE",
      status: "Approved",
      students: 280,
      growth: "+5%",
      principal: "Swarup Das",
      email: "central@edu.in",
    },
  ]);

  // 2. Control States
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [viewBranch, setViewBranch] = useState(null);
  const [search, setSearch] = useState("");
  const [activeMenu, setActiveMenu] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    board: "Default",
  });
  const menuRef = useRef(null);

  const boardOptions = [
    "Default",
    "CBSE",
    "ICSE",
    "Bihar Board (BSEB)",
    "UP Board",
    "Maharashtra State Board",
    "IB",
    "IGCSE",
  ];

  // 3. Click outside to close dropdown menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setActiveMenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Core Handlers ---

  // ✅ UPDATED EXPORT HANDLER: Converts data to CSV format for Excel
  const handleExport = () => {
    if (branches.length === 0) return alert("No data to export");

    // 1. Define CSV Headers
    const headers = [
      "Branch ID",
      "School Name",
      "Location",
      "Board",
      "Status",
      "Total Students",
      "Growth",
      "Principal",
      "Email",
    ];

    // 2. Map branch data to match headers safely (wrapping strings in quotes handles commas in locations)
    const csvRows = branches.map((b) => {
      return [
        `"${b.id}"`,
        `"${b.name}"`,
        `"${b.location}"`,
        `"${b.board}"`,
        `"${b.status}"`,
        b.students,
        `"${b.growth}"`,
        `"${b.principal || "N/A"}"`,
        `"${b.email || "N/A"}"`,
      ].join(",");
    });

    // 3. Combine headers and rows
    const csvContent = [headers.join(","), ...csvRows].join("\n");

    // 4. Create Blob and trigger browser download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Dynamic filename with today's date
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `Organization_Branches_${dateStr}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOnboardSubmit = (e) => {
    e.preventDefault();
    const newBranch = {
      ...formData,
      id: `BRN-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "Approved",
      students: 0,
      growth: "+0%",
      principal: "Not Assigned",
      email: "pending@setup.com",
    };
    setBranches([newBranch, ...branches]);
    setIsOnboardModalOpen(false); // Close Modal
    setFormData({ name: "", location: "", board: "Default" });
  };

  const toggleStatus = (id) => {
    setBranches((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, status: b.status === "Approved" ? "Inactive" : "Approved" }
          : b,
      ),
    );
  };

  const filteredBranches = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.location.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-4 md:p-8 bg-[#f8faff] min-h-screen font-sans">
      {/* Header */}
      <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-[11px] font-bold text-blue-600 tracking-[0.2em] uppercase flex items-center gap-3">
            <span className="h-[2px] w-5 bg-blue-600"></span> Admin Intelligence
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mt-2 tracking-tight">
            Board <span className="text-blue-600">Management</span>
          </h2>
        </div>

        <button
          onClick={() => setIsOnboardModalOpen(true)}
          className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Onboard New
        </button>
      </div>

      {/* Search & Export Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-10">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 w-5 h-5 transition-colors" />
          <input
            type="text"
            placeholder="Search school name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl shadow-sm border border-transparent focus:border-blue-200 outline-none focus:ring-4 focus:ring-blue-50 transition-all text-sm font-semibold"
          />
        </div>
        <button
          onClick={handleExport}
          className="px-6 py-4 bg-white border border-gray-100 rounded-2xl text-slate-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 shadow-sm active:scale-95 transition-all"
        >
          <Download size={18} className="text-blue-600" /> Export CSV
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredBranches.map((branch) => (
          <div
            key={branch.id}
            className="group bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 relative"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-slate-900 rounded-[22px] flex items-center justify-center text-white font-bold text-2xl shadow-xl">
                  {branch.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-800 truncate">
                      {branch.name}
                    </h3>
                    <span className="text-[10px] font-bold text-green-500 flex items-center shrink-0">
                      <TrendingUp size={12} /> {branch.growth}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-bold mt-1 truncate">
                    <MapPin size={12} className="inline mr-1 text-blue-500" />
                    {branch.location}
                  </p>
                </div>
              </div>

              <div className="relative">
                <button
                  onClick={() =>
                    setActiveMenu(activeMenu === branch.id ? null : branch.id)
                  }
                  className="p-2 text-gray-400 hover:text-slate-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <MoreVertical size={20} />
                </button>
                {activeMenu === branch.id && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 mt-3 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[50] py-2"
                  >
                    <button className="w-full px-4 py-2 text-left text-sm font-bold text-slate-600 hover:bg-blue-50 flex items-center gap-3">
                      <Edit2 size={16} /> Edit
                    </button>
                    <button
                      onClick={() => {
                        setBranches(branches.filter((b) => b.id !== branch.id));
                        setActiveMenu(null);
                      }}
                      className="w-full px-4 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50/70 p-5 rounded-3xl border border-gray-50 text-center">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Capacity
                </p>
                <p className="text-xl font-black text-slate-700 flex justify-center items-center gap-2">
                  <Users size={18} className="text-blue-500" />{" "}
                  {branch.students}
                </p>
              </div>
              <div className="bg-gray-50/70 p-5 rounded-3xl border border-gray-50 text-center">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                  Affiliation
                </p>
                <p className="text-sm font-black text-slate-700 mt-1 truncate uppercase">
                  {branch.board}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
              <span
                className={`text-[10px] font-black px-4 py-2 rounded-xl border ${branch.status === "Approved" ? "bg-green-50 text-green-600 border-green-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}
              >
                {branch.status.toUpperCase()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleStatus(branch.id)}
                  className={`p-3.5 rounded-2xl transition-all ${branch.status === "Approved" ? "bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"}`}
                >
                  <Power size={20} />
                </button>
                <button
                  onClick={() => setViewBranch(branch)}
                  className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
                >
                  <Eye size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL FOR ADDING NEW BRANCH --- */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[45px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl text-white">
                  <Building2 size={22} />
                </div>
                <h3 className="text-2xl font-black text-slate-800">
                  New Branch Details
                </h3>
              </div>
              <button
                onClick={() => setIsOnboardModalOpen(false)}
                className="p-2 bg-gray-100 rounded-full hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="p-10 space-y-6">
              <div className="space-y-4">
                <input
                  required
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100"
                  placeholder="School Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
                <input
                  required
                  className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100"
                  placeholder="Location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
                <div className="relative">
                  <select
                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none appearance-none"
                    value={formData.board}
                    onChange={(e) =>
                      setFormData({ ...formData, board: e.target.value })
                    }
                  >
                    {boardOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-3xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white rounded-3xl font-black shadow-xl hover:bg-blue-700 transition-all"
                >
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SIDE PANEL FOR VIEW DETAILS --- */}
      {viewBranch && (
        <div className="fixed inset-0 z-[2000] flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setViewBranch(null)}
          />
          <div className="bg-white w-full max-w-md h-full shadow-2xl relative p-10 overflow-y-auto">
            <button
              onClick={() => setViewBranch(null)}
              className="absolute top-8 right-8 p-3 bg-gray-50 hover:bg-red-50 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <div className="mt-12">
              <div className="w-24 h-24 bg-blue-600 rounded-[32px] flex items-center justify-center text-white text-4xl font-black mb-8 shadow-2xl">
                {viewBranch.name[0]}
              </div>
              <h2 className="text-4xl font-black text-slate-800 mb-2">
                {viewBranch.name}
              </h2>
              <p className="text-blue-600 font-bold mb-10">{viewBranch.id}</p>

              <div className="space-y-4">
                <div className="p-5 bg-gray-50 rounded-3xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase">
                    Location
                  </p>
                  <p className="font-bold">{viewBranch.location}</p>
                </div>
                <div className="p-5 bg-gray-50 rounded-3xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase">
                    Board
                  </p>
                  <p className="font-bold">{viewBranch.board}</p>
                </div>
              </div>
              <button
                onClick={() => setViewBranch(null)}
                className="mt-10 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationBoards;
