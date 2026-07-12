"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Headset, CheckCircle, WarningCircle, X, MagnifyingGlass, EnvelopeSimple, Paperclip } from "@phosphor-icons/react";
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
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const supabase = createClient();
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/support?t=${Date.now()}`);
      const data = await res.json();
      if (data.tickets) setTickets(data.tickets);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  useEffect(() => {
    const channel = supabase.channel('admin-support-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, (payload) => {
        fetchTickets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleReply = async () => {
    if ((!selectedTicket || !replyText.trim()) && !attachment) return;
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
      const res = await fetch("/api/admin/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedTicket?.id,
          replyText,
          userEmail: selectedTicket?.user_email,
          ticketSubject: selectedTicket?.subject,
          attachmentUrl
        }),
      });

      if (res.ok) {
        // Instead of closing the modal automatically, we just clear the input because it is a chat!
        setReplyText("");
        setAttachment(null);
        fetchTickets(); // Refresh list
        setTimeout(scrollToBottom, 100);
      } else {
        const errorData = await res.json();
        alert(`Failed to reply: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error: ${msg}`);
      console.error(err);
    } finally {
      setIsReplying(false);
    }
  };

  const openTicketsCount = tickets.filter(t => t.status !== "Resolved" && t.status !== "Closed").length;

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.user_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Support Queue</h1>
          <p className="text-sm text-slate-500 dark:text-white/40">Manage and reply to customer tickets.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-900 dark:border-white/20 px-4 py-2 rounded-xl font-bold text-sm">
          <WarningCircle size={20} weight="fill" className="text-orange-400 dark:text-orange-500" />
          {openTicketsCount} Open Tickets
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text"
          placeholder="Search by subject or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-2xl pl-11 pr-4 py-4 text-sm outline-none focus:border-slate-900 dark:border-white/50 transition-colors placeholder:text-slate-400 dark:placeholder:text-white/20 text-slate-900 dark:text-white shadow-sm dark:shadow-none"
        />
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-3xl shadow-sm dark:shadow-none p-4 md:p-6 overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-white/30 gap-2">
            <Headset size={48} weight="duotone" className="opacity-50" />
            <p className="font-medium text-slate-900 dark:text-white">No tickets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5">
                  <th className="pb-3 px-4 font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider text-[10px]">Status</th>
                  <th className="pb-3 px-4 font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider text-[10px]">Priority</th>
                  <th className="pb-3 px-4 font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider text-[10px]">User Email</th>
                  <th className="pb-3 px-4 font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider text-[10px]">Subject</th>
                  <th className="pb-3 px-4 font-bold text-slate-500 dark:text-white/40 uppercase tracking-wider text-[10px] text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(ticket => (
                  <tr key={ticket.id} className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 px-4">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${ticket.status === 'Resolved' ? 'bg-slate-900 dark:bg-white text-white dark:text-black/10 text-slate-900 dark:text-white' : 'bg-orange-500/10 text-orange-500'}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-bold text-[11px] uppercase tracking-widest text-slate-600 dark:text-white/60">
                      {ticket.priority}
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-500 dark:text-white/60">
                      {ticket.user_email}
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                      {ticket.subject}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        onClick={() => setSelectedTicket(ticket)}
                        className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-black font-bold text-xs rounded-lg transition-colors"
                      >
                        {ticket.status === 'Resolved' ? 'View' : 'Reply'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedTicket(null)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-[110] w-full max-w-2xl bg-white dark:bg-[#0A0A0A] rounded-[2rem] border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
            >
              <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-[#111]">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedTicket.subject}</h2>
                  <p className="text-xs text-slate-500 dark:text-white/40 font-mono mt-1">From: {selectedTicket.user_email}</p>
                </div>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 transition-colors"
                >
                  <X weight="bold" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-5">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest mb-2">Customer Message</p>
                  <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed">{selectedTicket.message}</p>
                </div>

                {selectedTicket.admin_reply && (
                  <div className="bg-slate-900 dark:bg-white text-white dark:text-black border border-slate-900 dark:border-white/20 rounded-2xl p-5">
                    <p className="text-[10px] font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-2 flex items-center gap-1"><CheckCircle weight="fill" /> Your Reply</p>
                    <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap leading-relaxed">{selectedTicket.admin_reply}</p>
                  </div>
                )}

                {/* Chat History Array */}
                {(selectedTicket.messages || []).map((msg: any, idx: number) => (
                  <div key={idx} className={`flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'} gap-1 w-full`}>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mx-1">
                      {msg.sender === 'admin' ? 'You' : 'Customer'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <div className={`max-w-[80%] p-3 text-sm shadow-sm ${
                      msg.sender === 'admin' 
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl rounded-tr-sm' 
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
              </div>

              {selectedTicket.status !== 'Closed' && selectedTicket.status !== 'Resolved' ? (
                <div className="flex flex-col gap-2 p-4 border border-black/5 dark:border-white/5 rounded-2xl bg-slate-50 dark:bg-[#1A1A1A]">
                    {attachment && (
                      <div className="flex items-center justify-between bg-blue-500/10 text-blue-500 px-3 py-2 rounded-lg text-xs font-medium w-fit">
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
                      <label className="cursor-pointer p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
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
                        placeholder="Type a response..."
                        className="flex-1 bg-white dark:bg-[#111] border border-black/5 dark:border-white/5 rounded-xl px-4 py-2 text-sm outline-none focus:border-slate-900 dark:border-white/50 transition-colors text-slate-900 dark:text-white placeholder:text-slate-400"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleReply();
                        }}
                      />
                      <button
                        onClick={handleReply}
                        disabled={isReplying || (!replyText.trim() && !attachment) || isUploading}
                        className="px-6 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-black rounded-xl text-sm font-bold transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {isReplying || isUploading ? '...' : 'Send Reply'}
                      </button>
                    </div>
                    <div ref={chatEndRef} />
                  </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-[#1A1A1A] border-t border-black/5 dark:border-white/5 text-center text-xs text-slate-500">
                  This ticket has been marked as {selectedTicket.status}. You cannot reply.
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
