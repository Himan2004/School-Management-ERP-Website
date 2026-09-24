import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, MessageSquare, Mail, Phone, Clock, 
  Search, Filter, ChevronRight, ChevronDown, 
  Loader2, Send, Paperclip, Image, Smile,
  Star, StarOff, ThumbsUp, ThumbsDown, Copy,
  Check, AlertCircle, CheckCircle, XCircle,
  BookOpen, Video, FileText, Download, ExternalLink,
  User, Calendar, Tag, FilterX, RefreshCw,
  MessageCircle, PhoneCall, MailOpen, Globe,
  Shield, Lock, UserCheck, Settings, CreditCard,
  School, Users, BarChart3, TrendingUp, Zap,
  Award, Crown, Sparkles, Bell, Rocket
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import * as api from '../../services/api/graphuraApi';

const GraphuraSupport = () => {
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportFAQs, setSupportFAQs] = useState([]);
  const [supportVideos, setSupportVideos] = useState([]);
  const [supportResources, setSupportResources] = useState([]);
  const [loading, setLoading] = useState({
    supportTickets: false,
    supportFAQs: false,
    supportVideos: false,
    supportResources: false,
  });

  const [activeTab, setActiveTab] = useState('faq');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    message: '',
    attachments: []
  });
  const [ticketMessage, setTicketMessage] = useState('');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [feedback, setFeedback] = useState({});
  const [copied, setCopied] = useState(false);

  const faqCategories = [
    { id: 'getting-started', name: 'Getting Started', icon: Rocket, color: 'blue' },
    { id: 'school-management', name: 'School Management', icon: School, color: 'green' },
    { id: 'user-management', name: 'User Management', icon: Users, color: 'purple' },
    { id: 'subscriptions', name: 'Subscriptions & Billing', icon: CreditCard, color: 'yellow' },
    { id: 'security', name: 'Security & Privacy', icon: Shield, color: 'red' },
    { id: 'technical', name: 'Technical Support', icon: Settings, color: 'gray' }
  ];

  const tickets = supportTickets || [];
  const displayFaqs = supportFAQs || [];
  const displayVideos = supportVideos || [];
  const displayResources = supportResources || [];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(l => ({
          ...l,
          supportFAQs: true,
          supportTickets: true,
          supportVideos: true,
          supportResources: true,
        }));
        
        const [faqsRes, ticketsRes, videosRes, resourcesRes] = await Promise.allSettled([
          api.fetchSupportFAQs(),
          api.fetchSupportTickets(),
          api.fetchSupportVideos(),
          api.fetchSupportResources()
        ]);
        
        if (faqsRes.status === 'fulfilled') setSupportFAQs(faqsRes.value.data.data || []);
        if (ticketsRes.status === 'fulfilled') setSupportTickets(ticketsRes.value.data.data || []);
        if (videosRes.status === 'fulfilled') setSupportVideos(videosRes.value.data.data || []);
        if (resourcesRes.status === 'fulfilled') setSupportResources(resourcesRes.value.data.data || []);
      } catch (err) {
        toast.error("Failed to fetch some support data.");
      } finally {
        setLoading(l => ({
          ...l,
          supportFAQs: false,
          supportTickets: false,
          supportVideos: false,
          supportResources: false,
        }));
      }
    };
    fetchData();
  }, []);

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }
    try {
      const res = await api.createSupportTicket(newTicket);
      setSupportTickets([...supportTickets, res.data.data]);
      toast.success('Support ticket created successfully');
      setShowNewTicketModal(false);
      setNewTicket({ subject: '', category: '', priority: 'medium', message: '', attachments: [] });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create ticket');
    }
  };

  const handleAddMessage = async () => {
    if (!ticketMessage.trim()) return;
    try {
      const ticketId = selectedTicket._id || selectedTicket.id;
      const res = await api.addTicketMessage(ticketId, { message: ticketMessage });
      const updatedTicket = res.data.data;
      setSupportTickets(supportTickets.map(t => (t._id || t.id) === (updatedTicket._id || updatedTicket.id) ? updatedTicket : t));
      setSelectedTicket(updatedTicket);
      setTicketMessage('');
      toast.success('Message sent');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    }
  };

  const handleFaqHelpful = async (faqId, isHelpful) => {
    if (feedback[faqId]) return;
    try {
      await api.submitFAQFeedback(faqId, { isHelpful });
      setSupportFAQs(supportFAQs.map(f => {
        if ((f._id || f.id) === faqId) {
          return { ...f, helpfulCount: isHelpful ? (f.helpfulCount || 0) + 1 : f.helpfulCount };
        }
        return f;
      }));
      setFeedback({ ...feedback, [faqId]: isHelpful ? 'helpful' : 'not-helpful' });
      toast.success('Thank you for your feedback!');
    } catch (error) {
      toast.error('Failed to submit feedback');
    }
  };

  const handleCopyLink = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFaqs = displayFaqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-700';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getResourceIcon = (type) => {
    switch (type) {
      case 'PDF': return FileText;
      case 'DOC': return FileText;
      case 'VIDEO': return Video;
      default: return Download;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Help & Support</h1>
          <p className="text-sm text-gray-500 mt-1">Get help, browse resources, and contact support</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewTicketModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <MessageSquare className="w-4 h-4" />
            Create Ticket
          </button>
          <button
            onClick={() => window.location.href = 'mailto:support@graphura.com'}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Mail className="w-4 h-4" />
            Email Support
          </button>
          <button
            onClick={() => window.location.href = 'tel:+911234567890'}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Phone className="w-4 h-4" />
            Call Support
          </button>
        </div>
      </div>

      {/* Support Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-3"><HelpCircle className="w-8 h-8 opacity-80" /><div><p className="text-2xl font-bold">24/7</p><p className="text-sm opacity-90">Support Available</p></div></div>
          <p className="text-xs opacity-80">Our team is here to help anytime</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex items-center gap-3"><div className="p-2 bg-yellow-100 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div><div><p className="text-2xl font-bold text-gray-800">{tickets.filter(t => t.status !== 'resolved').length}</p><p className="text-xs text-gray-500">Pending Tickets</p></div></div></div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-lg"><CheckCircle className="w-5 h-5 text-blue-600" /></div><div><p className="text-2xl font-bold text-gray-800">{tickets.length > 0 ? (tickets.filter(t => t.status === 'resolved').length / tickets.length * 100).toFixed(0) : 100}%</p><p className="text-xs text-gray-500">Resolution Rate</p></div></div></div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"><div className="flex items-center gap-3"><div className="p-2 bg-purple-100 rounded-lg"><Users className="w-5 h-5 text-purple-600" /></div><div><p className="text-2xl font-bold text-gray-800">{tickets.filter(t => t.status === 'resolved').length}</p><p className="text-xs text-gray-500">Tickets Resolved</p></div></div></div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
          {[
            { id: 'faq', name: 'FAQ', icon: HelpCircle },
            { id: 'tickets', name: 'My Tickets', icon: MessageSquare },
            { id: 'videos', name: 'Video Tutorials', icon: Video },
            { id: 'resources', name: 'Resources', icon: FileText },
            { id: 'contact', name: 'Contact Us', icon: Phone }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-3 px-1 flex items-center gap-2 transition-colors ${activeTab === tab.id ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              <tab.icon className="w-4 h-4" /> {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Search FAQs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg" /></div>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-2 border rounded-lg"><option value="all">All Categories</option>{faqCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-2">
                {faqCategories.map((cat) => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${selectedCategory === cat.id ? 'bg-indigo-50 text-indigo-600 border-l-4 border-indigo-600' : 'hover:bg-gray-50'}`}>
                    <cat.icon className="w-5 h-5" /> {cat.name}
                  </button>
                ))}
              </div>

              <div className="lg:col-span-3 space-y-4">
                {loading.supportFAQs ? (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500">
                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
                    <p>Loading helpful articles...</p>
                  </div>
                ) : filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq) => {
                    const faqId = faq._id || faq.id;
                    return (
                      <motion.div
                        key={faqId}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <button
                          onClick={() => setExpandedFaq(expandedFaq === faqId ? null : faqId)}
                          className="w-full px-6 py-4 flex items-center justify-between text-left"
                        >
                          <span className="font-medium text-gray-900">{faq.question}</span>
                          {expandedFaq === faqId ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <AnimatePresence>
                          {expandedFaq === faqId && (
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: 'auto' }}
                              exit={{ height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-6 pt-2 text-gray-600 border-t border-gray-50">
                                <p className="mb-6 leading-relaxed">{faq.answer}</p>
                                <div className="flex items-center justify-between py-4 border-t border-gray-50">
                                  <div className="flex items-center gap-4 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <ThumbsUp className="w-3 h-3" /> {faq.helpfulCount || 0} helpful
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> Updated {format(new Date(faq.updatedAt || new Date()), 'MMM yyyy')}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">Was this helpful?</span>
                                    {feedback[faqId] ? (
                                      <span className="text-xs font-medium text-indigo-600 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Thanks!
                                      </span>
                                    ) : (
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => handleFaqHelpful(faqId, true)}
                                          className="p-1.5 hover:bg-green-50 rounded-lg text-gray-400 hover:text-green-600 transition-colors"
                                        >
                                          <ThumbsUp className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => handleFaqHelpful(faqId, false)}
                                          className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                                        >
                                          <ThumbsDown className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <HelpCircle className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No articles found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex gap-3"><div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" placeholder="Search tickets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg" /></div></div>
            </div>

            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <div key={ticket._id || ticket.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer" onClick={() => { setSelectedTicket(ticket); setShowTicketModal(true); }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1"><h3 className="font-semibold text-gray-800">{ticket.subject}</h3><p className="text-sm text-gray-500 mt-1 line-clamp-1">{ticket.message}</p><div className="flex items-center gap-3 mt-2"><span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(ticket.priority)}`}>{ticket.priority}</span><span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(ticket.status)}`}>{ticket.status}</span><span className="text-xs text-gray-400">Updated {ticket.updatedAt ? format(new Date(ticket.updatedAt), 'dd MMM yyyy') : 'Recently'}</span></div></div>
                    <div className="flex gap-2"><button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><MessageSquare className="w-4 h-4" /></button></div>
                  </div>
                </div>
              ))}
              {filteredTickets.length === 0 && (<div className="text-center py-12"><MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" /><p className="text-gray-500">No tickets found</p><button onClick={() => setShowNewTicketModal(true)} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Create New Ticket</button></div>)}
            </div>
          </div>
        )}

        {/* Video Tutorials Tab */}
        {activeTab === 'videos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading.supportVideos ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
                <p>Loading video tutorials...</p>
              </div>
            ) : displayVideos.length > 0 ? (
              displayVideos.map((video) => (
                <div key={video._id || video.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="relative h-40 bg-gray-900 flex items-center justify-center cursor-pointer group" onClick={() => window.open(video.url, '_blank')}>
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Video className="w-6 h-6 text-indigo-600 ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">{video.duration}</div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 line-clamp-2">{video.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{video.category}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <Video className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No video tutorials available</p>
              </div>
            )}
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            {loading.supportResources ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-500">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-600" />
                <p>Loading resources...</p>
              </div>
            ) : displayResources.length > 0 ? (
              <div className="space-y-3">
                {displayResources.map((resource) => {
                  const Icon = getResourceIcon(resource.type);
                  return (
                    <div key={resource._id || resource.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-800">{resource.title}</p>
                          <p className="text-xs text-gray-500">{resource.type} • {resource.size} • {resource.downloadsCount || 0} downloads</p>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(resource.fileUrl, '_blank')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                      >
                        <Download className="w-4 h-4" /> Download
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-gray-500 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <FileText className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No resources found</p>
              </div>
            )}
          </div>
        )}

        {/* Contact Tab */}
        {activeTab === 'contact' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><Mail className="w-5 h-5 text-indigo-600" /><div><p className="font-medium">Email Support</p><p className="text-sm text-gray-600">support@graphura.com</p><p className="text-xs text-gray-500">Response within 24 hours</p></div></div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><Phone className="w-5 h-5 text-indigo-600" /><div><p className="font-medium">Phone Support</p><p className="text-sm text-gray-600">+91 1234567890</p><p className="text-xs text-gray-500">Mon-Fri, 9AM-6PM IST</p></div></div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><MessageSquare className="w-5 h-5 text-indigo-600" /><div><p className="font-medium">Live Chat</p><p className="text-sm text-gray-600">Available 24/7</p><p className="text-xs text-gray-500">Click the chat icon in bottom right</p></div></div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Office Hours</h3>
              <div className="space-y-3"><div className="flex justify-between"><span>Monday - Friday</span><span>9:00 AM - 6:00 PM</span></div><div className="flex justify-between"><span>Saturday</span><span>10:00 AM - 4:00 PM</span></div><div className="flex justify-between"><span>Sunday</span><span>Closed</span></div><div className="mt-4 pt-4 border-t"><p className="text-sm text-gray-600">Emergency support available 24/7 for critical issues</p></div></div>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Details Modal */}
      <AnimatePresence>
        {showTicketModal && selectedTicket && (() => {
          const liveTicket = tickets.find(t => (t._id === selectedTicket._id || t.id === selectedTicket.id)) || selectedTicket;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowTicketModal(false)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">{liveTicket.subject}</h2>
                      <p className="text-sm text-indigo-200">Ticket #{liveTicket._id || liveTicket.id}</p>
                    </div>
                    <button onClick={() => setShowTicketModal(false)} className="p-2 hover:bg-white/10 rounded-lg">
                      <XCircle className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
                  <div className="flex gap-3 mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(liveTicket.priority)}`}>{liveTicket.priority}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(liveTicket.status)}`}>{liveTicket.status}</span>
                    <span className="text-xs text-gray-500">Created {liveTicket.createdAt ? format(new Date(liveTicket.createdAt), 'PPP') : 'Recently'}</span>
                  </div>
                  <div className="space-y-4 mb-4">
                    <h3 className="font-medium text-gray-700">Conversation</h3>
                    {liveTicket.messages?.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.isStaff ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-3 ${msg.isStaff ? 'bg-gray-100' : 'bg-indigo-600 text-white'}`}>
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs mt-1 opacity-70">{msg.sender} • {format(new Date(msg.timestamp || new Date()), 'dd MMM h:mm a')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <textarea rows="2" value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} placeholder="Type your message..." className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={handleAddMessage} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* New Ticket Modal */}
      <AnimatePresence>{showNewTicketModal && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowNewTicketModal(false)}><motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}><div className="p-6"><h3 className="text-lg font-bold mb-2">Create Support Ticket</h3><p className="text-sm text-gray-500 mb-4">Describe your issue and we'll help you resolve it</p><div className="space-y-4"><div><label className="block text-sm font-medium mb-1">Subject</label><input type="text" value={newTicket.subject} onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div><div><label className="block text-sm font-medium mb-1">Category</label><select value={newTicket.category} onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg"><option value="">Select category</option><option value="school-management">School Management</option><option value="user-management">User Management</option><option value="subscriptions">Subscriptions</option><option value="technical">Technical Issue</option></select></div><div><label className="block text-sm font-medium mb-1">Priority</label><select value={newTicket.priority} onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })} className="w-full px-3 py-2 border rounded-lg"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div><div><label className="block text-sm font-medium mb-1">Message</label><textarea rows="4" value={newTicket.message} onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })} placeholder="Please describe your issue in detail..." className="w-full px-3 py-2 border rounded-lg" /></div></div><div className="flex gap-3 mt-6"><button onClick={() => setShowNewTicketModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button><button onClick={handleCreateTicket} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg">Submit Ticket</button></div></div></motion.div></div>)}</AnimatePresence>
    </div>
  );
};

export default GraphuraSupport;