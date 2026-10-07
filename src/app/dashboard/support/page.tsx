"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Headset, 
  CheckCircle, 
  WarningCircle, 
  X, 
  MagnifyingGlass, 
  Plus, 
  Circle, 
  Paperclip,
  PaperPlaneRight,
  ChatCircleDots
} from "@phosphor-icons/react";
import { NewTicketModal } from "@/components/dashboard/NewTicketModal";
import { createClient } from "@/lib/supabase/client";

interface TicketMessage {
  sender: 'user' | 'admin';
  text: string;
  timestamp: string;
  attachment_url?: string | null;
}

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  created_at: string;
  admin_reply?: string | null;
  has_unread_admin_reply?: boolean;
  messages?: TicketMessage[];
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("Any");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);
  const selectedTicketRef = useRef<Ticket | null>(null);
  selectedTicketRef.current = selectedTicket;

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Lock body scroll and notify floating mobile navigation to hide when chat modal is open
  useEffect(() => {
    if (selectedTicket) {
      document.body.setAttribute("data-modal-open", "true");
    } else {
      document.body.removeAttribute("data-modal-open");
    }
    return () => {
      document.body.removeAttribute("data-modal-open");
    };
  }, [selectedTicket]);

  const fetchTickets = async (silentRefetch = false) => {
    if (!silentRefetch) setIsLoading(true);
    try {
      const res = await fetch(`/api/support?t=${Date.now()}`);
      const data = await res.json();
      if (data.tickets) {
        setTickets(data.tickets);
        // Live sync selectedTicket if open
        if (selectedTicketRef.current) {
          const fresh = data.tickets.find((t: Ticket) => t.id === selectedTicketRef.current?.id);
          if (fresh) {
            setSelectedTicket(fresh);
          }
        }
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
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

  const handleOpenTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setReplyText("");
    setAttachment(null);
    setTimeout(scrollToBottom, 50);

    // Mark as read if it has an unread admin reply
    if (ticket.has_unread_admin_reply) {
      // Optimistically update
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, has_unread_admin_reply: false } : t));
      setSelectedTicket(prev => prev ? { ...prev, has_unread_admin_reply: false } : null);
      try {
        await fetch("/api/support/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticketId: ticket.id })
        });
      } catch (err) {
        console.error("Failed to mark ticket as read:", err);
      }
    }
  };

  const handleReply = async (ticketId: string) => {
    if (isSendingRef.current) return;
    if (!replyText.trim() && !attachment) return;

    isSendingRef.current = true;
    setIsReplying(true);

    const textToSend = replyText.trim();
    const currentAttachment = attachment;

    // Optimistic message dispatch (0ms latency - instant feedback)
    const optimisticMsg: TicketMessage = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
      attachment_url: currentAttachment ? URL.createObjectURL(currentAttachment) : null,
    };

    setSelectedTicket(prev => prev ? {
      ...prev,
      messages: [...(prev.messages || []), optimisticMsg]
    } : null);

    setTickets(prev => prev.map(t => t.id === ticketId ? {
      ...t,
      messages: [...(t.messages || []), optimisticMsg]
    } : t));

    setReplyText("");
    setAttachment(null);
    setTimeout(scrollToBottom, 50);

    let attachmentUrl = null;
    if (currentAttachment) {
      setIsUploading(true);
      try {
        const fileExt = currentAttachment.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { data, error } = await supabase.storage.from('support_attachments').upload(fileName, currentAttachment);
        if (!error && data) {
          attachmentUrl = supabase.storage.from('support_attachments').getPublicUrl(fileName).data.publicUrl;
        }
      } catch (uploadErr) {
        console.error("Attachment upload error:", uploadErr);
      } finally {
        setIsUploading(false);
      }
    }

    try {
      const res = await fetch("/api/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, replyText: textToSend, attachmentUrl })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setSelectedTicket(prev => prev && prev.id === ticketId ? { ...prev, messages: data.messages } : prev);
          setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, messages: data.messages } : t));
        }
        setTimeout(scrollToBottom, 100);
      } else {
        const errorData = await res.json();
        alert(`Failed to send reply: ${errorData.error || 'Unknown error'}`);
        fetchTickets(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${msg}`);
      console.error("Reply failed:", err);
      fetchTickets(true);
    } finally {
      setIsReplying(false);
      isSendingRef.current = false;
    }
  };

  const handleResolveTicket = async (ticketId: string) => {
    try {
      const res = await fetch("/api/support/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status: "Resolved" }),
      });
      if (res.ok) {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: "Resolved" } : t));
        setSelectedTicket(prev => prev && prev.id === ticketId ? { ...prev, status: "Resolved" } : prev);
      } else {
        alert("Failed to update ticket status");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReopenTicket = async (ticketId: string) => {
    try {
      const res = await fetch("/api/support/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status: "Open" }),
      });
      if (res.ok) {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: "Open" } : t));
        setSelectedTicket(prev => prev && prev.id === ticketId ? { ...prev, status: "Open" } : prev);
      } else {
        alert("Failed to update ticket status");
      }
    } catch (err) {
      console.error(err);
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
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 text-sm font-bold rounded-full transition-colors shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] z-10 cursor-pointer"
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
              className="w-full bg-slate-50 dark:bg-[#1A1A1A] border border-black/5 dark:border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-sm outline-none focus:border-slate-900 dark:focus:border-white/50 transition-colors placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
            {/* Status Filters */}
            <div className="flex gap-1 bg-slate-50 dark:bg-[#1A1A1A] p-1 rounded-xl border border-black/5 dark:border-white/5">
              {["All", "Open", "In Progress", "Resolved", "Closed"].map((s) => (
                <button 
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${statusFilter === s ? 'bg-slate-900 dark:bg-white text-white dark:text-black' : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'}`}
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${priorityFilter === p ? (p === 'Any' ? 'bg-slate-900 dark:bg-white text-white dark:text-black' : 'bg-white/10 text-white') : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'}`}
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
                className="mt-2 flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-black hover:bg-slate-800 dark:hover:bg-slate-200 text-sm font-bold rounded-full transition-colors shadow-[0_0_20px_rgba(34,197,94,0.2)] cursor-pointer"
              >
                <Plus weight="bold" /> Open a Ticket
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredTickets.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => handleOpenTicket(t)}
                  className={`w-full text-left bg-slate-50 dark:bg-[#1A1A1A] border ${
                    t.has_unread_admin_reply 
                      ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.12)] bg-emerald-500/[0.02]' 
                      : 'border-black/5 dark:border-white/5'
                  } rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:border-slate-300 dark:hover:border-white/20 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                >
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {/* Responsive Badges with flex-wrap - Never Overflows! */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400 shrink-0">#{t.id.split('-')[0]}</span>
                      
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        t.status === 'Open' ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20' :
                        t.status === 'In Progress' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                        'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {t.status}
                      </span>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        t.priority === 'Urgent' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        t.priority === 'High' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                        'bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-white/70'
                      }`}>
                        {t.priority}
                      </span>

                      {/* Clean, Non-Overflowing Professional Reply Badge */}
                      {t.has_unread_admin_reply && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider animate-pulse shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          New Reply
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-slate-900 dark:text-white truncate text-base">{t.subject}</h3>
                    <p className="text-sm text-slate-500 dark:text-white/50 line-clamp-2 sm:line-clamp-1">{t.message}</p>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5 dark:border-white/5">
                    <span className="text-xs font-mono text-slate-400">
                      {new Date(t.created_at).toLocaleDateString()}
                    </span>
                    <button 
                      type="button"
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        t.has_unread_admin_reply 
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs' 
                          : 'bg-slate-200/80 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white'
                      }`}
                    >
                      {t.has_unread_admin_reply ? 'Reply' : 'Open Ticket'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Ticket Conversation Modal / Mobile Bottom Sheet */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedTicket(null)}
            />
            
            {/* Modal Container */}
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.98 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="relative z-[110] w-full max-w-2xl bg-white dark:bg-[#0A0A0A] rounded-t-[32px] sm:rounded-[2rem] border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col h-[92dvh] sm:h-[84vh] max-h-[92dvh]"
            >
              {/* Mobile Drag Indicator */}
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-[#111] shrink-0">
                <div className="min-w-0 pr-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-slate-400">#{selectedTicket.id.split('-')[0]}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      selectedTicket.status === 'Open' ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20' :
                      selectedTicket.status === 'In Progress' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {selectedTicket.status}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-white/10 text-slate-700 dark:text-white/70">
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{selectedTicket.subject}</h2>
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 transition-colors shrink-0 cursor-pointer"
                  aria-label="Close"
                >
                  <X weight="bold" size={18} />
                </button>
              </div>

              {/* Resolution Quick Action Banner */}
              <div className="px-4 sm:px-6 py-2.5 bg-slate-100/70 dark:bg-white/5 border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-2.5 shrink-0">
                {selectedTicket.status !== 'Closed' && selectedTicket.status !== 'Resolved' ? (
                  <>
                    <span className="text-xs text-slate-500 dark:text-white/40">Is your issue resolved?</span>
                    <button
                      type="button"
                      onClick={() => handleResolveTicket(selectedTicket.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle size={14} weight="fill" />
                      <span>Mark as Resolved</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle size={14} weight="fill" />
                      <span>Ticket marked as {selectedTicket.status}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReopenTicket(selectedTicket.id)}
                      className="px-3 py-1.5 bg-white dark:bg-[#222] border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-white transition-colors cursor-pointer"
                    >
                      Re-open Ticket
                    </button>
                  </>
                )}
              </div>

              {/* Chat Thread */}
              <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                {/* Initial Request Bubble */}
                <div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-4 sm:p-5 border border-black/5 dark:border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Your Initial Request</p>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(selectedTicket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed">{selectedTicket.message}</p>
                </div>

                {/* Legacy Admin Reply (ONLY rendered if messages array is empty to guarantee ZERO duplicate bubbles!) */}
                {(!selectedTicket.messages || selectedTicket.messages.length === 0) && selectedTicket.admin_reply && (
                  <div className="flex flex-col items-start gap-1 w-full">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mx-1">
                      Support Team
                    </span>
                    <div className="max-w-[85%] sm:max-w-[80%] p-3.5 text-sm bg-slate-100 dark:bg-[#1E1E1E] text-slate-900 dark:text-white rounded-2xl rounded-tl-sm border border-black/5 dark:border-white/5 shadow-sm whitespace-pre-wrap">
                      {selectedTicket.admin_reply}
                    </div>
                  </div>
                )}

                {/* Live Message History */}
                {(selectedTicket.messages || []).map((msg, idx) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1 w-full`}>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mx-1">
                        {isUser ? 'You' : 'Support Team'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <div className={`max-w-[85%] sm:max-w-[80%] p-3.5 text-sm shadow-sm ${
                        isUser 
                          ? 'bg-brand-blue text-white rounded-2xl rounded-tr-sm' 
                          : 'bg-slate-100 dark:bg-[#1E1E1E] text-slate-900 dark:text-white rounded-2xl rounded-tl-sm border border-black/5 dark:border-white/5'
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        {msg.attachment_url && (
                          <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="block mt-2.5">
                            <img src={msg.attachment_url} alt="Attachment" className="max-w-full rounded-xl max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity border border-black/10 dark:border-white/10" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Reply Section - Sticky bottom with safe-area padding & high-contrast, fully visible Send button */}
              {selectedTicket.status !== 'Closed' && selectedTicket.status !== 'Resolved' ? (
                <div className="p-3 sm:p-4 border-t border-black/5 dark:border-white/5 bg-slate-50 dark:bg-[#111] pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
                  {attachment && (
                    <div className="flex items-center justify-between bg-brand-blue/10 text-brand-blue px-3 py-1.5 rounded-lg text-xs font-medium w-fit mb-2 border border-brand-blue/20">
                      <div className="flex items-center gap-2">
                        <Paperclip size={14} />
                        <span className="truncate max-w-[200px]">{attachment.name}</span>
                      </div>
                      <button type="button" onClick={() => setAttachment(null)} className="ml-3 hover:text-red-500 p-0.5 cursor-pointer">
                        <X size={14} weight="bold" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <label className="p-2.5 text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0">
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
                      className="flex-1 min-w-0 bg-white dark:bg-[#1A1A1A] border border-black/10 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-blue dark:focus:border-brand-blue text-slate-900 dark:text-white placeholder:text-slate-400 transition-colors shadow-2xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleReply(selectedTicket.id);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleReply(selectedTicket.id)}
                      disabled={isReplying || (!replyText.trim() && !attachment) || isUploading}
                      className="px-5 py-2.5 bg-brand-blue hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center gap-2 shrink-0 cursor-pointer min-h-[42px]"
                    >
                      {isReplying || isUploading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Send</span>
                          <PaperPlaneRight weight="bold" size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t border-black/5 dark:border-white/5 bg-slate-50 dark:bg-[#111] pb-[max(1rem,env(safe-area-inset-bottom))] text-center shrink-0">
                  <p className="text-xs text-slate-500 dark:text-white/40 mb-2">This ticket is marked as {selectedTicket.status}.</p>
                  <button
                    type="button"
                    onClick={() => handleReopenTicket(selectedTicket.id)}
                    className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Re-open to Continue Conversation
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Ticket Modal */}
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
