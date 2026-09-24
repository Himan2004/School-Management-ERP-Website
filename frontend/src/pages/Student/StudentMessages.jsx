import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, Send, CheckCheck, MessageSquare, 
  ArrowLeft, User, GraduationCap
} from 'lucide-react';
import Card from '../../components/teacher/Card';
import { fetchContacts, fetchChatHistory, sendMessage, setActiveUser } from '../../features/teacher/teacherMessageSlice';

const StudentMessages = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);
  
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Handle 'conversation' or 'to' query param to auto-select conversation
  useEffect(() => {
    const toUserId = searchParams.get('conversation') || searchParams.get('to');
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
    dispatch(fetchContacts()); // Refresh sidebar snippet instantly
  };

  // Safe fallback arrays (for students, contacts contains 'teachers')
  const safeTeachers = contacts?.teachers || [];

  // Filter based on search query
  const filteredTeachers = safeTeachers.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find the details of the active teacher
  const activeTeacher = safeTeachers.find(c => c.id === activeUserId);

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
        <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
        <p className="mt-1 text-sm text-gray-500">Communicate directly with your assigned class teachers.</p>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col lg:flex-row border border-gray-200 shadow-sm rounded-2xl bg-white">
        
        {/* LEFT SIDEBAR: TEACHERS LIST */}
        <div className={`w-full lg:w-80 xl:w-96 border-r border-gray-100 flex-col h-full ${activeUserId ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Your Teachers</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search teachers or subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* TEACHERS DIRECTORY LIST */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading && filteredTeachers.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading directory...</div>
            ) : filteredTeachers.length > 0 ? (
              filteredTeachers.map((teacher) => (
                <button
                  key={teacher.id}
                  onClick={() => dispatch(setActiveUser(teacher.id))}
                  className={`w-full text-left p-4 border-b border-gray-50 transition-all hover:bg-gray-50/80 flex items-start gap-3 relative ${
                    activeUserId === teacher.id ? 'bg-indigo-50/30' : ''
                  }`}
                >
                  {activeUserId === teacher.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r-md" />
                  )}
                  
                  {/* Avatar */}
                  <div className="relative shrink-0 mt-0.5">
                    {teacher.photo ? (
                      <img src={teacher.photo} alt={teacher.name} className="h-10 w-10 rounded-full object-cover border border-gray-100 shadow-sm" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-xs border border-indigo-200 shadow-sm">
                        {getInitials(teacher.name)}
                      </div>
                    )}
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate pr-2 flex-1 min-w-0">{teacher.name}</p>
                      {teacher.lastMessageTime && (
                        <p className="text-[9px] font-medium text-gray-400 shrink-0">{formatTime(teacher.lastMessageTime)}</p>
                      )}
                    </div>
                    
                    <p className="text-[10px] text-indigo-600 font-semibold truncate mb-1">
                      {teacher.subject} • {teacher.designation || 'Teacher'}
                    </p>

                    <p className={`text-xs truncate ${teacher.unread > 0 ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                      {teacher.lastMessage || <span className="italic text-gray-300">No messages yet</span>}
                    </p>
                  </div>
                  
                  {/* Unread Badge */}
                  {teacher.unread > 0 && (
                    <div className="shrink-0 h-4.5 w-4.5 rounded-full bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-500/30 self-center">
                      <span className="text-[8px] font-bold text-white">{teacher.unread}</span>
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-gray-400 flex flex-col items-center justify-center">
                <GraduationCap className="h-8 w-8 text-gray-200 mb-2" />
                <p>No teachers found.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT AREA: ACTIVE CHAT */}
        <div className={`flex-1 flex-col bg-gray-50/20 ${!activeUserId ? 'hidden lg:flex' : 'flex'}`}>
          {activeUserId && activeTeacher ? (
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

                  {activeTeacher.photo ? (
                    <img src={activeTeacher.photo} alt={activeTeacher.name} className="h-9 w-9 rounded-full object-cover border border-gray-100" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-xs border border-indigo-200">
                      {getInitials(activeTeacher.name)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xs font-bold text-gray-900 leading-tight">{activeTeacher.name}</h2>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 mt-0.5">
                      {activeTeacher.subject} • {activeTeacher.designation || 'Teacher'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                {chatLoading && activeChat.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 py-10">Loading message log...</div>
                ) : activeChat.length > 0 ? (
                  activeChat.map((msg, index) => {
                    const isMe = msg.sender === 'me';
                    
                    return (
                      <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div 
                          className={`max-w-[70%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                            isMe 
                              ? 'bg-indigo-600 text-white rounded-tr-none shadow-sm shadow-indigo-500/20' 
                              : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 px-1">
                          <span className="text-[8px] font-medium text-gray-400">{msg.time}</span>
                          {isMe && (
                            <CheckCheck className={`h-3 w-3 ${msg.status === 'read' ? 'text-emerald-500' : 'text-gray-300'}`} />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-xs text-gray-400 py-16 flex flex-col items-center">
                    <MessageSquare className="h-12 w-12 text-gray-200 mb-3" />
                    <p className="font-bold">No messages here yet</p>
                    <p className="text-xs text-gray-400 mt-1">Send a message to start communicating.</p>
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
                    className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-5.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                  />
                  <button 
                    type="submit" 
                    disabled={!inputText.trim()}
                    className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0"
                  >
                    <Send className="h-4.5 w-4.5 ml-0.5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Empty State (No Chat Selected) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/10">
              <div className="h-16 w-16 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center mb-4 text-indigo-600">
                <MessageSquare className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Select a Teacher</h3>
              <p className="mt-1 text-xs text-gray-500 max-w-sm leading-relaxed">
                Choose a teacher from the left directory to view chat history and start a secure conversation.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StudentMessages;
