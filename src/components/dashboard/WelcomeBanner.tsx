"use client";

import { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Wallet, 
  Hash, 
  BookmarkSimple, 
  Sparkle, 
  ShareNetwork, 
  DotsThreeVertical, 
  Command, 
  CheckCircle
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

type DeviceOS = "ios" | "android" | "mac" | "windows" | "other";

function detectDeviceOS(): { os: DeviceOS; isMobile: boolean } {
  if (typeof window === "undefined") return { os: "other", isMobile: false };
  const ua = window.navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/i.test(ua) && !isIOS;
  const isWindows = /Win32|Win64|Windows|WinCE/i.test(ua);

  if (isIOS) return { os: "ios", isMobile: true };
  if (isAndroid) return { os: "android", isMobile: true };
  if (isMac) return { os: "mac", isMobile: false };
  if (isWindows) return { os: "windows", isMobile: false };
  return { os: "other", isMobile: /Mobi|Android/i.test(ua) };
}

const emptySubscribe = () => () => {};

export function WelcomeBanner({ userCreatedAt }: { userCreatedAt?: string }) {
  const isMounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [phase, setPhase] = useState<"welcome" | "bookmark" | "hidden">("hidden");
  const deviceInfo = useMemo(() => isMounted ? detectDeviceOS() : { os: "other" as DeviceOS, isMobile: false }, [isMounted]);

  useEffect(() => {
    // Check if user previously dismissed onboarding in localStorage
    const isDismissed = typeof window !== "undefined" ? localStorage.getItem("smsdigitals_onboarding_dismissed") : null;
    if (isDismissed === "true") {
      return;
    }

    // If user account is brand new (e.g. within 30 days) or no timestamp provided
    if (userCreatedAt) {
      const createdDate = new Date(userCreatedAt).getTime();
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (createdDate < thirtyDaysAgo) {
        return;
      }
    }

    const timer = setTimeout(() => {
      setPhase("welcome");
    }, 0);

    return () => clearTimeout(timer);
  }, [userCreatedAt]);

  const handleDismissWelcome = () => {
    // Transition smoothly to the bookmark guidance phase
    setPhase("bookmark");
  };

  const handleFinalDismiss = async () => {
    setPhase("hidden");
    try {
      localStorage.setItem("smsdigitals_onboarding_dismissed", "true");
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { onboarding_dismissed: true }
      });
    } catch (e) {
      console.warn("Could not save dismissal flag to profile:", e);
    }
  };

  if (!isMounted || phase === "hidden") return null;

  return (
    <div className="w-full relative overflow-hidden transition-all duration-300">
      <AnimatePresence mode="wait">
        {phase === "welcome" && (
          <motion.div
            key="welcome-card"
            initial={{ opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-brand-blue/25 dark:border-brand-blue/30 bg-gradient-to-br from-blue-50/90 via-white to-sky-50/60 dark:from-[#0B1528] dark:via-[#090D16] dark:to-[#0D1A2E] p-4 sm:p-5 md:p-6 shadow-[0_8px_30px_rgba(0,112,243,0.08)] dark:shadow-[0_8px_30px_rgba(0,112,243,0.18)]"
          >
            {/* Ambient Background Glows */}
            <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-brand-blue/15 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />
            <div className="absolute bottom-0 left-1/3 w-36 sm:w-48 h-36 sm:h-48 bg-cyan-400/10 rounded-full blur-2xl pointer-events-none" />

            {/* Mobile-Friendly Close Button (40px touch target) */}
            <button
              onClick={handleDismissWelcome}
              aria-label="Dismiss welcome message"
              className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-20 cursor-pointer active:scale-90"
            >
              <X size={18} weight="bold" />
            </button>

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10 pr-7 sm:pr-8 lg:pr-0">
              <div className="space-y-1.5 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-brand-blue/10 dark:bg-blue-500/15 text-brand-blue dark:text-blue-400 border border-brand-blue/20 dark:border-blue-400/20">
                  <Sparkle size={13} weight="fill" className="animate-pulse text-brand-blue" />
                  <span>Getting Started</span>
                </div>

                <h3 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  Welcome to SmsDigitals! 🚀
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-white/70 leading-relaxed font-normal">
                  Receive instant SMS verification codes across 1,300+ global platforms. Fund your wallet or choose a virtual carrier number to get started.
                </p>
              </div>

              {/* Action Buttons: Immune to mobile wrapping bugs with grid-cols-2 */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full lg:w-auto shrink-0 pt-1 lg:pt-0">
                <Link
                  href="/dashboard/fund"
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-600 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-brand-blue/25 transition-all text-center"
                >
                  <Wallet size={16} weight="bold" className="shrink-0" />
                  <span className="truncate">Fund Wallet</span>
                </Link>

                <Link
                  href="/dashboard/sms"
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 active:scale-95 text-xs sm:text-sm font-bold transition-all text-center"
                >
                  <Hash size={16} weight="bold" className="shrink-0" />
                  <span className="truncate">Get a Number</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {phase === "bookmark" && (
          <motion.div
            key="bookmark-card"
            initial={{ opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-500/30 dark:border-amber-500/35 bg-gradient-to-br from-amber-50/95 via-white to-orange-50/50 dark:from-[#211608] dark:via-[#140F08] dark:to-[#1C1208] p-4 sm:p-5 md:p-6 shadow-[0_8px_30px_rgba(245,158,11,0.12)]"
          >
            {/* Ambient Gold Glow */}
            <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-12 -mt-12" />

            {/* Mobile-Friendly Close Button */}
            <button
              onClick={handleFinalDismiss}
              aria-label="Close bookmark reminder"
              className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-20 cursor-pointer active:scale-90"
            >
              <X size={18} weight="bold" />
            </button>

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10 pr-7 sm:pr-8 lg:pr-0">
              <div className="space-y-2 max-w-2xl w-full">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                  <BookmarkSimple size={13} weight="fill" />
                  <span>Never Lose Access</span>
                </div>

                <h3 className="text-base sm:text-lg md:text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  Bookmark SmsDigitals 📌
                </h3>

                {/* Device-Specific Instructions (Optimized for all viewports) */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-slate-700 dark:text-amber-100/90 leading-relaxed font-medium">
                  {deviceInfo.os === "ios" && (
                    <div className="flex items-start gap-2.5">
                      <ShareNetwork size={20} weight="bold" className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <strong>On iPhone/iPad (Safari):</strong> Tap the <strong>Share icon</strong> (at the bottom of Safari), scroll down, and select <strong>&ldquo;Add to Home Screen&rdquo;</strong> or <strong>&ldquo;Add Bookmark&rdquo;</strong> for instant 1-tap access.
                      </div>
                    </div>
                  )}

                  {deviceInfo.os === "android" && (
                    <div className="flex items-start gap-2.5">
                      <DotsThreeVertical size={20} weight="bold" className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <strong>On Android (Chrome):</strong> Tap the <strong>Menu (⋮)</strong> at the top right, then select <strong>&ldquo;Add to Home screen&rdquo;</strong> or tap the <strong>Star (⭐)</strong> icon to bookmark this page.
                      </div>
                    </div>
                  )}

                  {deviceInfo.os === "mac" && (
                    <div className="flex items-start gap-2.5">
                      <Command size={20} weight="bold" className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <strong>On Mac:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/15 font-mono text-xs font-bold shadow-sm">⌘ + D</kbd> on your keyboard to instantly bookmark this page for fast access.
                      </div>
                    </div>
                  )}

                  {(deviceInfo.os === "windows" || deviceInfo.os === "other") && (
                    <div className="flex items-start gap-2.5">
                      <BookmarkSimple size={20} weight="bold" className="shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                      <div>
                        <strong>On Windows / PC:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/15 font-mono text-xs font-bold shadow-sm">Ctrl + D</kbd> on your keyboard to instantly bookmark this page for fast access.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirm / Got it button (Full width on mobile for easy thumb reach, compact on desktop) */}
              <div className="w-full lg:w-auto shrink-0 pt-1 lg:pt-0">
                <button
                  onClick={handleFinalDismiss}
                  className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs sm:text-sm shadow-md shadow-amber-500/25 transition-all cursor-pointer whitespace-nowrap"
                >
                  <CheckCircle size={16} weight="bold" />
                  <span>Got it, thanks!</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
