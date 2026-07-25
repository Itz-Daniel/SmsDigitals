"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Megaphone, Info, CheckCircle, X, ArrowRight, Clock, ShieldCheck } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { AnimatePresence, motion } from "framer-motion";

interface Notification {
  id: string;
  title: string;
  message: string;
  icon_type: string;
  created_at: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("last_read_notifications_at")
        .eq("id", user.id)
        .single();

      const lastRead = profile?.last_read_notifications_at || "1970-01-01T00:00:00Z";

      const { data: notifs } = await supabase
        .from("global_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (notifs) {
        setNotifications(notifs);
        const unreadExists = notifs.some(n => new Date(n.created_at) > new Date(lastRead));
        setHasUnread(unreadExists);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = async () => {
    setIsOpen(!isOpen);
    
    if (!isOpen && hasUnread) {
      setHasUnread(false);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ last_read_notifications_at: new Date().toISOString() })
          .eq("id", user.id);
      }
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    setSelectedNotif(notif);
    setIsOpen(false);
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  };

  const formatDateFull = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).format(new Date(dateString));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      
      {/* Bell Icon Trigger */}
      <button 
        onClick={handleOpen}
        aria-label="Open Notifications"
        className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-colors"
      >
        <Bell size={20} />
        {hasUnread && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-brand-blue ring-2 ring-white dark:ring-[#0A0A0A] animate-pulse"></span>
        )}
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-[-60px] sm:right-0 mt-3 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white dark:bg-[#0A0A0A] rounded-3xl shadow-2xl border border-black/10 dark:border-white/15 z-50 overflow-hidden transform origin-top-right transition-all">
          
          {/* Header */}
          <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-[#111111]">
            <div className="flex items-center gap-2">
              <Bell weight="fill" className="text-brand-blue text-lg" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Platform Announcements</h3>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
              {notifications.length} Updates
            </span>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto bg-white dark:bg-[#0A0A0A] flex flex-col divide-y divide-black/5 dark:divide-white/5">
            {notifications.length === 0 ? (
              <div className="p-10 text-center text-slate-400 dark:text-white/40 text-xs font-medium">
                No system announcements broadcasted yet.
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif)}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer flex items-start gap-3 transition-all group"
                >
                  <div className="mt-1 w-2.5 h-2.5 rounded-full bg-brand-blue flex-shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                  <div className="flex flex-col gap-1 w-full overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-blue transition-colors truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] font-medium text-slate-400 dark:text-white/40 shrink-0">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-white/60 flex items-start gap-1.5 line-clamp-2 leading-relaxed">
                      {notif.icon_type === 'megaphone' && <Megaphone className="text-purple-500 mt-0.5 shrink-0" weight="fill" />}
                      {notif.icon_type === 'info' && <Info className="text-brand-blue mt-0.5 shrink-0" weight="fill" />}
                      {notif.icon_type === 'success' && <CheckCircle className="text-emerald-500 mt-0.5 shrink-0" weight="fill" />}
                      <span>{notif.message}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 dark:bg-[#111111] border-t border-black/5 dark:border-white/10">
            <button 
              onClick={() => {
                setIsOpen(false);
                setShowHistoryModal(true);
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-brand-blue hover:bg-brand-blue/10 transition-all flex items-center justify-center gap-1.5"
            >
              View Full Update History <ArrowRight size={14} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* FULL UNTRUNCATED ANNOUNCEMENT READING MODAL */}
      <AnimatePresence>
        {selectedNotif && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#111111] border border-black/10 dark:border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full flex flex-col gap-6 shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-black/5 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                    {selectedNotif.icon_type === 'megaphone' ? <Megaphone size={22} weight="fill" className="text-purple-500" /> :
                     selectedNotif.icon_type === 'success' ? <CheckCircle size={22} weight="fill" className="text-emerald-500" /> :
                     <Info size={22} weight="fill" className="text-brand-blue" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 flex items-center gap-1">
                      <Clock size={12} /> {formatDateFull(selectedNotif.created_at)}
                    </span>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                      {selectedNotif.title}
                    </h3>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedNotif(null)} 
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              {/* Full Untruncated Announcement Content */}
              <div className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {selectedNotif.message}
              </div>

              {/* Footer */}
              <div className="border-t border-black/5 dark:border-white/10 pt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 dark:text-white/40 flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-500" weight="fill" /> Official Broadcast
                </span>
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="px-6 py-2.5 rounded-xl bg-brand-blue text-white font-bold text-xs hover:bg-blue-600 transition-all shadow-md shadow-brand-blue/20"
                >
                  Close Update
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL UPDATE HISTORY LIST MODAL */}
      <AnimatePresence>
        {showHistoryModal && (
          <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#111111] border border-black/10 dark:border-white/15 rounded-3xl p-6 sm:p-8 max-w-2xl w-full flex flex-col gap-6 max-h-[85vh] shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                    <Bell size={22} weight="fill" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Platform Announcement History</h3>
                    <p className="text-xs text-slate-500 dark:text-white/40">Complete archive of system updates and features.</p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowHistoryModal(false)} 
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              {/* History List */}
              <div className="overflow-y-auto flex flex-col gap-3 pr-2 custom-scrollbar max-h-[60vh]">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => {
                      setShowHistoryModal(false);
                      setSelectedNotif(notif);
                    }}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 hover:border-brand-blue/30 cursor-pointer flex flex-col gap-2 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-blue transition-colors">
                        {notif.title}
                      </h4>
                      <span className="text-[11px] font-mono text-slate-400 dark:text-white/40">
                        {formatDateFull(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-white/70 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
