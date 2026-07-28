"use client";

import { useState } from "react";
import { Lightning, Spinner, Sparkle, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { motion } from "framer-motion";

interface AILineFixerProps {
  rentalId: string;
  provider?: string;
  onFixSuccess: () => void;
}

export function AILineFixerWidget({ rentalId, provider = "5sim", onFixSuccess }: AILineFixerProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleFixLine = async () => {
    setIsFixing(true);
    setMessage(null);

    try {
      const res = await fetch("/api/ai/fix-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rentalId })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ text: data.message || "⚡ AI Auto-Switch complete!", type: "success" });
        setTimeout(() => {
          onFixSuccess();
        }, 1500);
      } else {
        setMessage({ text: data.error || "Failed to auto-switch line.", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Network error while running AI auto-switch.", type: "error" });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-2xl bg-gradient-to-r from-brand-blue/15 via-purple-500/10 to-brand-blue/15 border border-brand-blue/30 backdrop-blur-xl flex flex-col gap-3 shadow-lg my-2"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-extrabold text-brand-blue dark:text-blue-400">
          <Sparkle size={18} className="animate-spin text-amber-400 shrink-0" />
          <span>SmsDigitals AI Line Diagnostic Assistant</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-blue/20 text-brand-blue border border-brand-blue/30">
          60s Stalled Line Fixer
        </span>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
        Carrier network route <strong className="text-slate-900 dark:text-white font-bold">{provider.toUpperCase()}</strong> is experiencing slow SMS transmission. AI recommends auto-switching to a fresh backup line.
      </p>

      {message && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <WarningCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <button
        onClick={handleFixLine}
        disabled={isFixing}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-blue to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-blue/20 transition-all active:scale-95 disabled:opacity-50"
      >
        {isFixing ? (
          <>
            <Spinner size={16} className="animate-spin" /> AI Auto-Switching Carrier Line...
          </>
        ) : (
          <>
            <Lightning size={16} weight="fill" className="text-amber-300" />
            1-Click AI Auto-Switch to Backup Carrier Line
          </>
        )}
      </button>
    </motion.div>
  );
}
