import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileText,
  Settings,
  Loader2,
  Crown,
  Star,
  Zap,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import toast, { Toaster } from "react-hot-toast";
import { fetchMySubscription } from "../../services/api/subscriptionApi";
import { Heading, Button, ModalData, Grid } from "../shared/Common_Components";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatDateSafe = (dateString, formatStr = "dd MMM yyyy") => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? "Invalid Date" : format(d, formatStr);
};

const getDaysLeft = (endDate) => {
  if (!endDate) return 0;
  const d = new Date(endDate);
  return isNaN(d.getTime()) ? 0 : differenceInDays(d, new Date());
};

const getCycleBadgeColor = (cycle) => {
  switch (cycle) {
    case "Yearly":
      return "text-emerald-700 bg-emerald-50 border border-emerald-100";
    case "Monthly":
      return "text-blue-700 bg-blue-50 border border-blue-100";
    case "Custom":
      return "text-purple-700 bg-purple-50 border border-purple-100";
    default:
      return "text-slate-700 bg-slate-50 border border-slate-100";
  }
};

const MySubscription = () => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const response = await fetchMySubscription();
      setSubscription(response?.data?.data || null);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to load subscription details",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!subscription) return;

    try {
      setIsDownloading(true);
      const doc = new jsPDF();

      const displayPrice = `INR ${(subscription.billing?.customAmount || 0).toLocaleString()}`;
      const planName = subscription.billing?.cycle || "Custom";
      const txStatus = (subscription.billing?.status || "active").toUpperCase();
      const invoiceId = subscription.billing?.lastInvoiceId || `INV-${subscription._id.toString().slice(-6).toUpperCase()}`;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(79, 70, 229);
      doc.text("Graphura ERP", 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text("Graphura Corp India", 14, 28);
      doc.text("sales@graphura.com", 14, 33);

      doc.setFontSize(18);
      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.text("SUBSCRIPTION RECEIPT", 196, 22, { align: "right" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      let rightY = 30;
      doc.text(`Date of Issue: ${formatDateSafe(new Date())}`, 196, rightY, {
        align: "right",
      });
      rightY += 6;
      doc.setFont("helvetica", "bold");
      doc.text(`Status: ${txStatus}`, 196, rightY, { align: "right" });
      doc.setFont("helvetica", "normal");
      rightY += 6;
      doc.text(`Receipt ID: ${invoiceId}`, 196, rightY, {
        align: "right",
      });

      doc.setDrawColor(220, 220, 220);
      doc.line(14, 52, 196, 52);

      doc.setFontSize(11);
      doc.setTextColor(150, 150, 150);
      doc.text("BILLED TO:", 14, 62);

      doc.setFontSize(14);
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.text(subscription.organizationName || "Client Organization", 14, 69);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(subscription.officialEmail || "N/A", 14, 75);
      if (subscription.contactNumber) {
        doc.text(`Ph: ${subscription.contactNumber}`, 14, 80);
      }

      autoTable(doc, {
        startY: 92,
        head: [["Description", "Subscription Period", "Amount"]],
        body: [
          [
            `Graphura ERP Subscription (${planName} Cycle)\nManual Billing Mode`,
            `Start: ${formatDateSafe(subscription.createdAt)}\nEnd: ${formatDateSafe(subscription.billing?.expiryDate)}`,
            displayPrice,
          ],
        ],
        theme: "striped",
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
        styles: { fontSize: 10, cellPadding: 6, valign: "middle" },
      });

      const finalY = doc.lastAutoTable.finalY || 120;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Total Paid:", 150, finalY + 15, { align: "right" });
      doc.text(displayPrice, 196, finalY + 15, { align: "right" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(150, 150, 150);
      doc.text("Thank you for partnering with Graphura ERP.", 105, 280, {
        align: "center",
      });
      doc.text(
        "This is a computer-generated document and requires no physical signature.",
        105,
        285,
        { align: "center" },
      );

      const sanitizedOrgName = (subscription.organizationName || "Org").replace(
        /\s+/g,
        "_",
      );
      doc.save(
        `Graphura_Receipt_${sanitizedOrgName}_${format(new Date(), "yyyyMMdd")}.pdf`,
      );

      toast.success("Receipt downloaded successfully!");
    } catch (error) {
      console.error("Receipt generation failed:", error);
      toast.error("Failed to generate receipt document.");
    } finally {
      setTimeout(() => setIsDownloading(false), 500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#223F74] mb-4" />
        <p className="text-slate-500 font-bold animate-pulse">
          Loading Subscription Data...
        </p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl shadow-sm border border-slate-100 max-w-2xl mx-auto mt-10">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-black text-slate-800">
          No Subscription Found
        </h2>
        <p className="text-slate-500 mt-2">
          We couldn't locate active subscription data for your organization.
        </p>
      </div>
    );
  }

  const daysLeft = getDaysLeft(subscription.billing?.expiryDate);
  const isExpiringSoon = subscription.billing?.status === "past_due" || (daysLeft <= 30 && daysLeft > 0);
  const isExpired = subscription.billing?.status === "expired" || daysLeft <= 0;

  // Visuals based on Plan mapping with Graphura theme colors (blue/purple gradient)
  const planDetails = {
    Premium: {
      icon: Crown,
      color: "from-[#223F74] to-[#5F3E8C]", // Dark blue to deep purple-indigo gradient
      badge: "bg-indigo-100 text-indigo-700",
    },
    Standard: {
      icon: Star,
      color: "from-[#223F74] to-[#4F709C]", // Blue to purple-indigo theme gradient
      badge: "bg-blue-100 text-blue-700",
    },
    Basic: {
      icon: Zap,
      color: "from-[#223F74] to-[#2B4A7A]", // Muted blue theme gradient
      badge: "bg-slate-100 text-slate-700",
    },
  };

  const currentPlan = (subscription.billing?.cycle === "Monthly") ? planDetails.Standard : planDetails.Premium;
  const PlanIcon = currentPlan.icon;

  const maxSchools = subscription.quotas?.maxSchools || 1;
  const maxStudents = subscription.quotas?.maxStudents || 500;
  const maxStaff = subscription.quotas?.maxStaff !== undefined
    ? subscription.quotas.maxStaff
    : (subscription.quotas?.maxTeachingStaff || 0) + (subscription.quotas?.maxNonTeachingStaff || 0) || 70;

  return (
    <div className="space-y-6">
      <Toaster />

      {/* Header Banner */}
      <Grid cols={12} gap={4}>
        <Heading
          primaryText="My Subscription"
          secondaryText="BILLING & PLANS"
          size={12}
          fontSize="2xl"
        />
      </Grid>

      {/* Main Content Grid */}
      <Grid cols={12} gap={6}>
        {/* Left Column: Active Plan Card, Quick Actions */}
        <div className="lg:col-span-8 col-span-12 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-gradient-to-br ${currentPlan.color} rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 text-white shadow-2xl shadow-[#223F74]/20 relative overflow-hidden backdrop-blur-3xl border border-white/20`}
          >
            <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none"></div>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10 pointer-events-none">
              <PlanIcon size={250} />
            </div>

            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-black tracking-widest uppercase border border-white/20 shadow-sm">
                  {subscription.billing?.cycle || "Custom"} Plan
                </span>

                {isExpired ? (
                  <span className="bg-rose-500 px-4 py-1.5 rounded-full text-sm font-black flex items-center gap-2 shadow-lg animate-pulse">
                    <AlertTriangle size={16} /> Expired
                  </span>
                ) : isExpiringSoon ? (
                  <span className="bg-white text-yellow-600 px-4 py-1.5 rounded-full text-sm font-black flex items-center gap-2 shadow-lg animate-pulse">
                    <Clock size={16} /> Past Due ({daysLeft} Days Left)
                  </span>
                ) : (
                  <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-black flex items-center gap-2 border border-white/20 shadow-sm">
                    <CheckCircle2 size={16} /> Active Status
                  </span>
                )}
              </div>

              <div>
                <p className="text-white/80 font-bold text-sm mb-1 uppercase tracking-widest">
                  Organization
                </p>
                <h2 className="text-3xl sm:text-4xl font-black mb-10 leading-tight">
                  {subscription.organizationName}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-black/10 p-6 rounded-3xl backdrop-blur-sm border border-white/10 mt-6">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1">
                    Start Date
                  </span>
                  <span className="text-white font-extrabold text-base block">
                    {formatDateSafe(subscription.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1">
                    Expiration Date
                  </span>
                  <span className="text-white font-extrabold text-base block">
                    {formatDateSafe(subscription.billing?.expiryDate)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <div className="bg-white border border-slate-100 rounded-3xl p-4 flex gap-3 shadow-sm">
            <div className="flex-1">
              <Button
                text={isDownloading ? "Generating..." : "Download Invoice Receipt"}
                icon={isDownloading ? <Loader2 className="animate-spin" size={18} /> : <FileText size={18} />}
                variant="secondary"
                disabled={isDownloading}
                onClick={handleDownloadInvoice}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Subscription Details */}
        <div className="lg:col-span-4 col-span-12 space-y-6">
          {/* Subscription Details Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Settings size={20} />
              </div>
              <h3 className="font-black text-slate-800 text-lg">Subscription Details</h3>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center py-3.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Subscription Amount
                </span>
                <span className="font-black text-purple-700 text-lg">
                  ₹{(subscription.billing?.customAmount || 0).toLocaleString()}
                </span>
              </div>

              {subscription.billing?.outstandingBalance > 0 && (
                <div className="flex justify-between items-center py-3.5 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Outstanding Balance
                  </span>
                  <span className="font-bold text-red-600 text-lg">
                    ₹{(subscription.billing?.outstandingBalance || 0).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-3.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Billing Cycle
                </span>
                <span className={`text-[11px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider ${getCycleBadgeColor(subscription.billing?.cycle)}`}>
                  {subscription.billing?.cycle || "Yearly"}
                </span>
              </div>

              <div className="flex justify-between items-center py-3.5 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Last Payment Date
                </span>
                <span className="font-bold text-slate-700 text-sm">
                  {subscription.billing?.lastPaymentDate ? formatDateSafe(subscription.billing.lastPaymentDate) : "N/A"}
                </span>
              </div>

              <div className="flex justify-between items-center py-3.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Expiration Date
                </span>
                <span className="font-bold text-emerald-600 text-sm">
                  {subscription.billing?.expiryDate ? formatDateSafe(subscription.billing.expiryDate) : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Grid>

      {/* Included in Your Plan - Full Width Card below the columns */}
      <div className="mt-8 bg-white border border-slate-100 rounded-[2rem] p-8 sm:p-10 shadow-sm">
        <h3 className="font-black text-slate-800 mb-8 flex items-center gap-2 text-xl">
          <Star className="text-yellow-500" size={24} /> Included in your plan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-100 transition-all duration-300">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Maximum Branches
            </span>
            <span className="text-3xl font-black text-slate-800">
              {maxSchools}
            </span>
          </div>
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-100 transition-all duration-300">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Maximum Students
            </span>
            <span className="text-3xl font-black text-slate-800">
              {maxStudents.toLocaleString()}
            </span>
          </div>
          <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-100 transition-all duration-300">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Maximum Staff Capacity
            </span>
            <span className="text-3xl font-black text-slate-800">
              {maxStaff}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MySubscription;