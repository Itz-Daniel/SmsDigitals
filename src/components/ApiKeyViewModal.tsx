"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Key, Copy, Check, X, ShieldWarning } from "@phosphor-icons/react";

interface ApiKeyViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyName: string;
  apiKey: string;
}

export function ApiKeyViewModal({
  isOpen,
  onClose,
  keyName,
  apiKey
}: ApiKeyViewModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-lg bg-white dark:bg-[#0D1322] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative flex flex-col gap-6 text-slate-900 dark:text-white"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} weight="bold" />
          </button>

          {/* Header */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                <Key size={22} weight="bold" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-blue">Reseller API Key</span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white truncate">
              {keyName || "Reseller API Key"}
            </h3>
          </div>

          {/* Key Box */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/40">
              Your Secret API Key
            </label>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-black border border-slate-200/80 dark:border-white/15 flex items-center justify-between gap-3 shadow-inner">
              <code className="text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-emerald-400 break-all leading-relaxed select-all">
                {apiKey}
              </code>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-start gap-2.5">
            <ShieldWarning size={20} weight="fill" className="shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Keep this key private! Anyone with access to this API key can perform automated requests using your wallet balance.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 py-4 rounded-2xl bg-brand-blue text-white font-bold text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20"
            >
              {copied ? <Check size={18} weight="bold" /> : <Copy size={18} weight="bold" />}
              {copied ? "Copied to Clipboard!" : "Copy API Key"}
            </button>
            
            <button
              onClick={onClose}
              className="px-6 py-4 rounded-2xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/20 transition-all"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
