"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Headset } from "@phosphor-icons/react";

export function FloatingSupport() {
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    window.open("https://t.me/SmsDigitals", "_blank");
  };

  return (
    <motion.div
      drag
      dragConstraints={{ left: -350, right: 20, top: -700, bottom: 20 }}
      dragElastic={0.1}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => {
        setTimeout(() => setIsDragging(false), 150);
      }}
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-[999] group cursor-grab active:cursor-grabbing select-none touch-none"
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 rounded-full bg-brand-blue flex items-center justify-center text-white shadow-[0_0_25px_rgba(0,112,243,0.5)] border-2 border-white dark:border-[#030303] relative"
      >
        <Headset weight="fill" size={26} />
        
        {/* Pulse effect */}
        <div className="absolute inset-0 rounded-full bg-brand-blue opacity-30 animate-ping" style={{ animationDuration: '3s' }} />
      </motion.div>

      {/* Tooltip */}
      <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-bold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl border border-slate-800 dark:border-white/10">
        Contact Support (Drag anywhere)
      </div>
    </motion.div>
  );
}
