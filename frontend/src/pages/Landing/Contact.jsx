import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Laptop, 
  ShieldCheck, 
  Zap, 
  Phone, 
  Mail, 
  MapPin, 
  Send, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight 
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import Navbar from "../../LegacyLanding/components/Navbar";
import "./Contact.css";

const initialFormData = {
  fullName: "",
  schoolName: "",
  workEmail: "",
  phoneNumber: "",
  enquiryType: "Product Demo",
  requirements: "",
};

const featureCards = [
  {
    icon: Laptop,
    title: "Product Demo",
    subtitle: "Experience the complete ERP workflow.",
    iconBg: "rgba(59, 130, 246, 0.15)",
    iconColor: "#60a5fa",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Support",
    subtitle: "Migration, onboarding and dedicated assistance.",
    iconBg: "rgba(16, 185, 129, 0.15)",
    iconColor: "#34d399",
  },
  {
    icon: Zap,
    title: "Fast Response",
    subtitle: "Our team will connect with you within one business day.",
    iconBg: "rgba(249, 115, 22, 0.15)",
    iconColor: "#fb923c",
  },
];

const contactDetails = [
  {
    icon: Phone,
    label: "Phone",
    value: "+91 7378 021327",
    href: "tel:+917378021327",
  },
  {
    icon: Mail,
    label: "Email",
    value: "official@graphura.in",
    href: "mailto:official@graphura.in",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "Pataudi, Gurgaon, Haryana 122503",
  },
];

