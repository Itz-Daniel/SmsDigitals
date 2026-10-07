"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Headset, 
  CheckCircle, 
  WarningCircle, 
  X, 
  MagnifyingGlass, 
  EnvelopeSimple, 
  Paperclip, 
  Trash, 
  Clock,
  ChatCircleDots,
  PaperPlaneRight,
  Check,
  ArrowClockwise
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

interface AdminTicket {
  id: string;
  user_id: string;
  user_email: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  created_at: string;
  messages: any[];
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const supabase = createClient();
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);
  const selectedTicketRef = useRef<AdminTicket | null>(null);
  selectedTicketRef.current = selectedTicket;

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Helper to determine customer reply status
  const getTicketReplyStatus = (t: AdminTicket) => {
    if (t.status === 'Resolved' || t.status === 'Closed') {
      return { type: 'resolved', label: 'Resolved' };
    }
    const msgs = t.messages || [];
    if (msgs.length > 0) {
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg.sender === 'user') {
        return { 
          type: 'customer_replied', 
          label: 'Customer Replied', 
          timestamp: lastMsg.timestamp,
          preview: lastMsg.text 
        };
      }
      return { 
        type: 'admin_replied', 
        label: 'Waiting on Customer', 
        timestamp: lastMsg.timestamp 
      };
    }
    return { 
      type: 'new_ticket', 
      label: 'New Ticket', 
      timestamp: t.created_at 
    };
  };

  const fetchTickets = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/support?t=${Date.now()}`);
      const data = await res.json();
      if (data.tickets) {
        setTickets(data.tickets);

        // Live sync selectedTicket if open
        if (selectedTicketRef.current) {
          const fresh = data.tickets.find((t: AdminTicket) => t.id === selectedTicketRef.current?.id);
          if (fresh) {
            setSelectedTicket(fresh);
          }
        }
      }
    } catch (err) {
      console.error("Fetch tickets error:", err);
    } finally {
      if (!silent) setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  // Real-time synchronization
  useEffect(() => {
    const channel = supabase.channel('admin-support-tickets')
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

  // Lock body scroll and notify floating navigation on modal open
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

  const handleUpdateStatus = async (ticketId: string, newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch("/api/admin/support/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status: newStatus }),
      });
      if (res.ok) {
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("Are you sure you want to permanently delete this ticket?")) return;
    try {
      const res = await fetch("/api/admin/support/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });
      if (res.ok) {
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket(null);
        }
      } else {
        alert("Failed to delete ticket");
      }
    } catch (err) {
      console.error("Delete ticket error:", err);
    }
  };

  const handleReply = async () => {
    if (isSendingRef.current || isReplying || isUploading) return;
    if (!selectedTicket || (!replyText.trim() && !attachment)) return;

    isSendingRef.current = true;
    setIsReplying(true);

    const ticketId = selectedTicket.id;
    const textToSend = replyText.trim();
    const tempTimestamp = new Date().toISOString();

    let attachmentUrl: string | null = null;
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

    // 1. INSTANT OPTIMISTIC UPDATE: Admin sees response immediately in 0ms!
    const optimisticMessage = {
      sender: 'admin',
      text: textToSend,
      timestamp: tempTimestamp,
      attachment_url: attachmentUrl
    };

    setSelectedTicket(prev => prev ? {
      ...prev,
      messages: [...(prev.messages || []), optimisticMessage],
      status: 'In Progress'
    } : null);

    setTickets(prev => prev.map(t => t.id === ticketId ? {
      ...t,
      messages: [...(t.messages || []), optimisticMessage],
      status: 'In Progress'
    } : t));

    setReplyText("");
    setAttachment(null);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch("/api/admin/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          replyText: textToSend,
          userEmail: selectedTicket.user_email,
          ticketSubject: selectedTicket.subject,
          attachmentUrl
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.messages) {
          setSelectedTicket(prev => prev ? { ...prev, messages: result.messages, status: 'In Progress' } : null);
          setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, messages: result.messages, status: 'In Progress' } : t));
        }
        await fetchTickets(true);
        setTimeout(scrollToBottom, 100);
      } else {
        const errorData = await res.json();
        alert(`Failed to reply: ${errorData.error || 'Unknown error'}`);
        await fetchTickets(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${msg}`);
      console.error(err);
      await fetchTickets(true);
    } finally {
      isSendingRef.current = false;
      setIsReplying(false);
    }
  };

  // Metrics
  const totalCount = tickets.length;
  const needsReplyTickets = tickets.filter(t => {
    const s = getTicketReplyStatus(t);
    return s.type === 'customer_replied' || s.type === 'new_ticket';
  });
  const needsReplyCount = needsReplyTickets.length;
  const openCount = tickets.filter(t => t.status === "Open").length;
  const inProgressCount = tickets.filter(t => t.status === "In Progress").length;
  const resolvedCount = tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;
  const totalOpenOrActive = openCount + inProgressCount;

  // Filtered List
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const replyStatus = getTicketReplyStatus(t);
    const matchesStatus = 
      statusFilter === "All" ? true :
      statusFilter === "Needs Reply" ? (replyStatus.type === 'customer_replied' || replyStatus.type === 'new_ticket') :
      statusFilter === "Open" ? (t.status === "Open") :
      statusFilter === "In Progress" ? (t.status === "In Progress") :
      statusFilter === "Resolved" ? (t.status === "Resolved" || t.status === "Closed") : true;

    return matchesSearch && matchesStatus;
  });

  // Priority Sort: Tickets requiring admin response are automatically ranked to the top!
  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const statusA = getTicketReplyStatus(a);
    const statusB = getTicketReplyStatus(b);
    const isNeedsA = statusA.type === 'customer_replied' || statusA.type === 'new_ticket';
    const isNeedsB = statusB.type === 'customer_replied' || statusB.type === 'new_ticket';

    if (isNeedsA && !isNeedsB) return -1;
    if (!isNeedsA && isNeedsB) return 1;

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Headset size={28} className="text-brand-blue" />
            Admin Support Queue
          </h1>
          <p className="text-sm text-slate-500 dark:text-white/40">Manage, resolve, and reply to customer tickets with live updates.</p>
        </div>
        <div className="flex items-center gap-2.5">
          {needsReplyCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 px-3.5 py-2 rounded-xl font-bold text-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              {needsReplyCount} Customer {needsReplyCount === 1 ? 'Reply' : 'Replies'} Pending
            </div>
          )}
          <button 
            type="button" 
            onClick={() => fetchTickets()}
            className="p-2.5 rounded-xl border border-black/5 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-white/70 transition-colors"
            title="Refresh queue"
          >
            <ArrowClockwise size={16} weight="bold" className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-2xl p-4 shadow-sm">
          <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 dark:text-white">{totalCount}</span>
          <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 tracking-widest mt-1 uppercase">Total</p>
        </div>
        <div 
          onClick={() => setStatusFilter("Needs Reply")}
          className={`cursor-pointer bg-white dark:bg-[#111] border rounded-2xl p-4 shadow-sm transition-all hover:scale-[1.02] ${
            needsReplyCount > 0 ? 'border-amber-500/40 bg-amber-500/[0.03]' : 'border-black/5 dark:border-white/5'
          }`}
        >
          <span className="text-2xl sm:text-3xl font-mono font-bold text-amber-500 flex items-center gap-2">
            {needsReplyCount}
            {needsReplyCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
          </span>
          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 tracking-widest mt-1 uppercase">Needs Reply</p>
        </div>
        <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-2xl p-4 shadow-sm">
          <span className="text-2xl sm:text-3xl font-mono font-bold text-brand-blue">{openCount}</span>
          <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 tracking-widest mt-1 uppercase">Open</p>
        </div>
        <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-2xl p-4 shadow-sm">
          <span className="text-2xl sm:text-3xl font-mono font-bold text-emerald-500">{resolvedCount}</span>
          <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 tracking-widest mt-1 uppercase">Resolved</p>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by subject, email, or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:border-slate-900 dark:border-white/50 transition-colors placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-900 dark:text-white shadow-sm dark:shadow-none"
          />
        </div>

        {/* Status Filters */}
        <div className="flex gap-1 bg-white dark:bg-[#111] p-1.5 rounded-2xl border border-black/5 dark:border-white/5 overflow-x-auto custom-scrollbar shrink-0">
          {["All", "Needs Reply", "Open", "In Progress", "Resolved"].map((s) => (
            <button 
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                statusFilter === s 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-xs' 
                  : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{s}</span>
              {s === "Needs Reply" && needsReplyCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                  {needsReplyCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-3xl shadow-sm dark:shadow-none p-4 md:p-6 overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : sortedTickets.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-white/30 gap-2">
            <Headset size={48} weight="duotone" className="opacity-50" />
            <p className="font-medium text-slate-900 dark:text-white">No tickets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5">
                  <th className="pb-3 px-4 font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider text-[10px]">Conversation Status</th>
                  <th className="pb-3 px-4 font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider text-[10px]">Priority</th>
                  <th className="pb-3 px-4 font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider text-[10px]">User Email</th>
                  <th className="pb-3 px-4 font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider text-[10px]">Subject</th>
                  <th className="pb-3 px-4 font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider text-[10px] text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedTickets.map(ticket => {
                  const replyStatus = getTicketReplyStatus(ticket);
                  const isNeedsAttention = replyStatus.type === 'customer_replied' || replyStatus.type === 'new_ticket';

                  return (
                    <tr 
                      key={ticket.id} 
                      className={`border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${
                        isNeedsAttention ? 'bg-amber-500/[0.03] dark:bg-amber-500/[0.05]' : ''
                      }`}
                    >
                      {/* Status / Reply Indicator */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {replyStatus.type === 'customer_replied' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              <ChatCircleDots size={13} weight="fill" />
                              Customer Replied
                            </span>
                          ) : replyStatus.type === 'new_ticket' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-brand-blue/15 text-brand-blue border border-brand-blue/30">
                              <WarningCircle size={13} weight="fill" />
                              New Ticket
                            </span>
                          ) : replyStatus.type === 'resolved' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle size={12} weight="fill" />
                              Resolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-white/50">
                              <Check size={12} weight="bold" />
                              Waiting on Customer
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400 dark:text-white/40">
                            {ticket.status}
                          </span>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-4 px-4">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          ticket.priority === 'Urgent' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          ticket.priority === 'High' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                          'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/60'
                        }`}>
                          {ticket.priority}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-4 font-mono text-slate-600 dark:text-white/70 text-xs">
                        {ticket.user_email}
                      </td>

                      {/* Subject & Preview */}
                      <td className="py-4 px-4 max-w-[240px]">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{ticket.subject}</p>
                        <p className="text-xs text-slate-500 dark:text-white/40 truncate mt-0.5">
                          {ticket.message}
                        </p>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-right">
                        <button 
                          onClick={() => setSelectedTicket(ticket)}
                          className={`px-4 py-2 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs ${
                            isNeedsAttention 
                              ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' 
                              : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black'
                          }`}
                        >
                          {isNeedsAttention ? 'Reply Now' : 'Manage'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ticket Management Modal & Live Chat Sheet */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedTicket(null)}
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.98 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="relative z-[110] w-full max-w-2xl bg-white dark:bg-[#0A0A0A] rounded-t-[32px] sm:rounded-[2rem] border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col h-[92dvh] sm:h-[84vh] max-h-[92dvh]"
            >
              {/* Mobile Grab Handle */}
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-white/20 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

              {/* Modal Header */}
              <div className="p-4 sm:p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-[#111] shrink-0">
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-slate-400">#{selectedTicket.id.split('-')[0]}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">{selectedTicket.subject}</h2>
                  <p className="text-xs text-slate-500 dark:text-white/50 font-mono truncate">From: {selectedTicket.user_email}</p>
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 transition-colors shrink-0 cursor-pointer"
                >
                  <X weight="bold" size={18} />
                </button>
              </div>

              {/* Status Bar & Quick Actions */}
              <div className="px-4 sm:px-6 py-2.5 bg-slate-100/70 dark:bg-white/5 border-b border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider">Status:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["Open", "In Progress", "Resolved", "Closed"].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleUpdateStatus(selectedTicket.id, st)}
                        disabled={isUpdatingStatus}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          selectedTicket.status === st
                            ? (st === "Resolved" || st === "Closed"
                                ? "bg-emerald-500 text-white shadow-sm"
                                : st === "In Progress"
                                ? "bg-orange-500 text-white shadow-sm"
                                : "bg-brand-blue text-white shadow-sm")
                            : "bg-white dark:bg-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-200 dark:hover:bg-white/20"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteTicket(selectedTicket.id)}
                  className="text-xs font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer ml-auto"
                >
                  <Trash size={14} />
                  <span>Delete</span>
                </button>
              </div>

              {/* Chat Thread */}
              <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                {/* Initial Customer Message */}
                <div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-4 sm:p-5 border border-black/5 dark:border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Customer Initial Message</p>
                    <span className="text-[10px] text-slate-400 font-mono">{new Date(selectedTicket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed">{selectedTicket.message}</p>
                </div>

                {/* Legacy Admin Reply (ONLY if messages array is empty to prevent ANY double message render!) */}
                {(!selectedTicket.messages || selectedTicket.messages.length === 0) && selectedTicket.admin_reply && (
                  <div className="flex flex-col items-end gap-1 w-full">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mx-1">
                      You (Admin)
                    </span>
                    <div className="max-w-[85%] sm:max-w-[80%] p-3 text-sm bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl rounded-tr-sm shadow-sm whitespace-pre-wrap">
                      {selectedTicket.admin_reply}
                    </div>
                  </div>
                )}

                {/* Chat History Array */}
                {(selectedTicket.messages || []).map((msg: any, idx: number) => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <div key={idx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} gap-1 w-full`}>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mx-1">
                        {isAdmin ? 'You (Admin)' : 'Customer'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <div className={`max-w-[85%] sm:max-w-[80%] p-3.5 text-sm shadow-sm ${
                        isAdmin 
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl rounded-tr-sm' 
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

              {/* Reply Section - Sticky bottom on mobile with safe-area padding */}
              <div className="p-3 sm:p-4 border-t border-black/5 dark:border-white/5 bg-slate-50 dark:bg-[#111] pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0">
                {attachment && (
                  <div className="flex items-center justify-between bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg text-xs font-medium w-fit mb-2">
                    <div className="flex items-center gap-2">
                      <Paperclip size={14} />
                      <span className="truncate max-w-[200px]">{attachment.name}</span>
                    </div>
                    <button onClick={() => setAttachment(null)} className="ml-3 hover:text-red-500 cursor-pointer">
                      <X size={14} weight="bold" />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-2 items-center">
                  <label className="cursor-pointer p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0">
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
                    placeholder="Type an official reply to customer..."
                    className="flex-1 bg-white dark:bg-[#1A1A1A] border border-black/5 dark:border-white/10 rounded-xl px-4 py-3 text-base sm:text-sm outline-none focus:border-slate-900 dark:border-white/50 transition-colors text-slate-900 dark:text-white placeholder:text-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                    }}
                  />
                  <button
                    onClick={handleReply}
                    disabled={isReplying || (!replyText.trim() && !attachment) || isUploading}
                    className="px-5 py-3 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-black rounded-xl text-sm font-bold transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                  >
                    {isReplying || isUploading ? (
                      <span>Sending...</span>
                    ) : (
                      <>
                        <PaperPlaneRight size={16} weight="fill" />
                        <span>Send Reply</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
