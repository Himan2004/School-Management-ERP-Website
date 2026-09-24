import React, { useState, useEffect, useRef } from "react";
import { X, Send, Clock, User, AlertCircle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getTicketDetails, updateTicket } from "../../../services/api/commonTicketApi.js";

const TicketDetailsModal = ({ isOpen, onClose, ticketId, onTicketUpdated }) => {
  const [ticket, setTicket] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch full details when the modal opens
  useEffect(() => {
    if (isOpen && ticketId) {
      fetchDetails();
    }
  }, [isOpen, ticketId]);

  // Auto-scroll to the bottom of the messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket?.responses]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const response = await getTicketDetails(ticketId);
      if (response.success) {
        setTicket(response.data);
      }
    } catch (error) {
      toast.error("Failed to load ticket details.");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setIsSending(true);
    try {
      const response = await updateTicket(ticketId, { message: replyMessage });
      if (response.success) {
        setReplyMessage("");
        setTicket(response.data); // Update the local view with the new message
        onTicketUpdated(response.data); // Update the parent list view
      }
    } catch (error) {
      toast.error(error.message || "Failed to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkResolved = async () => {
    try {
      const response = await updateTicket(ticketId, { status: "resolved", resolutionNote: "Resolved by Admin" });
      if (response.success) {
        toast.success("Ticket marked as resolved!");
        setTicket(response.data);
        onTicketUpdated(response.data);
      }
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl h-[85vh] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {isLoading ? "Loading..." : ticket?.title}
            </h2>
            {!isLoading && ticket && (
              <div className="flex items-center gap-3 mt-1 text-xs font-medium text-slate-500">
                <span className="uppercase tracking-wider">#{ticket._id.slice(-6)}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className={`uppercase ${
                  ticket.status === 'open' ? 'text-red-600' : 
                  ticket.status === 'in_progress' ? 'text-blue-600' : 'text-green-600'
                }`}>
                  {ticket.status.replace("_", " ")}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chat / Details Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar flex flex-col gap-6">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#223F74]"></div>
            </div>
          ) : (
            <>
              {/* Original Description (First Message) */}
              <div className="flex flex-col gap-1 max-w-[85%] self-start">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 ml-1">
                  <User size={14} />
                  <span className="font-semibold text-slate-700">{ticket.raisedBy?.name || "User"}</span>
                  <span>•</span>
                  <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <div className="bg-white border border-slate-200 text-slate-700 p-4 rounded-2xl rounded-tl-sm shadow-sm text-sm whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </div>
              </div>

              {/* Responses Mapping */}
              {ticket.responses?.map((resp, index) => {
                // Assuming you have the current user's ID to determine alignment, 
                // but for now, let's alternate based on role or simple logic.
                // If it's a response from the person who raised it, put it on left, else right.
                const isCreator = resp.user?._id === ticket.raisedBy?._id;

                return (
                  <div key={index} className={`flex flex-col gap-1 max-w-[85%] ${isCreator ? "self-start" : "self-end"}`}>
                    <div className={`flex items-center gap-2 text-xs text-slate-500 mb-1 mx-1 ${isCreator ? "" : "flex-row-reverse"}`}>
                      <User size={14} />
                      <span className="font-semibold text-slate-700">{resp.user?.name || "Support Team"}</span>
                      <span>•</span>
                      <span>{new Date(resp.createdAt).toLocaleString()}</span>
                    </div>
                    <div className={`p-4 rounded-2xl shadow-sm text-sm whitespace-pre-wrap leading-relaxed ${
                      isCreator 
                        ? "bg-white border border-slate-200 text-slate-700 rounded-tl-sm" 
                        : "bg-[#223F74] text-white rounded-tr-sm"
                    }`}>
                      {resp.message}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Footer / Reply Box */}
        {!isLoading && ticket && (
          <div className="p-4 bg-white border-t border-slate-100">
            {ticket.status === "closed" || ticket.status === "resolved" ? (
              <div className="flex items-center justify-center gap-2 text-slate-500 bg-slate-50 py-3 rounded-lg border border-slate-200">
                <CheckCircle size={18} className="text-green-500" />
                <span className="text-sm font-semibold">This ticket is resolved and closed to new replies.</span>
              </div>
            ) : (
              <form onSubmit={handleSendReply} className="flex items-end gap-3">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply..."
                  className="flex-1 max-h-32 min-h-[44px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#223F74]/20 focus:border-[#223F74] resize-none custom-scrollbar"
                  rows="1"
                  required
                />
                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={isSending || !replyMessage.trim()}
                    className="flex items-center justify-center w-11 h-11 bg-[#223F74] hover:bg-blue-800 text-white rounded-xl transition-colors disabled:opacity-50"
                  >
                    {isSending ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <Send size={18} className="ml-1" />
                    )}
                  </button>
                </div>
              </form>
            )}
            
            {/* Quick Actions for Help Desk Tab */}
            {ticket.status !== "resolved" && ticket.status !== "closed" && (
               <div className="mt-3 flex justify-between items-center px-1">
                 <button 
                   type="button" 
                   onClick={handleMarkResolved}
                   className="text-xs font-semibold text-green-600 hover:text-green-700 transition-colors"
                 >
                   Mark as Resolved
                 </button>
               </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default TicketDetailsModal;