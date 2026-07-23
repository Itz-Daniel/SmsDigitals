"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, X } from "@phosphor-icons/react";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem("smsdigitals_cookie_consent");
    if (!consent) {
      // Delay slightly for smooth entrance
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("smsdigitals_cookie_consent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("smsdigitals_cookie_consent", "essential_only");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-50"
        >
          <div className="relative p-5 rounded-2xl bg-white/90 dark:bg-[#0D1322]/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-slate-900 dark:text-white overflow-hidden">
            {/* Ambient subtle glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue flex items-center justify-center shrink-0">
                  <ShieldCheck weight="fill" size={18} />
                </div>
                <h3 className="font-bold tracking-tight text-sm text-slate-900 dark:text-white">
                  Cookie & Privacy Choice
                </h3>
              </div>
              <button
                onClick={handleDecline}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
                aria-label="Close cookie consent banner"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed mb-4 relative z-10 font-medium">
              We use essential cookies and local storage to keep you logged in, remember your currency preferences, and secure wallet payments. Read our{" "}
              <Link
                href="/privacy"
                className="text-brand-blue underline hover:text-blue-600 font-semibold"
              >
                Privacy Policy
              </Link>
              .
            </p>

            <div className="flex items-center gap-2 relative z-10">
              <button
                onClick={handleAccept}
                className="flex-1 py-2.5 px-4 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-600 transition-all shadow-md shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                Accept All
              </button>
              <button
                onClick={handleDecline}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white/80 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Essential Only
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
