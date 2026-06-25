"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, Megaphone, Info, CheckCircle } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchNotifications = async () => {
    try {
      // 1. Get user profile for last_read timestamp
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("last_read_notifications_at")
        .eq("id", user.id)
        .single();

      const lastRead = profile?.last_read_notifications_at || "1970-01-01T00:00:00Z";

      // 2. Fetch global notifications
      const { data: notifs } = await supabase
        .from("global_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (notifs) {
        setNotifications(notifs);
        
        // 3. Check if any are unread
        const unreadExists = notifs.some(n => new Date(n.created_at) > new Date(lastRead));
        setHasUnread(unreadExists);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();

    // Close dropdown on outside click
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpen = async () => {
    setIsOpen(!isOpen);
    
    // If opening and there are unread, mark as read
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

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleOpen}
        className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white transition-colors"
      >
        <Bell size={20} />
        {hasUnread && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0A0A0A] animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-80 md:w-96 bg-white dark:bg-[#0A0A0A] rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 z-50 overflow-hidden transform origin-top-right transition-all">
          {/* Header */}
          <div className="p-4 border-b border-black/5 dark:border-white/10 flex items-center gap-2 bg-slate-50 dark:bg-[#111111]">
            <Bell weight="fill" className="text-[#10B981] text-lg" />
            <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto bg-white dark:bg-[#0A0A0A] flex flex-col custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-white/40 text-sm">No new notifications.</div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="p-4 border-b border-black/5 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer flex items-start gap-3 transition-colors">
                  <div className="mt-1 w-2 h-2 rounded-full bg-[#10B981]/40 flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  <div className="flex flex-col gap-1 w-full">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white/90 leading-tight">{notif.title}</h4>
                    <div className="text-[13px] text-slate-600 dark:text-white/60 flex gap-1 items-start">
                      {notif.icon_type === 'megaphone' && <Megaphone className="text-[#EC4899] mt-0.5 flex-shrink-0" weight="fill" />}
                      {notif.icon_type === 'info' && <Info className="text-brand-blue mt-0.5 flex-shrink-0" weight="fill" />}
                      {notif.icon_type === 'success' && <CheckCircle className="text-[#10B981] mt-0.5 flex-shrink-0" weight="fill" />}
                      <span className="line-clamp-2 leading-snug">{notif.message}</span>
                    </div>
                    <span className="text-[11px] font-medium text-[#10B981] dark:text-[#10B981]/80 mt-1 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM16.2 16.2L11 13V7H12.5V12.2L17 14.9L16.2 16.2Z"/></svg>
                      {timeAgo(notif.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 dark:bg-[#111111] border-t border-black/5 dark:border-white/10">
            <button className="w-full py-2 text-sm font-bold text-[#10B981] hover:text-[#34D399] transition-colors flex items-center justify-center gap-1">
              View all notifications 
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
