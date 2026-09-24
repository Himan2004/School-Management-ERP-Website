import React, { useState, useMemo, useEffect } from "react";
import {
  Download,
  Search,
  FileText,
  Star,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Eye,
  Filter,
  X,
  Calendar,
  ChevronDown,
  FileDown
} from "lucide-react";
import {
  DataTable,
  DashGrid,
  Grid,
  EnhancedDashCard,
  GColumnChart,
  GDoughnutChart,
  PanelModal,
  Heading,
  P,
  Button,
  SelectField,
  Option,
  ModalGrid,
  ModalData,
  DataField,
} from "../../../components/shared/Common_Components";
import { getAcademicYears } from "../../../services/api/PrincipalSettingApi";
import {
  getPTMFeedbackData,
  updatePTMFeedback,
  sendParentDirectMessage
} from "../../../services/api/principalCommunicationApi";

const PTMFeedback = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [academicYear, setAcademicYear] = useState("");
  const [ptmEventsList, setPtmEventsList] = useState([]);
  const [selectedPTM, setSelectedPTM] = useState("All PTMs");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [ratingFilter, setRatingFilter] = useState("All Ratings");
  const [loading, setLoading] = useState(false);

  // Modal States
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Follow-up form state
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUpStatus, setFollowUpStatus] = useState("");

  // Compose parent message state
  const [parentMessage, setParentMessage] = useState("");

  const fetchYears = async () => {
    try {
      const schoolId = localStorage.getItem("schoolId") || "";
      const res = await getAcademicYears(schoolId);
      if (res.success && res.data?.academicYears) {
        setAcademicYears(res.data.academicYears);
        const activeYear = res.data.academicYears.find((y) => y.status === "Active");
        if (activeYear) {
          setAcademicYear(activeYear.name);
        } else if (res.data.academicYears.length > 0) {
          setAcademicYear(res.data.academicYears[0].name);
        }
      } else {
        setAcademicYears([{ name: "2024-25" }, { name: "2023-24" }]);
        setAcademicYear("2024-25");
      }
    } catch (err) {
      console.error("Error fetching academic years:", err);
      setAcademicYears([{ name: "2024-25" }, { name: "2023-24" }]);
      setAcademicYear("2024-25");
    }
  };

  const fetchFeedback = async (yearName) => {
    setLoading(true);
    try {
      const activeYear = yearName || academicYear;
      if (!activeYear) return;
      const res = await getPTMFeedbackData({ academicYear: activeYear });
      if (res.success && res.data) {
        setFeedbackList(res.data);
        if (res.ptmEvents) {
          setPtmEventsList(res.ptmEvents);
        }
      } else {
        setFeedbackList([]);
      }
    } catch (err) {
      console.error("Error fetching feedback:", err);
      setFeedbackList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
  }, []);

  useEffect(() => {
    if (academicYear) {
      fetchFeedback(academicYear);
    }
  }, [academicYear]);

  // Filter logic applied client-side to fetched live records
  const filteredData = useMemo(() => {
    return feedbackList.filter((fb) => {
      const matchesPTM = selectedPTM === "All PTMs" || fb.ptmEvent === selectedPTM;
      const matchesCategory = categoryFilter === "All Categories" || fb.category === categoryFilter;
      const matchesStatus = statusFilter === "All Statuses" || fb.status === statusFilter;

      let matchesRating = true;
      if (ratingFilter === "5 Stars") matchesRating = fb.rating === 5;
      else if (ratingFilter === "4 Stars") matchesRating = fb.rating === 4;
      else if (ratingFilter === "3 Stars") matchesRating = fb.rating === 3;
      else if (ratingFilter === "2 Stars & Below") matchesRating = fb.rating <= 2;

      return matchesPTM && matchesCategory && matchesStatus && matchesRating;
    });
  }, [feedbackList, selectedPTM, categoryFilter, statusFilter, ratingFilter]);

  // Derived KPI statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return { total: 0, avgRating: 0, positivePercent: 0, pending: 0 };
    }
    const total = filteredData.length;
    const ratingSum = filteredData.reduce((sum, item) => sum + item.rating, 0);
    const avgRating = (ratingSum / total).toFixed(1);
    const positiveCount = filteredData.filter((item) => item.rating >= 4).length;
    const positivePercent = ((positiveCount / total) * 100).toFixed(1);
    const pending = filteredData.filter((item) => item.status === "Pending Review").length;
    return { total, avgRating, positivePercent, pending };
  }, [filteredData]);

  // Chart 1: Average Rating by Class
  const classChartData = useMemo(() => {
    const classGroups = {};
    filteredData.forEach((fb) => {
      const cls = fb.className.split("-")[0]; // e.g., "Class 10"
      if (!classGroups[cls]) {
        classGroups[cls] = { total: 0, count: 0 };
      }
      classGroups[cls].total += fb.rating;
      classGroups[cls].count += 1;
    });

    return Object.entries(classGroups).map(([name, group]) => ({
      name,
      rating: parseFloat((group.total / group.count).toFixed(2))
    })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [filteredData]);

  // Chart 2: Category Distribution
  const categoryChartData = useMemo(() => {
    const categories = {};
    filteredData.forEach((fb) => {
      categories[fb.category] = (categories[fb.category] || 0) + 1;
    });

    const categoryColors = {
      Academics: "#8b5cf6",
      Teachers: "#10b981",
      Infrastructure: "#3b82f6",
      Behavior: "#f59e0b",
      Activities: "#ec4899"
    };

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value,
      color: categoryColors[name] || "#64748b"
    }));
  }, [filteredData]);

  // Action Handlers
  const handleOpenDetail = (feedback) => {
    setSelectedFeedback(feedback);
    setFollowUpNotes(feedback.principalNotes || "");
    setFollowUpStatus(feedback.status);
    setShowDetailModal(true);
  };

  const handleSaveFollowUp = async () => {
    try {
      const res = await updatePTMFeedback(selectedFeedback.id, {
        status: followUpStatus,
        principalNotes: followUpNotes
      });
      if (res.success) {
        fetchFeedback(academicYear);
        setShowDetailModal(false);
        const toastEl = document.createElement("div");
        toastEl.innerHTML = `
          <div class="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-[9999]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Feedback ticket updated successfully
          </div>
        `;
        document.body.appendChild(toastEl);
        setTimeout(() => toastEl.remove(), 3000);
      } else {
        alert(res.message || "Failed to update feedback ticket");
      }
    } catch (err) {
      console.error("Error updating feedback follow-up:", err);
      alert("Failed to update feedback ticket");
    }
  };

  const handleOpenNotification = (feedback) => {
    setSelectedFeedback(feedback);
    setParentMessage(`Dear ${feedback.parentName}, thank you for attending the ${feedback.ptmEvent}. Regarding your comments on ${feedback.category.toLowerCase()}, we are looking into the matter...`);
    setShowNotificationModal(true);
  };

  const handleSendNotification = async () => {
    try {
      const res = await sendParentDirectMessage(selectedFeedback.id, {
        message: parentMessage
      });
      if (res.success) {
        fetchFeedback(academicYear);
        setShowNotificationModal(false);
        const toastEl = document.createElement("div");
        toastEl.innerHTML = `
          <div class="fixed bottom-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-[9999]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
            Direct message sent to parent's portal
          </div>
        `;
        document.body.appendChild(toastEl);
        setTimeout(() => toastEl.remove(), 3000);
      } else {
        alert(res.message || "Failed to send message to parent");
      }
    } catch (err) {
      console.error("Error sending parent notification:", err);
      alert("Failed to send message to parent");
    }
  };



  // DataTable columns configuration
  const columns = [
    { key: "parentName", label: "Parent Name", width: "160px" },
    { key: "studentName", label: "Student & Class", width: "160px" },
    { key: "category", label: "Category", width: "120px" },
    {
      key: "rating",
      label: "Rating",
      width: "140px",
      align: "center",
      render: (val) => (
        <div className="flex items-center justify-center gap-0.5">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Star
              key={idx}
              size={14}
              className={idx < val ? "fill-amber-400 text-amber-400" : "text-slate-200"}
            />
          ))}
        </div>
      )
    },
    { key: "comments", label: "Feedback Notes", width: "320px" },
    {
      key: "status",
      label: "Follow-up Status",
      width: "160px",
      align: "center",
      render: (val) => {
        let cls = "bg-gray-100 text-gray-800";
        if (val === "Resolved") cls = "bg-emerald-100 text-emerald-800 border border-emerald-200";
        else if (val === "Contacted Parent") cls = "bg-sky-100 text-sky-800 border border-sky-200";
        else if (val === "Pending Review") cls = "bg-rose-100 text-rose-800 border border-rose-200";
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide ${cls}`}>
            {val}
          </span>
        );
      }
    }
  ];

  const tableRows = filteredData.map((item) => ({
    id: item.id,
    parentName: item.parentName,
    studentName: `${item.studentName} (${item.className})`,
    category: item.category,
    rating: item.rating,
    comments: item.comments,
    status: item.status,
    rawComments: item.comments,
    className: item.className
  }));

  const actions = [
    {
      icon: <Eye size={14} />,
      tooltip: "View Follow-up Panel",
      variant: "primary",
      onClick: (row) => {
        const original = feedbackList.find((x) => x.id === row.id);
        handleOpenDetail(original);
      }
    },
    {
      icon: <Send size={14} />,
      tooltip: "Send Message",
      variant: "success",
      onClick: (row) => {
        const original = feedbackList.find((x) => x.id === row.id);
        handleOpenNotification(original);
      }
    }
  ];

  const statsItems = [
    {
      title: "Total Submissions",
      value: String(stats.total),
      icon: <FileText size={22} />,
      accentColor: "#3b82f6",
      size: 3
    },
    {
      title: "Average Rating",
      value: `${stats.avgRating} / 5.0`,
      icon: <Star className="fill-amber-400 text-amber-400" size={22} />,
      accentColor: "#f59e0b",
      size: 3
    },
    {
      title: "Positive Sentiment",
      value: `${stats.positivePercent}%`,
      icon: <CheckCircle size={22} />,
      accentColor: "#10b981",
      size: 3
    },
    {
      title: "Pending Action Tickets",
      value: String(stats.pending),
      icon: <AlertCircle size={22} />,
      accentColor: "#f43f5e",
      size: 3
    }
  ];

  return (
    <div className="w-full space-y-6 pb-12 font-sans text-left custom-dashboard-styles">
      
      {/* Standardized Heading */}
      <Grid cols={12} gap={4}>
        <Heading
          primaryText="PTM Feedback"
          secondaryText="Dashboard"
          size={12}
          showAnimations={true}
        />
      </Grid>

      {/* KPI Cards */}
      <DashGrid cols={12} gap={4}>
        {statsItems.map((stat, idx) => (
          <EnhancedDashCard
            key={idx}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            accentColor={stat.accentColor}
            size={stat.size}
            showAnimations={true}
          />
        ))}
      </DashGrid>

      {/* Global Filters */}
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-5">
        <Grid cols={12} gap={4}>
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <SelectField
              label="Academic Year"
              id="filter_academic_year"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              searchable={false}
              size={12}
            >
              {academicYears.map((year) => (
                <Option key={year._id || year.name} value={year.name} label={year.name} />
              ))}
            </SelectField>
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-4">
            <SelectField
              label="PTM Event"
              id="filter_ptm_event"
              value={selectedPTM}
              onChange={(e) => setSelectedPTM(e.target.value)}
              searchable={false}
              size={12}
            >
              <Option value="All PTMs" label="All PTM Events" />
              {ptmEventsList.map((evt, idx) => (
                <Option key={idx} value={evt} label={evt} />
              ))}
            </SelectField>
          </div>
          <div className="col-span-12 md:col-span-4 lg:col-span-4">
            <SelectField
              label="Category"
              id="filter_category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              searchable={false}
              size={12}
            >
              <Option value="All Categories" label="All Categories" />
              <Option value="Academics" label="Academics" />
              <Option value="Teachers" label="Teachers" />
              <Option value="Infrastructure" label="Infrastructure" />
              <Option value="Behavior" label="Behavior" />
              <Option value="Activities" label="Activities" />
            </SelectField>
          </div>
          <div className="col-span-12 md:col-span-4 lg:col-span-6">
            <SelectField
              label="Rating"
              id="filter_rating"
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              searchable={false}
              size={12}
            >
              <Option value="All Ratings" label="All Ratings" />
              <Option value="5 Stars" label="5 Stars Only" />
              <Option value="4 Stars" label="4 Stars Only" />
              <Option value="3 Stars" label="3 Stars Only" />
              <Option value="2 Stars & Below" label="2 Stars & Below" />
            </SelectField>
          </div>
          <div className="col-span-12 md:col-span-4 lg:col-span-6">
            <SelectField
              label="Status"
              id="filter_status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              searchable={false}
              size={12}
            >
              <Option value="All Statuses" label="All Follow-up Statuses" />
              <Option value="Pending Review" label="Pending Review" />
              <Option value="Contacted Parent" label="Contacted Parent" />
              <Option value="Resolved" label="Resolved" />
            </SelectField>
          </div>
          {(selectedPTM !== "All PTMs" || categoryFilter !== "All Categories" || statusFilter !== "All Statuses" || ratingFilter !== "All Ratings") && (
            <div className="col-span-12 flex justify-end">
              <button
                onClick={() => {
                  setSelectedPTM("All PTMs");
                  setCategoryFilter("All Categories");
                  setStatusFilter("All Statuses");
                  setRatingFilter("All Ratings");
                }}
                className="text-rose-600 font-bold text-xs hover:underline px-1"
              >
                Clear Filters
              </button>
            </div>
          )}
        </Grid>
      </div>

      {/* Charts section */}
      <DashGrid cols={12} gap={4}>
        <div className="col-span-12 lg:col-span-8">
          {classChartData.length > 0 ? (
            <GColumnChart
              title="Class Satisfaction Index"
              subtitle="Average rating per class for PTM events"
              data={classChartData}
              bars={[{ key: "rating", label: "Avg Rating Score", color: "#8b5cf6" }]}
              size={12}
              height={280}
            />
          ) : (
            <div className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center min-h-[300px] h-full">
              <AlertCircle size={48} className="text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No chart data matching search filters</p>
            </div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-4">
          {categoryChartData.length > 0 ? (
            <GDoughnutChart
              title="Feedback Categorization"
              subtitle="Volume of feedback tickets per topic"
              data={categoryChartData}
              colors={categoryChartData.map((x) => x.color)}
              size={12}
              height={280}
            />
          ) : (
            <div className="bg-white rounded-[24px] border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center min-h-[300px] h-full">
              <AlertCircle size={48} className="text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-500">No categorization matching filters</p>
            </div>
          )}
        </div>
      </DashGrid>

      {/* Main Records Table */}
      <div className="w-full">
        <DataTable
          title="Feedback Records"
          columns={columns}
          rows={tableRows}
          actions={actions}
          size={12}
          pageSize={5}
          pageSizeOptions={[5, 10, 20]}
          searchable={true}
          exportable={true}
          exportFileName={`ptm-feedback-${academicYear}`}
        />
      </div>

      {/* Follow-up / View Details Modal */}
      {showDetailModal && selectedFeedback && (
        <PanelModal
          id="followup-details-modal"
          title={`PTM Feedback Detail: Ticket #${selectedFeedback.id}`}
          isVisible={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          size="md"
        >
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {selectedFeedback.ptmEvent} • {selectedFeedback.date}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedFeedback.status === "Resolved" ? "bg-emerald-100 text-emerald-800"
                    : selectedFeedback.status === "Contacted Parent" ? "bg-sky-100 text-sky-800"
                      : "bg-rose-100 text-rose-800"
                  }`}>
                  {selectedFeedback.status}
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                {selectedFeedback.parentName}
              </h3>
              <p className="text-sm text-slate-500">
                Parent of <span className="font-semibold">{selectedFeedback.studentName}</span> ({selectedFeedback.className})
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                <MessageSquare size={13} />
                Parent Comments & Rating:
              </h4>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-sm font-semibold text-slate-700">Topic: {selectedFeedback.category}</span>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      size={14}
                      className={idx < selectedFeedback.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                "{selectedFeedback.comments}"
              </p>
            </div>

            <ModalGrid cols={2}>
              <ModalData label="Phone Number" value={selectedFeedback.contactPhone || 'N/A'} />
              <ModalData label="Email Address" value={selectedFeedback.email || 'N/A'} />
            </ModalGrid>

            <div className="space-y-3.5 pt-2">
              <h4 className="text-sm font-bold text-[#223F74]">Principal Resolution Panel</h4>
              <div>
                <SelectField
                  label="Update Follow-up Status"
                  id="update_status"
                  value={followUpStatus}
                  onChange={(e) => setFollowUpStatus(e.target.value)}
                  searchable={false}
                  size={12}
                >
                  <Option value="Pending Review" label="Pending Review" />
                  <Option value="Contacted Parent" label="Contacted Parent" />
                  <Option value="Resolved" label="Resolved" />
                </SelectField>
              </div>

              <div>
                <DataField
                  label="Action Logs / Internal Notes"
                  id="followup_notes"
                  type="textarea"
                  placeholder="Record phone discussions, resolutions, or specific follow-up actions taken..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  size={12}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <div className="flex-1">
                <Button variant="secondary" text="Cancel" onClick={() => setShowDetailModal(false)} size={12} className="w-full" />
              </div>
              <div className="flex-1">
                <Button variant="primary" text="Save Resolution" icon={<CheckCircle size={16} />} onClick={handleSaveFollowUp} size={12} className="w-full" />
              </div>
            </div>
          </div>
        </PanelModal>
      )}

      {/* Direct Messaging Modal */}
      {showNotificationModal && selectedFeedback && (
        <PanelModal
          id="direct-message-modal"
          title="Direct Message Parent"
          isVisible={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-blue-900">EduAI Link Message</h4>
                <p className="text-xs text-blue-700 leading-relaxed mt-1">
                  This message will trigger a push notification and appear directly in <strong>{selectedFeedback.parentName}</strong>'s parent application.
                </p>
              </div>
            </div>

            <div>
              <DataField
                label="Recipient Details"
                id="recipient_details"
                value={`${selectedFeedback.parentName} (Parent of ${selectedFeedback.studentName})`}
                disabled={true}
                size={12}
              />
            </div>

            <div>
              <DataField
                label="Compose Message"
                id="compose_message"
                type="textarea"
                value={parentMessage}
                onChange={(e) => setParentMessage(e.target.value)}
                placeholder="Write your message here..."
                size={12}
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <div className="flex-1">
                <Button variant="secondary" text="Cancel" onClick={() => setShowNotificationModal(false)} size={12} className="w-full" />
              </div>
              <div className="flex-1">
                <Button variant="success" text="Send Message" icon={<Send size={15} />} onClick={handleSendNotification} size={12} className="w-full" />
              </div>
            </div>
          </div>
        </PanelModal>
      )}
    </div>
  );
};

export default PTMFeedback;