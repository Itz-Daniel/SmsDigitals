"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, X, CheckCircle, CaretDown, Lock } from "@phosphor-icons/react";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

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

  const handleAcceptAll = () => {
    localStorage.setItem("smsdigitals_cookie_consent", "accepted");
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    const choice = analyticsEnabled ? "accepted_with_analytics" : "essential_only";
    localStorage.setItem("smsdigitals_cookie_consent", choice);
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
          <div className="relative p-5 rounded-2xl bg-white/95 dark:bg-[#0D1322]/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-2xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-slate-900 dark:text-white overflow-hidden transition-all">
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
                onClick={handleSavePreferences}
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

            {/* EXPANDABLE ESSENTIAL COOKIE DETAILS */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="mb-4 space-y-2.5 relative z-10 pt-2 border-t border-slate-200/60 dark:border-white/10"
                >
                  {/* Category 1: Essential Cookies */}
                  <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Lock size={12} weight="bold" className="text-brand-blue" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Strictly Essential Storage
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue dark:bg-brand-blue/20 dark:text-brand-blue border border-brand-blue/20">
                        Always Active
                      </span>
                    </div>
                    <ul className="text-[11px] text-slate-500 dark:text-white/50 space-y-1 pl-4 list-disc font-medium">
                      <li><strong className="text-slate-700 dark:text-white/80">Auth & Session:</strong> Supabase authentication token to keep you safely logged in.</li>
                      <li><strong className="text-slate-700 dark:text-white/80">Wallet & Currency:</strong> NGN / USD active currency selection.</li>
                      <li><strong className="text-slate-700 dark:text-white/80">Security & Theme:</strong> Light / Dark mode preference and CSRF defense.</li>
                    </ul>
                  </div>

                  {/* Category 2: Optional Analytics */}
                  <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 flex items-center justify-between cursor-pointer" onClick={() => setAnalyticsEnabled(!analyticsEnabled)}>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Performance & Diagnostics
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-white/50 block font-medium">
                        Anonymous telemetry to improve API response speeds.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={analyticsEnabled}
                      onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                      className="w-4 h-4 accent-brand-blue rounded cursor-pointer shrink-0"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col gap-2 relative z-10">
              {!showDetails ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAcceptAll}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-600 transition-all shadow-md shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={() => setShowDetails(true)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white/80 text-xs font-bold transition-all flex items-center justify-center gap-1 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Essential Only <CaretDown size={12} weight="bold" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSavePreferences}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-brand-blue text-white text-xs font-bold hover:bg-blue-600 transition-all shadow-md shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle size={14} weight="bold" /> Confirm Selection & Accept
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white/80 text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Accept All
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
