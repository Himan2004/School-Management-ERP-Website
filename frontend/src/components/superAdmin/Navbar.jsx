import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Menu } from "lucide-react";
import { selectSuperAdmin } from "../../features/auth/superAuthSlice";
import { useSelector } from "react-redux";
import ZebraBadge from "./BranchCreationId";
import { useNavigate } from "react-router-dom";
import NotificationBell from "../NotificationBell";
import UserAvatar from "../shared/UserAvatar";

// Static routing data (Replace this with your API data later if needed)
const SEARCH_DATA = [
  { label: "Dashboard", path: "/superadmin/dashboard" },
  { label: "All Schools", path: "/superadmin/all-school" },
  { label: "School Requests", path: "/superadmin/school-requests" },
  { label: "Exam Structure", path: "/superadmin/exam/structure" },
  { label: "Exam Schedule", path: "/superadmin/exam/schedule" },
  { label: "Exam Config", path: "/superadmin/exam/config" },
  { label: "Finance", path: "/superadmin/finance" },
  { label: "Manage Subscriptions", path: "/superadmin/subscriptions" },
  { label: "Staff Management", path: "/superadmin/staff" },
  { label: "HRM", path: "/superadmin/hrm" },
  { label: "Analytics", path: "/superadmin/analytics" },
  { label: "Reports", path: "/superadmin/reports" },
  { label: "Communication", path: "/superadmin/communication" },
];

function getStoredProfile() {
  try {
    const storedKeys = [
      { key: "user", storage: sessionStorage },
      { key: "admin", storage: sessionStorage },
      { key: "superAdmin", storage: sessionStorage },
    ];
    for (const { key, storage } of storedKeys) {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

function getProfileDisplayName(profile) {
  if (!profile) return "";
  return (
    profile.fullName ||
    profile.name ||
    profile.firstName ||
    profile.email ||
    "Profile"
  );
}

function getProfileAvatar(profile) {
  if (!profile) return null;
  return (
    profile.avatarUrl ||
    profile.photo ||
    profile.profilePic ||
    profile.picture ||
    null
  );
}

const Navbar = ({ userName = "Super Admin", onMenuClick }) => {
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchRef = useRef(null);
  const navigate = useNavigate();
  const authUser = useSelector(selectSuperAdmin);
  const branchCreationId = authUser?.organization?.branchCreationId;

  const storedProfile = useMemo(() => getStoredProfile(), []);
  const displayName = getProfileDisplayName(storedProfile) || userName;
  const avatarUrl = getProfileAvatar(storedProfile);

  // Handle Search Filtering
  useEffect(() => {
    if (searchValue.trim() === "") {
      setSearchResults([]);
      setSelectedIndex(-1);
      return;
    }

    const filtered = SEARCH_DATA.filter((item) =>
      item.label.toLowerCase().includes(searchValue.toLowerCase()),
    );

    setSearchResults(filtered);
    setSelectedIndex(-1); // Reset keyboard selection when results change
  }, [searchValue]);

  // Handle Click Outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Keyboard Navigation
  const handleKeyDown = (e) => {
    if (!isSearchFocused || searchValue.trim() === "") return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        handleSelect(searchResults[selectedIndex].path);
      } else if (searchResults.length > 0) {
        // Fallback: If they hit enter without arrow keys, select the first result
        handleSelect(searchResults[0].path);
      }
    } else if (e.key === "Escape") {
      setIsSearchFocused(false);
      setSearchValue("");
    }
  };

  const handleSelect = (path) => {
    navigate(path);
    setSearchValue("");
    setSearchResults([]);
    setIsSearchFocused(false);
  };

  return (
    <nav
      className="h-16 w-full bg-transparent flex items-center justify-between px-4 md:px-8 font-sans"
    >
      <div className="flex items-center gap-4 flex-1">
        {/* MOBILE MENU BUTTON */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* SEARCH BAR */}
        <div
          ref={searchRef}
          className="hidden md:block flex-1 max-w-md transition-all duration-300 relative"
        >
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center z-10 pointer-events-none">
              <Search
                size={18}
                className={`transition-colors ${isSearchFocused ? "text-blue-500" : "text-slate-400"}`}
              />
            </div>

            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleKeyDown}
              placeholder="Search everything..."
              className="w-full bg-slate-100/50 border-none rounded-2xl pl-12 pr-4 py-2.5 text-sm font-medium outline-none ring-2 ring-transparent focus:ring-blue-100 focus:bg-white transition-all shadow-inner font-sans"
            />

            {/* Search Results Dropdown */}
            {isSearchFocused && searchValue.trim() !== "" && (
              <div className="absolute left-0 right-0 top-12 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden py-2">
                {searchResults.length > 0 ? (
                  searchResults.map((item, index) => (
                    <div
                      key={item.path}
                      onClick={() => handleSelect(item.path)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`px-4 py-3 cursor-pointer text-sm font-medium transition-colors flex items-center gap-3
                        ${selectedIndex === index ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"}
                      `}
                    >
                      <Search
                        size={14}
                        className={
                          selectedIndex === index
                            ? "text-blue-500"
                            : "text-slate-400"
                        }
                      />
                      {item.label}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500 font-medium text-center">
                    No results found for "{searchValue}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-3">
        {/* Badge */}
        <div className="hidden sm:block mr-2">
          <ZebraBadge value={branchCreationId} />
        </div>

        <NotificationBell userRole="SUPER_ADMIN" />

        <button
          type="button"
          onClick={() => navigate("/superadmin/profile")}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-1.5 py-1.5 shadow-sm shadow-slate-200/40 transition duration-200 hover:border-slate-300 hover:bg-slate-50"
          aria-label="Go to Profile"
        >
          <UserAvatar
            name={displayName || "Super Admin"}
            src={avatarUrl}
            size={32}
            className="shrink-0"
          />
          <span className="hidden text-sm pr-1.5 font-medium text-slate-700 sm:block">
            Super Admin
          </span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
