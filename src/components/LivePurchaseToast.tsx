"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, X, ShieldCheck, Lightning } from "@phosphor-icons/react";

interface ActivityEvent {
  id: string;
  flag: string;
  title: string;
  subtitle: string;
  timeAgo: string;
  type: "sms" | "marketplace" | "wallet";
}

const SAMPLE_EVENTS: Omit<ActivityEvent, "id" | "timeAgo">[] = [
  { flag: "🇺🇸", title: "USA WhatsApp Number Procured", subtitle: "Dallas, TX • Verified", type: "sms" },
  { flag: "🇬🇧", title: "UK Telegram Code Received [849-***]", subtitle: "London, UK • Delivered in 4s", type: "sms" },
  { flag: "🇨🇦", title: "Canada Tinder Line Activated", subtitle: "Toronto, CA • Active Node", type: "sms" },
  { flag: "🇳🇬", title: "Wallet Top-Up (₦15,000)", subtitle: "Lagos, NG • Paystack Instant", type: "wallet" },
  { flag: "🌐", title: "Facebook Verified Account Purchased", subtitle: "Digital Marketplace • Stock #104", type: "marketplace" },
  { flag: "🇩🇪", title: "Germany Google/Gmail SMS Delivered", subtitle: "Berlin, DE • Real SIM", type: "sms" },
  { flag: "🇫🇷", title: "France WhatsApp Line Deployed", subtitle: "Paris, FR • Verified", type: "sms" },
  { flag: "🇺🇸", title: "USA OpenAI / ChatGPT Code Received", subtitle: "Chicago, IL • Delivered in 6s", type: "sms" },
  { flag: "🇳🇬", title: "Wallet Top-Up ($50.00 USD)", subtitle: "Abuja, NG • Instant Card", type: "wallet" },
  { flag: "🌐", title: "Instagram PVA Aged Account Purchased", subtitle: "Digital Marketplace • Stock #88", type: "marketplace" },
];

export function LivePurchaseToast() {
  const [currentEvent, setCurrentEvent] = useState<ActivityEvent | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (isMuted) return;

    // Show initial toast after 4 seconds
    const initialTimer = setTimeout(() => {
      triggerNewEvent();
    }, 4000);

    // Loop new toasts every 18 to 28 seconds
    const interval = setInterval(() => {
      triggerNewEvent();
    }, Math.floor(Math.random() * 10000) + 18000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [isMuted]);

  const triggerNewEvent = () => {
    const randomEvent = SAMPLE_EVENTS[Math.floor(Math.random() * SAMPLE_EVENTS.length)];
    const timeAgoSecs = Math.floor(Math.random() * 45) + 3;

    setCurrentEvent({
      id: Math.random().toString(),
      flag: randomEvent.flag,
      title: randomEvent.title,
      subtitle: randomEvent.subtitle,
      type: randomEvent.type,
      timeAgo: `${timeAgoSecs}s ago`,
    });

    setIsVisible(true);

    // Auto-hide toast after 7 seconds
    setTimeout(() => {
      setIsVisible(false);
    }, 7000);
  };

  if (isMuted || !currentEvent) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 pointer-events-none font-sans">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, backdropFilter: "blur(16px)" }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="pointer-events-auto max-w-sm bg-white/90 dark:bg-[#0D1322]/90 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-start gap-3.5 relative overflow-hidden"
          >
            {/* Ambient subtle glow ring */}
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-brand-blue/20 blur-2xl rounded-full pointer-events-none"></div>

            {/* Left Flag / Icon */}
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xl shrink-0 shadow-inner border border-black/5 dark:border-white/5">
              {currentEvent.flag}
            </div>

            {/* Content */}
            <div className="flex flex-col flex-1 pr-4 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  Live Activity <ShieldCheck size={12} weight="fill" />
                </span>
                <span className="text-[10px] text-slate-400 dark:text-white/30 ml-auto">
                  {currentEvent.timeAgo}
                </span>
              </div>

              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate leading-snug">
                {currentEvent.title}
              </h4>

              <p className="text-[11px] text-slate-500 dark:text-white/50 truncate mt-0.5 font-medium">
                {currentEvent.subtitle}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => {
                setIsVisible(false);
                setIsMuted(true);
              }}
              className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-700 dark:text-white/30 dark:hover:text-white transition-colors p-1 rounded-lg"
              title="Dismiss live notifications"
            >
              <X size={14} weight="bold" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
