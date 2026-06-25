"use client";

import { useState, useEffect } from "react";
import { Megaphone, CheckCircle, WarningCircle, Info, X, Trash, Spinner, BellRinging } from "@phosphor-icons/react";
import { motion, AnimatePresence } from "motion/react";

interface Notification {
  id: string;
  title: string;
  message: string;
  icon_type: string;
  created_at: string;
}

export default function GlobalNotificationManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"push" | "history">("push");
  
  // Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [iconType, setIconType] = useState<"megaphone" | "info" | "success">("megaphone");
  
  // Data State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === "history") {
      fetchNotifications();
    }
  }, [isOpen, activeTab]);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/notifications");
      const data = await res.json();
      if (res.ok) setNotifications(data.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, icon_type: iconType })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to push notification");
      
      setFeedback({ text: "Notification pushed globally!", type: "success" });
      setTitle("");
      setMessage("");
      setIconType("megaphone");
    } catch (err: any) {
      setFeedback({ text: err.message, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-[#111111] border border-black/5 dark:border-white/5 rounded-[24px] p-6 md:p-8 shadow-sm dark:shadow-none flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#10B981]/10 rounded-2xl flex items-center justify-center text-[#10B981]">
            <BellRinging size={24} weight="duotone" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Global Notifications</h2>
            <p className="text-slate-500 dark:text-white/40 text-sm">Push alerts and updates to all users instantly.</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-md dark:shadow-none"
        >
          Manage Alerts
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-[110] w-full max-w-xl bg-white dark:bg-[#0A0A0A] rounded-[2rem] border border-black/5 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
            >
              <div className="p-6 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-[#111]">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Megaphone className="text-[#10B981]" weight="fill" /> Notification Center
                </h2>
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-white/50 transition-colors">
                  <X weight="bold" />
                </button>
              </div>

              <div className="flex px-6 pt-4 gap-6 border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-[#111]">
                <button 
                  onClick={() => setActiveTab('push')}
                  className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'push' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  Push New
                </button>
                <button 
                  onClick={() => setActiveTab('history')}
                  className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'}`}
                >
                  History
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                {activeTab === 'push' ? (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">Icon Type</label>
                      <div className="flex gap-3">
                        <button onClick={() => setIconType('megaphone')} className={`flex-1 py-3 flex flex-col items-center gap-2 rounded-xl border-2 transition-all ${iconType === 'megaphone' ? 'border-[#EC4899] bg-[#EC4899]/5 text-[#EC4899]' : 'border-black/5 dark:border-white/5 text-slate-400 hover:border-black/10 dark:hover:border-white/20'}`}>
                          <Megaphone size={24} weight="duotone" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Announcement</span>
                        </button>
                        <button onClick={() => setIconType('info')} className={`flex-1 py-3 flex flex-col items-center gap-2 rounded-xl border-2 transition-all ${iconType === 'info' ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-black/5 dark:border-white/5 text-slate-400 hover:border-black/10 dark:hover:border-white/20'}`}>
                          <Info size={24} weight="duotone" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Update</span>
                        </button>
                        <button onClick={() => setIconType('success')} className={`flex-1 py-3 flex flex-col items-center gap-2 rounded-xl border-2 transition-all ${iconType === 'success' ? 'border-[#10B981] bg-[#10B981]/5 text-[#10B981]' : 'border-black/5 dark:border-white/5 text-slate-400 hover:border-black/10 dark:hover:border-white/20'}`}>
                          <CheckCircle size={24} weight="duotone" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Good News</span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">Headline</label>
                      <input 
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="e.g. Platform Maintenance Scheduled"
                        className="w-full bg-slate-50 dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-brand-blue outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mb-2">Message</label>
                      <textarea 
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Write the full announcement..."
                        className="w-full h-28 resize-none bg-slate-50 dark:bg-[#111] border border-black/5 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-brand-blue outline-none transition-colors custom-scrollbar"
                      />
                    </div>
                    
                    {feedback && (
                      <div className={`p-3 text-xs font-bold rounded-lg flex items-center gap-2 ${feedback.type === 'success' ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-red-500/10 text-red-500'}`}>
                        {feedback.type === 'success' ? <CheckCircle weight="fill" size={16} /> : <WarningCircle weight="fill" size={16} />}
                        {feedback.text}
                      </div>
                    )}

                    <button 
                      onClick={handlePush}
                      disabled={isSubmitting || !title || !message}
                      className="w-full py-3.5 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center shadow-lg shadow-brand-blue/20"
                    >
                      {isSubmitting ? <Spinner className="w-5 h-5 animate-spin" /> : "Deploy Global Notification"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="flex justify-center p-8"><Spinner className="w-6 h-6 animate-spin text-slate-400" /></div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center p-8 text-sm text-slate-500">No past notifications.</div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className="p-4 border border-black/5 dark:border-white/5 rounded-xl flex items-start justify-between gap-4 bg-slate-50 dark:bg-[#111]">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {notif.icon_type === 'megaphone' && <Megaphone className="text-[#EC4899]" weight="fill" />}
                              {notif.icon_type === 'info' && <Info className="text-brand-blue" weight="fill" />}
                              {notif.icon_type === 'success' && <CheckCircle className="text-[#10B981]" weight="fill" />}
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{notif.title}</h4>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-white/60 mb-2">{notif.message}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{new Date(notif.created_at).toLocaleString()}</p>
                          </div>
                          <button onClick={() => handleDelete(notif.id)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center shrink-0 transition-colors">
                            <Trash weight="duotone" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
