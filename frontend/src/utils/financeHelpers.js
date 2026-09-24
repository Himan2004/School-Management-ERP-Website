/**
 * Finance Module Helper Functions & Constants
 * Shared utilities for Finance pages to avoid code duplication
 */

// Animation variants for Framer Motion
export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// Format large numbers as currency in Indian Rupees
export const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

// Validate if value is a positive number
export const isValidCurrency = (value) => {
  const num = Number(value);
  return !isNaN(num) && num > 0;
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format date to DD MMMM, YYYY
export const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

// Category labels for waivers
export const WAIVER_CATEGORY_LABELS = {
  sibling_discount: "Sibling Discount",
  merit_scholarship: "Merit Scholarship",
  staff_child: "Staff Child",
  financial_hardship: "Financial Hardship",
  sports_quota: "Sports Quota",
  custom: "Custom",
};

// Discount type labels
export const DISCOUNT_TYPE_LABELS = {
  percentage: "Percentage",
  fixed_amount: "Fixed Amount",
};

// Approval authority labels
export const APPROVAL_LABELS = {
  hq_admin: "HQ Admin",
  principal: "Principal",
  branch_admin: "Branch Admin",
};

// Get status color based on priority
export const getStatusColor = (status) => {
  const statusMap = {
    High: "bg-rose-50 text-rose-600",
    Medium: "bg-orange-50 text-orange-600",
    Low: "bg-blue-50 text-blue-600",
    Active: "bg-green-50 text-green-600",
    Inactive: "bg-slate-50 text-slate-600",
  };
  return statusMap[status] || "bg-slate-50 text-slate-600";
};
