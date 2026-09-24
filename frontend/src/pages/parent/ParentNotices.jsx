import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  X,
  Download,
  BookmarkCheck,
  LoaderCircle,
} from "lucide-react";
import {
  fetchParentNotices,
  markParentNoticeAsRead,
} from "../../services/parentDashboardApi";

export default function ParentNotices() {
  const [notices, setNotices] = useState([]);
  const [selectedNoticeId, setSelectedNoticeId] = useState(null);
  const [noticeReadStatus, setNoticeReadStatus] = useState({});
  const [filterCategory, setFilterCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const noticesResponse = await fetchParentNotices();
        const noticeList = noticesResponse.data || [];
        const noticeStatus = {};
        noticeList.forEach((notice) => {
          noticeStatus[notice.id] = Boolean(notice.unread);
        });
        setNotices(noticeList);
        setNoticeReadStatus(noticeStatus);
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load notices"
        );
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const unreadCount = useMemo(
    () => notices.filter((notice) => noticeReadStatus[notice.id]).length,
    [noticeReadStatus, notices]
  );

  const filteredNotices = useMemo(() => {
    if (filterCategory === "All") return notices;
    return notices.filter((notice) => notice.category === filterCategory);
  }, [filterCategory, notices]);

  const availableCategories = [
    "All",
    "Academic",
    "Administrative",
    "Exam",
    "Holiday",
    "General",
    "Urgent",
  ];

  const selectedNotice = useMemo(
    () => notices.find((notice) => notice.id === selectedNoticeId),
    [notices, selectedNoticeId]
  );

  const getCategoryColor = (category) => {
    const colors = {
      Academic: { light: "bg-blue-50", text: "text-blue-700" },
      Exam: { light: "bg-purple-50", text: "text-purple-700" },
      Holiday: { light: "bg-green-50", text: "text-green-700" },
      Urgent: { light: "bg-rose-50", text: "text-rose-700" },
      General: { light: "bg-slate-100", text: "text-slate-700" },
      Sports: { light: "bg-orange-50", text: "text-orange-700" },
      Cultural: { light: "bg-purple-50", text: "text-purple-700" },
      Emergency: { light: "bg-red-50", text: "text-red-700" },
    };
    return colors[category] || colors.General;
  };

  const getCategoryBadge = (category) => {
    const badges = {
      Academic: "bg-blue-100 text-blue-800 border-blue-300",
      Exam: "bg-purple-100 text-purple-800 border-purple-300",
      Holiday: "bg-green-100 text-green-800 border-green-300",
      Urgent: "bg-rose-100 text-rose-800 border-rose-300",
      General: "bg-slate-100 text-slate-800 border-slate-300",
      Sports: "bg-orange-100 text-orange-800 border-orange-300",
      Cultural: "bg-purple-100 text-purple-800 border-purple-300",
      Emergency: "bg-red-100 text-red-800 border-red-300",
    };
    return badges[category] || badges.General;
  };

  const handleNoticeClick = async (noticeId) => {
    setSelectedNoticeId(noticeId);
    if (noticeReadStatus[noticeId]) {
      setNoticeReadStatus((prev) => ({ ...prev, [noticeId]: false }));
      try {
        await markParentNoticeAsRead(noticeId);
      } catch {
        // UI remains updated even if the read-tracking call fails.
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <LoaderCircle className="w-8 h-8 animate-spin text-[#223F74]" />
        <span className="ml-3 font-semibold text-slate-500">
          Loading notices...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-rose-500 font-bold bg-rose-50 rounded-[2rem] m-6">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#223F74] p-2.5 rounded-2xl">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">School Notices</h2>
            <p className="text-slate-400 text-sm">Stay updated with school announcements</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <div className="bg-[#F59B87] text-white px-4 py-2 rounded-full text-xs font-black">
            {unreadCount} Unread
          </div>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 flex-wrap">
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${
              filterCategory === cat
                ? "bg-[#223F74] text-white border-[#223F74]"
                : "bg-white border-[#E7E2DB] text-slate-500 hover:border-[#223F74] hover:text-[#223F74]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notices List */}
      <div className="space-y-3">
        {filteredNotices.length === 0 ? (
          <div className="rounded-[2rem] border border-[#E7E2DB] bg-white p-8 text-slate-400 text-sm text-center">
            No notices available.
          </div>
        ) : (
          filteredNotices.map((notice) => (
            <div
              key={notice.id}
              onClick={() => handleNoticeClick(notice.id)}
              className="rounded-[2rem] border border-[#E7E2DB] bg-white p-5 hover:shadow-md transition-all cursor-pointer flex gap-4"
            >
              <div className="relative flex-shrink-0">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getCategoryColor(notice.category).light}`}
                >
                  <BookmarkCheck
                    className={`w-6 h-6 ${getCategoryColor(notice.category).text}`}
                  />
                </div>
                {noticeReadStatus[notice.id] && (
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#F59B87] rounded-full border-2 border-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${getCategoryBadge(notice.category)}`}
                  >
                    {notice.category}
                  </span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    {noticeReadStatus[notice.id] ? "● Unread" : "Read"}
                  </span>
                </div>
                <h3 className="font-black text-slate-800 text-sm mb-1 truncate">
                  {notice.title}
                </h3>
                <p className="text-slate-400 text-xs line-clamp-2 mb-2">
                  {notice.content?.substring(0, 120) || ""}
                  {notice.content?.length > 120 ? "..." : ""}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>📅 {notice.date}</span>
                  <div className="flex items-center gap-2">
                    {notice.attachment && <span>📎</span>}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Notice Detail Modal */}
      {selectedNotice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#223F74] rounded-t-[2rem] flex items-center justify-between p-5">
              <span
                className={`text-[10px] font-black px-3 py-1 rounded-full border ${
                  getCategoryBadge(selectedNotice.category)
                } bg-white/10 !text-white !border-white/20`}
              >
                {selectedNotice.category}
              </span>
              <button
                onClick={() => setSelectedNoticeId(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-all text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <h2 className="text-xl font-black text-slate-800 mb-2">
                {selectedNotice.title}
              </h2>
              <p className="text-slate-400 text-sm mb-5">
                Published on {selectedNotice.date}
              </p>

              <div className="bg-[#F8EEE9] rounded-2xl p-5 mb-5 border border-[#E7E2DB]">
                <p className="text-slate-700 leading-relaxed text-sm">
                  {selectedNotice.content}
                </p>
              </div>

              {selectedNotice.attachment && (
                <button className="bg-[#223F74] text-white px-5 py-3 rounded-2xl text-sm font-bold inline-flex items-center gap-2 hover:bg-[#1a3360] transition-all">
                  <Download className="w-4 h-4" />
                  Download {selectedNotice.attachmentName || "attachment"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