export default function Contact() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setSubmitted(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!consent) {
      toast.error("Please agree to be contacted.");
      return;
    }

    // Client-side validations
    if (!formData.fullName.trim()) {
      toast.error("Full Name is required.");
      return;
    }
    if (!formData.schoolName.trim()) {
      toast.error("School Name is required.");
      return;
    }
    if (!formData.workEmail.trim()) {
      toast.error("Work Email is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.workEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!formData.phoneNumber.trim()) {
      toast.error("Phone Number is required.");
      return;
    }
    const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;
    if (!phoneRegex.test(formData.phoneNumber.replace(/\s+/g, ""))) {
      toast.error("Please enter a valid phone number.");
      return;
    }
    if (!formData.enquiryType.trim()) {
      toast.error("Enquiry Type is required.");
      return;
    }
    if (!formData.requirements.trim()) {
      toast.error("Requirements details are required.");
      return;
    }

    setLoading(true);
    console.log("Submitting Contact Form Payload:", formData);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/school/contact`,
        formData
      );

      console.log("Contact Form API Response:", response.data);

      if (response.data?.success) {
        toast.success("Message sent successfully!");
        setSubmitted(true);
        setFormData(initialFormData);
        setConsent(false);
      } else {
        toast.error(response.data?.message || "Failed to send message.");
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast.error(error.response?.data?.message || "An error occurred while sending your message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contact-page-root legacy-root">
      {/* Top Navbar */}
      <Navbar 
        onNavigateRegister={() => navigate("/organization/signup")} 
        onNavigateLogin={() => navigate("/organization/login")} 
      />

      {/* Main Content Area */}
      <main className="pt-24 pb-12 sm:pt-32 sm:pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1200px]">
          
          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] rounded-3xl border border-slate-200/80 bg-white shadow-2xl overflow-hidden min-h-[640px]">
            
            {/* Left Column: Brand Onboarding Sidebar */}
            <aside className="contact-sidebar p-6 sm:p-8 lg:p-10 text-white">
              {/* Background Animations */}
              <div className="sidebar-gradient-bg"></div>
              <div className="decor-circle circle-1"></div>
              <div className="decor-circle circle-2"></div>
              <div className="glass-grid-overlay"></div>
              <div className="radial-glow glow-1"></div>
              <div className="radial-glow glow-2"></div>
              <div className="floating-shape circle-shape"></div>
              <div className="floating-shape square-shape"></div>
              <div className="floating-shape plus-shape">+</div>
              <div className="floating-shape dot-shape"></div>
              <div className="light-beam"></div>

              {/* Sidebar Content */}
              <div className="contact-sidebar-content flex flex-col justify-between h-full space-y-8">
                <div>
                  <div className="mb-6">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                      <ArrowLeft size={16} /> Back to Home
                    </Link>
                  </div>

                  <span className="inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-white/10 rounded-full border border-white/15 mb-4">
                    Graphura School ERP
                  </span>
                  
                  <h1 
                    className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold leading-tight tracking-tight mb-4"
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #fc9d8b 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    Let's Build Your School Together
                  </h1>

                  <p className="text-sm sm:text-base leading-relaxed text-slate-300">
                    Our experts help schools streamline admissions, academics, finance, HR, communication and daily operations with Graphura School ERP.
                  </p>

                  {/* 3 Premium Feature Cards */}
                  <div className="mt-8 space-y-3.5">
                    {featureCards.map((card, idx) => {
                      const CardIcon = card.icon;
                      return (
                        <div key={idx} className="contact-feature-card flex items-start gap-3.5">
                          <div 
                            className="flex h-10 w-10 min-w-[40px] items-center justify-center rounded-xl"
                            style={{ backgroundColor: card.iconBg, color: card.iconColor }}
                          >
                            <CardIcon size={20} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{card.title}</h3>
                            <p className="text-xs leading-relaxed text-slate-300 mt-0.5">{card.subtitle}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Contact Details */}
                <div className="pt-4">
                  <div className="contact-details-box space-y-3">
                    {contactDetails.map((item, idx) => {
                      const DetailIcon = item.icon;
                      const Wrapper = item.href ? "a" : "div";

                      return (
                        <Wrapper
                          key={idx}
                          {...(item.href ? { href: item.href } : {})}
                          className="flex items-center gap-3 text-xs sm:text-sm text-slate-200 hover:text-white transition-colors"
                        >
                          <DetailIcon size={16} className="text-orange-400 min-w-[16px]" />
                          <span className="font-semibold">{item.label}:</span>
                          <span className="truncate">{item.value}</span>
                        </Wrapper>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>

            {/* Right Column: Form Panel */}
            <section className="bg-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
              <div>
                <div className="mb-6">
                  <span className="inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 rounded-full border border-orange-200">
                    Contact Form
                  </span>
                  <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Tell us your requirements
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Fill out the form and our team will get back to you shortly.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="fullName" className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-800">
                        Full Name
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        required
                        disabled={loading}
                        className="contact-input disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label htmlFor="schoolName" className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-800">
                        School Name
                      </label>
                      <input
                        id="schoolName"
                        name="schoolName"
                        type="text"
                        value={formData.schoolName}
                        onChange={handleChange}
                        placeholder="Enter school name"
                        required
                        disabled={loading}
                        className="contact-input disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="workEmail" className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-800">
                        Work Email
                      </label>
                      <input
                        id="workEmail"
                        name="workEmail"
                        type="email"
                        value={formData.workEmail}
                        onChange={handleChange}
                        placeholder="you@school.edu"
                        required
                        disabled={loading}
                        className="contact-input disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label htmlFor="phoneNumber" className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-800">
                        Phone Number
                      </label>
                      <input
                        id="phoneNumber"
                        name="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        placeholder="+91 98XXX XXXXX"
                        required
                        disabled={loading}
                        className="contact-input disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="enquiryType" className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-800">
                      Enquiry Type
                    </label>
                    <select
                      id="enquiryType"
                      name="enquiryType"
                      value={formData.enquiryType}
                      onChange={handleChange}
                      disabled={loading}
                      className="contact-input cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option>Product Demo</option>
                      <option>Implementation Guidance</option>
                      <option>Support</option>
                      <option>Pricing</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="requirements" className="mb-1.5 block text-xs sm:text-sm font-semibold text-slate-800">
                      Requirements
                    </label>
                    <textarea
                      id="requirements"
                      name="requirements"
                      rows={3}
                      value={formData.requirements}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      placeholder="Tell us your requirement"
                      className="contact-input disabled:opacity-60 disabled:cursor-not-allowed resize-y"
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent}
                      disabled={loading}
                      onChange={(event) => setConsent(event.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-orange-600 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm leading-snug text-slate-600">
                      I agree to be contacted regarding my enquiry.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={!consent || loading}
                    className="contact-submit-btn mt-2"
                  >
                    <span>{loading ? "Sending..." : "Send Message"}</span>
                    {!loading && <Send size={16} />}
                  </button>
                </form>

                {submitted && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm text-emerald-700 flex items-center gap-2.5">
                    <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-600" />
                    <span>Thanks. Your message has been captured and our team will reach out shortly.</span>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm text-slate-500">
                <Link to="/" className="font-semibold text-slate-700 hover:text-orange-600 transition-colors">
                  Back to Home
                </Link>
                <Link to="/privacy-policy" className="inline-flex items-center gap-1 font-medium text-slate-500 hover:text-orange-600 transition-colors">
                  Privacy Policy <ArrowRight size={12} />
                </Link>
              </div>
            </section>

          </div>

        </div>
      </main>
    </div>
  );
}
