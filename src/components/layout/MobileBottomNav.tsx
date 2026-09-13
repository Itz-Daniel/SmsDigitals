"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  House, 
  ChatCircleDots, 
  ClockCounterClockwise, 
  Headset,
  Plus 
} from "@phosphor-icons/react";

export function MobileBottomNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsVisible(true);
  }

  // Handle scroll to smoothly hide on scroll-down and reveal on scroll-up
  useEffect(() => {
    const mainEl = document.querySelector("main");

    const handleScroll = () => {
      const currentScrollY = mainEl ? mainEl.scrollTop : window.scrollY;
      const diff = currentScrollY - lastScrollY.current;

      // Only trigger if scroll delta exceeds threshold
      if (Math.abs(diff) > 10) {
        if (diff > 0 && currentScrollY > 60) {
          // Scrolling down -> hide with slide-down animation
          setIsVisible(false);
        } else if (diff < 0) {
          // Scrolling up -> reveal with slide-up animation
          setIsVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }
    };

    if (mainEl) {
      mainEl.addEventListener("scroll", handleScroll, { passive: true });
    }
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      if (mainEl) mainEl.removeEventListener("scroll", handleScroll);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const isHome = pathname === "/dashboard";
  const isSms = pathname.startsWith("/dashboard/sms");
  const isFund = pathname.startsWith("/dashboard/fund");
  const isSupport = pathname.startsWith("/dashboard/support");
  const isHistory = pathname.startsWith("/dashboard/transactions") || pathname.startsWith("/dashboard/history");

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          aria-label="Mobile Navigation"
          className="lg:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-50 flex justify-center pointer-events-none px-2.5 sm:px-4"
        >
          <div className="pointer-events-auto w-full max-w-[360px] bg-white/92 dark:bg-[#121212]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.14)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.7)] rounded-full p-1 select-none [-webkit-tap-highlight-color:transparent]">
            <div className="grid grid-cols-5 items-center">
              
              {/* 1. Home Tab */}
              <Link
                href="/dashboard"
                className={`h-[52px] flex flex-col items-center justify-center rounded-full transition-all duration-150 relative active:scale-95 ${
                  isHome 
                    ? "text-brand-blue dark:text-blue-400 font-bold" 
                    : "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white font-medium"
                }`}
              >
                <div className="h-6 flex items-center justify-center">
                  <House 
                    size={20} 
                    weight={isHome ? "fill" : "regular"} 
                    className={`transition-transform duration-150 ${isHome ? "scale-110" : ""}`}
                  />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                  Home
                </span>
                {isHome && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand-blue dark:bg-blue-400" />
                )}
              </Link>

              {/* 2. SMS Hub Tab */}
              <Link
                href="/dashboard/sms"
                className={`h-[52px] flex flex-col items-center justify-center rounded-full transition-all duration-150 relative active:scale-95 ${
                  isSms 
                    ? "text-brand-blue dark:text-blue-400 font-bold" 
                    : "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white font-medium"
                }`}
              >
                <div className="h-6 flex items-center justify-center">
                  <ChatCircleDots 
                    size={20} 
                    weight={isSms ? "fill" : "regular"} 
                    className={`transition-transform duration-150 ${isSms ? "scale-110" : ""}`}
                  />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                  SMS
                </span>
                {isSms && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand-blue dark:bg-blue-400" />
                )}
              </Link>

              {/* 3. Center Prominent Plus (+) Action Button (No label below, elevated & centered) */}
              <div className="h-[52px] flex items-center justify-center">
                <Link
                  href="/dashboard/fund"
                  aria-label="Fund Wallet"
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-brand-blue hover:bg-blue-600 text-white shadow-md shadow-brand-blue/35 flex items-center justify-center active:scale-90 transition-all ${
                    isFund 
                      ? "ring-2 ring-brand-blue ring-offset-2 dark:ring-offset-[#121212] scale-105" 
                      : ""
                  }`}
                >
                  <Plus size={20} weight="bold" />
                </Link>
              </div>

              {/* 4. Support Tab */}
              <Link
                href="/dashboard/support"
                className={`h-[52px] flex flex-col items-center justify-center rounded-full transition-all duration-150 relative active:scale-95 ${
                  isSupport 
                    ? "text-brand-blue dark:text-blue-400 font-bold" 
                    : "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white font-medium"
                }`}
              >
                <div className="h-6 flex items-center justify-center">
                  <Headset 
                    size={20} 
                    weight={isSupport ? "fill" : "regular"} 
                    className={`transition-transform duration-150 ${isSupport ? "scale-110" : ""}`}
                  />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                  Support
                </span>
                {isSupport && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand-blue dark:bg-blue-400" />
                )}
              </Link>

              {/* 5. History Tab */}
              <Link
                href="/dashboard/transactions"
                className={`h-[52px] flex flex-col items-center justify-center rounded-full transition-all duration-150 relative active:scale-95 ${
                  isHistory 
                    ? "text-brand-blue dark:text-blue-400 font-bold" 
                    : "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white font-medium"
                }`}
              >
                <div className="h-6 flex items-center justify-center">
                  <ClockCounterClockwise 
                    size={20} 
                    weight={isHistory ? "fill" : "regular"} 
                    className={`transition-transform duration-150 ${isHistory ? "scale-110" : ""}`}
                  />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 leading-none">
                  History
                </span>
                {isHistory && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand-blue dark:bg-blue-400" />
                )}
              </Link>

            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
