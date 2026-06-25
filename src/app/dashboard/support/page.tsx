"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Headset, CheckCircle, WarningCircle, X, MagnifyingGlass, Plus, Circle, Paperclip } from "@phosphor-icons/react";
import { NewTicketModal } from "@/components/dashboard/NewTicketModal";
import { createClient } from "@/lib/supabase/client";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  admin_reply?: string | null;
  has_unread_admin_reply?: boolean;
  messages?: { sender: 'user' | 'admin', text: string, timestamp: string }[];
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("Any");
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchTickets = async (silentRefetch = false) => {
    if (!silentRefetch) setIsLoading(true);
    try {
      const res = await fetch(`/api/support?t=${Date.now()}`);
      const data = await res.json();
      if (data.tickets) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      if (!silentRefetch) setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  useEffect(() => {
    const channel = supabase.channel('user-support-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, (payload) => {
        // Only fetch if this ticket belongs to the user, but since fetchTickets relies on the server auth, it's safe
        fetchTickets(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    fetchTickets();
  }, []);

  // Compute Stats
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === "Open" || t.status === "In Progress").length;
  const resolvedTickets = tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;
  const urgentTickets = tickets.filter(t => t.priority === "Urgent" && (t.status === "Open" || t.status === "In Progress")).length;

  // Filter Tickets
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || t.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "Any" || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleTicketClick = async (ticket: Ticket) => {
    setExpandedTicketId(expandedTicketId === ticket.id ? null : ticket.id);
    
    // Mark as read if expanding and it has unread reply
    if (expandedTicketId !== ticket.id && ticket.has_unread_admin_reply) {
      try {
        await fetch("/api/support/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId: ticket.id })
        });
        
        // Optimistically update UI
        setTickets(tickets.map(t => t.id === ticket.id ? { ...t, has_unread_admin_reply: false } : t));
      } catch (err) {
        console.error("Failed to mark read:", err);
      }
    }
  };

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim() && !attachment) return;
    setIsReplying(true);

    let attachmentUrl = null;
    if (attachment) {
      setIsUploading(true);
      const fileExt = attachment.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('support_attachments').upload(fileName, attachment);
      setIsUploading(false);
      if (!error && data) {
        attachmentUrl = supabase.storage.from('support_attachments').getPublicUrl(fileName).data.publicUrl;
      }
    }

    try {
      const res = await fetch("/api/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, replyText, attachmentUrl })
      });
      if (res.ok) {
        setReplyText("");
        setAttachment(null);
        await fetchTickets(true); // Silent refetch to get new messages
        setTimeout(scrollToBottom, 100);
      } else {
        const errorData = await res.json();
        alert(`Failed to send reply: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${msg}`);
      console.error("Reply failed:", err);
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 dark:bg-background text-slate-900 dark:text-white p-4 md:p-8 font-sans pb-32 transition-colors duration-500">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Header Section */}
        <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm dark:shadow-none overflow-hidden relative">
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-slate-900 dark:from-white/10 to-transparent pointer-events-none" />
          <div className="flex items-center gap-4 z-10">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-white/60">
              <Headset weight="duotone" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Support Center</h1>
              <p className="text-sm text-slate-500 dark:text-white/40">Track your requests, get help fast.</p>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 text-sm font-bold rounded-full transition-colors shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] z-10"
          >
            <Plus weight="bold" /> New Ticket
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm dark:shadow-none">
            <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white">{totalTickets}</span>
            <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 tracking-widest mt-1 uppercase">Total</p>
          </div>
          <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm dark:shadow-none">
            <span className="text-3xl font-mono font-bold text-brand-blue">{openTickets}</span>
            <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 tracking-widest mt-1 uppercase">Open</p>
          </div>
          <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm dark:shadow-none">
            <span className="text-3xl font-mono font-bold text-slate-900 dark:text-white">{resolvedTickets}</span>
            <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 tracking-widest mt-1 uppercase">Resolved</p>
          </div>
          <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-2xl p-5 shadow-sm dark:shadow-none">
            <span className="text-3xl font-mono font-bold text-red-500">{urgentTickets}</span>
            <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 tracking-widest mt-1 uppercase">Urgent</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-2xl p-3 flex flex-col lg:flex-row gap-4 items-center shadow-sm dark:shadow-none">
          <div className="flex-1 w-full relative">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-slate-900 dark:border-white/50 transition-colors placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
            {/* Status Filters */}
            <div className="flex gap-1 bg-slate-50 dark:bg-[#1A1A1A] p-1 rounded-xl border border-black/5 dark:border-white/5">
              {["All", "Open", "In Progress", "Resolved", "Closed"].map((s) => (
                <button 
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap ${statusFilter === s ? 'bg-slate-900 dark:bg-white text-white dark:text-black' : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            {/* Priority Filters */}
            <div className="flex gap-1 bg-slate-50 dark:bg-[#1A1A1A] p-1 rounded-xl border border-black/5 dark:border-white/5">
              {["Any", "Urgent", "High", "Normal", "Low"].map((p) => {
                const colorClass = p === 'Urgent' ? 'text-red-500' : p === 'High' ? 'text-orange-500' : p === 'Normal' ? 'text-brand-blue' : p === 'Low' ? 'text-purple-500' : 'text-slate-400';
                return (
                  <button 
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap ${priorityFilter === p ? (p === 'Any' ? 'bg-slate-900 dark:bg-white text-white dark:text-black' : 'bg-white/10 text-white') : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    {p !== 'Any' && <Circle weight="fill" size={8} className={priorityFilter === p ? '' : colorClass} />}
                    {p}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 border-dashed rounded-3xl min-h-[400px] shadow-sm dark:shadow-none p-4 md:p-6">
          {isLoading ? (
            <div className="w-full h-full min-h-[300px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center gap-4 text-slate-400 dark:text-white/30">
              <Headset weight="duotone" size={48} className="opacity-50" />
              <div className="text-center">
                <h3 className="text-slate-900 dark:text-white font-bold text-lg">No tickets yet</h3>
                <p className="text-sm mt-1">Create a ticket and we'll respond as soon as possible.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-2 flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 text-sm font-bold rounded-full transition-colors shadow-[0_0_20px_rgba(34,197,94,0.2)]"
              >
                <Plus weight="bold" /> Open a Ticket
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredTickets.map(t => {
                const isExpanded = expandedTicketId === t.id;
                const messages = t.messages || [];
                
                return (
                  <div 
                    key={t.id} 
                    className={`w-full text-left bg-slate-50 dark:bg-[#1A1A1A] border ${t.has_unread_admin_reply ? 'border-brand-blue shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-black/5 dark:border-white/5'} rounded-xl transition-all duration-300 hover:border-slate-300 dark:hover:border-white/20`}
                  >
                    <div 
                      onClick={() => handleTicketClick(t)}
                      className="p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-slate-400">#{t.id.split('-')[0]}</span>
                          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                            t.status === 'Open' ? 'bg-brand-blue/10 text-brand-blue' :
                            t.status === 'In Progress' ? 'bg-orange-500/10 text-orange-500' :
                            'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/40'
                          }`}>
                            {t.status}
                          </div>
                          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                            t.priority === 'Urgent' ? 'bg-red-500/10 text-red-500' :
                            t.priority === 'High' ? 'bg-orange-500/10 text-orange-500' :
                            'bg-brand-blue/10 text-brand-blue'
                          }`}>
                            {t.priority}
                          </div>
                          {t.has_unread_admin_reply && (
                            <div className="px-2 py-0.5 rounded bg-brand-blue text-white text-[10px] font-bold uppercase tracking-widest animate-pulse">
                              New Reply
                            </div>
                          )}
                        </div>
                        <h3 className="font-medium text-slate-900 dark:text-white">{t.subject}</h3>
                        <p className="text-sm text-slate-500 dark:text-white/50 line-clamp-1">{t.message}</p>
                      </div>
                      <div className="text-xs font-mono text-slate-400 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-black/5 dark:border-white/5"
                        >
                          <div className="p-5 bg-white dark:bg-[#111] rounded-b-xl flex flex-col gap-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {/* Original Ticket Text (Always First) */}
                            <div className="flex flex-col items-end gap-1 w-full">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mr-1">You</span>
                              <div className="max-w-[80%] p-3 text-sm bg-brand-blue text-white rounded-2xl rounded-tr-sm shadow-sm">
                                {t.message}
                              </div>
                            </div>
                            
                            {/* Legacy Admin Reply (if it exists and isn't part of the messages array) */}
                            {t.admin_reply && (
                              <div className="flex flex-col items-start gap-1 w-full">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest ml-1">Admin</span>
                                <div className="max-w-[80%] p-3 text-sm bg-slate-100 dark:bg-[#222] text-slate-900 dark:text-white rounded-2xl rounded-tl-sm border border-black/5 dark:border-white/5 shadow-sm">
                                  {t.admin_reply}
                                </div>
                              </div>
                            )}

                            {/* Chat History Array */}
                            {messages.map((msg, idx) => (
                              <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} gap-1 w-full`}>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mx-1">
                                  {msg.sender === 'user' ? 'You' : 'Admin'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                                <div className={`max-w-[80%] p-3 text-sm shadow-sm ${
                                  msg.sender === 'user' 
                                    ? 'bg-brand-blue text-white rounded-2xl rounded-tr-sm' 
                                    : 'bg-slate-100 dark:bg-[#222] text-slate-900 dark:text-white rounded-2xl rounded-tl-sm border border-black/5 dark:border-white/5'
                                }`}>
                                  {msg.text}
                                  {msg.attachment_url && (
                                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mt-2">
                                      <img src={msg.attachment_url} alt="Attachment" className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                            <div ref={chatEndRef} />

                            {/* Reply Input */}
                            {t.status !== 'Closed' && t.status !== 'Resolved' && (
                              <div className="mt-4 flex flex-col gap-2">
                                {attachment && (
                                  <div className="flex items-center justify-between bg-brand-blue/10 text-brand-blue px-3 py-2 rounded-lg text-xs font-medium w-fit">
                                    <div className="flex items-center gap-2">
                                      <Paperclip size={14} />
                                      {attachment.name}
                                    </div>
                                    <button onClick={() => setAttachment(null)} className="ml-4 hover:text-red-500">
                                      <X size={14} weight="bold" />
                                    </button>
                                  </div>
                                )}
                                <div className="flex gap-2 items-center">
                                  <label className="cursor-pointer p-2 text-slate-400 hover:text-brand-blue transition-colors">
                                    <Paperclip size={20} weight="bold" />
                                    <input 
                                      type="file" 
                                      accept="image/png, image/jpeg, image/webp" 
                                      className="hidden" 
                                      onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                                    />
                                  </label>
                                  <input 
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your reply..."
                                    className="flex-1 bg-slate-50 dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 rounded-xl px-4 py-2 text-sm outline-none focus:border-brand-blue transition-colors text-slate-900 dark:text-white placeholder:text-slate-400"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleReply(t.id);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleReply(t.id)}
                                    disabled={isReplying || (!replyText.trim() && !attachment) || isUploading}
                                    className="px-4 py-2 bg-brand-blue hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors"
                                  >
                                    {isReplying || isUploading ? '...' : 'Send'}
                                  </button>
                                </div>
                              </div>
                            )}
                            {(t.status === 'Closed' || t.status === 'Resolved') && (
                              <div className="mt-4 p-3 bg-slate-50 dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 rounded-xl text-center text-xs text-slate-500">
                                This ticket has been marked as {t.status.toLowerCase()}. You cannot reply.
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {isModalOpen && (
        <NewTicketModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            fetchTickets();
          }} 
        />
      )}
    </div>
  );
}
