import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, Send, CheckCheck, MessageSquare, 
  Users, UserCheck, ShieldAlert, ArrowLeft, User
} from 'lucide-react';
import Card from '../../components/teacher/Card';
import { fetchContacts, fetchChatHistory, sendMessage, setActiveUser } from '../../features/teacher/teacherMessageSlice';

const Messages = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);
  
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'parents' | 'staff'

  const { 
    contacts, 
    activeChat, 
    activeUserId, 
    loading, 
    chatLoading 
  } = useSelector((state) => state.teacherMessage || {});

  // Fetch contacts on mount and setup polling every 4 seconds
  useEffect(() => {
    dispatch(fetchContacts());
    const interval = setInterval(() => {
      dispatch(fetchContacts());
    }, 4000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Handle 'to' query param to auto-select conversation
  useEffect(() => {
    const toUserId = searchParams.get('to');
    if (toUserId) {
      dispatch(setActiveUser(toUserId));
    }
  }, [searchParams, dispatch]);

  // Fetch chat history and setup polling every 4 seconds when a chat is active
  useEffect(() => {
    if (activeUserId) {
      dispatch(fetchChatHistory(activeUserId));
      const interval = setInterval(() => {
        dispatch(fetchChatHistory(activeUserId));
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeUserId, dispatch]);

  // Auto-scroll to the bottom of the chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeUserId) return;

    await dispatch(sendMessage({ receiverId: activeUserId, text: inputText }));
    setInputText('');
    dispatch(fetchContacts()); // Refresh sidebar message snippet instantly
  };

  // Safe fallback arrays
  const safeStudents = contacts?.students || [];
  const safeParents = contacts?.parents || [];
  const safeStaff = contacts?.staff || [];

  // Filter based on active tab and search query
  const getFilteredContacts = () => {
    const query = searchQuery.toLowerCase();
    switch (activeTab) {
      case 'students':
        return safeStudents.filter(c => 
          c.name?.toLowerCase().includes(query) || 
          c.rollNo?.toLowerCase().includes(query) || 
          c.className?.toLowerCase().includes(query)
        );
      case 'parents':
        return safeParents.filter(c => 
          c.name?.toLowerCase().includes(query) || 
          c.studentName?.toLowerCase().includes(query)
        );
      case 'staff':
        return safeStaff.filter(c => 
          c.name?.toLowerCase().includes(query) || 
          c.designation?.toLowerCase().includes(query)
        );
      default:
        return [];
    }
  };

  const filteredContacts = getFilteredContacts();

  // Find the details of the active user across all categories
  const getActiveUser = () => {
    if (!activeUserId) return null;
    const all = [...safeStudents, ...safeParents, ...safeStaff];
    return all.find(c => c.id === activeUserId);
  };

  const activeUser = getActiveUser();

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  // Helper to format timestamps
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className={`mb-0 ${activeUserId ? 'hidden lg:block' : 'block'}`}>
        <h1 className="text-3xl font-bold text-gray-900">Communication Center</h1>
        <p className="mt-1 text-sm text-gray-500">Securely message assigned students, parents, and school staff.</p>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col lg:flex-row border border-gray-200 shadow-sm rounded-2xl bg-white">
        
        {/* LEFT SIDEBAR: CONVERSATION LIST */}
        <div className={`w-full lg:w-80 xl:w-96 border-r border-gray-100 flex-col h-full ${activeUserId ? 'hidden lg:flex' : 'flex'}`}>
          
          {/* TABS */}
          <div className="flex border-b border-gray-100 p-2 gap-1 bg-gray-50/50 shrink-0">
            <button
              onClick={() => { setActiveTab('students'); setSearchQuery(''); }}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'students' 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Students
            </button>
            <button
              onClick={() => { setActiveTab('parents'); setSearchQuery(''); }}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'parents' 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Parents
            </button>
            <button
              onClick={() => { setActiveTab('staff'); setSearchQuery(''); }}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'staff' 
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Staff
            </button>
          </div>

          {/* SEARCH BAR */}
          <div className="p-4 border-b border-gray-50 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* CONTACTS LIST */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">Loading directory...</div>
            ) : filteredContacts.length > 0 ? (
              filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => dispatch(setActiveUser(contact.id))}
                  className={`w-full text-left p-4 border-b border-gray-50 transition-all hover:bg-gray-50/80 flex items-start gap-3 relative ${
                    activeUserId === contact.id ? 'bg-blue-50/50' : ''
                  }`}
                >
                  {activeUserId === contact.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-md" />
                  )}
                  
                  {/* Photo / Avatar */}
                  <div className="relative shrink-0 mt-0.5">
                    {contact.photo ? (
                      <img src={contact.photo} alt={contact.name} className="h-10 w-10 rounded-full object-cover border border-gray-100 shadow-sm" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-sm border border-blue-200 shadow-sm">
                        {getInitials(contact.name)}
                      </div>
                    )}
                    {contact.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate pr-2 flex-1 min-w-0">{contact.name}</p>
                      {contact.lastMessageTime && (
                        <p className="text-[10px] font-medium text-gray-400 shrink-0">{formatTime(contact.lastMessageTime)}</p>
                      )}
                    </div>

                    {/* Metadata Sub-labels */}
                    {activeTab === 'students' && (
                      <p className="text-[10px] text-gray-500 font-medium truncate mb-1">
                        Class: {contact.className} • Roll: {contact.rollNo}
                      </p>
                    )}
                    {activeTab === 'parents' && (
                      <p className="text-[10px] text-gray-500 font-medium truncate mb-1">
                        Student: {contact.studentName}
                      </p>
                    )}
                    {activeTab === 'staff' && (
                      <p className="text-[10px] text-gray-500 font-medium truncate mb-1">
                        {contact.designation}
                      </p>
                    )}

                    <p className={`text-xs truncate ${contact.unread > 0 ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                      {contact.lastMessage || <span className="italic text-gray-300">No messages yet</span>}
                    </p>
                  </div>
                  
                  {/* Unread Badge */}
                  {contact.unread > 0 && (
                    <div className="shrink-0 h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-500/30 self-center">
                      <span className="text-[9px] font-bold text-white">{contact.unread}</span>
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-gray-400 flex flex-col items-center justify-center">
                <User className="h-8 w-8 text-gray-200 mb-2" />
                <p>No contacts found in {activeTab}.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT AREA: ACTIVE CHAT */}
        <div className={`flex-1 flex-col bg-gray-50/20 ${!activeUserId ? 'hidden lg:flex' : 'flex'}`}>
          {activeUserId && activeUser ? (
            <>
              {/* Chat Header */}
              <div className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm shadow-gray-50">
                <div className="flex items-center gap-3">
                  
                  {/* Back Button for mobile */}
                  <button 
                    onClick={() => dispatch(setActiveUser(null))} 
                    className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full mr-1 transition-all"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  {activeUser.photo ? (
                    <img src={activeUser.photo} alt={activeUser.name} className="h-9 w-9 rounded-full object-cover border border-gray-100" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 font-bold text-xs border border-blue-200">
                      {getInitials(activeUser.name)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 leading-tight">{activeUser.name}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mt-0.5">
                      {activeUser.role === 'student' ? `Student (${activeUser.className})` : activeUser.role === 'parent' ? `Parent of ${activeUser.studentName}` : activeUser.designation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                {chatLoading && activeChat.length === 0 ? (
                  <div className="text-center text-sm text-gray-400 py-10">Loading message log...</div>
                ) : activeChat.length > 0 ? (
                  activeChat.map((msg, index) => {
                    const isMe = msg.sender === 'me';
                    
                    return (
                      <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div 
                          className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            isMe 
                              ? 'bg-blue-600 text-white rounded-tr-none shadow-sm shadow-blue-500/20' 
                              : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 px-1">
                          <span className="text-[9px] font-medium text-gray-400">{msg.time}</span>
                          {isMe && (
                            <CheckCheck className={`h-3.5 w-3.5 ${msg.status === 'read' ? 'text-emerald-500' : 'text-gray-300'}`} />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-sm text-gray-400 py-16 flex flex-col items-center">
                    <MessageSquare className="h-12 w-12 text-gray-200 mb-3" />
                    <p className="font-bold">No messages here yet</p>
                    <p className="text-xs text-gray-400 mt-1">Send a message to kickstart the conversation.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                <form onSubmit={handleSend} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Write a message..."
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-gray-400"
                  />
                  <button 
                    type="submit" 
                    disabled={!inputText.trim()}
                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0"
                  >
                    <Send className="h-4.5 w-4.5 ml-0.5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State (No Chat Selected) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/10">
              <div className="h-16 w-16 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center mb-4 text-blue-600">
                <MessageSquare className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-gray-900">Select a Conversation</h3>
              <p className="mt-1 text-xs text-gray-500 max-w-sm leading-relaxed">
                Choose a student, parent, or colleague from the left pane to view history and start sending real-time messages.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Messages;