import { useEffect, useMemo, useRef, useState } from "react";
import {
  Users,
  School,
  GraduationCap,
  BookOpen,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share2,
  SendHorizontal,
  User,
  Megaphone,
  FileText,
  Download,
  BarChart2,
  Trophy,
  CalendarRange,
  CalendarDays,
  MapPin,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  fetchParentCommunityFeed,
  fetchParentProfile,
  respondToParentCommunityEvent,
  submitParentCommunityComment,
  toggleParentCommunityLike,
  voteParentCommunityPoll,
} from "../../services/parentDashboardApi";

const FILTERS = [
  "all",
  "photos",
  "announcements",
  "polls",
  "events",
  "achievements",
];
const FALLBACK_IMAGE =
  "https://placehold.co/600x400/e2e8f0/94a3b8?text=Image+Unavailable";

const formatFilterLabel = (filter) => {
  if (filter === "all") return "All";
  if (filter === "photos") return "Photos";
  if (filter === "announcements") return "Announcements";
  if (filter === "polls") return "Polls";
  if (filter === "events") return "Events";
  return "Achievements";
};

function PhotoGrid({ count, images = [] }) {
  const photoCount = images.length || count;

  const renderImage = (image, fallbackAlt) => (
    <img
      src={image?.src || FALLBACK_IMAGE}
      alt={image?.alt || fallbackAlt}
      loading="lazy"
      className="w-full h-full object-cover"
      onError={(e) => {
        e.currentTarget.onerror = null;
        e.currentTarget.src = FALLBACK_IMAGE;
      }}
    />
  );

  if (photoCount <= 1) {
    return (
      <div className="bg-slate-100 h-64 rounded-2xl overflow-hidden">
        {renderImage(images[0], "Community post image")}
      </div>
    );
  }

  if (photoCount === 2) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((idx) => (
          <div
            key={idx}
            className="bg-slate-100 h-48 rounded-2xl overflow-hidden"
          >
            {renderImage(images[idx], `Community photo ${idx + 1}`)}
          </div>
        ))}
      </div>
    );
  }

  if (photoCount === 3) {
    return (
      <div className="space-y-3">
        <div className="bg-slate-100 h-52 rounded-2xl overflow-hidden">
          {renderImage(images[0], "Community featured photo")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((imgIdx, idx) => (
            <div
              key={idx}
              className="bg-slate-100 h-40 rounded-2xl overflow-hidden"
            >
              {renderImage(images[imgIdx], `Community photo ${imgIdx + 1}`)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {[0, 1, 2, 3].map((idx) => {
        const isLast = idx === 3 && photoCount > 4;
        return (
          <div
            key={idx}
            className="relative bg-slate-100 h-40 rounded-2xl overflow-hidden"
          >
            {renderImage(images[idx], `Community photo ${idx + 1}`)}
            {isLast && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white font-black text-2xl">
                  +{photoCount - 3}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SchoolAvatar({ schoolName }) {
  const initials = (schoolName || "School")
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return (
    <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0">
      {initials}
    </div>
  );
}

function PostHeader({ post }) {
  return (
    <div className="flex items-center gap-3 mb-4 min-w-0">
      <SchoolAvatar schoolName={post.schoolName} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <p className="font-black text-slate-800 truncate max-w-[120px] sm:max-w-none">
            {post.schoolName}
          </p>
          <span className="bg-blue-50 text-blue-600 text-[10px] font-black rounded-full px-2 py-0.5 whitespace-nowrap">
            {post.authorRole}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-400 ml-auto shrink-0">{post.timeAgo}</p>
    </div>
  );
}

export default function ParentCommunity() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");
  const [posts, setPosts] = useState([]);
  const [sidebar, setSidebar] = useState({
    activePolls: [],
    upcomingEvents: [],
    popularPosts: [],
  });
  const [profile, setProfile] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const pollRefs = useRef({});

  useEffect(() => {
    const loadFeed = async () => {
      setLoading(true);
      setError("");

      try {
        const [profileResponse, feedResponse] = await Promise.all([
          fetchParentProfile(),
          fetchParentCommunityFeed(),
        ]);
        const profileData = profileResponse.data || {};
        setProfile(profileData);

        const schoolId = profileData.school?._id || profileData.school;
        const studentId =
          profileData.students?.[0]?._id || localStorage.getItem("studentId");

        if (schoolId) localStorage.setItem("schoolId", schoolId);
        if (studentId) localStorage.setItem("studentId", studentId);

        setPosts(feedResponse.data?.feed || []);
        setSidebar(
          feedResponse.data?.sidebar || {
            activePolls: [],
            upcomingEvents: [],
            popularPosts: [],
          },
        );
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load community feed",
        );
      } finally {
        setLoading(false);
      }
    };

    loadFeed();
  }, []);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const postTypeFromFilter = {
    photos: "photo",
    announcements: "announcement",
    polls: "poll",
    events: "event",
    achievements: "achievement",
  };

  const filteredPosts = useMemo(() => {
    if (activeFilter === "all") return posts;
    return posts.filter(
      (post) => post.type === postTypeFromFilter[activeFilter],
    );
  }, [activeFilter, posts]);

  const activePollPosts = useMemo(
    () => sidebar.activePolls || [],
    [sidebar.activePolls],
  );
  const upcomingEvents = useMemo(
    () => sidebar.upcomingEvents || [],
    [sidebar.upcomingEvents],
  );
  const popularPosts = useMemo(
    () => sidebar.popularPosts || [],
    [sidebar.popularPosts],
  );

  const toggleLike = async (postId) => {
    try {
      const response = await toggleParentCommunityLike(postId);
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          const liked = Boolean(response?.liked ?? !post.liked);
          const likes = liked
            ? post.likes + (post.liked ? 0 : 1)
            : Math.max(0, post.likes - (post.liked ? 1 : 0));
          return { ...post, liked, likes };
        }),
      );
    } catch {
      showToast("Unable to update like right now");
    }
  };

  const toggleCommentSection = (postId) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const toggleCommentLike = (postId, commentId) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          comments: post.comments.map((comment) =>
            comment.id === commentId
              ? { ...comment, liked: !comment.liked }
              : comment,
          ),
        };
      }),
    );
  };

  const submitComment = async (postId) => {
    const text = (commentInputs[postId] || "").trim();
    if (!text) return;

    try {
      await submitParentCommunityComment(postId, text);
      const newComment = {
        id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: profile?.name || "You",
        text,
        timeAgo: "Just now",
        liked: false,
      };

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          return {
            ...post,
            comments: [newComment, ...post.comments],
            commentsCount: post.commentsCount + 1,
          };
        }),
      );
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch {
      showToast("Unable to add your comment right now");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard!");
    } catch {
      showToast("Link copied to clipboard!");
    }
  };

  const handlePollVote = async (postId, optionId) => {
    try {
      await voteParentCommunityPoll(postId, optionId);
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId || post.type !== "poll" || post.userVote)
            return post;
          return { ...post, userVote: optionId };
        }),
      );
    } catch {
      showToast("Unable to record poll vote right now");
    }
  };

  const handleRsvp = async (postId, value) => {
    try {
      await respondToParentCommunityEvent(postId, value);
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId || post.type !== "event") return post;
          if (post.userRsvp === value) return post;

          let rsvpYes = post.rsvpYes;
          let rsvpNo = post.rsvpNo;

          if (post.userRsvp === "yes") rsvpYes -= 1;
          if (post.userRsvp === "no") rsvpNo -= 1;

          if (value === "yes") rsvpYes += 1;
          if (value === "no") rsvpNo += 1;

          return { ...post, userRsvp: value, rsvpYes, rsvpNo };
        }),
      );
    } catch {
      showToast("Unable to record RSVP right now");
    }
  };

  const renderPostBody = (post) => {
    if (post.type === "photo") {
      return (
        <>
          <p className="text-slate-700 text-sm leading-relaxed mb-4 break-words">
            {post.caption}
          </p>
          <PhotoGrid count={post.photos} images={post.photoUrls} />
        </>
      );
    }

    if (post.type === "announcement") {
      return (
        <div className="border-l-4 border-blue-600 pl-4">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-5 h-5 text-blue-600" />
            <span className="bg-blue-50 text-blue-600 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              Announcement
            </span>
          </div>
          <h3 className="font-black text-slate-800 text-lg mb-2 break-words">
            {post.title}
          </h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-4 break-words">
            {post.content}
          </p>
          {post.attachment && (
            <div className="bg-blue-50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3 min-w-0 w-full">
                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                <span className="text-sm font-bold text-slate-700 truncate">
                  {post.attachment}
                </span>
              </div>
              <button className="text-xs font-bold text-blue-600 flex items-center gap-1 shrink-0 self-end sm:self-auto">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          )}
        </div>
      );
    }

    if (post.type === "poll") {
      const winnerVotes = Math.max(...post.options.map((opt) => opt.votes));

      return (
        <>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-5 h-5 text-purple-600" />
            <span className="bg-purple-50 text-purple-600 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              Poll
            </span>
          </div>

          <h3 className="font-black text-slate-800 text-lg mb-4 break-words">
            {post.question}
          </h3>

          <div className="space-y-3">
            {post.options.map((option) => {
              const percent =
                post.totalVotes > 0
                  ? Math.round((option.votes / post.totalVotes) * 100)
                  : 0;
              const selected = post.userVote === option.id;
              const voted = !!post.userVote;
              const winner = option.votes === winnerVotes;

              return (
                <button
                  key={option.id}
                  disabled={voted}
                  onClick={() => handlePollVote(post.id, option.id)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${
                    selected
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                  } ${voted ? "cursor-default" : "cursor-pointer"}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full border-2 ${selected ? "border-blue-600 bg-blue-600" : "border-slate-300"} flex items-center justify-center shrink-0`}
                    >
                      {selected && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <p className="font-bold text-slate-700 break-words flex-1 min-w-0">{option.text}</p>
                    {winner && voted && (
                      <Trophy className="w-4 h-4 text-amber-500 ml-auto shrink-0" />
                    )}
                  </div>

                  {voted && (
                    <div className="mt-3">
                      <div className="bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${selected ? "bg-blue-600" : "bg-slate-300"}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 font-bold text-right mt-1">
                        {option.votes} votes • {percent}%
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
            <span className="text-xs text-slate-400">
              {post.totalVotes} total votes
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-amber-600 font-bold">
                {post.endsIn}
              </span>
              {post.userVote && (
                <span className="text-xs text-emerald-600 font-bold">
                  You have voted
                </span>
              )}
            </div>
          </div>
        </>
      );
    }

    if (post.type === "event") {
      return (
        <>
          <div className="flex items-center gap-2 mb-3">
            <CalendarRange className="w-5 h-5 text-emerald-600" />
            <span className="bg-emerald-50 text-emerald-600 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
              Event
            </span>
          </div>

          <div className="bg-emerald-50 rounded-2xl p-4 sm:p-5 border border-emerald-100">
            <h3 className="font-black text-emerald-800 text-xl mb-3 break-words">
              {post.eventName}
            </h3>
            <p className="text-emerald-700 font-bold text-sm mb-2 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 shrink-0" /> <span className="break-words">{post.eventDate}</span>
            </p>
            <p className="text-emerald-600 text-sm mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4 shrink-0" /> <span className="break-words">{post.venue}</span>
            </p>
            <p className="text-emerald-600 text-sm break-words">Who: {post.who}</p>
          </div>

          <div className="mt-4">
            <p className="font-bold text-slate-700 text-sm mb-3">
              Will you attend?
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleRsvp(post.id, "yes")}
                className={`w-full sm:w-auto px-4 py-2 rounded-2xl border-2 font-bold text-sm transition-all text-center ${
                  post.userRsvp === "yes"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                }`}
              >
                Yes, I&apos;ll Attend
              </button>
              <button
                onClick={() => handleRsvp(post.id, "no")}
                className={`w-full sm:w-auto px-4 py-2 rounded-2xl border-2 font-bold text-sm transition-all text-center ${
                  post.userRsvp === "no"
                    ? "bg-rose-600 border-rose-600 text-white"
                    : "border-rose-600 text-rose-600 hover:bg-rose-50"
                }`}
              >
                Cannot Attend
              </button>
            </div>
            <p className="text-slate-400 text-xs mt-2 break-words">
              {post.rsvpYes} attending · {post.rsvpNo} not attending
            </p>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-amber-600" />
          <span className="bg-amber-50 text-amber-600 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            Achievement
          </span>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 sm:p-5 border border-amber-100 text-center">
          <p className="text-4xl mb-2">🏆</p>
          <p className="font-black text-slate-800 break-words">{post.studentName}</p>
          <p className="text-slate-600 text-sm mt-2 break-words">{post.achievement}</p>
          <p className="text-amber-600 font-bold text-sm mt-2 break-words">
            {post.competition}
          </p>
        </div>
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-blue-600">
        <LoaderCircle className="w-8 h-8 animate-spin" />
        <span className="ml-3 font-semibold text-slate-500">
          Loading community feed...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-rose-500 font-bold bg-rose-50 rounded-2xl m-8">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 font-sans">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="bg-blue-600 p-3 sm:p-4 rounded-2xl ring-4 ring-blue-100 shadow-lg shadow-blue-200 shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 truncate">
                School Community
              </h1>
              <p className="text-slate-400 mt-1 text-sm sm:text-base break-words">
                Stay connected with school updates, photos and polls
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-slate-200 shrink-0 self-start sm:self-auto">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
              Live Feed
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-col gap-6 w-full lg:w-64 xl:w-72 shrink-0">
          <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4 min-w-0">
              <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shrink-0">
                {(profile?.school?.schoolName || "School")
                  .split(" ")
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 3)
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-black text-slate-800 truncate">
                  {profile?.school?.schoolName || "School"}
                </p>
                <p className="text-slate-400 text-xs break-all">
                  {profile?.school?.officialEmail || "Connected school"}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between text-slate-700 min-w-0">
                <span className="flex items-center gap-2 min-w-0 truncate">
                  <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />{" "}
                  <span className="truncate">{profile?.students?.length || 0} Linked Child(ren)</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700 min-w-0">
                <span className="flex items-center gap-2 min-w-0 truncate">
                  <Users className="w-4 h-4 text-slate-400 shrink-0" /> <span className="truncate">{posts.length} Posts</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-700 min-w-0">
                <span className="flex items-center gap-2 min-w-0 truncate">
                  <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />{" "}
                  <span className="truncate">{sidebar.activePolls?.length || 0} Polls</span>
                </span>
              </div>
            </div>

            <div className="mt-4">
              <span className="inline-flex max-w-full text-center whitespace-normal rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700">
                You are following this school
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 sm:p-6">
            <h3 className="font-black text-slate-800 mb-4">Quick Links</h3>
            <div className="space-y-3 text-sm">
              <button
                onClick={() => navigate("/parent/notices")}
                className="block text-left w-full break-words text-blue-600 font-bold hover:underline"
              >
                Latest Notices
              </button>
              <button
                onClick={() => navigate("/parent/meetings")}
                className="block text-left w-full break-words text-blue-600 font-bold hover:underline"
              >
                Upcoming Events
              </button>
              <button
                onClick={() => navigate("/parent/fee-status")}
                className="block text-left w-full break-words text-blue-600 font-bold hover:underline"
              >
                Fee Reminder
              </button>
              <button
                onClick={() => navigate("/parent/results")}
                className="block text-left w-full break-words text-blue-600 font-bold hover:underline"
              >
                My Child&apos;s Results
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col xl:flex-row gap-6">
          <section className="flex-1 min-w-0">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap flex-nowrap pb-2 mb-6 max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]">
              {FILTERS.map((filter) => {
                const active = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition-all shrink-0 ${
                      active
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-400 border border-slate-100 hover:text-slate-600"
                    }`}
                  >
                    {formatFilterLabel(filter)}
                  </button>
                );
              })}
            </div>

            <div className="space-y-6">
              {filteredPosts.length === 0 ? (
                <div className="rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm p-4 sm:p-6 bg-white text-slate-400 text-sm">
                  No community posts available right now.
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <article
                    key={post.id}
                    ref={(el) => {
                      if (post.type === "poll") pollRefs.current[post.id] = el;
                    }}
                    className="rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm p-4 sm:p-6 bg-white"
                  >
                    <PostHeader post={post} />

                    {renderPostBody(post)}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4 border-t border-slate-50">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-rose-500 transition-all"
                      >
                        <Heart
                          className={`w-5 h-5 transition-all ${post.liked ? "text-rose-500 fill-rose-500" : "text-slate-400"}`}
                        />
                        <span>{post.likes} Likes</span>
                      </button>

                      <button
                        onClick={() => toggleCommentSection(post.id)}
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-all"
                      >
                        <MessageCircle className="w-5 h-5 text-slate-400" />
                        <span>{post.commentsCount} Comments</span>
                      </button>

                      <button
                        onClick={handleShare}
                        className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-all"
                      >
                        <Share2 className="w-5 h-5 text-slate-400" />
                        <span>Share</span>
                      </button>
                    </div>

                    {expandedComments[post.id] && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="space-y-4 mb-4">
                          {post.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="flex items-start gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-bold text-sm text-slate-700 truncate">
                                    {comment.name}
                                  </p>
                                  <button
                                    onClick={() =>
                                      toggleCommentLike(post.id, comment.id)
                                    }
                                    className={`text-xs font-bold transition-all shrink-0 ${comment.liked ? "text-rose-500" : "text-slate-400"}`}
                                  >
                                    ♥
                                  </button>
                                </div>
                                <p className="text-slate-500 text-sm break-words">
                                  {comment.text}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {comment.timeAgo}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ""}
                            onChange={(event) =>
                              setCommentInputs((prev) => ({
                                ...prev,
                                [post.id]: event.target.value,
                              }))
                            }
                            placeholder="Write a comment"
                            className="flex-1 min-w-0 rounded-2xl border border-slate-200 px-4 py-2 text-sm"
                          />
                          <button
                            onClick={() => submitComment(post.id)}
                            className="bg-blue-600 text-white p-2 rounded-2xl shrink-0"
                          >
                            <SendHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>

          <aside className="grid grid-cols-1 md:grid-cols-3 xl:flex xl:flex-col gap-6 w-full xl:w-72 shrink-0">
            <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 sm:p-6">
              <h3 className="font-black text-slate-800 mb-4">Active Polls</h3>
              <div className="space-y-3">
                {activePollPosts.length === 0 ? (
                  <p className="text-sm text-slate-400">No polls live.</p>
                ) : (
                  activePollPosts.map((poll) => (
                    <button
                      key={poll.id}
                      onClick={() => pollRefs.current[poll.id]?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      })}
                      className="w-full text-left bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:border-blue-200"
                    >
                      <p className="font-bold text-slate-700 text-sm break-words">
                        {poll.question}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        {poll.totalVotes} votes · Ends {poll.endsIn}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 sm:p-6">
              <h3 className="font-black text-slate-800 mb-4">Upcoming Events</h3>
              <div className="space-y-4">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-slate-400">No events scheduled.</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="bg-slate-50 rounded-2xl p-4">
                      <p className="font-bold text-slate-700 text-sm break-words">
                        {event.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {event.date}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 sm:p-6">
              <h3 className="font-black text-slate-800 mb-4">Popular Posts</h3>
              <div className="space-y-4">
                {popularPosts.length === 0 ? (
                  <p className="text-sm text-slate-400">No popular posts yet.</p>
                ) : (
                  popularPosts.map((post) => (
                    <div key={post.id} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                        <ChevronRight className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-700 text-sm break-words">
                          {post.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {post.engagement} engagements
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-6 right-6 sm:left-auto bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-xl text-sm font-bold text-slate-700 z-50 text-center sm:text-left sm:max-w-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
