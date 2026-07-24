"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, Copy, Check, X, ArrowRight, ShieldCheck } from "@phosphor-icons/react";

interface PurchaseSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  phoneNumber: string;
  cost: string;
  orderId: string;
  countryFlag?: string;
}

export function PurchaseSuccessModal({
  isOpen,
  onClose,
  serviceName,
  phoneNumber,
  cost,
  orderId,
  countryFlag = "🇺🇸"
}: PurchaseSuccessModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(phoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="w-full max-w-md bg-white dark:bg-[#0D1322] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative flex flex-col gap-6 text-slate-900 dark:text-white"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} weight="bold" />
          </button>

          {/* Success Icon Header */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 shadow-inner">
              <CheckCircle size={36} weight="fill" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                <ShieldCheck size={12} weight="fill" /> Order Provisioned Successfully
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Line Activated!
              </h3>
            </div>
          </div>

          {/* Details Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/5 pb-2.5">
              <span className="text-xs text-slate-500 dark:text-white/40 font-bold uppercase tracking-wider">Service</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{countryFlag}</span> {serviceName}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/5 pb-2.5">
              <span className="text-xs text-slate-500 dark:text-white/40 font-bold uppercase tracking-wider">Value / Cost Paid</span>
              <span className="text-sm font-extrabold font-mono text-brand-blue">
                {cost}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-white/40 font-bold uppercase tracking-wider">Order Reference</span>
              <span className="text-xs font-mono font-bold text-slate-600 dark:text-white/60">
                {orderId}
              </span>
            </div>
          </div>

          {/* Phone Number Display & Copy Box */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-white/40">
              Assigned Virtual Phone Number
            </label>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-black border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 shadow-inner">
              <span className="text-xl font-mono font-bold tracking-wider text-slate-900 dark:text-emerald-400">
                {phoneNumber}
              </span>
              <button
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 shrink-0"
              >
                {copied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-brand-blue text-white font-bold text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20"
          >
            Start Receiving SMS <ArrowRight size={16} weight="bold" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
