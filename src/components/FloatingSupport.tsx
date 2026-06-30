"use client";

import { motion } from "framer-motion";
import { Headset } from "@phosphor-icons/react";
import Link from "next/link";

export function FloatingSupport() {
  return (
    <Link 
      href="https://t.me/SmsDigitals"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-[999] group"
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-brand-blue flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,112,243,0.4)] cursor-pointer border-2 border-white dark:border-[#030303] relative"
      >
        <Headset weight="fill" size={24} />
        
        {/* Pulse effect */}
        <div className="absolute inset-0 rounded-full bg-brand-blue opacity-30 animate-ping" style={{ animationDuration: '3s' }} />
      </motion.div>
      
      {/* Tooltip */}
      <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-slate-800 dark:border-white/10">
        Contact Support
      </div>
    </Link>
  );
}
